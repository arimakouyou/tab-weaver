# 🧩 Tab Weaver - コンポーネント仕様書

## 📋 概要

Tab Weaverの各コンポーネントの詳細な仕様と実装ガイドライン。

---

## 🎯 TabWeaverController

### 責任範囲
- ポップアップUIの制御とライフサイクル管理
- ユーザーインタラクションの処理
- 他コンポーネントとの協調

### クラス仕様

#### コンストラクタ
```javascript
constructor() {
    // 依存コンポーネントの初期化
    this.tabManager = new TabManager();
    this.markdownFormatter = new MarkdownFormatter();
    this.clipboardManager = new ClipboardManager();
    
    // 状態管理
    this.currentTabs = [];          // 現在のタブ情報
    this.currentFormat = 'list';    // 表示形式
    this.currentScope = 'current';  // スコープ設定
    this.isLoading = false;         // ローディング状態
}
```

#### 初期化フェーズ
```javascript
async initialize() {
    await this.loadSettings();      // 1. 設定読み込み
    this.initializeUI();           // 2. UI初期化
    this.bindEvents();             // 3. イベントバインド
    await this.loadInitialData();  // 4. 初期データ読み込み
}
```

#### DOM要素管理
```javascript
initializeUI() {
    // 必須要素の検証
    const requiredElements = [
        'format-select', 'scope-select', 'preview-content',
        'tab-count', 'copy-btn', 'refresh-btn'
    ];
    
    this.elements = {};
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Required element missing: ${id}`);
        }
        this.elements[this.toCamelCase(id)] = element;
    });
}
```

#### イベント処理
```javascript
bindEvents() {
    // フォーマット変更
    this.elements.formatSelect.addEventListener('change', 
        this.handleFormatChange.bind(this));
    
    // スコープ変更
    this.elements.scopeSelect.addEventListener('change', 
        this.handleScopeChange.bind(this));
    
    // コピーボタン
    this.elements.copyBtn.addEventListener('click', 
        this.handleCopyClick.bind(this));
    
    // キーボードショートカット
    document.addEventListener('keydown', this.handleKeydown.bind(this));
}
```

#### 状態管理
- **currentTabs**: タブ情報の配列
- **currentFormat**: 'list' | 'table' | 'grouped' | 'tabGroups'
- **currentScope**: 'current' | 'all'
- **isLoading**: ローディング状態のフラグ

#### パフォーマンス監視
```javascript
performanceMetrics = {
    tabLoadTime: 0,        // タブ読み込み時間
    previewRenderTime: 0,  // プレビュー描画時間
    copyTime: 0           // コピー処理時間
}
```

---

## 📋 TabManager

### 責任範囲
- Chrome Tabs APIとの通信
- タブ情報の処理とキャッシュ管理
- セキュリティ検証とデータサニタイズ

### キャッシュ戦略
```javascript
class TabManager {
    constructor(options = {}) {
        this.cache = new Map();                    // キャッシュストレージ
        this.cacheTimeout = options.cacheTimeout || 30000; // 30秒TTL
        this.excludePatterns = new Set([           // 除外パターン
            'chrome://', 'chrome-extension://', 'moz-extension://',
            'edge://', 'opera://', 'about:', 'data:'
        ]);
    }
}
```

#### API メソッド

##### `getAllTabs()`
```javascript
async getAllTabs(): Promise<Array<TabInfo>>
```
- **キャッシュ**: 30秒間有効
- **戻り値**: 処理済みタブ情報配列
- **エラー**: Chrome API エラー時に例外スロー

##### `getCurrentWindowTabs()`
```javascript
async getCurrentWindowTabs(): Promise<Array<TabInfo>>
```
- **キャッシュ**: 30秒間有効
- **戻り値**: 現在ウィンドウのタブ情報

##### `processTabs(tabs)`
```javascript
processTabs(tabs: Array<chrome.tabs.Tab>): Array<TabInfo>
```
- **処理内容**:
  1. URL検証とフィルタリング
  2. セキュリティチェック
  3. Markdownエスケープ
  4. 優先度ソート

#### セキュリティ処理

##### URL検証
```javascript
isValidTab(tab) {
    if (!tab || !tab.url) return false;
    
    // 内部URLやプロトコルを除外
    for (const pattern of this.excludePatterns) {
        if (tab.url.startsWith(pattern)) {
            return false;
        }
    }
    return true;
}
```

##### データサニタイズ
```javascript
sanitizeUrl(url) {
    try {
        const urlObj = new URL(url);
        // javascript:プロトコルを除外
        if (urlObj.protocol === 'javascript:') {
            return 'about:blank';
        }
        return url;
    } catch {
        return 'about:blank';
    }
}
```

#### 統計情報生成
```javascript
getTabStats(tabs): {
    total: number,        // 総タブ数
    pinned: number,       // ピン留めタブ数
    secure: number,       // セキュアタブ数（HTTPS）
    domains: number,      // ユニークドメイン数
    duplicates: number,   // 重複タブ数
    grouped: number,      // グループ化されたタブ数
    groupCount: number    // タブグループ数
}
```

---

## 📝 MarkdownFormatter

### 責任範囲
- タブ情報のMarkdown形式変換
- 複数出力形式のサポート
- テンプレート機能の提供

### 出力形式

#### 1. List形式
```javascript
formatList(tabs, options = {}) {
    return `## 📋 開いているタブ (${timestamp})

${tabs.map(tab => 
    `- [${this.escapeMarkdown(tab.title)}](${tab.url}) ${this.getStatusIcon(tab)}`
).join('\n')}

${this.generateStats(tabs)}`;
}
```

#### 2. Table形式
```javascript
formatTable(tabs, options = {}) {
    return `## 📋 開いているタブ (${timestamp})

| Title | Domain | Status |
|-------|--------|--------|
${tabs.map(tab => 
    `| [${this.escapeMarkdown(tab.title)}](${tab.url}) | \`${tab.domain}\` | ${this.getStatusIcon(tab)} |`
).join('\n')}`;
}
```

