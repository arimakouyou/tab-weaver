# 🏗️ Tab Weaver - プロジェクト構造ドキュメント

## 📁 プロジェクト概要

Tab WeaverはChrome拡張機能として設計されており、タブ情報をMarkdown形式で整理・エクスポートする機能を提供します。

```
tablist/                          # プロジェクトルート
├── 📋 manifest.json              # Chrome拡張機能設定ファイル
├── 📖 README.md                  # プロジェクト説明書
├── 🛠️ CLAUDE.md                 # 開発ガイドライン
├── 📦 PACKAGE-INFO.md            # パッケージ情報
├── ⚙️ package.json               # Node.js設定・依存関係
├── 🔒 package-lock.json          # 依存関係ロック
│
├── 🎨 popup/                     # ポップアップUI関連
│   ├── 🌐 popup.html             # メインUI構造
│   ├── 🎨 popup.css              # スタイル定義
│   ├── 🧠 popup.js               # メインコントローラー
│   ├── 📋 tab-manager.js         # タブ管理クラス
│   ├── 📝 markdown-formatter.js  # Markdown変換クラス
│   └── 📋 clipboard-manager.js   # クリップボード管理クラス
│
├── 🔧 background/                # バックグラウンド処理
│   └── ⚙️ service-worker.js      # サービスワーカー
│
├── 🎯 assets/                    # 静的リソース
│   └── 🖼️ icons/                # アイコンファイル群
│       ├── icon-16.png          # 16x16 アイコン
│       ├── icon-32.png          # 32x32 アイコン
│       ├── icon-48.png          # 48x48 アイコン
│       ├── icon-128.png         # 128x128 アイコン
│       └── icon.svg             # ベクターアイコン
│
├── 🧪 tests/                     # テストファイル
│   ├── unit/                    # ユニットテスト
│   │   ├── tab-manager.test.js   
│   │   ├── clipboard-manager.test.js
│   │   └── markdown-formatter.test.js
│   ├── integration/             # 統合テスト
│   │   ├── popup-integration.test.js
│   │   └── service-worker.test.js
│   ├── mocks/                   # モックファイル
│   ├── setup.js                 # テストセットアップ
│   └── transform.js             # Babel変換設定
│
├── 📊 coverage/                  # テストカバレッジレポート
│   ├── lcov-report/             # HTML形式レポート
│   └── lcov.info                # LCOV形式レポート
│
├── 📦 release/                   # リリース用ビルド
│   ├── manifest.json
│   ├── popup/                   # 最適化済みファイル
│   ├── background/
│   └── assets/
│
├── 📚 docs/                      # プロジェクトドキュメント
│   ├── API.md                   # API仕様書
│   ├── PROJECT_STRUCTURE.md     # このファイル
│   └── DEVELOPMENT.md           # 開発ガイド
│
└── 📦 node_modules/              # npm依存関係
```

---

## 📋 コアファイル詳細

### 🧩 manifest.json
```json
{
  "manifest_version": 3,          // Chrome拡張機能v3仕様
  "name": "Tab Weaver",
  "version": "1.0.0",
  "permissions": [                // 必要な権限
    "tabs", "tabGroups", "storage", 
    "contextMenus", "notifications", "scripting"
  ]
}
```

**役割**: Chrome拡張機能の設定ファイル
**重要度**: 🔴 Critical
**メンテナンス**: 機能追加時に権限更新が必要

### 🎨 popup/ ディレクトリ

#### 🌐 popup.html (4KB)
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <!-- UI構造定義 -->
</body>
</html>
```

**役割**: ポップアップのUI構造
**依存関係**: popup.css, popup.js
**特徴**: セマンティックHTML、アクセシビリティ対応

#### 🎨 popup.css (8KB)
- **モダンCSS**: Flexbox、Grid Layout使用
- **レスポンシブ**: 320px-800px対応
- **テーマ**: ライト・ダークテーマサポート
- **アニメーション**: スムーズなトランジション

#### 🧠 popup.js (24KB)
```javascript
class TabWeaverController {
    constructor() {
        this.tabManager = new TabManager();
        this.formatter = new MarkdownFormatter();
        this.clipboardManager = new ClipboardManager();
    }
}
```

**役割**: メインコントローラー
**依存関係**: TabManager, MarkdownFormatter, ClipboardManager
**機能**: UI制御、イベント処理、状態管理

#### 📋 tab-manager.js (20KB)
```javascript
class TabManager {
    async getAllTabs() { /* Chrome Tabs API */ }
    processTabs(tabs) { /* セキュリティ処理 */ }
    getTabStats(tabs) { /* 統計生成 */ }
}
```

**役割**: タブ情報管理
**API使用**: Chrome Tabs API, Chrome TabGroups API
**特徴**: キャッシュ機能、セキュリティ検証

#### 📝 markdown-formatter.js (16KB)
```javascript
class MarkdownFormatter {
    formatList(tabs) { /* リスト形式 */ }
    formatTable(tabs) { /* テーブル形式 */ }
    formatGrouped(tabs) { /* グループ形式 */ }
}
```

**役割**: Markdown変換処理
**出力形式**: List, Table, Grouped, TabGroups
**特徴**: エスケープ処理、テンプレート機能

#### 📋 clipboard-manager.js (12KB)
```javascript
class ClipboardManager {
    async copyToClipboard(text) { /* クリップボード操作 */ }
    showCopyFeedback(message) { /* フィードバック表示 */ }
}
```

**役割**: クリップボード操作
**API使用**: Clipboard API
**特徴**: フォールバック機能、履歴管理

### 🔧 background/ ディレクトリ

#### ⚙️ service-worker.js (16KB)
```javascript
// インストール処理
chrome.runtime.onInstalled.addListener((details) => {
    initializeExtension();
    createContextMenus();
});

