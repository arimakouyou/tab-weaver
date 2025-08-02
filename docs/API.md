# 📘 Tab Weaver - API仕様書

## 概要

Tab WeaverはChrome拡張機能として、タブ情報をMarkdown形式で整理・エクスポートする機能を提供します。このドキュメントでは、各クラスとメソッドの詳細な仕様を説明します。

## 📚 クラス一覧

### [TabManager](#tabmanager) 
タブ情報の管理と処理を担当するコアクラス

### [MarkdownFormatter](#markdownformatter)
Markdown形式でのデータ変換を担当するクラス

### [ClipboardManager](#clipboardmanager)
クリップボード操作とフィードバック表示を担当するクラス

### [TabWeaverController](#tabweavercontroller)
UI制御とイベント処理を担当するメインコントローラー

---

## TabManager

Chrome Tabs APIを使用してタブ情報の取得・管理・キャッシュ処理を行うクラス。

### コンストラクタ

```javascript
new TabManager(options = {})
```

#### パラメータ
- `options` (Object, optional) - 設定オプション
  - `cacheTimeout` (number) - キャッシュの有効期限（ミリ秒, デフォルト: 30000）

#### 例
```javascript
const tabManager = new TabManager({ 
    cacheTimeout: 60000 // 1分間キャッシュ
});
```

### メソッド

#### `getAllTabs()`

全ウィンドウのタブ情報を取得します。結果は30秒間キャッシュされます。

```javascript
async getAllTabs(): Promise<Array<TabInfo>>
```

**戻り値**
- `Promise<Array<TabInfo>>` - 処理済みタブ情報の配列

**例外**
- `Error` - Chrome APIエラー時にスロー

**使用例**
```javascript
try {
    const allTabs = await tabManager.getAllTabs();
    console.log(`Total tabs: ${allTabs.length}`);
} catch (error) {
    console.error('タブ取得エラー:', error);
}
```

#### `getCurrentWindowTabs()`

現在のウィンドウのタブ情報のみを取得します。

```javascript
async getCurrentWindowTabs(): Promise<Array<TabInfo>>
```

#### `processTabs(tabs)`

生タブデータを処理してクリーンアップ・セキュリティ検証を行います。

```javascript
processTabs(tabs: Array<chrome.tabs.Tab>): Array<TabInfo>
```

**パラメータ**
- `tabs` (Array<chrome.tabs.Tab>) - Chrome tabs APIからの生タブデータ

**戻り値**
- `Array<TabInfo>` - 処理済みタブ情報

**処理内容**
- URL検証とセキュリティフィルタリング
- Markdownエスケープ処理
- ドメイン抽出
- 優先度ソート（アクティブ→ピン留め→ID順）

#### `groupTabsByDomain(tabs)`

タブをドメイン別にグループ化します。

```javascript
groupTabsByDomain(tabs: Array<TabInfo>): Object<string, Array<TabInfo>>
```

#### `getTabStats(tabs)`

タブの統計情報を取得します。

```javascript
getTabStats(tabs: Array<TabInfo>): Object
```

**戻り値オブジェクト**
- `total` (number) - 総タブ数
- `pinned` (number) - ピン留めタブ数
- `secure` (number) - セキュアタブ数（HTTPS）
- `domains` (number) - ユニークドメイン数
- `duplicates` (number) - 重複タブ数
- `grouped` (number) - グループ化されたタブ数
- `groupCount` (number) - タブグループ数

### TabInfo型定義

```typescript
interface TabInfo {
    id: number;              // タブID
    title: string;           // タブタイトル（エスケープ済み）
    url: string;             // タブURL（サニタイズ済み）
    favIconUrl: string|null; // ファビコンURL
    active: boolean;         // アクティブかどうか
    pinned: boolean;         // ピン留めかどうか
    windowId: number;        // ウィンドウID
    domain: string;          // ドメイン名
    isSecure: boolean;       // HTTPSかどうか
    groupId: number|null;    // タブグループID
    timestamp: number;       // タイムスタンプ
}
```

---

## MarkdownFormatter

タブ情報を3つの形式でMarkdownに変換するクラス。

### メソッド

#### `formatList(tabs, options)`

リスト形式でMarkdownを生成します。

```javascript
formatList(tabs: Array<TabInfo>, options: Object): string
```

