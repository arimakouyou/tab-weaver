/**
 * TabManager - Chrome Tabs APIを使用してタブ情報を管理するクラス
 * 
 * 主な機能:
 * - タブ情報の取得とキャッシュ管理
 * - タブのフィルタリングとソート
 * - Markdown対応のテキストクリーニング
 * - 統計情報の生成
 * 
 * @class TabManager
 * @version 1.0.0
 * @author TabList Extension
 */
class TabManager {
    /**
     * TabManagerのコンストラクタ
     * 
     * @constructor
     * @param {Object} options - オプション設定
     * @param {number} options.cacheTimeout - キャッシュの有効期限（ミリ秒）
     */
    constructor(options = {}) {
        /** @type {Map<string, {data: any, timestamp: number}>} キャッシュストレージ */
        this.cache = new Map();
        
        /** @type {number} キャッシュの有効期限（30秒） */
        this.cacheTimeout = options.cacheTimeout || 30000;
        
        /** @type {Set<string>} 除外するURLパターン */
        this.excludePatterns = new Set([
            'chrome://', 'chrome-extension://', 'moz-extension://',
            'edge://', 'opera://', 'about:', 'data:'
        ]);
    }

    /**
     * 全ウィンドウのタブを取得
     * 
     * Chrome Tabs APIを使用して、全てのウィンドウのタブ情報を取得します。
     * 結果は30秒間キャッシュされます。
     * 
     * @async
     * @method getAllTabs
     * @returns {Promise<Array<TabInfo>>} 処理済みタブ情報の配列
     * @throws {Error} Chrome APIエラー時にスロー
     * 
     * @example
     * const tabManager = new TabManager();
     * const allTabs = await tabManager.getAllTabs();
     * console.log(`Total tabs: ${allTabs.length}`);
     */
    async getAllTabs() {
        try {
            const cacheKey = 'all-tabs';
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const tabs = await chrome.tabs.query({});
            const processedTabs = this.processTabs(tabs);
            
            this.setCache(cacheKey, processedTabs);
            return processedTabs;
        } catch (error) {
            console.error('Error getting all tabs:', error);
            // セキュリティ: エラー情報のサニタイズ
            const sanitizedError = this.sanitizeError(error);
            throw new Error(`タブ情報の取得に失敗しました: ${sanitizedError}`);
        }
    }

    /**
     * 現在のウィンドウのタブを取得
     * @returns {Promise<Array>} タブ情報の配列
     */
    async getCurrentWindowTabs() {
        try {
            const cacheKey = 'current-window-tabs';
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const tabs = await chrome.tabs.query({ currentWindow: true });
            const processedTabs = this.processTabs(tabs);
            
            this.setCache(cacheKey, processedTabs);
            return processedTabs;
        } catch (error) {
            console.error('Error getting current window tabs:', error);
            const sanitizedError = this.sanitizeError(error);
            throw new Error(`現在のウィンドウのタブ情報取得に失敗しました: ${sanitizedError}`);
        }
    }

    /**
     * タブ情報を処理してクリーンアップ
     * 
     * セキュリティとパフォーマンスを考慮したタブデータの加工を行います。
     * 
     * @method processTabs
     * @param {Array<chrome.tabs.Tab>} tabs - Chrome tabs API からの生タブデータ
     * @returns {Array<TabInfo>} 処理済みタブ情報
     * @throws {Error} タブデータが無効な場合
     */
    processTabs(tabs) {
        if (!Array.isArray(tabs)) {
            throw new Error('無効なタブデータが渡されました');
        }

        const processedTabs = tabs
            .filter(tab => this.isValidTab(tab))
            .map(tab => this.createTabInfo(tab))
            .sort(this.compareTabsPriority.bind(this));

        // セキュリティ検証
        this.validateProcessedTabs(processedTabs);

        return processedTabs;
    }

