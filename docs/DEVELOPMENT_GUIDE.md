# 🛠️ Tab Weaver - 開発者ガイド

## 🚀 開発環境セットアップ

### 前提条件
- **Node.js**: v16.0.0以上
- **Chrome**: v88以上
- **Git**: 最新版

### 初期セットアップ
```bash
# リポジトリのクローン
git clone https://github.com/arimakouyou/tab-weaver.git
cd tab-weaver

# 依存関係のインストール
npm install

# 開発環境の確認
npm run test
npm run lint
```

### Chrome拡張機能の読み込み
1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. プロジェクトルートディレクトリを選択

---

## 🏗️ アーキテクチャ詳細

### クラス設計パターン

#### 1. TabWeaverController (MVC Controller)
```javascript
class TabWeaverController {
    constructor() {
        // 依存性注入パターン
        this.tabManager = new TabManager();
        this.markdownFormatter = new MarkdownFormatter();
        this.clipboardManager = new ClipboardManager();
    }
    
    // 初期化フェーズ
    async initialize() {
        await this.loadSettings();      // 設定読み込み
        this.initializeUI();           // UI初期化
        this.bindEvents();             // イベントバインド
        await this.loadInitialData();  // 初期データ読み込み
    }
}
```

**設計思想**: 
- 単一責任原則: UI制御のみに特化
- 依存性注入: テスタビリティの向上
- 非同期初期化: パフォーマンス最適化

#### 2. TabManager (データアクセス層)
```javascript
class TabManager {
    constructor(options = {}) {
        this.cache = new Map();                    // インメモリキャッシュ
        this.cacheTimeout = options.cacheTimeout || 30000;
        this.excludePatterns = new Set([...]);    // セキュリティフィルター
    }
    
    // キャッシュファーストパターン
    async getAllTabs() {
        const cached = this.getFromCache('all-tabs');
        if (cached) return cached;
        
        const tabs = await chrome.tabs.query({});
        const processedTabs = this.processTabs(tabs);
        this.setCache('all-tabs', processedTabs);
        return processedTabs;
    }
}
```

**パフォーマンス最適化**:
- 30秒キャッシュによるAPI呼び出し削減
- Map使用による高速ルックアップ
- バッチ処理による効率化

#### 3. MarkdownFormatter (変換層)
```javascript
class MarkdownFormatter {
    // ストラテジーパターン
    format(tabs, format, options) {
        const strategies = {
            list: () => this.formatList(tabs, options),
            table: () => this.formatTable(tabs, options),
            grouped: () => this.formatGrouped(tabs, options)
        };
        
        return strategies[format]?.() || this.formatList(tabs, options);
    }
}
```

**設計パターン**: Strategy Pattern で形式別処理を分離

---

## 🔧 開発ワークフロー

### 1. 機能開発フロー
```bash
# 1. 新機能ブランチを作成
git checkout -b feature/new-awesome-feature

# 2. 開発中のテスト実行（ウォッチモード）
npm run dev

# 3. 個別ファイルテスト
npm test -- tab-manager.test.js

# 4. カバレッジ確認
npm run test:coverage

# 5. リント修正
npm run lint

# 6. 最終ビルド確認
npm run build
```

### 2. テスト駆動開発（TDD）
```javascript
// 1. テストを先に書く
describe('TabManager', () => {
    test('should cache tabs for 30 seconds', async () => {
        const tabManager = new TabManager();
        // テストロジック
    });
});

// 2. 最小限の実装
class TabManager {
    getFromCache(key) {
        // 最小実装
    }
}

// 3. リファクタリング
// 実装を改善し、テストが通ることを確認
```

### 3. デバッグ手順
```javascript
// 1. Console デバッグ
console.log('Debug info:', { tabs, format, options });

// 2. Chrome DevTools
// ポップアップ: 拡張機能詳細 → 「検証」
// Service Worker: 拡張機能詳細 → 「service worker」をクリック

// 3. Performance プロファイリング
const startTime = performance.now();
await this.tabManager.getAllTabs();
console.log(`Tab loading took ${performance.now() - startTime}ms`);
```

---

## 📊 品質保証

### テスト戦略

#### 1. ユニットテスト
```javascript
// tab-manager.test.js
describe('TabManager', () => {
    let tabManager;
    
    beforeEach(() => {
        tabManager = new TabManager();
        // Chrome API モック
        global.chrome = {
            tabs: { query: jest.fn() }
        };
    });
    
    test('processTabs should filter invalid tabs', () => {
        const mockTabs = [
            { url: 'https://example.com', title: 'Valid' },
            { url: 'chrome://settings', title: 'Invalid' }
        ];
        
        const result = tabManager.processTabs(mockTabs);
        expect(result).toHaveLength(1);
        expect(result[0].url).toBe('https://example.com');
    });
});
```

#### 2. 統合テスト
```javascript
// popup-integration.test.js
describe('Popup Integration', () => {
    test('should update preview when format changes', async () => {
        // DOM セットアップ
        document.body.innerHTML = '<select id="format-select"></select>';
        
        const controller = new TabWeaverController();
        await controller.initialize();
        
        // フォーマット変更のシミュレーション
        controller.elements.formatSelect.value = 'table';
        controller.handleFormatChange();
        
        // 結果の検証
        expect(controller.currentFormat).toBe('table');
    });
});
```

