/**
 * Tab Weaver Chrome Extension - Main Popup Controller
 * ポップアップUIの制御とタブ情報の管理を行うメインスクリプト
 */

/* global TabManager, MarkdownFormatter, ClipboardManager */

// クラスを読み込み（HTMLでスクリプトタグとして読み込まれる想定）
// <script src="tab-manager.js"></script>
// <script src="markdown-formatter.js"></script>
// <script src="clipboard-manager.js"></script>

class TabWeaverController {
    constructor() {
        this.tabManager = new TabManager();
        this.markdownFormatter = new MarkdownFormatter();
        this.clipboardManager = new ClipboardManager();
        
        this.currentTabs = [];
        this.currentFormat = 'list';
        this.currentScope = 'current';
        this.isLoading = false;
        this.initializationPromise = null;
        
        // デバウンス用タイマー
        this.previewUpdateTimer = null;
        this.settingsSaveTimer = null;
        
        // パフォーマンス監視
        this.performanceMetrics = {
            tabLoadTime: 0,
            previewRenderTime: 0,
            copyTime: 0
        };
        
        this.initialize();
    }

    /**
     * 非同期初期化
     */
    async initialize() {
        try {
            this.initializationPromise = this.performInitialization();
            await this.initializationPromise;
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError('初期化に失敗しました');
        }
    }

    /**
     * 初期化処理の実行
     */
    async performInitialization() {
        await this.loadSettings();
        this.initializeUI();
        this.bindEvents();
        await this.loadInitialData();
    }

