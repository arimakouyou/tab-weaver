/**
 * TabList Chrome Extension - Service Worker
 * バックグラウンドで動作するサービスワーカー
 */

console.log('Service Worker initialized');

// Service Worker の起動時の処理
self.addEventListener('install', () => {
    console.log('Service Worker installing');
    // Service Worker をすぐにアクトベート
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating');
    // 他のService Workerを削除してすぐに制御を取る
    event.waitUntil(self.clients.claim());
});

// インストール時の処理
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        // 初回インストール時の処理
        initializeExtension();
    } else if (details.reason === 'update') {
        // アップデート時の処理
        handleUpdate(details.previousVersion);
    }
});

// 拡張機能の初期化
function initializeExtension() {
    // デフォルト設定を保存
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
    }, () => {
        // Default settings initialized
    });
}

// アップデート処理
function handleUpdate(previousVersion) {
    // Updated to new version
    
    // 必要に応じて設定の移行処理を行う
    migrateSettings(previousVersion);
}

// 設定の移行処理
function migrateSettings(previousVersion) {
    chrome.storage.local.get(['tabListSettings'], (result) => {
        let settings = result.tabListSettings || {};
        
        // バージョン固有の移行処理
        if (compareVersions(previousVersion, '1.0.0') < 0) {
            // v1.0.0以前からの移行処理
            settings = {
                ...settings,
                theme: settings.theme || 'light',
                showNotifications: settings.showNotifications !== false
            };
        }
        
        chrome.storage.local.set({ tabListSettings: settings });
    });
}

// バージョン比較関数
function compareVersions(a, b) {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        
        if (aPart < bPart) return -1;
        if (aPart > bPart) return 1;
    }
    
    return 0;
}

// アクションボタンクリック時の処理
chrome.action.onClicked.addListener(() => {
    // ポップアップが設定されているので、通常は呼ばれない
    // Action button clicked
});

// コンテキストメニューの作成
chrome.runtime.onInstalled.addListener(() => {
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
});

// コンテキストメニューのクリック処理
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
        switch (info.menuItemId) {
            case 'copyCurrentTab':
                await copyCurrentTabAsMarkdown(tab);
                break;
            case 'copyAllTabs':
                await copyAllTabsAsMarkdown();
                break;
        }
    } catch (error) {
        console.error('Context menu action failed:', error);
    }
});

// 現在のタブをMarkdownでコピー
async function copyCurrentTabAsMarkdown(tab) {
    try {
        const markdown = `- [${escapeMarkdown(tab.title)}](${tab.url})`;
        
        // Service Worker環境でのクリップボードアクセス
        await writeToClipboard(markdown);
        
        showNotification('現在のタブをコピーしました', `タイトル: ${tab.title}`);
        
    } catch (error) {
        console.error('Failed to copy current tab:', error);
        showNotification('コピーに失敗しました', error.message, 'error');
    }
}

// 全てのタブをMarkdownでコピー
async function copyAllTabsAsMarkdown() {
    try {
        const tabs = await safeExecute(() => chrome.tabs.query({}));
        const timestamp = new Date().toLocaleString('ja-JP');
        
        let markdown = `## 📋 開いているタブ (${timestamp})\n\n`;
        
        tabs.forEach(tab => {
            if (tab.url && !tab.url.startsWith('chrome://')) {
                markdown += `- [${escapeMarkdown(tab.title)}](${tab.url})\n`;
            }
        });
        
        markdown += `\n**統計情報:** ${tabs.length} タブ`;
        
        // クリップボードにコピー
        await safeExecute(() => writeToClipboard(markdown));
        
        showNotification('全てのタブをコピーしました', `${tabs.length}個のタブを処理しました`);
        
    } catch (error) {
        const errorMessage = handleTabError(error, 'copyAllTabs');
        console.error('Failed to copy all tabs:', error);
        showNotification('コピーに失敗しました', errorMessage, 'error');
    }
}

// Service Worker環境でのクリップボード書き込み
async function writeToClipboard(text) {
    try {
        // Chrome Extension Service Worker でのクリップボードアクセス
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(text);
        } else {
            // フォールバック: content script 経由でクリップボードに書き込み
            await writeToClipboardViaContentScript(text);
        }
    } catch (error) {
        console.error('Clipboard write failed:', error);
        throw new Error(`クリップボードへの書き込みに失敗しました: ${error.message}`);
    }
}

