# Tab Weaver Chrome拡張機能 - パッケージ情報

## 📦 パッケージ詳細

- **拡張機能名**: Tab Weaver
- **バージョン**: 1.0.0
- **パッケージファイル**: `Tab-Weaver-v1.0.0.zip`
- **作成日時**: 2025-08-02
- **パッケージサイズ**: 60.9 KB (圧縮後)
- **展開時サイズ**: 124.7 KB
- **圧縮率**: 51.2%

## 📋 含まれるファイル

### 必須ファイル
- `manifest.json` - 拡張機能設定ファイル (821 bytes)

### ポップアップUI
- `popup/popup.html` - ポップアップUIのHTML (2,338 bytes)
- `popup/popup.css` - ポップアップのスタイル (6,953 bytes)  
- `popup/popup.js` - メインポップアップロジック (23,206 bytes)

### コアモジュール
- `popup/tab-manager.js` - タブ管理機能 (19,293 bytes)
- `popup/clipboard-manager.js` - クリップボード管理 (9,019 bytes)
- `popup/markdown-formatter.js` - Markdown形式変換 (15,733 bytes)

### バックグラウンド処理
- `background/service-worker.js` - サービスワーカー (13,060 bytes)

### アイコン
- `assets/icons/icon-16.png` - 16x16アイコン (5,311 bytes)
- `assets/icons/icon-32.png` - 32x32アイコン (5,955 bytes)
- `assets/icons/icon-48.png` - 48x48アイコン (7,320 bytes)
- `assets/icons/icon-128.png` - 128x128アイコン (18,719 bytes)

## 🚀 インストール方法

### Chrome Web Store (推奨)
未公開

### 開発者モード (手動インストール)
1. Chrome を開く
2. `chrome://extensions/` にアクセス
3. 右上の「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `Tab-Weaver-v1.0.0.zip` を展開したフォルダを選択

## ✨ 主要機能

- **タブ一覧表示**: 現在開いているタブをMarkdown形式で表示
- **クリップボードコピー**: ワンクリックでタブ情報をコピー
- **複数の出力形式**: プレーンテキスト、Markdown、リンクリスト
- **タブフィルタ**: アクティブタブのみ表示オプション
- **統計情報**: タブ数などの統計表示
- **コンテキストメニュー**: 右クリックからの素早いアクセス

## 🔒 権限

- `tabs` - タブ情報の取得
- `tabGroups` - タブグループ情報の取得  
- `storage` - 設定の保存
- `contextMenus` - 右クリックメニューの追加
- `notifications` - 通知の表示
- `scripting` - コンテンツスクリプトの実行

## 📊 品質指標

- **テストカバレッジ**: 57.07% (目標: 75%)
- **ESLint警告**: 34件 (主にconsole文)
- **Manifest Version**: 3 (最新仕様準拠)
- **ブラウザ対応**: Chrome/Edge/Opera/Brave

## 📝 注意事項

- Service Worker統合テストに既知の問題があります
- 本番環境では console 文の整理が推奨されます
- 定期的なテストカバレッジ向上が必要です

## 🛠️ 開発情報

- **フレームワーク**: Vanilla JavaScript
- **テストフレームワーク**: Jest
- **リンター**: ESLint
- **ビルドツール**: npm scripts
- **最小Chrome バージョン**: 88+