### コードカバレッジ目標
- **ステートメント**: 75%以上
- **ブランチ**: 70%以上  
- **関数**: 75%以上
- **ライン**: 75%以上

### ESLint ルール
```javascript
// package.json の eslintConfig
{
    "rules": {
        "no-unused-vars": "warn",     // 未使用変数は警告
        "no-console": "warn",         // console文は警告（開発時）
        "prefer-const": "error",      // const 使用を強制
        "no-var": "error"            // var 禁止
    }
}
```

---

## 🔒 セキュリティガイドライン

### 1. 入力検証
```javascript
// ❌ 危険: 検証なし
element.innerHTML = userInput;

// ✅ 安全: 検証とエスケープ
element.textContent = this.sanitizeInput(userInput);

sanitizeInput(input) {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .substring(0, 1000); // 長さ制限
}
```

### 2. URL検証
```javascript
isValidUrl(url) {
    try {
        const urlObj = new URL(url);
        // 危険なプロトコルを除外
        const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
        return !dangerousProtocols.includes(urlObj.protocol);
    } catch {
        return false;
    }
}
```

### 3. CSP設定
```json
// manifest.json
{
    "content_security_policy": {
        "extension_pages": "script-src 'self'; object-src 'none';"
    }
}
```

---

## ⚡ パフォーマンス最適化

### 1. DOM操作最適化
```javascript
// ❌ 非効率: 個別DOM操作
tabs.forEach(tab => {
    const li = document.createElement('li');
    li.textContent = tab.title;
    container.appendChild(li);
});

// ✅ 効率的: DocumentFragment使用
const fragment = document.createDocumentFragment();
tabs.forEach(tab => {
    const li = document.createElement('li');
    li.textContent = tab.title;
    fragment.appendChild(li);
});
container.appendChild(fragment);
```

### 2. デバウンス処理
```javascript
class TabWeaverController {
    updatePreview() {
        // 連続呼び出しを防ぐ
        clearTimeout(this.previewUpdateTimer);
        this.previewUpdateTimer = setTimeout(() => {
            this.renderPreview();
        }, 300);
    }
}
```

### 3. キャッシュ戦略
```javascript
class TabManager {
    setCache(key, data) {
        // LRU風のシンプルなキャッシュ
        if (this.cache.size > 10) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: this.cacheTimeout
        });
    }
}
```

---

## 🚀 デプロイメント

### 1. リリースビルド
```bash
# テスト + リント + ビルド
npm run build

# リリース用ディレクトリの確認
ls -la release/

# パッケージサイズ確認
du -sh release/
```

### 2. Chrome Web Store 申請
```bash
# release/ ディレクトリをZIP化
cd release/
zip -r ../Tab-Weaver-v1.0.0.zip .
cd ..

# パッケージサイズ確認（5MB以下）
ls -lh Tab-Weaver-v1.0.0.zip
```

### 3. バージョン管理
```json
// manifest.json と package.json のバージョン同期
{
    "version": "1.0.1",
    "version_name": "1.0.1 - Security fixes"
}
```

---

## 🐛 トラブルシューティング

### よくある問題

#### 1. Chrome API エラー
```javascript
// エラー: Cannot read property 'query' of undefined
// 原因: chrome オブジェクトが未定義
// 解決: manifest.json の permissions 確認

// テスト環境では
if (typeof chrome !== 'undefined' && chrome.tabs) {
    return await chrome.tabs.query({});
} else {
    return mockTabs; // テスト用データ
}
```

#### 2. キャッシュ関連問題
```javascript
// 症状: 古いデータが表示される
// 解決: キャッシュクリア機能の追加
clearCache() {
    this.cache.clear();
    console.log('Cache cleared');
}
```

#### 3. パフォーマンス問題
```javascript
// 症状: 大量タブで動作が重い
// 解決: 仮想化またはページング
const MAX_VISIBLE_TABS = 100;
const visibleTabs = tabs.slice(0, MAX_VISIBLE_TABS);
```

### デバッグコマンド
```bash
# 特定テストのデバッグ実行
npm test -- --testNamePattern="TabManager" --verbose

# ESLint の特定ルール無効化
npm run lint -- --rule "no-console: off"

# カバレッジの詳細確認
npm run test:coverage -- --verbose
```

---

## 📈 今後の改善計画

### 短期（1-2週間）
- [ ] TypeScript 導入
- [ ] セキュリティ脆弱性修正
- [ ] アイコン最適化

### 中期（1ヶ月）
- [ ] テストカバレッジ75%達成
- [ ] パフォーマンス最適化
- [ ] 国際化対応

### 長期（3ヶ月）
- [ ] プラグインアーキテクチャ
- [ ] クラウド同期機能
- [ ] ダークテーマ完全対応

---

## 📞 開発サポート

### コミュニティ
- **GitHub Discussions**: 技術的な質問
- **Issues**: バグ報告・機能要望
- **Pull Requests**: コード貢献

### 開発リソース
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/reference/)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [ESLint Rules](https://eslint.org/docs/rules/)

---

**更新日**: 2025-08-02  
**作成者**: Tab Weaver Development Team  
**バージョン**: 1.0.0