**パラメータ**
- `tabs` (Array<TabInfo>) - タブ情報の配列
- `options` (Object) - フォーマットオプション
  - `showStats` (boolean) - 統計情報を表示するか
  - `showTimestamp` (boolean) - タイムスタンプを表示するか

**出力例**
```markdown
## 📋 開いているタブ (2024-07-31 15:30)

- [GitHub - Issues](https://github.com/user/repo/issues) ▶️
- [Stack Overflow](https://stackoverflow.com/questions) 📌

**統計情報:** 2 タブ | 🔒 2 セキュア | 🌐 2 ドメイン
```

#### `formatTable(tabs, options)`

テーブル形式でMarkdownを生成します。

```javascript
formatTable(tabs: Array<TabInfo>, options: Object): string
```

#### `formatGrouped(tabs, options)`

ドメイン別グループ形式でMarkdownを生成します。

```javascript
formatGrouped(tabs: Array<TabInfo>, options: Object): string
```

#### `formatTabGroups(groupedTabs, options)`

タブグループ別形式でMarkdownを生成します。

```javascript
formatTabGroups(groupedTabs: Object, options: Object): string
```

---

## ClipboardManager

クリップボード操作とフィードバック表示を管理するクラス。

### メソッド

#### `copyToClipboard(text, options)`

テキストをクリップボードにコピーします。

```javascript
async copyToClipboard(text: string, options: Object): Promise<boolean>
```

**パラメータ**
- `text` (string) - コピーするテキスト
- `options` (Object, optional) - オプション設定
  - `showFeedback` (boolean, デフォルト: true) - フィードバック表示の有無
  - `addToHistory` (boolean, デフォルト: true) - 履歴追加の有無

**戻り値**
- `Promise<boolean>` - コピー成功の可否

#### `showCopyFeedback(message, type, duration)`

コピー成功のフィードバックを表示します。

```javascript
showCopyFeedback(message: string, type: string = 'success', duration: number = 2000): void
```

**パラメータ**
- `message` (string) - 表示メッセージ
- `type` (string) - フィードバックタイプ ('success' | 'error' | 'info')
- `duration` (number) - 表示時間（ミリ秒）

#### `getTextStats(text)`

テキストの統計情報を取得します。

```javascript
getTextStats(text: string): Object
```

**戻り値オブジェクト**
- `lines` (number) - 行数
- `words` (number) - 単語数
- `characters` (number) - 文字数
- `charactersNoSpaces` (number) - スペース除外文字数
- `estimatedReadTime` (number) - 推定読書時間（分）

---

## 🔧 設定とカスタマイズ

### キャッシュ設定

```javascript
// キャッシュ無効
const tabManager = new TabManager({ cacheTimeout: 0 });

// 長期キャッシュ（5分）
const tabManager = new TabManager({ cacheTimeout: 300000 });
```

### フォーマットオプション

```javascript
const options = {
    showStats: true,        // 統計情報表示
    showTimestamp: true,    // タイムスタンプ表示
    groupByDomain: false,   // ドメイン別グループ化
    showFavicons: true,     // ファビコン表示
    maxTitleLength: 60      // タイトル最大長
};
```

### セキュリティ機能

- **XSS対策**: 全てのテキストでHTMLエスケープ処理
- **URL検証**: `javascript:`等の危険なプロトコルを除外
- **入力サニタイズ**: ユーザー入力の検証とクリーンアップ
- **最小権限**: 必要最小限のChrome API権限のみ要求

### エラーハンドリング

全てのメソッドは適切なエラーハンドリングを実装しており、以下の戦略を採用：

- **リトライ機能**: API呼び出し失敗時の自動リトライ（最大3回）
- **グレースフルデグラデーション**: 一部機能が失敗しても他の機能は継続
- **詳細なエラーメッセージ**: 開発者向けの詳細なエラー情報
- **ユーザーフレンドリーなメッセージ**: エンドユーザー向けの分かりやすいエラー表示

## 📊 パフォーマンス仕様

- **キャッシュ**: 30秒間のインメモリキャッシュ
- **処理速度**: 1000タブ以下では1秒以内に処理完了
- **メモリ使用量**: 通常時50MB以下
- **API呼び出し制限**: Chrome API制限に準拠

## 🧪 テスト

各クラスはJestを使用したユニットテストでカバーされています：

```bash
npm test                # 全テスト実行
npm run test:coverage   # カバレッジレポート生成
npm run test:watch      # ウォッチモード
```

現在のテストカバレッジ: **57.07%** (目標: 75%)