#### 3. Grouped形式
```javascript
formatGrouped(tabs, options = {}) {
    const grouped = this.groupTabsByDomain(tabs);
    let markdown = `## 📋 開いているタブ (ドメイン別) (${timestamp})\n\n`;
    
    Object.entries(grouped).forEach(([domain, domainTabs]) => {
        const icon = this.getDomainIcon(domain);
        markdown += `### ${icon} ${domain} (${domainTabs.length})\n\n`;
        markdown += domainTabs.map(tab => 
            `- [${this.escapeMarkdown(tab.title)}](${tab.url}) ${this.getStatusIcon(tab)}`
        ).join('\n') + '\n\n';
    });
    
    return markdown;
}
```

#### ステータスアイコン
```javascript
getStatusIcon(tab) {
    if (tab.active) return '▶️';
    if (tab.pinned) return '📌';
    return '';
}

getDomainIcon(domain) {
    const icons = {
        'github.com': '🐙',
        'stackoverflow.com': '📚',
        'developer.mozilla.org': '🦎',
        'google.com': '🔍',
        'youtube.com': '📺'
    };
    return icons[domain] || '🌐';
}
```

### エスケープ処理
```javascript
escapeMarkdown(text) {
    if (!text) return 'Untitled';
    
    return text
        .replace(/\\/g, '\\\\')    // バックスラッシュ
        .replace(/\*/g, '\\*')     // アスタリスク
        .replace(/\[/g, '\\[')     // 角括弧
        .replace(/\]/g, '\\]')     // 角括弧
        .replace(/\(/g, '\\(')     // 丸括弧
        .replace(/\)/g, '\\)')     // 丸括弧
        .replace(/`/g, '\\`');     // バッククォート
}
```

---

## 📋 ClipboardManager

### 責任範囲
- クリップボード操作の抽象化
- フィードバック表示の管理
- コピー履歴の保持

### API設計

#### メインAPI
```javascript
async copyToClipboard(text, options = {
    showFeedback: true,
    addToHistory: true
}): Promise<boolean>
```

#### フォールバック戦略
```javascript
async copyToClipboard(text, options = {}) {
    try {
        // 現代的なClipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            // 従来のexecCommand フォールバック
            await this.fallbackCopy(text);
        }
        
        this.updateHistory(text, options);
        this.showFeedback('コピーしました！', 'success');
        return true;
    } catch (error) {
        this.showFeedback('コピーに失敗しました', 'error');
        return false;
    }
}
```

#### フィードバックシステム
```javascript
showCopyFeedback(message, type = 'success', duration = 2000) {
    const feedbackElement = this.getFeedbackElement();
    
    feedbackElement.textContent = message;
    feedbackElement.className = `feedback ${type}`;
    
    // アニメーション表示
    setTimeout(() => feedbackElement.classList.add('show'), 10);
    setTimeout(() => feedbackElement.classList.remove('show'), duration);
}
```

#### 履歴管理
```javascript
addToHistory(text) {
    const entry = {
        text: text.substring(0, 200),    // プレビュー用
        fullText: text,                  // 完全なテキスト
        timestamp: Date.now(),
        id: this.generateId()
    };
    
    // 重複除去
    this.copyHistory = this.copyHistory.filter(item => 
        item.text !== entry.text
    );
    
    // 先頭に追加
    this.copyHistory.unshift(entry);
    
    // 履歴サイズ制限
    if (this.copyHistory.length > this.maxHistorySize) {
        this.copyHistory = this.copyHistory.slice(0, this.maxHistorySize);
    }
}
```

---

## 🔧 Service Worker

### 責任範囲
- バックグラウンド処理の管理
- コンテキストメニューの制御
- 通知機能の提供

### ライフサイクル管理
```javascript
// インストール処理
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        initializeExtension();
    } else if (details.reason === 'update') {
        handleUpdate(details.previousVersion);
    }
    createContextMenus();
});