// Content Script経由でのクリップボード書き込み
async function writeToClipboardViaContentScript(text) {
    try {
        // アクティブなタブを取得
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!activeTab || activeTab.url.startsWith('chrome://')) {
            throw new Error('クリップボードアクセスが制限されています');
        }

        // Content Script を注入してクリップボードに書き込み
        await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (textToWrite) => {
                return navigator.clipboard.writeText(textToWrite);
            },
            args: [text]
        });
    } catch (error) {
        console.error('Content script clipboard write failed:', error);
        throw error;
    }
}

// Markdownエスケープ処理
function escapeMarkdown(text) {
    if (!text) return 'Untitled';
    
    // Markdownリンクのタイトル部分では、エスケープは不要
    // HTMLタグ除去のみで十分
    return text;
}

// 通知表示
function showNotification(title, message, type = 'basic') {
    chrome.storage.local.get(['tabListSettings'], (result) => {
        const settings = result.tabListSettings || {};
        
        if (settings.showNotifications !== false) {
            chrome.notifications.create({
                type: type,
                iconUrl: '../assets/icons/icon48.png',
                title: title,
                message: message
            });
        }
    });
}

// タブの変更を監視（オプション機能）
let tabChangeTimeout;

chrome.tabs.onCreated.addListener(handleTabChange);
chrome.tabs.onRemoved.addListener(handleTabChange);
chrome.tabs.onUpdated.addListener(handleTabChange);

function handleTabChange() {
    // 短時間の連続変更を防ぐためにデバウンス
    clearTimeout(tabChangeTimeout);
    tabChangeTimeout = setTimeout(() => {
        // 必要に応じて統計情報を更新
        updateTabStatistics();
    }, 1000);
}

// タブ統計情報の更新
async function updateTabStatistics() {
    try {
        const tabs = await safeExecute(() => chrome.tabs.query({}));
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
        
        await safeExecute(() => 
            new Promise((resolve, reject) => {
                chrome.storage.local.set({ tabListStats: stats }, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                });
            })
        );
        
    } catch (error) {
        console.error('Failed to update tab statistics:', error);
        
        // 統計更新の失敗は重要ではないので、通知は出さない
    }
}

// 定期的な統計更新（1分間隔）
setInterval(updateTabStatistics, 60000);

// メッセージハンドリング
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    switch (message.action) {
        case 'getStats':
            chrome.storage.local.get(['tabListStats'], (result) => {
                sendResponse(result.tabListStats || {});
            });
            return true; // 非同期レスポンス
            
        case 'clearCache':
            // キャッシュクリア処理
            chrome.storage.local.remove(['tabCache'], () => {
                sendResponse({ success: true });
            });
            return true;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// グローバルエラーハンドリング
self.addEventListener('error', (event) => {
    console.error('Service Worker global error:', event.error);
    
    // エラー情報をストレージに保存
    chrome.storage.local.set({
        lastError: {
            message: event.error?.message || 'Unknown error',
            stack: event.error?.stack || '',
            timestamp: Date.now()
        }
    });
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker unhandled promise rejection:', event.reason);
    
    // エラー情報をストレージに保存
    chrome.storage.local.set({
        lastError: {
            message: event.reason?.message || 'Promise rejection',
            stack: event.reason?.stack || '',
            timestamp: Date.now()
        }
    });
});

// Service Worker のライフサイクル管理
chrome.runtime.onSuspend.addListener(() => {
    console.log('Service worker suspending');
    
    // 必要に応じてクリーンアップ処理
    clearTimeout(tabChangeTimeout);
});

// Service Worker の起動確認機能
chrome.runtime.onStartup.addListener(() => {
    console.log('Browser started, service worker activated');
    
    // 起動時の初期化処理
    updateTabStatistics();
});

// タブ操作のエラーハンドリング強化
function handleTabError(error, operation) {
    console.error(`Tab operation '${operation}' failed:`, error);
    
    const errorMessage = error.message || 'Unknown error';
    
    // エラータイプに応じた処理
    if (errorMessage.includes('Cannot access')) {
        return '特別なページ（chrome://など）にはアクセスできません';
    } else if (errorMessage.includes('permission')) {
        return '権限が不足しています';
    } else if (errorMessage.includes('network')) {
        return 'ネットワークエラーが発生しました';
    } else {
        return `操作に失敗しました: ${errorMessage}`;
    }
}

// リトライ機能付きの安全な操作実行
async function safeExecute(operation, retries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            console.warn(`Attempt ${attempt} failed:`, error);
            
            if (attempt === retries) {
                throw error;
            }
            
            // 次の試行前に待機
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
}

console.log('Service Worker initialized with enhanced error handling');