/**
 * ClipboardManager クラスの単体テスト
 */

// テスト対象のクラスを読み込み
const ClipboardManager = require('../../popup/clipboard-manager.js');

describe('ClipboardManager', () => {
  let clipboardManager;

  beforeEach(() => {
    clipboardManager = new ClipboardManager();
    
    // DOM要素をモック
    document.body.innerHTML = '<div id="feedback"></div>';
    
    // Navigator clipboard APIのモック
    navigator.clipboard.writeText.mockResolvedValue();
    navigator.clipboard.readText.mockResolvedValue('test content');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    
    // Clipboard APIのモックを復元
    navigator.clipboard.writeText.mockReset();
    navigator.clipboard.readText.mockReset().mockResolvedValue('test content');
  });

  describe('constructor', () => {
    test('初期値が正しく設定される', () => {
      expect(clipboardManager.lastCopiedText).toBeNull();
      expect(clipboardManager.copyHistory).toEqual([]);
      expect(clipboardManager.maxHistorySize).toBe(10);
    });
  });

  describe('copyToClipboard', () => {
    test('Clipboard APIを使用してテキストをコピーする', async () => {
      const testText = 'Test clipboard content';
      const result = await clipboardManager.copyToClipboard(testText);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testText);
      expect(result).toBe(true);
      expect(clipboardManager.lastCopiedText).toBe(testText);
    });

    test('コピー成功時にフィードバックを表示する', async () => {
      const testText = 'Test content';
      await clipboardManager.copyToClipboard(testText, { showFeedback: true });
      
      // DOM更新を待機
      await testUtils.waitFor(50);

      const feedbackElement = document.getElementById('feedback');
      expect(feedbackElement.textContent).toBe('コピーしました！');
      
      // 非同期でclassが追加されるため、少し待機
      await testUtils.waitFor(20);
      expect(feedbackElement.classList.contains('show')).toBe(true);
    });

    test('履歴に追加される', async () => {
      const testText = 'Test content for history';
      await clipboardManager.copyToClipboard(testText, { addToHistory: true });

      const history = clipboardManager.getCopyHistory();
      expect(history).toHaveLength(1);
      expect(history[0].fullText).toBe(testText);
      expect(history[0].text).toBe(testText);
    });

    test('Clipboard API失敗時にfalseを返しフィードバックを表示する', async () => {
      // Clipboard APIを失敗させる
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard API failed'));

      const result = await clipboardManager.copyToClipboard('test', { showFeedback: false });

      // Clipboard APIとフォールバック両方が失敗するとfalseが返る
      expect(result).toBe(false);
    });

    test('両方の方法が失敗した場合にfalseを返す', async () => {
      navigator.clipboard.writeText.mockRejectedValue(new Error('API failed'));
      document.execCommand = jest.fn().mockReturnValue(false);
      
      const result = await clipboardManager.copyToClipboard('test', { showFeedback: false });
      
      expect(result).toBe(false);
    });
  });

  describe('fallbackCopy', () => {
    test('execCommandを使用してテキストをコピーする', async () => {
      document.execCommand = jest.fn().mockReturnValue(true);

      await expect(clipboardManager.fallbackCopy('test content')).resolves.not.toThrow();
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    test('execCommand失敗時にエラーをスローする', async () => {
      document.execCommand = jest.fn().mockReturnValue(false);
      
      await expect(clipboardManager.fallbackCopy('test')).rejects.toThrow();
    });
  });

  describe('showCopyFeedback', () => {
    test('成功フィードバックを表示する', () => {
      clipboardManager.showCopyFeedback('Success message', 'success');
      
      const feedbackElement = document.getElementById('feedback');
      expect(feedbackElement.textContent).toBe('Success message');
      expect(feedbackElement.className).toContain('success');
    });

    test('エラーフィードバックを表示する', () => {
      clipboardManager.showCopyFeedback('Error message', 'error');
      
      const feedbackElement = document.getElementById('feedback');
      expect(feedbackElement.textContent).toBe('Error message');
      expect(feedbackElement.className).toContain('error');
    });

    test('自動的に非表示になる', async () => {
      clipboardManager.showCopyFeedback('Test message', 'info', 50);
      
      const feedbackElement = document.getElementById('feedback');
      
      // 初期表示の確認
      await testUtils.waitFor(20);
      expect(feedbackElement.classList.contains('show')).toBe(true);
      
      // 自動非表示の確認
      await testUtils.waitFor(100);
      expect(feedbackElement.classList.contains('show')).toBe(false);
    });
  });

  describe('readFromClipboard', () => {
    test('クリップボードからテキストを読み取る', async () => {
      const result = await clipboardManager.readFromClipboard();
      
      expect(navigator.clipboard.readText).toHaveBeenCalled();
      expect(result).toBe('test content');
    });

    test('Clipboard API未対応時にnullを返す', async () => {
      // 元のreadTextを保存して復元する
      const originalReadText = navigator.clipboard.readText;
      navigator.clipboard.readText = undefined;
      
      const result = await clipboardManager.readFromClipboard();
      
      expect(result).toBeNull();
      
      // 復元
      navigator.clipboard.readText = originalReadText;
    });

    test('読み取り失敗時にnullを返す', async () => {
      // テスト前にモックを設定し直す
      navigator.clipboard.readText = jest.fn().mockRejectedValue(new Error('Read failed'));
      
      const result = await clipboardManager.readFromClipboard();
      
      expect(result).toBeNull();
    });
  });

  describe('copy history management', () => {
    test('履歴に項目を追加する', () => {
      const testText = 'Test history item';
      clipboardManager.addToHistory(testText);
      
      expect(clipboardManager.copyHistory).toHaveLength(1);
      expect(clipboardManager.copyHistory[0].fullText).toBe(testText);
      expect(clipboardManager.copyHistory[0].timestamp).toBeDefined();
      expect(clipboardManager.copyHistory[0].id).toBeDefined();
    });

    test('長いテキストの履歴は短縮される', () => {
      const longText = 'a'.repeat(300);
      clipboardManager.addToHistory(longText);
      
      expect(clipboardManager.copyHistory[0].text).toHaveLength(200);
      expect(clipboardManager.copyHistory[0].fullText).toBe(longText);
    });

    test('同じテキストの重複は除去される', () => {
      clipboardManager.addToHistory('duplicate text');
      clipboardManager.addToHistory('other text');
      clipboardManager.addToHistory('duplicate text');
      
      expect(clipboardManager.copyHistory).toHaveLength(2);
      expect(clipboardManager.copyHistory[0].text).toBe('duplicate text'); // 最新が先頭
    });

    test('履歴サイズ制限が機能する', () => {
      // 制限を超える数の項目を追加
      for (let i = 0; i < 15; i++) {
        clipboardManager.addToHistory(`item ${i}`);
      }
      
      expect(clipboardManager.copyHistory).toHaveLength(10);
      expect(clipboardManager.copyHistory[0].text).toBe('item 14'); // 最新が先頭
    });

    test('履歴を取得できる', () => {
      clipboardManager.addToHistory('item 1');
      clipboardManager.addToHistory('item 2');
      
      const history = clipboardManager.getCopyHistory();
      
      expect(history).toHaveLength(2);
      expect(history).not.toBe(clipboardManager.copyHistory); // コピーが返される
    });

    test('履歴をクリアできる', () => {
      clipboardManager.addToHistory('item 1');
      clipboardManager.clearHistory();
      
      expect(clipboardManager.copyHistory).toHaveLength(0);
    });

    test('IDで項目を削除できる', () => {
      clipboardManager.addToHistory('item 1');
      clipboardManager.addToHistory('item 2');
      
      const itemId = clipboardManager.copyHistory[0].id;
      clipboardManager.removeFromHistory(itemId);
      
      expect(clipboardManager.copyHistory).toHaveLength(1);
    });
  });

  describe('getLastCopied', () => {
    test('最後にコピーしたテキストを取得する', async () => {
      await clipboardManager.copyToClipboard('last copied text');
      
      expect(clipboardManager.getLastCopied()).toBe('last copied text');
    });

    test('初期状態ではnullを返す', () => {
      expect(clipboardManager.getLastCopied()).toBeNull();
    });
  });

  describe('getTextStats', () => {
    test('テキストの統計情報を計算する', () => {
      const text = 'Hello world\nThis is a test\nWith multiple lines';
      const stats = clipboardManager.getTextStats(text);
      
      expect(stats.lines).toBe(3);
      expect(stats.words).toBe(9);
      expect(stats.characters).toBe(text.length);
      expect(stats.charactersNoSpaces).toBe(text.replace(/\s/g, '').length);
      expect(stats.estimatedReadTime).toBe(1); // 200 words per minute
    });
  });

  describe('formatText', () => {
    const testText = 'Test <text> with "quotes" & symbols';

    test('プレーンテキスト形式でフォーマットする', () => {
      const result = clipboardManager.formatText('Test *bold* _italic_ `code`', 'plain');
      expect(result).toBe('Test bold italic code');
    });

    test('HTML形式でフォーマットする', () => {
      const result = clipboardManager.formatText(testText, 'html');
      expect(result).toContain('&lt;text&gt;');
      expect(result).toContain('&quot;quotes&quot;');
      expect(result).toContain('&amp;');
    });

    test('JSON形式でフォーマットする', () => {
      const result = clipboardManager.formatText('test "text"', 'json');
      expect(result).toBe('"test \\"text\\""');
    });

    test('CSV形式でフォーマットする', () => {
      const result = clipboardManager.formatText('test "text"', 'csv');
      expect(result).toBe('"test ""text"""');
    });

    test('未知の形式では元のテキストを返す', () => {
      const result = clipboardManager.formatText(testText, 'unknown');
      expect(result).toBe(testText);
    });
  });

  describe('updateSettings', () => {
    test('履歴サイズを更新する', () => {
      clipboardManager.updateSettings({ maxHistorySize: 20 });
      expect(clipboardManager.maxHistorySize).toBe(20);
    });

    test('無効な値は範囲内に調整される', () => {
      clipboardManager.updateSettings({ maxHistorySize: 0 });
      expect(clipboardManager.maxHistorySize).toBe(1); // 最小値

      clipboardManager.updateSettings({ maxHistorySize: 100 });
      expect(clipboardManager.maxHistorySize).toBe(50); // 最大値
    });
  });

  describe('checkClipboardPermission', () => {
    test('権限状態を確認する', async () => {
      navigator.permissions.query.mockResolvedValue({ state: 'granted' });
      
      const permission = await clipboardManager.checkClipboardPermission();
      
      expect(permission).toBe('granted');
      expect(navigator.permissions.query).toHaveBeenCalledWith({ name: 'clipboard-write' });
    });

    test('権限API未対応時は unknown を返す', async () => {
      const originalPermissions = navigator.permissions;
      navigator.permissions = undefined;

      const permission = await clipboardManager.checkClipboardPermission();

      expect(permission).toBe('unknown');

      // 復元
      navigator.permissions = originalPermissions;
    });

    test('権限確認失敗時は unknown を返す', async () => {
      navigator.permissions.query.mockRejectedValue(new Error('Permission check failed'));
      
      const permission = await clipboardManager.checkClipboardPermission();
      
      expect(permission).toBe('unknown');
    });
  });

  describe('generateId', () => {
    test('ユニークなIDを生成する', () => {
      const id1 = clipboardManager.generateId();
      const id2 = clipboardManager.generateId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    test('空文字列のコピーを処理する', async () => {
      const result = await clipboardManager.copyToClipboard('');
      expect(result).toBe(true);
    });

    test('非常に長いテキストのコピーを処理する', async () => {
      const longText = 'a'.repeat(100000);
      const result = await clipboardManager.copyToClipboard(longText);
      expect(result).toBe(true);
    });

    test('特殊文字を含むテキストのコピーを処理する', async () => {
      const specialText = '🎉 Special chars: \n\t"quotes" & <tags>';
      const result = await clipboardManager.copyToClipboard(specialText);
      expect(result).toBe(true);
    });
  });
});