// 初期化処理
function initializeExtension() {
    const defaultSettings = {
        format: 'list',
        scope: 'current',
        autoRefresh: false,
        showNotifications: true,
        theme: 'light'
    };
    
    chrome.storage.local.set({
        tabListSettings: defaultSettings,
        installDate: Date.now(),
        version: chrome.runtime.getManifest().version
    });
}
```

### コンテキストメニュー
```javascript
function createContextMenus() {
    chrome.contextMenus.create({
        id: 'copyCurrentTab',
        title: '現在のタブをMarkdownでコピー',
        contexts: ['page']
    });
    
    chrome.contextMenus.create({
        id: 'copyAllTabs',
        title: '全てのタブをMarkdownでコピー',
        contexts: ['page']
    });
}

// メニューアクション処理
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    switch (info.menuItemId) {
        case 'copyCurrentTab':
            await copyCurrentTabAsMarkdown(tab);
            break;
        case 'copyAllTabs':
            await copyAllTabsAsMarkdown();
            break;
    }
});
```

### 統計情報管理
```javascript
async function updateTabStatistics() {
    try {
        const tabs = await chrome.tabs.query({});
        const stats = {
            totalTabs: tabs.length,
            pinnedTabs: tabs.filter(tab => tab.pinned).length,
            secureTabs: tabs.filter(tab => tab.url?.startsWith('https://')).length,
            uniqueDomains: new Set(tabs.map(tab => {
                try {
                    return new URL(tab.url).hostname;
                } catch {
                    return 'unknown';
                }
            })).size,
            lastUpdated: Date.now()
        };
        
        await chrome.storage.local.set({ tabListStats: stats });
    } catch (error) {
        console.error('統計更新に失敗:', error);
    }
}
```

---

## 🎨 UI Components

### HTML構造
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tab Weaver</title>
    <link rel="stylesheet" href="popup.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1 class="title">🕸️ Tab Weaver</h1>
            <div class="controls">
                <select id="format-select" aria-label="出力形式">
                    <option value="list">リスト</option>
                    <option value="table">テーブル</option>
                    <option value="grouped">グループ</option>
                </select>
                
                <select id="scope-select" aria-label="対象範囲">
                    <option value="current">現在のウィンドウ</option>
                    <option value="all">全てのウィンドウ</option>
                </select>
            </div>
        </header>
        
        <main class="main">
            <div class="stats">
                <span id="tab-count">0 タブ</span>
                <button id="refresh-btn" aria-label="更新">🔄</button>
            </div>
            
            <div id="preview-content" class="preview" aria-live="polite">
                <!-- プレビューコンテンツ -->
            </div>
        </main>
        
        <footer class="footer">
            <button id="copy-btn" class="copy-button">
                📋 コピー
            </button>
        </footer>
        
        <div id="feedback" class="feedback" role="alert" aria-live="assertive">
            <!-- フィードバックメッセージ -->
        </div>
    </div>
</body>
</html>
```

### CSS設計
```css
/* BEMメソドロジー採用 */
.container {
    width: 400px;
    min-height: 300px;
    font-family: 'Segoe UI', sans-serif;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
}

.controls {
    display: flex;
    gap: 8px;
}

.preview {
    max-height: 300px;
    overflow-y: auto;
    padding: 16px;
    font-family: 'Monaco', monospace;
    font-size: 12px;
    white-space: pre-wrap;
}

.copy-button {
    width: 100%;
    padding: 12px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.copy-button:hover {
    background: var(--primary-hover-color);
}

.feedback {
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 8px 12px;
    border-radius: 4px;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s ease;
}

.feedback.show {
    opacity: 1;
    transform: translateY(0);
}

.feedback.success {
    background: var(--success-color);
    color: white;
}

.feedback.error {
    background: var(--error-color);
    color: white;
}
```

---

## 📊 エラーハンドリング

### エラー分類
```javascript
class TabWeaverError extends Error {
    constructor(message, type, code) {
        super(message);
        this.name = 'TabWeaverError';
        this.type = type;  // 'API', 'UI', 'DATA', 'NETWORK'
        this.code = code;  // エラーコード
    }
}

// 使用例
throw new TabWeaverError(
    'Chrome Tabs API access failed',
    'API',
    'TAB_ACCESS_DENIED'
);
```

### エラー回復戦略
```javascript
async function safeExecute(operation, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            console.warn(`Attempt ${attempt} failed:`, error);
            
            if (attempt === retries) {
                throw error;
            }
            
            // 指数バックオフ
            await new Promise(resolve => 
                setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
            );
        }
    }
}
```

---

## 🧪 テスト仕様

### モックの設計
```javascript
// Chrome API モック
const mockChrome = {
    tabs: {
        query: jest.fn(),
        onCreated: { addListener: jest.fn() },
        onRemoved: { addListener: jest.fn() }
    },
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn()
        }
    }
};

global.chrome = mockChrome;
```

### テストカテゴリ
1. **ユニットテスト**: 個別クラス・メソッドのテスト
2. **統合テスト**: コンポーネント間の連携テスト
3. **E2Eテスト**: ユーザーシナリオのテスト

---

**更新日**: 2025-08-02  
**バージョン**: 1.0.0