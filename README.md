# 🕸️ Tab Weaver Chrome拡張機能

タブ情報を美しくMarkdown形式で整理するChrome拡張機能です。

## 📋 機能

- **タブリスト生成**: 現在開いているタブをMarkdown形式で表示
- **複数フォーマット対応**: List / Table / Grouped の3つの表示形式
- **スコープ選択**: 現在のウィンドウまたは全ウィンドウのタブを対象
- **ワンクリックコピー**: 生成されたMarkdownをクリップボードにコピー
- **リアルタイムプレビュー**: 設定変更時に即座にプレビューを更新
- **コンテキストメニュー**: 右クリックメニューからの直接操作

## 🚀 インストール方法

### 開発版のインストール

1. このリポジトリをクローンまたはダウンロード
```bash
git clone https://github.com/arimakouyou/tab-weaver.git
cd tab-weaver
```

2. Chromeを開き、`chrome://extensions/` にアクセス

3. 右上の「デベロッパーモード」を有効にする

4. 「パッケージ化されていない拡張機能を読み込む」をクリック

5. `tab-weaver` フォルダを選択

6. 拡張機能がインストールされ、ツールバーにアイコンが表示されます

## 📖 使用方法

### 基本操作

1. **拡張機能アイコンをクリック** してポップアップを開く
2. **Format**: 出力形式を選択（List / Table / Grouped）
3. **Scope**: 対象範囲を選択（Current Window / All Windows）
4. **プレビューエリア**: 生成されたMarkdownを確認
5. **Copyボタン**: クリップボードにコピー

### キーボードショートカット

- `Ctrl+C` / `Cmd+C`: コピー
- `Ctrl+R` / `Cmd+R`: リフレッシュ

### コンテキストメニュー

ページ上で右クリックして以下を選択：
- **現在のタブをMarkdownでコピー**: アクティブなタブのみをコピー
- **全てのタブをMarkdownでコピー**: 全ウィンドウのタブをコピー

## 📋 出力例

### List形式
```markdown
## 📋 開いているタブ (2024-07-31 15:30)

- [GitHub - Issues](https://github.com/user/repo/issues)
- [Stack Overflow - JavaScript](https://stackoverflow.com/questions/tagged/javascript)
- [MDN Web Docs - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

**統計情報:** 3 タブ | 🔒 3 セキュア | 🌐 3 ドメイン
```

### Table形式
```markdown
## 📋 開いているタブ (2024-07-31 15:30)

| Title | Domain | Status |
|-------|--------|--------|
| [GitHub - Issues](https://github.com/user/repo/issues) | `github.com` | ▶️ |
| [Stack Overflow - JavaScript](https://stackoverflow.com/questions/tagged/javascript) | `stackoverflow.com` | - |
| [MDN Web Docs - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) | `developer.mozilla.org` | 📌 |
```

### Grouped形式
```markdown
## 📋 開いているタブ (ドメイン別) (2024-07-31 15:30)

### 🐙 github.com (1)

- [GitHub - Issues](https://github.com/user/repo/issues) ▶️

### 📚 stackoverflow.com (1)

- [Stack Overflow - JavaScript](https://stackoverflow.com/questions/tagged/javascript)

### 🦎 developer.mozilla.org (1)

- [MDN Web Docs - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) 📌
```

## 🏗️ 技術仕様

### ファイル構成
```
Tab Weaver/
├── manifest.json          # 拡張機能設定
├── popup/
│   ├── popup.html         # ポップアップUI
│   ├── popup.css          # スタイル定義
│   ├── popup.js           # メインコントローラー
│   ├── tab-manager.js     # タブ管理クラス
│   ├── markdown-formatter.js # Markdown変換クラス
│   └── clipboard-manager.js  # クリップボード管理クラス
├── background/
│   └── service-worker.js  # バックグラウンド処理
└── assets/
    └── icons/             # アイコンファイル
```

### 主要クラス

- **TabManager**: Chrome Tabs APIを使用したタブ情報管理
- **MarkdownFormatter**: 3つの形式でのMarkdown変換
- **ClipboardManager**: クリップボード操作とフィードバック
- **TabWeaverController**: UI制御とイベント処理

### 使用API

- **Chrome Tabs API**: タブ情報の取得
- **Chrome Storage API**: 設定の保存
- **Chrome Context Menus API**: 右クリックメニュー
- **Chrome Notifications API**: 通知表示
- **Clipboard API**: クリップボード操作

## 🔧 開発者向け情報

### 開発環境

- Manifest V3対応
- 純粋なJavaScript/HTML/CSS（ビルドプロセス不要）
- Chrome Extensions API使用

### デバッグ方法

1. `chrome://extensions/` で拡張機能の詳細を表示
2. 「検証」をクリックしてDevToolsを開く
3. Service WorkerのログとPopupのログを確認

### 設定項目

拡張機能は以下の設定を`chrome.storage.local`に保存：
- フォーマット形式（list/table/grouped）
- スコープ設定（current/all）
- 通知設定
- 使用統計

## 📊 機能詳細

### セキュリティ機能

- Markdownインジェクション対策のエスケープ処理
- 最小権限の原則に基づく権限要求
- chrome:// URLの除外処理

### パフォーマンス最適化

- 30秒間のキャッシュ機能
- デバウンス処理による不要な処理の削減
- 効率的なDOM操作

### アクセシビリティ対応

- キーボードナビゲーション対応
- 適切なARIA属性の使用
- 色のみに依存しない情報表示

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License

## 🐛 既知の問題・制限事項

- Service Workerからのクリップボード操作は制限があるため、コンテキストメニューからのコピーは通知のみ
- 大量のタブ（1000+）がある場合、パフォーマンスが低下する可能性
- 一部のChrome内部ページ（chrome://）は除外される

## 📞 サポート

問題や要望がありましたら、GitHubのIssuesにてお知らせください。