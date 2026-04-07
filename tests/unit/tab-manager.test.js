/**
 * TabManager クラスの単体テスト
 */

// テスト対象のクラスを読み込み
const TabManager = require('../../popup/tab-manager.js');

describe('TabManager', () => {
  let tabManager;
  let mockTabs;

  beforeEach(() => {
    tabManager = new TabManager();
    mockTabs = testUtils.createMockTabs(5);
    
    // Chrome API のモックをセットアップ
    chrome.tabs.query.mockResolvedValue(mockTabs);
  });

  describe('constructor', () => {
    test('デフォルトオプションで初期化される', () => {
      const manager = new TabManager();
      expect(manager.cache).toBeInstanceOf(Map);
      expect(manager.cacheTimeout).toBe(30000);
      expect(manager.excludePatterns).toBeInstanceOf(Set);
    });

    test('カスタムオプションで初期化される', () => {
      const options = { cacheTimeout: 60000 };
      const manager = new TabManager(options);
      expect(manager.cacheTimeout).toBe(60000);
    });
  });

  describe('getAllTabs', () => {
    test('全タブを正常に取得できる', async () => {
      const tabs = await tabManager.getAllTabs();
      
      expect(chrome.tabs.query).toHaveBeenCalledWith({});
      expect(tabs).toHaveLength(5);
      expect(tabs[0]).toHaveProperty('id');
      expect(tabs[0]).toHaveProperty('title');
      expect(tabs[0]).toHaveProperty('url');
    });

    test('キャッシュが機能する', async () => {
      // 最初の呼び出し
      await tabManager.getAllTabs();
      
      // 2回目の呼び出し（キャッシュから取得）
      await tabManager.getAllTabs();
      
      // Chrome APIは1回だけ呼ばれる
      expect(chrome.tabs.query).toHaveBeenCalledTimes(1);
    });

    test('Chrome API エラー時に適切なエラーがスローされる', async () => {
      const errorMessage = 'Chrome API Error';
      chrome.tabs.query.mockRejectedValue(new Error(errorMessage));

      await expect(tabManager.getAllTabs()).rejects.toThrow('タブ情報の取得に失敗しました');
    });
  });

  describe('getCurrentWindowTabs', () => {
    test('現在のウィンドウのタブを取得できる', async () => {
      const tabs = await tabManager.getCurrentWindowTabs();
      
      expect(chrome.tabs.query).toHaveBeenCalledWith({ currentWindow: true });
      expect(tabs).toHaveLength(5);
    });

    test('Chrome API エラー時に適切なエラーがスローされる', async () => {
      chrome.tabs.query.mockRejectedValue(new Error('API Error'));

      await expect(tabManager.getCurrentWindowTabs()).rejects.toThrow();
    });
  });

  describe('processTabs', () => {
    test('タブデータを正常に処理する', () => {
      const rawTabs = [
        { id: 1, title: 'Test Tab 1', url: 'https://example.com', active: true, pinned: false, windowId: 1 },
        { id: 2, title: 'Test Tab 2', url: 'https://google.com', active: false, pinned: true, windowId: 1 }
      ];

      const processedTabs = tabManager.processTabs(rawTabs);

      expect(processedTabs).toHaveLength(2);
      expect(processedTabs[0]).toHaveProperty('domain', 'example.com');
      expect(processedTabs[0]).toHaveProperty('isSecure', true);
      expect(processedTabs[0]).toHaveProperty('timestamp');
    });

    test('無効なタブデータを除外する', () => {
      const rawTabs = [
        { id: 1, title: 'Valid Tab', url: 'https://example.com', active: true, pinned: false, windowId: 1 },
        { id: 2, title: 'Chrome Tab', url: 'chrome://settings', active: false, pinned: false, windowId: 1 },
        { id: 3, title: 'Extension Tab', url: 'chrome-extension://abc/popup.html', active: false, pinned: false, windowId: 1 }
      ];

      const processedTabs = tabManager.processTabs(rawTabs);

      expect(processedTabs).toHaveLength(1);
      expect(processedTabs[0].url).toBe('https://example.com');
    });

    test('無効な入力に対してエラーをスローする', () => {
      expect(() => tabManager.processTabs(null)).toThrow('無効なタブデータが渡されました');
      expect(() => tabManager.processTabs('invalid')).toThrow('無効なタブデータが渡されました');
    });

    test('タブの優先度でソートされる', () => {
      const rawTabs = [
        { id: 3, title: 'Normal Tab', url: 'https://example3.com', active: false, pinned: false, windowId: 1 },
        { id: 1, title: 'Active Tab', url: 'https://example1.com', active: true, pinned: false, windowId: 1 },
        { id: 2, title: 'Pinned Tab', url: 'https://example2.com', active: false, pinned: true, windowId: 1 }
      ];

      const processedTabs = tabManager.processTabs(rawTabs);

      // アクティブタブが最初、次にピン留めタブ
      expect(processedTabs[0].active).toBe(true);
      expect(processedTabs[1].pinned).toBe(true);
    });
  });

  describe('cleanTitle', () => {
    test('通常のタイトルを適切に処理する', () => {
      const title = 'GitHub - Issues';
      const cleaned = tabManager.cleanTitle(title);
      expect(cleaned).toBe('GitHub \\- Issues'); // Markdownエスケープ適用
    });

    test('長いタイトルを短縮する', () => {
      const longTitle = 'a'.repeat(100);
      const cleaned = tabManager.cleanTitle(longTitle);
      expect(cleaned).toHaveLength(63); // 57文字 + エスケープされた"..." (\\.\\.\\.)
      expect(cleaned).toMatch(/\\.\\.\\.$/); // 正規表現で末尾確認
    });

    test('HTMLタグを除去する', () => {
      const titleWithHtml = 'Test <script>alert("xss")</script> Title';
      const cleaned = tabManager.cleanTitle(titleWithHtml);
      expect(cleaned).toBe('Test alert\\("xss"\\) Title'); // Markdownエスケープ適用
      expect(cleaned).not.toContain('<script>');
    });

    test('Markdown特殊文字をエスケープする', () => {
      const titleWithMarkdown = 'Title [with] (markdown) *special* _chars_';
      const cleaned = tabManager.cleanTitle(titleWithMarkdown);
      expect(cleaned).toContain('\\[');
      expect(cleaned).toContain('\\]');
      expect(cleaned).toContain('\\(');
      expect(cleaned).toContain('\\)');
      expect(cleaned).toContain('\\*');
      expect(cleaned).toContain('\\_');
    });

    test('空のタイトルにデフォルト値を設定する', () => {
      expect(tabManager.cleanTitle('')).toBe('Untitled');
      expect(tabManager.cleanTitle(null)).toBe('Untitled');
      expect(tabManager.cleanTitle(undefined)).toBe('Untitled');
    });
  });

  describe('extractDomain', () => {
    test('有効なURLからドメインを抽出する', () => {
      expect(tabManager.extractDomain('https://www.google.com/search')).toBe('google.com');
      expect(tabManager.extractDomain('http://example.com/path')).toBe('example.com');
      expect(tabManager.extractDomain('https://subdomain.example.com')).toBe('subdomain.example.com');
    });

    test('www.プレフィックスを除去する', () => {
      expect(tabManager.extractDomain('https://www.example.com')).toBe('example.com');
    });

    test('無効なURLに対してデフォルト値を返す', () => {
      expect(tabManager.extractDomain('invalid-url')).toBe('unknown');
      expect(tabManager.extractDomain('')).toBe('unknown');
    });

    test('無効なドメインを検出する', () => {
      expect(tabManager.extractDomain('https://invalid..domain')).toBe('invalid-domain');
    });
  });

  describe('groupTabsByDomain', () => {
    test('タブをドメイン別にグループ化する', () => {
      const tabs = [
        { domain: 'google.com', title: 'Google 1' },
        { domain: 'github.com', title: 'GitHub 1' },
        { domain: 'google.com', title: 'Google 2' }
      ];

      const grouped = tabManager.groupTabsByDomain(tabs);

      expect(grouped['google.com']).toHaveLength(2);
      expect(grouped['github.com']).toHaveLength(1);
      expect(Object.keys(grouped).sort()).toEqual(['github.com', 'google.com']);
    });

    test('無効な入力に対してエラーをスローする', () => {
      expect(() => tabManager.groupTabsByDomain(null)).toThrow('無効なタブデータが渡されました');
    });
  });

  describe('getTabStats', () => {
    test('タブの統計情報を計算する', () => {
      const tabs = [
        { pinned: true, isSecure: true, domain: 'google.com' },
        { pinned: false, isSecure: true, domain: 'github.com' },
        { pinned: false, isSecure: false, domain: 'google.com' }
      ];

      const stats = tabManager.getTabStats(tabs);

      expect(stats.total).toBe(3);
      expect(stats.pinned).toBe(1);
      expect(stats.secure).toBe(2);
      expect(stats.domains).toBe(2);
    });

    test('空の配列に対してゼロ統計を返す', () => {
      const stats = tabManager.getTabStats([]);
      expect(stats.total).toBe(0);
      expect(stats.pinned).toBe(0);
      expect(stats.secure).toBe(0);
      expect(stats.domains).toBe(0);
    });

    test('無効な入力に対してデフォルト統計を返す', () => {
      const stats = tabManager.getTabStats(null);
      expect(stats.total).toBe(0);
    });
  });

  describe('cache management', () => {
    test('キャッシュが正常に機能する', () => {
      const key = 'test-key';
      const data = { test: 'data' };

      tabManager.setCache(key, data);
      const cached = tabManager.getFromCache(key);

      expect(cached).toEqual(data);
    });

    test('期限切れキャッシュが削除される', async () => {
      const manager = new TabManager({ cacheTimeout: 10 }); // 10ms
      const key = 'test-key';
      const data = { test: 'data' };

      manager.setCache(key, data);
      
      // キャッシュ期限を過ぎるまで待機
      await testUtils.waitFor(20);
      
      const cached = manager.getFromCache(key);
      expect(cached).toBeNull();
    });

    test('キャッシュをクリアできる', () => {
      tabManager.setCache('key1', 'data1');
      tabManager.setCache('key2', 'data2');
      
      tabManager.clearCache();
      
      expect(tabManager.getFromCache('key1')).toBeNull();
      expect(tabManager.getFromCache('key2')).toBeNull();
    });
  });

  describe('security features', () => {
    test('エラー情報をサニタイズする', () => {
      const sensitiveError = new Error('Database password: secret123');
      const sanitized = tabManager.sanitizeError(sensitiveError);
      
      expect(sanitized.length).toBeLessThanOrEqual(100); // 実装では100文字以下に制限
      expect(typeof sanitized).toBe('string');
    });

    test('URLをサニタイズする', () => {
      expect(tabManager.sanitizeUrl('javascript:alert("xss")')).toBe('about:blank');
      expect(tabManager.sanitizeUrl('vbscript:msgbox')).toBe('about:blank');
      expect(tabManager.sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('about:blank');
      expect(tabManager.sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(tabManager.sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(tabManager.sanitizeUrl('file:///path/to/file.html')).toBe('file:///path/to/file.html');
      expect(tabManager.sanitizeUrl('invalid-url')).toBe('about:blank');
    });

    test('IDをサニタイズする', () => {
      expect(tabManager.sanitizeId('123')).toBe(123);
      expect(tabManager.sanitizeId('-456')).toBe(456); // 絶対値
      expect(tabManager.sanitizeId('invalid')).toBe(0);
    });

    test('セキュアURLを検出する', () => {
      expect(tabManager.isSecureUrl('https://example.com')).toBe(true);
      expect(tabManager.isSecureUrl('wss://example.com')).toBe(true);
      expect(tabManager.isSecureUrl('http://example.com')).toBe(false);
      expect(tabManager.isSecureUrl('invalid-url')).toBe(false);
    });
  });
});