    /**
     * タブが有効かどうかをチェック
     * @param {chrome.tabs.Tab} tab - チェックするタブ
     * @returns {boolean} 有効かどうか
     */
    isValidTab(tab) {
        if (!tab || !tab.url) return false;
        
        // セキュリティ: 内部URLやプロトコルを除外
        for (const pattern of this.excludePatterns) {
            if (tab.url.startsWith(pattern)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * タブ情報オブジェクトを作成
     * @param {chrome.tabs.Tab} tab - 元のタブデータ
     * @returns {TabInfo} 処理済みタブ情報
     */
    createTabInfo(tab) {
        return {
            id: this.sanitizeId(tab.id),
            title: this.cleanTitle(tab.title),
            url: this.sanitizeUrl(tab.url),
            favIconUrl: tab.favIconUrl || null,
            active: Boolean(tab.active),
            pinned: Boolean(tab.pinned),
            windowId: this.sanitizeId(tab.windowId),
            domain: this.extractDomain(tab.url),
            isSecure: this.isSecureUrl(tab.url),
            groupId: tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE ? tab.groupId : null,
            timestamp: Date.now()
        };
    }

    /**
     * タブの優先度で比較
     * @param {TabInfo} a - タブA
     * @param {TabInfo} b - タブB
     * @returns {number} 比較結果
     */
    compareTabsPriority(a, b) {
        // アクティブタブを最初に
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        
        // ピン留めタブを次に
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        
        // IDでソート
        return a.id - b.id;
    }

    /**
     * 処理済みタブデータの検証
     * @param {Array<TabInfo>} tabs - 検証するタブデータ
     */
    validateProcessedTabs(tabs) {
        tabs.forEach((tab) => {
            if (!tab.id || !tab.title || !tab.url) {
                // Invalid tab data detected
            }
        });
    }

    /**
     * タブタイトルをクリーンアップ
     * 
     * XSS対策とMarkdownエスケープを行います。
     * 
     * @method cleanTitle
     * @param {string} title - 元のタイトル
     * @returns {string} クリーンアップされたタイトル
     */
    cleanTitle(title) {
        if (!title || typeof title !== 'string') {
            return 'Untitled';
        }
        
        // XSS対策: HTMLタグを除去
        let cleanTitle = title.replace(/<[^>]*>/g, '').trim();
        
        // 長さ制限（パフォーマンスと可読性のため）
        const maxLength = 60;
        if (cleanTitle.length > maxLength) {
            cleanTitle = cleanTitle.substring(0, maxLength - 3) + '...';
        }
        
        // Markdownエスケープ処理
        return this.escapeMarkdown(cleanTitle);
    }

    /**
     * Markdown特殊文字のエスケープ
     * Markdownリンクのタイトル部分では、ほとんどの文字はエスケープ不要
     * @param {string} text - エスケープするテキスト
     * @returns {string} エスケープ済みテキスト
     */
    escapeMarkdown(text) {
        // Markdown特殊文字をエスケープ
        return text
            .replace(/\\/g, '\\\\')  // バックスラッシュ
            .replace(/\*/g, '\\*')   // アスタリスク
            .replace(/_/g, '\\_')    // アンダースコア
            .replace(/\[/g, '\\[')   // 左角括弧
            .replace(/\]/g, '\\]')   // 右角括弧
            .replace(/\(/g, '\\(')   // 左丸括弧
            .replace(/\)/g, '\\)')   // 右丸括弧
            .replace(/-/g, '\\-')    // ハイフン
            .replace(/\+/g, '\\+')   // プラス
            .replace(/\./g, '\\.')   // ドット
            .replace(/!/g, '\\!')    // エクスクラメーション
            .replace(/#/g, '\\#')    // ハッシュ
            .replace(/`/g, '\\`')    // バッククォート
            .replace(/>/g, '\\>')    // 大なり
            .replace(/</g, '\\<')    // 小なり
            .replace(/\|/g, '\\|');  // パイプ
    }

    /**
     * URLからドメイン名を抽出
     * 
     * セキュアにURLをパースし、ドメイン名を取得します。
     * 
     * @method extractDomain
     * @param {string} url - 解析するURL
     * @returns {string} ドメイン名（www.プレフィックスは除去）
     */
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            // www.プレフィックスを除去
            const domain = hostname.replace(/^www\./, '');
            
            // ドメイン名の検証
            if (!this.isValidDomain(domain)) {
                return 'invalid-domain';
            }
            
            return domain;
        } catch (error) {
            // Domain extraction failed
            return 'unknown';
        }
    }

    /**
     * ドメイン名の有効性をチェック
     * @param {string} domain - チェックするドメイン名
     * @returns {boolean} 有効なドメインかどうか
     */
    isValidDomain(domain) {
        if (!domain || typeof domain !== 'string') return false;
        if (domain.length > 253) return false; // RFC制限
        
        // 基本的なドメインパターンのチェック
        const domainPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
        return domainPattern.test(domain);
    }

    /**
     * 全てのタブグループ情報を取得
     * 
     * @async
     * @method getAllTabGroups
     * @returns {Promise<Array<chrome.tabGroups.TabGroup>>} タブグループ情報の配列
     */
    async getAllTabGroups() {
        try {
            const cacheKey = 'all-tab-groups';
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const tabGroups = await chrome.tabGroups.query({});
            this.setCache(cacheKey, tabGroups);
            return tabGroups;
        } catch (error) {
            console.error('Error getting tab groups:', error);
            const sanitizedError = this.sanitizeError(error);
            throw new Error(`タブグループ情報の取得に失敗しました: ${sanitizedError}`);
        }
    }

    /**
     * タブをタブグループ別にグループ化
     * 
     * @async
     * @method groupTabsByTabGroups
     * @param {Array<TabInfo>} tabs - グループ化するタブ情報の配列
     * @returns {Promise<Object>} タブグループ別にグループ化されたタブ
     */
    async groupTabsByTabGroups(tabs) {
        if (!Array.isArray(tabs)) {
            throw new Error('無効なタブデータが渡されました');
        }

        try {
            const tabGroups = await this.getAllTabGroups();
            const groupMap = new Map();
            
            // タブグループの情報を準備
            tabGroups.forEach(group => {
                groupMap.set(group.id, {
                    group,
                    tabs: []
                });
            });

            // グループに属さないタブ用のカテゴリ
            const ungroupedTabs = [];

            // タブを適切なグループに振り分け
            tabs.forEach(tab => {
                if (tab.groupId && groupMap.has(tab.groupId)) {
                    groupMap.get(tab.groupId).tabs.push(tab);
                } else {
                    ungroupedTabs.push(tab);
                }
            });

            // 結果オブジェクトの構築
            const result = {};
            
            // グループ化されたタブを追加
            groupMap.forEach(({ group, tabs: groupTabs }, groupId) => {
                if (groupTabs.length > 0) {
                    result[`group_${groupId}`] = {
                        type: 'tabGroup',
                        group,
                        tabs: groupTabs
                    };
                }
            });

            // グループに属さないタブを追加
            if (ungroupedTabs.length > 0) {
                result['ungrouped'] = {
                    type: 'ungrouped',
                    group: null,
                    tabs: ungroupedTabs
                };
            }

            return result;
        } catch (error) {
            console.error('Error grouping tabs by tab groups:', error);
            throw new Error(`タブグループによるグルーピングに失敗しました: ${this.sanitizeError(error)}`);
        }
    }

    /**
     * タブをドメイン別にグループ化
     * 
     * パフォーマンスを考慮した効率的なグルーピングを行います。
     * 
     * @method groupTabsByDomain
     * @param {Array<TabInfo>} tabs - グループ化するタブ情報の配列
     * @returns {Object<string, Array<TabInfo>>} ドメイン別にグループ化されたタブ
     */
    groupTabsByDomain(tabs) {
        if (!Array.isArray(tabs)) {
            throw new Error('無効なタブデータが渡されました');
        }
        
        // Mapを使用して効率的にグルーピング
        const groupedMap = new Map();
        
        tabs.forEach(tab => {
            const domain = tab.domain || 'unknown';
            
            if (!groupedMap.has(domain)) {
                groupedMap.set(domain, []);
            }
            groupedMap.get(domain).push(tab);
        });
        
        // ドメイン名でソートしたオブジェクトを作成
        const sortedGrouped = {};
        const sortedDomains = Array.from(groupedMap.keys()).sort();
        
        sortedDomains.forEach(domain => {
            sortedGrouped[domain] = groupedMap.get(domain);
        });
            
        return sortedGrouped;
    }

    /**
     * キャッシュから値を取得
     * @param {string} key - キャッシュキー
     * @returns {*} キャッシュされた値またはnull
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    /**
     * キャッシュに値を設定
     * @param {string} key - キャッシュキー
     * @param {*} data - キャッシュするデータ
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * キャッシュをクリア
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * タブの統計情報を取得
     * 
     * パフォーマンス最適化された統計情報の生成を行います。
     * 
     * @method getTabStats
     * @param {Array<TabInfo>} tabs - 統計を取得するタブ情報の配列
     * @returns {Object} 統計情報オブジェクト
     * @returns {number} returns.total - 総タブ数
     * @returns {number} returns.pinned - ピン留めタブ数
     * @returns {number} returns.secure - セキュアタブ数
     * @returns {number} returns.domains - ユニークドメイン数
     * @returns {number} returns.duplicates - 重複タブ数
     * @returns {number} returns.grouped - グループ化されたタブ数
     * @returns {number} returns.groupCount - タブグループ数
     */
    getTabStats(tabs) {
        if (!Array.isArray(tabs)) {
            return { total: 0, pinned: 0, secure: 0, domains: 0, duplicates: 0, grouped: 0, groupCount: 0 };
        }
        
        let pinnedCount = 0;
        let secureCount = 0;
        let groupedCount = 0;
        const domainSet = new Set();
        const groupSet = new Set();
        
        // 一度のループで複数の統計を収集 (パフォーマンス最適化)
        tabs.forEach(tab => {
            if (tab.pinned) pinnedCount++;
            if (tab.isSecure) secureCount++;
            if (tab.domain) domainSet.add(tab.domain);
            if (tab.groupId) {
                groupedCount++;
                groupSet.add(tab.groupId);
            }
        });
        
        const stats = {
            total: tabs.length,
            pinned: pinnedCount,
            secure: secureCount,
            domains: domainSet.size,
            duplicates: this.findDuplicateTabs(tabs).length,
            grouped: groupedCount,
            groupCount: groupSet.size
        };

        return stats;
    }

    /**
     * 重複タブを検出
     * @param {Array} tabs - タブ情報の配列
     * @returns {Array} 重複タブの配列
     */
    findDuplicateTabs(tabs) {
        const urlCounts = {};
        const duplicates = [];

        tabs.forEach(tab => {
            const url = tab.url;
            if (urlCounts[url]) {
                urlCounts[url].push(tab);
            } else {
                urlCounts[url] = [tab];
            }
        });

        Object.values(urlCounts).forEach(tabGroup => {
            if (tabGroup.length > 1) {
                duplicates.push(...tabGroup.slice(1)); // 最初のタブ以外を重複として扱う
            }
        });

        return duplicates;
    }

    /**
     * エラー情報のサニタイズ
     * @param {Error} error - サニタイズするエラー
     * @returns {string} サニタイズ済みエラーメッセージ
     */
    sanitizeError(error) {
        if (typeof error === 'string') {
            return error.substring(0, 100); // 長さ制限
        }
        return error?.message?.substring(0, 100) || 'Unknown error';
    }

    /**
     * IDのサニタイズ
     * @param {number} id - サニタイズするID
     * @returns {number} サニタイズ済みID
     */
    sanitizeId(id) {
        const numId = parseInt(id, 10);
        return isNaN(numId) ? 0 : Math.abs(numId);
    }

    /**
     * URLのサニタイズ
     * @param {string} url - サニタイズするURL
     * @returns {string} サニタイズ済みURL
     */
    sanitizeUrl(url) {
        try {
            const urlObj = new URL(url);
            // セキュリティ: javascript:プロトコルを除外
            if (urlObj.protocol === 'javascript:') {
                return 'about:blank';
            }
            return url;
        } catch {
            return 'about:blank';
        }
    }

    /**
     * URLがセキュアかどうかをチェック
     * @param {string} url - チェックするURL
     * @returns {boolean} HTTPSかどうか
     */
    isSecureUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'https:' || urlObj.protocol === 'wss:';
        } catch {
            return false;
        }
    }
}

/**
 * タブ情報の型定義
 * @typedef {Object} TabInfo
 * @property {number} id - タブID
 * @property {string} title - タブタイトル
 * @property {string} url - タブURL
 * @property {string|null} favIconUrl - ファビコンURL
 * @property {boolean} active - アクティブかどうか
 * @property {boolean} pinned - ピン留めかどうか
 * @property {number} windowId - ウィンドウID
 * @property {string} domain - ドメイン名
 * @property {boolean} isSecure - HTTPSかどうか
 * @property {number|null} groupId - タブグループID（グループに属さない場合はnull）
 * @property {number} timestamp - タイムスタンプ
 */

// エクスポート（モジュール環境の場合）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TabManager;
}