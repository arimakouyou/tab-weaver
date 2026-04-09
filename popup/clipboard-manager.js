/**
 * ClipboardManager - クリップボード操作を管理するクラス
 */
class ClipboardManager {
    constructor() {
        this.lastCopiedText = null;
        this.copyHistory = [];
        this.maxHistorySize = 10;
    }

    /**
     * テキストをクリップボードにコピー
     * @param {string} text - コピーするテキスト
     * @param {Object} options - オプション設定
     * @returns {Promise<boolean>} コピー成功の可否
     */
    async copyToClipboard(text, options = {}) {
        const {
            showFeedback = true,
            addToHistory = true
        } = options;

        try {
            // Clipboard API が利用可能かチェック
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // フォールバック: 従来の方法
                await this.fallbackCopy(text);
            }

            // コピー履歴に追加
            if (addToHistory) {
                this.addToHistory(text);
            }

            this.lastCopiedText = text;

            // フィードバック表示
            if (showFeedback) {
                this.showCopyFeedback('コピーしました！', 'success');
            }

            return true;
        } catch (error) {
            console.error('Clipboard copy failed:', error);
            
            if (showFeedback) {
                this.showCopyFeedback('コピーに失敗しました', 'error');
            }
            
            return false;
        }
    }

    /**
     * フォールバック: execCommandを使用したコピー
     * @param {string} text - コピーするテキスト
     * @returns {Promise<void>}
     */
    async fallbackCopy(text) {
        return new Promise((resolve, reject) => {
            try {
                // 一時的なテキストエリアを作成
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (successful) {
                    resolve();
                } else {
                    reject(new Error('execCommand copy failed'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * コピー成功のフィードバックを表示
     * @param {string} message - 表示メッセージ
     * @param {string} type - フィードバックタイプ ('success' | 'error' | 'info')
     * @param {number} duration - 表示時間（ミリ秒）
     */
    showCopyFeedback(message, type = 'success', duration = 2000) {
        // 既存のフィードバック要素を削除
        const existingFeedback = document.getElementById('feedback');
        if (existingFeedback) {
            existingFeedback.classList.remove('show');
        }

        // フィードバック要素を取得または作成
        let feedbackElement = document.getElementById('feedback');
        if (!feedbackElement) {
            feedbackElement = document.createElement('div');
            feedbackElement.id = 'feedback';
            feedbackElement.className = 'feedback';
            document.body.appendChild(feedbackElement);
        }

        // タイプに応じてクラスを設定
        feedbackElement.className = `feedback ${type}`;
        feedbackElement.textContent = message;

        // 表示アニメーション
        setTimeout(() => {
            feedbackElement.classList.add('show');
        }, 10);

        // 自動的に非表示
        setTimeout(() => {
            feedbackElement.classList.remove('show');
        }, duration);
    }

    /**
     * クリップボードからテキストを読み取り
     * @returns {Promise<string|null>} クリップボードの内容
     */
    async readFromClipboard() {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                return text;
            } else {
                // Clipboard read not supported
                return null;
            }
        } catch (error) {
            console.error('Failed to read from clipboard:', error);
            return null;
        }
    }

    /**
     * コピー履歴に追加
     * @param {string} text - 追加するテキスト
     */
    addToHistory(text) {
        const entry = {
            text: text.substring(0, 200), // 履歴は最初の200文字のみ保存
            fullText: text,
            timestamp: Date.now(),
            id: this.generateId()
        };

        // 同じテキストが既に履歴にある場合は削除
        this.copyHistory = this.copyHistory.filter(item => item.text !== entry.text);

        // 先頭に追加
        this.copyHistory.unshift(entry);

        // 履歴サイズを制限
        if (this.copyHistory.length > this.maxHistorySize) {
            this.copyHistory = this.copyHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * コピー履歴を取得
     * @returns {Array} コピー履歴の配列
     */
    getCopyHistory() {
        return this.copyHistory.slice(); // コピーを返す
    }

    /**
     * コピー履歴をクリア
     */
    clearHistory() {
        this.copyHistory = [];
    }

    /**
     * 履歴から特定のエントリを削除
     * @param {string} id - 削除するエントリのID
     */
    removeFromHistory(id) {
        this.copyHistory = this.copyHistory.filter(item => item.id !== id);
    }

    /**
     * 最後にコピーしたテキストを取得
     * @returns {string|null} 最後にコピーしたテキスト
     */
    getLastCopied() {
        return this.lastCopiedText;
    }

    /**
     * ユニークIDを生成
     * @returns {string} ユニークID
     */
    generateId() {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const bytes = new Uint8Array(5);
            crypto.getRandomValues(bytes);
            return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').substring(0, 9);
        }
        return Math.floor(Math.random() * Math.pow(36, 9)).toString(36).padStart(9, '0');
    }

    /**
     * テキストの統計情報を取得
     * @param {string} text - 分析するテキスト
     * @returns {Object} 統計情報
     */
    getTextStats(text) {
        const lines = text.split('\n');
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const chars = text.length;
        const charsNoSpaces = text.replace(/\s/g, '').length;

        return {
            lines: lines.length,
            words: words.length,
            characters: chars,
            charactersNoSpaces: charsNoSpaces,
            estimatedReadTime: Math.ceil(words.length / 200) // 200 words per minute
        };
    }

    /**
     * テキストを特定形式でフォーマット
     * @param {string} text - フォーマットするテキスト
     * @param {string} format - フォーマット形式
     * @returns {string} フォーマット済みテキスト
     */
    formatText(text, format) {
        switch (format) {
            case 'plain':
                return text.replace(/[*_`~]/g, '');
            case 'html':
                return text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            case 'json':
                return JSON.stringify(text);
            case 'csv':
                return `"${text.replace(/"/g, '""')}"`;
            default:
                return text;
        }
    }

    /**
     * コピー処理の設定を管理
     * @param {Object} settings - 設定オブジェクト
     */
    updateSettings(settings) {
        if (settings.maxHistorySize !== undefined) {
            this.maxHistorySize = Math.max(1, Math.min(50, settings.maxHistorySize));
        }
    }

    /**
     * クリップボード権限の状態を確認
     * @returns {Promise<string>} 権限状態 ('granted' | 'denied' | 'prompt')
     */
    async checkClipboardPermission() {
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const permission = await navigator.permissions.query({ name: 'clipboard-write' });
                return permission.state;
            }
            return 'unknown';
        } catch (error) {
            // Clipboard permission check failed
            return 'unknown';
        }
    }
}

// エクスポート（モジュール環境の場合）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClipboardManager;
}