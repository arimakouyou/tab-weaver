/**
 * ポップアップUIの統合テスト
 * UI操作とAPI連携の統合的なテストを行う
 */

// Node.js モジュールのインポート
const fs = require('fs');
const path = require('path');

// 依存するクラスを読み込み
const TabManager = require('../../popup/tab-manager.js');
const MarkdownFormatter = require('../../popup/markdown-formatter.js');
const ClipboardManager = require('../../popup/clipboard-manager.js');

describe('Popup Integration Tests', () => {
  let mockTabs;
  let popupPath;

  beforeAll(() => {
    // popupPathを一度定義
    popupPath = path.join(__dirname, '../../popup/popup.js');
  });

  beforeEach(() => {
    // シングルトンリセット
    if (typeof TabWeaverController !== 'undefined') {
      TabWeaverController._instance = null;
    }
    if (window.tabWeaverController) {
      window.tabWeaverController = null;
    }

    // DOM環境をセットアップ (テスト用固定HTML - XSSリスクなし)
    document.body.innerHTML = `
      <div class="container">
        <header class="header">
          <h1 id="app-title">📋 TabList</h1>
        </header>
        
        <div class="controls">
          <div class="control-group">
            <label for="format-select">Format:</label>
            <select id="format-select">
              <option value="list">List</option>
              <option value="table">Table</option>
              <option value="grouped">Grouped</option>
            </select>
          </div>
          
          <div class="control-group">
            <label for="scope-select">Scope:</label>
            <select id="scope-select">
              <option value="current">Current Window</option>
              <option value="all">All Windows</option>
            </select>
          </div>
        </div>
        
        <div class="preview-area">
          <div class="preview-header">
            <span>Preview</span>
            <div class="tab-count" id="tab-count">0 tabs</div>
          </div>
          <div class="preview-content" id="preview-content">
            <div class="loading">Loading tabs...</div>
          </div>
        </div>
        
        <div class="actions">
          <button id="copy-btn" class="btn btn-primary">📋 Copy</button>
          <button id="refresh-btn" class="btn btn-secondary">🔄 Refresh</button>
        </div>
        
        <div class="feedback" id="feedback"></div>
      </div>
    `;

    // モックタブデータを準備
    mockTabs = testUtils.createMockTabs(3);
    chrome.tabs.query.mockResolvedValue(mockTabs);
    
    // ストレージAPIのモック（Promise形式とコールバック形式の両方に対応）
    const defaultSettings = { tabListSettings: { format: 'list', scope: 'current' } };
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      if (typeof callback === 'function') { callback(defaultSettings); return; }
      return Promise.resolve(defaultSettings);
    });
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (typeof callback === 'function') { callback(); return; }
      return Promise.resolve();
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    // タイマーをクリア
    jest.clearAllTimers();
  });

  describe('TabWeaverController initialization', () => {
    test('コントローラーが正常に初期化される', async () => {
      eval(fs.readFileSync(popupPath, 'utf8'));
      
      // DOMContentLoadedイベントを手動で発火
      document.dispatchEvent(new Event('DOMContentLoaded'));
      
      // 初期化を待機
      await testUtils.waitFor(50);
      
      expect(window.tabWeaverController).toBeDefined();
      expect(window.tabWeaverController.tabManager).toBeInstanceOf(TabManager);
      expect(window.tabWeaverController.markdownFormatter).toBeInstanceOf(MarkdownFormatter);
      expect(window.tabWeaverController.clipboardManager).toBeInstanceOf(ClipboardManager);
    });

    test('UI要素が正しく初期化される', async () => {
      eval(fs.readFileSync(popupPath, 'utf8'));
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await testUtils.waitFor(50);
      
      const controller = window.tabWeaverController;
      expect(controller.elements.formatSelect).toBe(document.getElementById('format-select'));
      expect(controller.elements.scopeSelect).toBe(document.getElementById('scope-select'));
      expect(controller.elements.copyBtn).toBe(document.getElementById('copy-btn'));
    });

    test('DOM要素が不足している場合はエラー表示される', async () => {
      // 必要な要素を削除
      document.getElementById('format-select').remove();

      // eslint-disable-next-line no-eval -- test pattern: load popup code via eval
      eval(fs.readFileSync(popupPath, 'utf8'));
      document.dispatchEvent(new Event('DOMContentLoaded'));

      await testUtils.waitFor(100);

      // エラー表示がDOM内に存在することを確認
      const previewContent = document.getElementById('preview-content');
      expect(previewContent.textContent).toContain('初期化に失敗しました');
    });
  });

  describe('Tab data loading and display', () => {
    let controller;

    beforeEach(async () => {
      // eslint-disable-next-line no-eval -- test pattern
      eval(fs.readFileSync(popupPath, 'utf8'));
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await testUtils.waitFor(100);
      controller = window.tabWeaverController;
    });

    test('初期ロード時にタブデータが取得され表示される', async () => {
      // 初期化完了を待機
      if (controller.initializationPromise) {
        await controller.initializationPromise;
      }

      await testUtils.waitFor(200);
      
      expect(chrome.tabs.query).toHaveBeenCalled();
      expect(controller.currentTabs).toHaveLength(3);
      
      const previewContent = document.getElementById('preview-content');
      expect(previewContent.textContent).toContain('Test Tab 1');
    });

    test('タブカウントが正しく表示される', async () => {
      if (controller.initializationPromise) {
        await controller.initializationPromise;
      }
      
      await testUtils.waitFor(50);
      
      const tabCount = document.getElementById('tab-count');
      expect(tabCount.textContent).toBe('3 tabs');
    });

    test('スコープ変更時にタブデータが再取得される', async () => {
      if (controller.initializationPromise) {
        await controller.initializationPromise;
      }
      
      const scopeSelect = document.getElementById('scope-select');
      scopeSelect.value = 'all';
      testUtils.fireEvent(scopeSelect, 'change');
      
      await testUtils.waitFor(50);
      
      expect(chrome.tabs.query).toHaveBeenCalledWith({});
    });
  });

  describe('Format switching', () => {
    let controller;

    beforeEach(async () => {
      eval(fs.readFileSync(popupPath, 'utf8'));
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await testUtils.waitFor(100);
      controller = window.tabWeaverController;

      if (controller.initializationPromise) {
        await controller.initializationPromise;
      }
      await testUtils.waitFor(200);
    });

    test('フォーマット変更でプレビューが更新される', async () => {
      const formatSelect = document.getElementById('format-select');
      const previewContent = document.getElementById('preview-content');
      
      // Table形式に変更
      formatSelect.value = 'table';
      testUtils.fireEvent(formatSelect, 'change');
      
      await testUtils.waitFor(150); // デバウンス待機
      
      expect(previewContent.textContent).toContain('| Title | Domain | Status |');
    });

    test('Grouped形式でドメイン別表示される', async () => {
      const formatSelect = document.getElementById('format-select');
      const previewContent = document.getElementById('preview-content');
      
      formatSelect.value = 'grouped';
      testUtils.fireEvent(formatSelect, 'change');
      
      await testUtils.waitFor(150);
      
      expect(previewContent.textContent).toContain('### ');
      expect(previewContent.textContent).toContain('example1.com');
    });

    test('キーボードショートカットでフォーマット変更できる', async () => {
      const formatSelect = document.getElementById('format-select');
      
      // Ctrl+2でTable形式に変更
      const keyEvent = new KeyboardEvent('keydown', {
        key: '2',
        ctrlKey: true,
        bubbles: true
      });
      document.dispatchEvent(keyEvent);
      
      await testUtils.waitFor(150);
      
      expect(formatSelect.value).toBe('table');
    });
  });

  describe('Copy functionality', () => {
    let controller;

    beforeEach(async () => {
      eval(fs.readFileSync(popupPath, 'utf8'));
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await testUtils.waitFor(100);
      controller = window.tabWeaverController;

      if (controller.initializationPromise) {
        await controller.initializationPromise;
      }
      await testUtils.waitFor(200);
    });

    test('コピーボタンクリックでクリップボードにコピーされる', async () => {
      const copyBtn = document.getElementById('copy-btn');
      
      testUtils.fireEvent(copyBtn, 'click');
      
      await testUtils.waitFor(50);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      const copiedText = navigator.clipboard.writeText.mock.calls[0][0];
      expect(copiedText).toContain('Test Tab 1');
    });

    test('Ctrl+Cキーでコピーできる', async () => {
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true
      });
      document.dispatchEvent(keyEvent);
      
      await testUtils.waitFor(50);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    test('タブがない場合はエラーメッセージが表示される', async () => {
      // 空のタブリストに設定
      controller.currentTabs = [];
      
      const copyBtn = document.getElementById('copy-btn');
      testUtils.fireEvent(copyBtn, 'click');
      
      await testUtils.waitFor(50);
      
      const feedback = document.getElementById('feedback');
      expect(feedback.textContent).toContain('コピーするタブがありません');
    });
  });

  describe('Refresh functionality', () => {
    let controller;

    beforeEach(async () => {
      eval(fs.readFileSync(popupPath, 'utf8'));
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await testUtils.waitFor(100);
      controller = window.tabWeaverController;

      if (controller.initializationPromise) {
        await controller.initializationPromise;
      }
      await testUtils.waitFor(200);
    });

    test('リフレッシュボタンでデータが更新される', async () => {
      const refreshBtn = document.getElementById('refresh-btn');
      
      // 最初のAPI呼び出しをクリア
      chrome.tabs.query.mockClear();
      
      testUtils.fireEvent(refreshBtn, 'click');
      
      await testUtils.waitFor(50);
      
      expect(chrome.tabs.query).toHaveBeenCalled();
    });

    test('Ctrl+Rキーでリフレッシュできる', async () => {
      chrome.tabs.query.mockClear();
      
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'r',
        ctrlKey: true,
        bubbles: true
      });
      document.dispatchEvent(keyEvent);
      
      await testUtils.waitFor(50);
      
      expect(chrome.tabs.query).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    let controller;

    beforeEach(async () => {
      eval(fs.readFileSync(popupPath, 'utf8'));
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await testUtils.waitFor(50);
      controller = window.tabWeaverController;
    });

    test('Chrome API エラー時にエラー表示される', async () => {
      if (controller.initializationPromise) {
        await controller.initializationPromise;
      }
      await testUtils.waitFor(200);

      // 初期ロード完了後にAPIを失敗させてリフレッシュ
      chrome.tabs.query.mockRejectedValue(new Error('API Error'));
      controller.tabManager.clearCache();
      await controller.loadTabData();

      await testUtils.waitFor(200);

      const previewContent = document.getElementById('preview-content');
      expect(previewContent.textContent).toContain('❌');
      expect(previewContent.textContent).toContain('再試行');
    });

    test('タイムアウト時に適切なエラーメッセージが表示される', async () => {
      if (controller.initializationPromise) {
        await controller.initializationPromise;
      }
      await testUtils.waitFor(200);

      // 応答しないPromiseを返してloadTabData()側のタイムアウトを発生させる
      chrome.tabs.query.mockImplementation(() => new Promise(() => {}));
      controller.tabManager.clearCache();
      await controller.loadTabData();

      await testUtils.waitFor(200);

      const previewContent = document.getElementById('preview-content');
      expect(previewContent.textContent).toContain('タイムアウト');
    }, 15000);
  });

  describe('Settings persistence', () => {
    test('設定が保存される', async () => {
      eval(fs.readFileSync(popupPath, 'utf8'));
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await testUtils.waitFor(50);
      const controller = window.tabWeaverController;
      
      if (controller.initializationPromise) {
        await controller.initializationPromise;
      }
      
      const formatSelect = document.getElementById('format-select');
      formatSelect.value = 'table';
      testUtils.fireEvent(formatSelect, 'change');
      
      // デバウンス待機
      await testUtils.waitFor(600);
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        tabListSettings: expect.objectContaining({
          format: 'table'
        })
      });
    });

    test('設定が読み込まれる', async () => {
      const groupedSettings = { tabListSettings: { format: 'grouped', scope: 'all' } };
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        if (typeof callback === 'function') { callback(groupedSettings); return; }
        return Promise.resolve(groupedSettings);
      });
      
      eval(fs.readFileSync(popupPath, 'utf8'));
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await testUtils.waitFor(50);
      const controller = window.tabWeaverController;
      
      if (controller.initializationPromise) {
        await controller.initializationPromise;
      }
      
      await testUtils.waitFor(50);
      
      expect(controller.currentFormat).toBe('grouped');
      expect(controller.currentScope).toBe('all');
    });
  });

  describe('Performance monitoring', () => {
    let controller;

    beforeEach(async () => {
      eval(fs.readFileSync(popupPath, 'utf8'));
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await testUtils.waitFor(100);
      controller = window.tabWeaverController;

      if (controller.initializationPromise) {
        await controller.initializationPromise;
      }
      await testUtils.waitFor(200);
    });

    test('パフォーマンスメトリクスが記録される', async () => {
      const copyBtn = document.getElementById('copy-btn');
      testUtils.fireEvent(copyBtn, 'click');
      
      await testUtils.waitFor(50);
      
      expect(controller.performanceMetrics.copyTime).toBeGreaterThan(0);
      expect(controller.performanceMetrics.tabLoadTime).toBeGreaterThan(0);
    });

    test('デバッグ情報が取得できる', () => {
      const debugInfo = controller.getDebugInfo();
      
      expect(debugInfo).toHaveProperty('version');
      expect(debugInfo).toHaveProperty('currentTabs');
      expect(debugInfo).toHaveProperty('format');
      expect(debugInfo).toHaveProperty('isLoading');
    });
  });

  describe('Accessibility features', () => {
    beforeEach(async () => {
      eval(fs.readFileSync(popupPath, 'utf8'));
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await testUtils.waitFor(50);
    });

    test('ARIA属性が設定される', () => {
      const formatSelect = document.getElementById('format-select');
      const previewContent = document.getElementById('preview-content');
      
      expect(formatSelect.getAttribute('aria-label')).toContain('Markdown出力形式');
      expect(previewContent.getAttribute('role')).toBe('textbox');
      expect(previewContent.getAttribute('aria-readonly')).toBe('true');
    });

    test('Escapeキーでウィンドウが閉じる', () => {
      const closeSpy = jest.spyOn(window, 'close').mockImplementation();
      
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      document.dispatchEvent(keyEvent);
      
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('Integration edge cases', () => {
    test('大量のタブを効率的に処理する', async () => {
      const largeTabs = testUtils.createMockTabs(1000);
      chrome.tabs.query.mockResolvedValue(largeTabs);
      
      eval(fs.readFileSync(popupPath, 'utf8'));
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await testUtils.waitFor(50);
      const controller = window.tabWeaverController;
      
      const startTime = Date.now();
      
      if (controller.initializationPromise) {
        await controller.initializationPromise;
      }
      
      await testUtils.waitFor(200);
      
      const endTime = Date.now();
      
      expect(controller.currentTabs).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(2000); // 2秒以内
    });

    test('ネットワークエラーから回復する', async () => {
      let callCount = 0;
      chrome.tabs.query.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockTabs);
      });
      
      eval(fs.readFileSync(popupPath, 'utf8'));
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await testUtils.waitFor(50);
      const controller = window.tabWeaverController;
      
      if (controller.initializationPromise) {
        await controller.initializationPromise;
      }
      
      await testUtils.waitFor(100);
      
      // 再試行ボタンをクリック
      const retryBtn = document.querySelector('.error-retry');
      if (retryBtn) {
        testUtils.fireEvent(retryBtn, 'click');
        await testUtils.waitFor(100);
      }
      
      expect(controller.currentTabs).toHaveLength(3);
    });
  });
});