// コンテキストメニュー処理
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    await copyTabAsMarkdown(tab);
});
```

**役割**: バックグラウンド処理
**機能**: 
- 拡張機能初期化
- コンテキストメニュー管理
- 通知表示
- 統計情報更新

---

## 🔧 技術スタック

### フロントエンド
- **HTML5**: セマンティック構造
- **CSS3**: Modern CSS、Flexbox/Grid
- **JavaScript ES2022**: 最新構文使用
- **Chrome Extensions API**: Manifest V3

### 開発ツール
- **Node.js**: 開発環境
- **Jest**: テストフレームワーク
- **Babel**: ES6+トランスパイル
- **ESLint**: コード品質チェック

### 依存関係管理
```json
{
  "devDependencies": {
    "@babel/core": "^7.23.0",
    "jest": "^29.7.0",
    "eslint": "^8.57.0",
    "@types/chrome": "^0.0.246"
  }
}
```

---

## 📊 ファイルサイズ分析

| ファイル | サイズ | 圧縮率 | 最適化度 |
|----------|--------|--------|----------|
| popup.js | 24KB | - | 🟡 中 |
| tab-manager.js | 20KB | - | 🟡 中 |
| markdown-formatter.js | 16KB | - | ✅ 良 |
| service-worker.js | 16KB | - | ✅ 良 |
| clipboard-manager.js | 12KB | - | ✅ 良 |
| popup.css | 8KB | - | ✅ 良 |
| popup.html | 4KB | - | ✅ 良 |
| **合計** | **100KB** | **51.2%** | **🟡 改善余地** |

### アイコンファイル (4.3MB)
```
assets/icons/
├── icon-16.png   (5.3KB)
├── icon-32.png   (6.0KB)  
├── icon-48.png   (7.3KB)
├── icon-128.png  (18.7KB)
└── その他        (4.2MB) ⚠️ 最適化必要
```

---

## 🔄 データフロー

### 1. ユーザー操作フロー
```
ユーザークリック → popup.js → TabManager → Chrome Tabs API
                                    ↓
                            タブ情報取得・処理
                                    ↓
                            MarkdownFormatter
                                    ↓
                            ClipboardManager → クリップボード
```

### 2. バックグラウンド処理フロー
```
ブラウザ起動 → service-worker.js → 初期化処理
                    ↓
            コンテキストメニュー作成
                    ↓
            タブ変更監視 → 統計情報更新
```

### 3. キャッシュフロー
```
API呼び出し → キャッシュチェック → 
    ↓(miss)           ↓(hit)
Chrome API      キャッシュ返却
    ↓
結果キャッシュ保存 (30秒)
```

---

## 🧪 テスト構造

### ユニットテスト
- **tab-manager.test.js**: TabManagerクラスのテスト
- **clipboard-manager.test.js**: ClipboardManagerクラスのテスト  
- **markdown-formatter.test.js**: MarkdownFormatterクラスのテスト

### 統合テスト
- **popup-integration.test.js**: ポップアップUIの統合テスト
- **service-worker.test.js**: サービスワーカーのテスト

### テストカバレッジ
```
全体: 57.07% (目標: 75%)
├── ステートメント: 57.07%
├── ブランチ: 53.03%
├── 関数: 58.01%
└── ライン: 57.39%
```

---

## 🔧 ビルド・デプロイ構造

### NPM スクリプト
```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint popup/**/*.js background/**/*.js --fix",
    "build": "npm run test:ci && npm run lint"
  }
}
```

### ビルドプロセス
1. **テスト実行**: Jest による全テスト実行
2. **Lint チェック**: ESLint によるコード品質チェック
3. **ファイルコピー**: release/ ディレクトリに最適化済みファイルをコピー

### リリース構造
```
release/                    # 配布用ディレクトリ
├── manifest.json          # 本番用設定
├── popup/                 # 最適化済みUI
├── background/            # 最適化済みバックグラウンド
└── assets/               # 圧縮済みアセット
```

---

## 🔒 セキュリティ考慮事項

### 入力検証
- **URL検証**: `javascript:`等の危険なプロトコル除外
- **XSS対策**: 全HTMLエスケープ処理
- **CSP**: Content Security Policy設定推奨

### 権限管理
- **最小権限の原則**: 必要最小限の権限のみ要求
- **権限説明**: 各権限の用途を明確化

### データ保護
- **ローカルストレージ**: 機密情報の暗号化
- **キャッシュ**: 自動期限切れ設定

---

## 📈 改善提案

### 短期改善 (1-2週間)
1. **アイコン最適化**: 4.3MB → 500KB以下
2. **コード分割**: popup.js (24KB) → 複数ファイル
3. **TypeScript導入**: 型安全性向上

### 中期改善 (1ヶ月)
1. **テストカバレッジ向上**: 57% → 75%
2. **パフォーマンス最適化**: 1000タブ対応
3. **国際化対応**: 多言語サポート

### 長期改善 (3ヶ月)
1. **プラグインアーキテクチャ**: 拡張性向上
2. **クラウド同期**: 設定同期機能
3. **ダークテーマ**: 完全対応