    /**
     * UI要素の初期化（安全なDOM要素取得）
     */
    initializeUI() {
        const elementIds = [
            'format-select', 'scope-select', 'preview-content',
            'tab-count', 'copy-btn', 'refresh-btn', 'feedback'
        ];
        
        this.elements = {};
        const missingElements = [];
        
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.elements[this.toCamelCase(id)] = element;
            } else {
                missingElements.push(id);
            }
        });
        
        if (missingElements.length > 0) {
            throw new Error(`Missing DOM elements: ${missingElements.join(', ')}`);
        }

        // 初期状態の設定
        this.elements.formatSelect.value = this.currentFormat;
        this.elements.scopeSelect.value = this.currentScope;
        
        // アクセシビリティ属性の設定
        this.setupAccessibility();
    }

    /**
     * ケバブケースをキャメルケースに変換
     */
    toCamelCase(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }

    /**
     * アクセシビリティ機能の設定
     */
    setupAccessibility() {
        // ARIA属性の設定
        this.elements.formatSelect.setAttribute('aria-label', 'Markdown出力形式を選択');
        this.elements.scopeSelect.setAttribute('aria-label', 'タブの対象範囲を選択');
        this.elements.copyBtn.setAttribute('aria-label', 'Markdownをクリップボードにコピー');
        this.elements.refreshBtn.setAttribute('aria-label', 'タブデータを更新');
        this.elements.previewContent.setAttribute('aria-label', 'Markdownプレビュー');
        this.elements.previewContent.setAttribute('role', 'textbox');
        this.elements.previewContent.setAttribute('aria-readonly', 'true');
        
        // タブインデックスの設定
        this.elements.previewContent.setAttribute('tabindex', '0');
    }

    /**
     * イベントリスナーの設定
     */
    bindEvents() {
        // フォーマット変更（デバウンス付き）
        this.elements.formatSelect.addEventListener('change', (e) => {
            this.currentFormat = e.target.value;
            this.updatePreview();
            this.debouncedSaveSettings();
        });

        // スコープ変更
        this.elements.scopeSelect.addEventListener('change', (e) => {
            this.currentScope = e.target.value;
            this.loadTabData();
            this.debouncedSaveSettings();
        });

        // コピーボタン
        this.elements.copyBtn.addEventListener('click', () => {
            this.copyToClipboard();
        });

        // リフレッシュボタン
        this.elements.refreshBtn.addEventListener('click', () => {
            this.refreshTabData();
        });

        // キーボードショートカット（改善版）
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // フォーカス管理
        this.elements.previewContent.addEventListener('keydown', this.handlePreviewKeyDown.bind(this));
        
        // ウィンドウのフォーカス変更時の自動更新
        window.addEventListener('focus', this.handleWindowFocus.bind(this));
    }

    /**
     * キーボードイベントのハンドリング
     */
    handleKeyDown(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'c':
                    e.preventDefault();
                    this.copyToClipboard();
                    break;
                case 'r':
                    e.preventDefault();
                    this.refreshTabData();
                    break;
                case '1':
                case '2':
                case '3':
                    e.preventDefault();
                    this.setFormatByIndex(parseInt(e.key) - 1);
                    break;
            }
        } else if (e.key === 'Escape') {
            window.close();
        }
    }

    /**
     * プレビューエリアのキーボードイベント
     */
    handlePreviewKeyDown(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                this.elements.scopeSelect.focus();
            } else {
                this.elements.copyBtn.focus();
            }
        }
    }

    /**
     * ウィンドウフォーカス時の処理
     */
    handleWindowFocus() {
        // フォーカス時に自動更新（オプション）
        if (!this.isLoading) {
            this.refreshTabData();
        }
    }

    /**
     * インデックスによるフォーマット設定
     */
    setFormatByIndex(index) {
        const formats = ['list', 'table', 'grouped', 'tab-groups'];
        if (index >= 0 && index < formats.length) {
            this.currentFormat = formats[index];
            this.elements.formatSelect.value = this.currentFormat;
            this.updatePreview();
            this.debouncedSaveSettings();
        }
    }

    /**
     * デバウンス付き設定保存
     */
    debouncedSaveSettings() {
        if (this.settingsSaveTimer) {
            clearTimeout(this.settingsSaveTimer);
        }
        
        this.settingsSaveTimer = setTimeout(() => {
            this.saveSettings();
        }, 500);
    }

    /**
     * 初期データの読み込み
     */
    async loadInitialData() {
        await this.loadTabData();
    }

    /**
     * タブデータの読み込み（タイムアウト付き）
     */
    async loadTabData() {
        if (this.isLoading) return;

        const startTime = performance.now();
        const timeout = 10000; // 10秒
        
        try {
            this.setLoadingState(true);
            
            // タイムアウト付きでタブデータを取得
            const tabDataPromise = this.currentScope === 'current' 
                ? this.tabManager.getCurrentWindowTabs()
                : this.tabManager.getAllTabs();
                
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('タブデータの読み込み時間が上限を超えました')), timeout);
            });
            
            const tabs = await Promise.race([tabDataPromise, timeoutPromise]);
            
            if (!Array.isArray(tabs)) {
                throw new Error('無効なタブデータが返されました');
            }

            this.currentTabs = tabs;
            this.updateTabCount();
            this.updatePreview();
            
            // パフォーマンス測定
            this.performanceMetrics.tabLoadTime = performance.now() - startTime;
            this.recordUsage('load_tabs');
            
        } catch (error) {
            console.error('Error loading tab data:', error);
            
            // エラーの種類に応じた詳細メッセージ
            let errorMessage = 'タブデータの読み込みに失敗しました';
            if (error.message.includes('時間が上限')) {
                errorMessage = 'タブデータの読み込みがタイムアウトしました';
            } else if (error.message.includes('Chrome')) {
                errorMessage = 'Chrome拡張機能の権限エラーが発生しました';
            }
            
            this.showError(errorMessage);
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * タブデータの更新（キャッシュクリア付き）
     */
    async refreshTabData() {
        this.tabManager.clearCache();
        await this.loadTabData();
        this.clipboardManager.showCopyFeedback('データを更新しました', 'info', 1500);
    }

    /**
     * プレビューの更新（デバウンス付き）
     */
    updatePreview() {
        if (this.previewUpdateTimer) {
            clearTimeout(this.previewUpdateTimer);
        }
        
        this.previewUpdateTimer = setTimeout(() => {
            this.performPreviewUpdate();
        }, 100);
    }

    /**
     * プレビュー更新の実行
     */
    async performPreviewUpdate() {
        if (!this.currentTabs) return;

        const startTime = performance.now();
        
        try {
            let markdown = '';
            const options = {
                includeHeader: true,
                includeStats: true,
                includeTimestamp: true
            };

            const formatters = {
                list: () => this.markdownFormatter.formatAsList(this.currentTabs, options),
                table: () => this.markdownFormatter.formatAsTable(this.currentTabs, options),
                grouped: () => this.markdownFormatter.formatAsGrouped(this.currentTabs, options),
                'tab-groups': async () => {
                    try {
                        const groupedTabs = await this.tabManager.groupTabsByTabGroups(this.currentTabs);
                        return this.markdownFormatter.formatAsTabGroups(groupedTabs, options);
                    } catch (error) {
                        console.error('Error grouping by tab groups:', error);
                        // フォールバックとして通常のリスト形式を使用
                        return this.markdownFormatter.formatAsList(this.currentTabs, options);
                    }
                }
            };

            const formatter = formatters[this.currentFormat] || formatters.list;
            markdown = await (typeof formatter === 'function' ? formatter() : formatter);

            // DOM更新の最適化
            if (this.elements.previewContent.textContent !== markdown) {
                this.elements.previewContent.textContent = markdown;
                this.elements.previewContent.scrollTop = 0;
                
                // 統計情報の更新
                this.updateContentStats(markdown);
            }
            
            // パフォーマンス測定
            this.performanceMetrics.previewRenderTime = performance.now() - startTime;
            
        } catch (error) {
            console.error('Error updating preview:', error);
            this.showError('プレビューの更新に失敗しました');
        }
    }

    /**
     * コンテンツ統計情報の更新
     */
    updateContentStats(content) {
        this.clipboardManager.getTextStats(content);
        // Content statistics generated
    }

    /**
     * タブ数の更新
     */
    updateTabCount() {
        const count = this.currentTabs ? this.currentTabs.length : 0;
        const label = count === 1 ? 'tab' : 'tabs';
        this.elements.tabCount.textContent = `${count} ${label}`;
    }

    /**
     * クリップボードにコピー（改善版）
     */
    async copyToClipboard() {
        const startTime = performance.now();
        
        // 事前チェック
        if (!this.currentTabs || this.currentTabs.length === 0) {
            this.clipboardManager.showCopyFeedback('コピーするタブがありません', 'error');
            this.recordUsage('copy_failed_no_tabs');
            return;
        }

        const content = this.elements.previewContent.textContent;
        if (!content || content.trim() === '') {
            this.clipboardManager.showCopyFeedback('コピーする内容がありません', 'error');
            this.recordUsage('copy_failed_no_content');
            return;
        }

        try {
            // ボタンの一時的な無効化
            this.elements.copyBtn.disabled = true;
            this.elements.copyBtn.textContent = 'コピー中...';
            
            const success = await this.clipboardManager.copyToClipboard(content, {
                showFeedback: true,
                addToHistory: true,
                preserveFormatting: true
            });

            if (success) {
                // 統計情報の記録
                this.clipboardManager.getTextStats(content);
                this.performanceMetrics.copyTime = performance.now() - startTime;
                
                // Copy operation completed successfully
                
                this.recordUsage('copy_success');
                
                // フォーカスをコピーボタンに戻す
                this.elements.copyBtn.focus();
            } else {
                this.recordUsage('copy_failed_api');
            }

        } catch (error) {
            console.error('Copy error:', error);
            this.clipboardManager.showCopyFeedback('コピーに失敗しました', 'error');
            this.recordUsage('copy_failed_error');
        } finally {
            // ボタンの復元
            this.elements.copyBtn.disabled = false;
            this.elements.copyBtn.textContent = '📋 Copy';
        }
    }

    /**
     * ローディング状態の設定
     * @param {boolean} loading - ローディング状態
     */
    setLoadingState(loading) {
        this.isLoading = loading;
        
        if (loading) {
            this.elements.previewContent.innerHTML = '<div class="loading">Loading tabs...</div>';
            this.elements.copyBtn.disabled = true;
            this.elements.refreshBtn.disabled = true;
        } else {
            this.elements.copyBtn.disabled = false;
            this.elements.refreshBtn.disabled = false;
        }
    }

    /**
     * エラー表示（改善版）
     * @param {string} message - エラーメッセージ
     * @param {string} details - エラー詳細（オプション）
     */
    showError(message, details = '') {
        const errorElement = document.createElement('div');
        errorElement.className = 'error';
        errorElement.innerHTML = `
            <div class="error-icon">❌</div>
            <div class="error-message">${message}</div>
            ${details ? `<div class="error-details">${details}</div>` : ''}
            <button class="error-retry" onclick="window.tabWeaverController.refreshTabData()">
                🔄 再試行
            </button>
        `;
        
        // ARIA属性の設定
        errorElement.setAttribute('role', 'alert');
        errorElement.setAttribute('aria-live', 'polite');
        
        this.elements.previewContent.innerHTML = '';
        this.elements.previewContent.appendChild(errorElement);
        
        console.error('TabList Error:', { message, details });
        this.recordUsage('error_shown');
    }

    /**
     * 設定の保存（改善版）
     */
    async saveSettings() {
        const settings = {
            format: this.currentFormat,
            scope: this.currentScope,
            lastUsed: Date.now(),
            version: chrome.runtime.getManifest().version
        };

        try {
            await Promise.race([
                chrome.storage.local.set({ tabListSettings: settings }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Settings save timeout')), 3000)
                )
            ]);
            
            // Settings saved
        } catch (error) {
            // Settings save failed
        }
    }

    /**
     * 設定の読み込み（改善版）
     */
    async loadSettings() {
        try {
            const result = await Promise.race([
                chrome.storage.local.get(['tabListSettings']),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Settings load timeout')), 5000)
                )
            ]);
            
            const settings = result.tabListSettings;

            if (settings && typeof settings === 'object') {
                // 設定値のバリデーション
                const validFormats = ['list', 'table', 'grouped', 'tab-groups'];
                const validScopes = ['current', 'all'];
                
                this.currentFormat = validFormats.includes(settings.format) 
                    ? settings.format : 'list';
                this.currentScope = validScopes.includes(settings.scope) 
                    ? settings.scope : 'current';
                
                // Settings loaded successfully
            } else {
                // Using default settings
            }
        } catch (error) {
            // Settings load failed
            // デフォルト値を使用
            this.currentFormat = 'list';
            this.currentScope = 'current';
        }
    }

    /**
     * 使用統計の記録
     */
    recordUsage(action) {
        try {
            const usage = {
                action,
                format: this.currentFormat,
                scope: this.currentScope,
                tabCount: this.currentTabs ? this.currentTabs.length : 0,
                timestamp: Date.now()
            };

            // 簡単な使用統計をローカルストレージに記録
            chrome.storage.local.get(['tabListUsage'], (result) => {
                const currentUsage = result.tabListUsage || [];
                currentUsage.push(usage);
                
                // 最新100件のみ保持
                const recentUsage = currentUsage.slice(-100);
                chrome.storage.local.set({ tabListUsage: recentUsage });
            });

        } catch (error) {
            // Usage recording failed
        }
    }

    /**
     * デバッグ情報の取得
     */
    getDebugInfo() {
        return {
            version: chrome.runtime.getManifest().version,
            currentTabs: this.currentTabs?.length || 0,
            format: this.currentFormat,
            scope: this.currentScope,
            isLoading: this.isLoading,
            cacheSize: this.tabManager.cache.size,
            historySize: this.clipboardManager.getCopyHistory().length
        };
    }
}

