# 📚 Tab Weaver - ドキュメントインデックス

## 🏠 プロジェクト概要

**Tab Weaver**は、Chrome拡張機能として開発されたタブ管理ツールです。開いているタブをMarkdown形式で整理・エクスポートし、生産性の向上を支援します。

---

## 📖 ドキュメント一覧

### 🚀 ユーザー向けドキュメント

#### 📋 [README.md](../README.md)
- **内容**: 機能紹介、インストール方法、使用方法
- **対象**: エンドユーザー、新規利用者
- **最終更新**: 2025-08-02

#### 📦 [PACKAGE-INFO.md](../PACKAGE-INFO.md)  
- **内容**: パッケージ詳細、ファイル構成、品質指標
- **対象**: インストール担当者、システム管理者
- **最終更新**: 2025-08-02

### 🔧 開発者向けドキュメント

#### 📘 [API.md](./API.md)
- **内容**: 詳細なAPI仕様、クラス構造、メソッドリファレンス
- **対象**: 開発者、コントリビューター
- **カバレッジ**: 全クラス・メソッド網羅

#### 🏗️ [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- **内容**: プロジェクト構造、技術スタック、アーキテクチャ
- **対象**: 新規開発者、アーキテクト
- **詳細度**: 高（ファイル単位まで説明）

#### 🛠️ [CLAUDE.md](../CLAUDE.md)
- **内容**: 開発ガイドライン、コード規約、品質基準
- **対象**: 開発チーム、AI開発支援
- **重要度**: 🔴 必読

---

## 🗺️ ナビゲーションガイド

### 初めて触る方

1. **[README.md](../README.md)** - まずはここから！機能と使い方を理解
2. **[PACKAGE-INFO.md](../PACKAGE-INFO.md)** - インストール・設定情報
3. **出力サンプル確認** - README内の出力例を確認

### 開発に参加したい方

1. **[CLAUDE.md](../CLAUDE.md)** - 開発原則とガイドライン
2. **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - 全体構造の理解
3. **[API.md](./API.md)** - コードレベルの詳細仕様
4. **`tests/` ディレクトリ** - テストコードで実装例を確認

### 機能を拡張したい方

1. **[API.md](./API.md)** - 既存クラスとメソッドの理解
2. **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - アーキテクチャ設計思想
3. **`popup/` ディレクトリ** - 実装パターンの参考

---

## 📊 プロジェクト統計

### コードベース
- **総ファイル数**: 20+ ファイル
- **コード行数**: 2,000+ 行
- **テストファイル数**: 5 ファイル
- **ドキュメント**: 6 ファイル

### 品質指標
- **テストカバレッジ**: 57.07% (目標: 75%)
- **ESLint警告**: 34件
- **セキュリティレベル**: B級（改善余地あり）

### ファイルサイズ
- **JS/CSS/HTML**: 100KB
- **アイコン**: 4.3MB ⚠️ 最適化必要
- **圧縮後パッケージ**: 60.9KB

---

## 🏷️ 技術タグ

### 主要技術
- `JavaScript ES2022`
- `Chrome Extensions API`
- `Manifest V3`
- `Vanilla CSS`

### 開発ツール
- `Jest` (テスト)
- `ESLint` (リント)
- `Babel` (トランスパイル)
- `npm` (パッケージ管理)

### 機能タグ
- `Tab Management`
- `Markdown Export`
- `Clipboard Operations`
- `Chrome Integration`

---

## 🔍 クイックリファレンス

### 主要クラス
- **TabManager**: タブ情報管理
- **MarkdownFormatter**: Markdown変換
- **ClipboardManager**: クリップボード操作
- **TabWeaverController**: UI制御

### 重要ファイル
- `manifest.json` - 拡張機能設定
- `popup/popup.js` - メインロジック
- `background/service-worker.js` - バックグラウンド処理

### 設定ファイル
- `package.json` - npm設定
- `.eslintrc` - リント設定（package.json内）
- `jest.config` - テスト設定（package.json内）

---

## 🚨 重要な注意事項

### セキュリティ
- HTMLインジェクション脆弱性あり ⚠️
- CSP未設定 ⚠️
- 詳細: [API.md](./API.md#セキュリティ機能)

### パフォーマンス
- アイコンファイルサイズ大 ⚠️
- 1000タブ以上で性能劣化可能性
- 詳細: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md#ファイルサイズ分析)

### ブラウザ対応
- Chrome/Edge/Opera/Brave対応
- Firefox: 未対応（Manifest V3制限）

---

## 📞 サポート・コントリビューション

### バグ報告
- **GitHub Issues**: 推奨
- **再現手順**: 詳細に記述

### 機能要望
- **GitHub Discussions**: 議論推奨
- **プルリクエスト**: 歓迎

### 開発参加
1. **Fork**: リポジトリをフォーク
2. **Branch**: 機能ブランチ作成
3. **Test**: テスト作成・実行
4. **PR**: プルリクエスト作成

---

## 📅 更新履歴

| 日付 | ドキュメント | 変更内容 |
|------|-------------|----------|
| 2025-08-02 | INDEX.md | 新規作成 |
| 2025-08-02 | API.md | 新規作成 |
| 2025-08-02 | PROJECT_STRUCTURE.md | 新規作成 |
| 2025-08-02 | README.md | 既存（レビュー済み） |
| 2025-08-02 | PACKAGE-INFO.md | 既存（レビュー済み） |

---

## 🔗 外部リンク

### Chrome拡張機能開発
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

### 使用技術
- [Jest Testing Framework](https://jestjs.io/)
- [ESLint Documentation](https://eslint.org/)
- [Markdown Specification](https://spec.commonmark.org/)

### コミュニティ
- [Chrome Extensions Community](https://groups.google.com/a/chromium.org/g/chromium-extensions)
- [Stack Overflow - Chrome Extensions](https://stackoverflow.com/questions/tagged/google-chrome-extension)

---

**ドキュメント作成日**: 2025-08-02  
**作成者**: Claude Code SuperClaude Framework  
**バージョン**: 1.0.0