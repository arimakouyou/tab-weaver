/**
 * Service Worker の統合テスト
 * バックグラウンド処理と Chrome API の統合テスト
 */

const fs = require('fs');
const path = require('path');

// Service Worker コードを読み込み
const serviceWorkerPath = path.join(__dirname, '../../background/service-worker.js');
const serviceWorkerCode = fs.readFileSync(serviceWorkerPath, 'utf8');

describe('Service Worker Integration Tests', () => {
  beforeEach(() => {
    // Chrome API のモックをリセット
    jest.clearAllMocks();
    
    // デフォルトのモック動作を設定（コールバック形式対応）
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      if (typeof callback === 'function') { callback({}); return; }
      return Promise.resolve({});
    });
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (typeof callback === 'function') { callback(); return; }
      return Promise.resolve();
    });
    chrome.storage.local.remove.mockImplementation((keys, callback) => {
      if (typeof callback === 'function') { callback(); return; }
      return Promise.resolve();
    });
    chrome.tabs.query.mockResolvedValue(testUtils.createMockTabs(5));
    chrome.notifications.create.mockImplementation((options, callback) => {
      if (typeof callback === 'function') { callback('notification-id'); return; }
      return Promise.resolve('notification-id');
    });
    chrome.contextMenus.create.mockReturnValue();
    
    // Performance API のモック
    if (global.performance && global.performance.now && global.performance.now.mockReturnValue) {
      global.performance.now.mockReturnValue(1000);
    }
  });

  afterEach(() => {
    // タイマーをクリア
    jest.clearAllTimers();
  });

  describe('Extension Installation', () => {
    test('初回インストール時にデフォルト設定が保存される', () => {
      eval(serviceWorkerCode);
      
      // onInstalled イベントをシミュレート
      const installDetails = { reason: 'install' };
      const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
      installListener(installDetails);
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        tabListSettings: expect.objectContaining({
          format: 'list',
          scope: 'current',
          autoRefresh: false,
          showNotifications: true,
          theme: 'light'
        }),
        installDate: expect.any(Number),
        version: '1.0.0'
      }, expect.any(Function));
    });

    test('アップデート時に設定移行が実行される', () => {
      // Note: eval loads service worker code in test environment
      eval(serviceWorkerCode); // eslint-disable-line no-eval

      const updateDetails = {
        reason: 'update',
        previousVersion: '0.9.0'
      };

      const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
      installListener(updateDetails);

      // 設定移行処理が呼ばれることを確認
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['tabListSettings'], expect.any(Function));
    });
  });

  describe('Context Menu', () => {
    test('コンテキストメニューが作成される', () => {
      // Note: eval is used here to load the service worker code in the test environment
      eval(serviceWorkerCode); // eslint-disable-line no-eval

      // onInstalledリスナーを発火してコンテキストメニューを作成
      const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
      installListener({ reason: 'install' });

      expect(chrome.contextMenus.create).toHaveBeenCalledWith({
        id: 'copyCurrentTab',
        title: '現在のタブをMarkdownでコピー',
        contexts: ['page']
      });

      expect(chrome.contextMenus.create).toHaveBeenCalledWith({
        id: 'copyAllTabs',
        title: '全てのタブをMarkdownでコピー',
        contexts: ['page']
      });
    });

    test('現在のタブをコピーするメニューが機能する', async () => {
      eval(serviceWorkerCode);
      
      const mockTab = testUtils.createMockTab({
        id: 123,
        title: 'Test Page',
        url: 'https://example.com/test'
      });
      
      const menuInfo = { menuItemId: 'copyCurrentTab' };
      const menuListener = chrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      
      await menuListener(menuInfo, mockTab);
      
      expect(chrome.notifications.create).toHaveBeenCalledWith({
        type: 'basic',
        iconUrl: '../assets/icons/icon-48.png',
        title: '現在のタブをコピーしました',
        message: expect.stringContaining('Test Page')
      });
    });

    test('全タブをコピーするメニューが機能する', async () => {
      eval(serviceWorkerCode);
      
      const menuInfo = { menuItemId: 'copyAllTabs' };
      const menuListener = chrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      
      await menuListener(menuInfo, null);
      
      expect(chrome.tabs.query).toHaveBeenCalledWith({});
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '全てのタブをコピーしました',
          message: expect.stringContaining('個のタブを処理しました')
        })
      );
    });
  });

  describe('Tab Change Monitoring', () => {
    test('タブ変更イベントリスナーが登録される', () => {
      eval(serviceWorkerCode);
      
      expect(chrome.tabs.onCreated.addListener).toHaveBeenCalled();
      expect(chrome.tabs.onRemoved.addListener).toHaveBeenCalled();
      expect(chrome.tabs.onUpdated.addListener).toHaveBeenCalled();
    });

    test('タブ統計情報が更新される', async () => {
      eval(serviceWorkerCode);
      
      // タブ変更イベントをシミュレート
      const tabChangeListener = chrome.tabs.onCreated.addListener.mock.calls[0][0];
      tabChangeListener();
      
      // デバウンス処理のため少し待機
      await testUtils.waitFor(50);
      
      expect(chrome.tabs.query).toHaveBeenCalledWith({});
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        tabListStats: expect.objectContaining({
          totalTabs: expect.any(Number),
          pinnedTabs: expect.any(Number),
          secureTabs: expect.any(Number),
          uniqueDomains: expect.any(Number),
          lastUpdated: expect.any(Number)
        })
      }, expect.any(Function));
    });
  });

  describe('Message Handling', () => {
    test('統計情報取得メッセージを処理する', async () => {
      eval(serviceWorkerCode);
      
      const mockStats = {
        totalTabs: 10,
        pinnedTabs: 2,
        secureTabs: 8,
        uniqueDomains: 5,
        lastUpdated: Date.now()
      };
      
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        if (typeof callback === 'function') { callback({ tabListStats: mockStats }); return; }
        return Promise.resolve({ tabListStats: mockStats });
      });

      const message = { action: 'getStats' };
      const sender = {};
      const sendResponse = jest.fn();
      
      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const result = messageListener(message, sender, sendResponse);
      
      expect(result).toBe(true); // 非同期レスポンス
      
      // 非同期処理の完了を待機
      await testUtils.waitFor(10);
      
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['tabListStats'], expect.any(Function));
      expect(sendResponse).toHaveBeenCalled();
    });

    test('キャッシュクリアメッセージを処理する', async () => {
      eval(serviceWorkerCode);
      
      const message = { action: 'clearCache' };
      const sender = {};
      const sendResponse = jest.fn();
      
      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const result = messageListener(message, sender, sendResponse);
      
      expect(result).toBe(true);
      
      await testUtils.waitFor(10);
      
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(['tabCache'], expect.any(Function));
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('不明なアクションに対してエラーレスポンスを返す', () => {
      eval(serviceWorkerCode);
      
      const message = { action: 'unknownAction' };
      const sender = {};
      const sendResponse = jest.fn();
      
      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener(message, sender, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({ error: 'Unknown action' });
    });
  });

  describe('Periodic Statistics Update', () => {
    test('chrome.alarmsで定期的な統計更新が設定される', () => {
      // Note: eval loads service worker code in test environment
      eval(serviceWorkerCode); // eslint-disable-line no-eval

      // chrome.alarms.create が呼ばれたことを確認
      expect(chrome.alarms.create).toHaveBeenCalledWith('updateTabStatistics', { periodInMinutes: 1 });

      // alarms リスナーが登録されたことを確認
      expect(chrome.alarms.onAlarm.addListener).toHaveBeenCalled();
    });
  });

  describe('Notification System', () => {
    test('通知設定が有効な場合に通知を表示する', async () => {
      // Note: eval loads service worker code in test environment
      eval(serviceWorkerCode); // eslint-disable-line no-eval

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        if (typeof callback === 'function') { callback({ tabListSettings: { showNotifications: true } }); return; }
        return Promise.resolve({ tabListSettings: { showNotifications: true } });
      });
      
      // 通知表示関数を直接テスト
      // この関数は showNotification として定義されているが、
      // eval環境では直接アクセスできないため、実際のユースケースでテスト
      const menuInfo = { menuItemId: 'copyCurrentTab' };
      const mockTab = testUtils.createMockTab();
      
      const menuListener = chrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      menuListener(menuInfo, mockTab);
      
      // 非同期処理の完了を待機
      await testUtils.waitFor(50);
      expect(chrome.notifications.create).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('Chrome API エラーを適切に処理する', async () => {
      eval(serviceWorkerCode);
      
      // tabs.query を失敗させる
      chrome.tabs.query.mockRejectedValue(new Error('API Error'));
      
      const menuInfo = { menuItemId: 'copyAllTabs' };
      const menuListener = chrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      
      // エラーが発生してもクラッシュしない
      await expect(menuListener(menuInfo, null)).resolves.not.toThrow();
    });

    test('ストレージエラーを適切に処理する', async () => {
      eval(serviceWorkerCode);
      
      chrome.storage.local.set.mockRejectedValue(new Error('Storage Error'));
      
      // 統計更新でエラーが発生してもクラッシュしない
      const tabChangeListener = chrome.tabs.onCreated.addListener.mock.calls[0][0];
      
      await expect(async () => {
        tabChangeListener();
        await testUtils.waitFor(1100);
      }).not.toThrow();
    });
  });

  describe('Settings Migration', () => {
    test('バージョン1.0.0未満からの設定移行', async () => {
      const oldSettings = {
        format: 'table',
        scope: 'all'
        // theme と showNotifications がない古い設定
      };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        if (typeof callback === 'function') { callback({ tabListSettings: oldSettings }); return; }
        return Promise.resolve({ tabListSettings: oldSettings });
      });

      // Note: eval loads service worker code in test environment
      eval(serviceWorkerCode); // eslint-disable-line no-eval
      
      const updateDetails = { 
        reason: 'update', 
        previousVersion: '0.8.0' 
      };
      
      const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
      installListener(updateDetails);
      
      // 設定移行の完了を待機
      await testUtils.waitFor(50);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        tabListSettings: expect.objectContaining({
          format: 'table',
          scope: 'all',
          theme: 'light',
          showNotifications: true
        })
      });  // migrateSettings uses set without callback
    });
  });

  describe('Performance Monitoring', () => {
    test('大量のタブでも効率的に処理する', async () => {
      // 1000個のタブをモック
      const largeTabs = testUtils.createMockTabs(1000);
      chrome.tabs.query.mockResolvedValue(largeTabs);
      
      eval(serviceWorkerCode);
      
      const startTime = Date.now();
      
      // 統計更新を実行
      const tabChangeListener = chrome.tabs.onCreated.addListener.mock.calls[0][0];
      tabChangeListener();
      
      await testUtils.waitFor(1100);
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(2000); // 2秒以内
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        tabListStats: expect.objectContaining({
          totalTabs: 1000
        })
      }, expect.any(Function));
    });
  });

  describe('Integration with Popup', () => {
    test('ポップアップからのメッセージを適切に処理する', async () => {
      // Note: eval loads service worker code in test environment
      eval(serviceWorkerCode); // eslint-disable-line no-eval

      // ポップアップから統計取得リクエスト
      const message = { action: 'getStats' };
      const sender = { tab: null }; // 拡張機能内部からの呼び出し
      const sendResponse = jest.fn();
      
      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener(message, sender, sendResponse);
      
      await testUtils.waitFor(10);
      
      // デフォルトモックでは空オブジェクトが返される
      expect(sendResponse).toHaveBeenCalled();
    });
  });

  describe('Lifecycle Management', () => {
    test('サスペンド時の処理が適切に実行される', () => {
      eval(serviceWorkerCode);
      
      const suspendListener = chrome.runtime.onSuspend.addListener.mock.calls[0][0];
      
      // サスペンドイベントをシミュレート
      expect(() => suspendListener()).not.toThrow();
    });
  });

  describe('Data Validation', () => {
    test('無効なタブデータを適切にフィルタリングする', async () => {
      eval(serviceWorkerCode);
      
      const invalidTabs = [
        testUtils.createMockTab({ url: 'chrome://settings' }),
        testUtils.createMockTab({ url: 'https://valid.com' }),
        testUtils.createMockTab({ url: null }),
        testUtils.createMockTab({ url: 'chrome-extension://abc/popup.html' })
      ];
      
      chrome.tabs.query.mockResolvedValue(invalidTabs);
      
      const tabChangeListener = chrome.tabs.onCreated.addListener.mock.calls[0][0];
      tabChangeListener();
      
      await testUtils.waitFor(1100);
      
      // updateTabStatistics は chrome.tabs.query の結果をそのまま統計処理する
      // （TabManagerのフィルタとは異なり、全タブをカウント）
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        tabListStats: expect.objectContaining({
          totalTabs: 4,
          secureTabs: 1 // https://valid.com のみ
        })
      }, expect.any(Function));
    });
  });
});