// DOM読み込み完了後に初期化（改善版）
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 初期化の開始ログ
        // Initializing Tab Weaver Controller
        
        window.tabWeaverController = new TabWeaverController();
        
        // 初期化完了の待機
        if (window.tabWeaverController.initializationPromise) {
            await window.tabWeaverController.initializationPromise;
        }
        
        // Tab Weaver Controller initialized
        
    } catch (error) {
        console.error('Failed to initialize Tab Weaver Controller:', error);
        
        // 詳細なエラー情報の表示
        const previewContent = document.getElementById('preview-content');
        if (previewContent) {
            const errorDetails = error.message || '不明なエラー';
            previewContent.innerHTML = `
                <div class="error" role="alert">
                    <div class="error-icon">❌</div>
                    <div class="error-message">初期化に失敗しました</div>
                    <div class="error-details">${errorDetails}</div>
                    <button onclick="window.location.reload()" class="error-retry">
                        🔄 リロード
                    </button>
                </div>
            `;
        }
        
        // エラー報告
        if (chrome && chrome.runtime) {
            chrome.runtime.sendMessage({
                action: 'reportError',
                error: error.message,
                stack: error.stack
            }).catch(() => {});
        }
    }
});

// グローバルエラーハンドラー（改善版）
window.addEventListener('error', (event) => {
    console.error('Tab Weaver Global Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
    
    // ユーザーへの通知
    if (window.tabWeaverController && window.tabWeaverController.clipboardManager) {
        window.tabWeaverController.clipboardManager.showCopyFeedback(
            '予期しないエラーが発生しました', 'error', 3000
        );
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Tab Weaver Unhandled Promise Rejection:', {
        reason: event.reason,
        promise: event.promise
    });
    
    // Promise拒否のデフォルト処理を防ぐ
    event.preventDefault();
    
    // ユーザーへの通知
    if (window.tabWeaverController && window.tabWeaverController.clipboardManager) {
        window.tabWeaverController.clipboardManager.showCopyFeedback(
            '非同期処理でエラーが発生しました', 'error', 3000
        );
    }
});

// パフォーマンス監視
if ('performance' in window && 'observe' in window.performance) {
    const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
            if (entry.duration > 100) { // 100ms以上の処理を監視
                console.warn(`Slow operation detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
            }
        });
    });
    
    try {
        observer.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (e) {
        console.warn('Performance observer not supported:', e);
    }
}