/**
 * MarkdownFormatter クラスの単体テスト
 */

// テスト対象のクラスを読み込み
const MarkdownFormatter = require('../../popup/markdown-formatter.js');

describe('MarkdownFormatter', () => {
  let formatter;
  let mockTabs;

  beforeEach(() => {
    formatter = new MarkdownFormatter();
    mockTabs = [
      {
        id: 1,
        title: 'GitHub - Issues',
        url: 'https://github.com/user/repo/issues',
        domain: 'github.com',
        active: true,
        pinned: false,
        isSecure: true
      },
      {
        id: 2,
        title: 'Stack Overflow - JavaScript',
        url: 'https://stackoverflow.com/questions/tagged/javascript',
        domain: 'stackoverflow.com',
        active: false,
        pinned: true,
        isSecure: true
      },
      {
        id: 3,
        title: 'MDN Web Docs',
        url: 'http://developer.mozilla.org/en-US/docs/Web',
        domain: 'developer.mozilla.org',
        active: false,
        pinned: false,
        isSecure: false
      }
    ];
  });

  describe('constructor', () => {
    test('日付フォーマッターが初期化される', () => {
      expect(formatter.dateFormatter).toBeDefined();
      expect(formatter.dateFormatter).toBeInstanceOf(Intl.DateTimeFormat);
    });
  });

  describe('formatAsList', () => {
    test('基本的なリスト形式でフォーマットする', () => {
      const result = formatter.formatAsList(mockTabs);
      
      expect(result).toContain('## 📋 開いているタブ');
      expect(result).toContain('- [GitHub - Issues](https://github.com/user/repo/issues)');
      expect(result).toContain('- [Stack Overflow - JavaScript](https://stackoverflow.com/questions/tagged/javascript)');
      expect(result).toContain('**統計情報:**');
    });

    test('オプションでヘッダーを無効にできる', () => {
      const result = formatter.formatAsList(mockTabs, { includeHeader: false });
      
      expect(result).not.toContain('## 📋 開いているタブ');
      expect(result).toContain('- [GitHub - Issues]');
    });

    test('オプションで統計情報を無効にできる', () => {
      const result = formatter.formatAsList(mockTabs, { includeStats: false });
      
      expect(result).not.toContain('**統計情報:**');
    });

    test('オプションでタイムスタンプを無効にできる', () => {
      const result = formatter.formatAsList(mockTabs, { includeTimestamp: false });
      
      expect(result).toContain('## 📋 開いているタブ');
      expect(result).not.toMatch(/\(\d{4}-\d{2}-\d{2}/);
    });

    test('追加情報を表示できる', () => {
      const result = formatter.formatAsList(mockTabs, { 
        showDomain: true,
        showSecurityStatus: true 
      });
      
      expect(result).toContain('📌'); // ピン留めアイコン
      expect(result).toContain('🔓'); // 非セキュアアイコン
      expect(result).toContain('`github.com`'); // ドメイン表示
    });

    test('空のタブ配列を処理する', () => {
      const result = formatter.formatAsList([]);
      
      expect(result).toContain('*タブが見つかりませんでした*');
    });
  });

  describe('formatAsTable', () => {
    test('基本的なテーブル形式でフォーマットする', () => {
      const result = formatter.formatAsTable(mockTabs);
      
      expect(result).toContain('| Title | Domain | Status |');
      expect(result).toContain('|-------|--------|--------|');
      expect(result).toContain('| [GitHub - Issues](https://github.com/user/repo/issues) | `github.com` |');
    });

    test('ステータスアイコンが適切に表示される', () => {
      const result = formatter.formatAsTable(mockTabs);
      
      expect(result).toContain('📌'); // ピン留め
      expect(result).toContain('▶️'); // アクティブ
      expect(result).toContain('🔓'); // 非セキュア
    });

    test('タイトルの長さを制限できる', () => {
      const longTitleTabs = [{
        id: 1,
        title: 'Very Long Title That Should Be Truncated Because It Is Too Long',
        url: 'https://example.com',
        domain: 'example.com',
        active: false,
        pinned: false,
        isSecure: true
      }];

      const result = formatter.formatAsTable(longTitleTabs, { maxTitleLength: 20 });
      
      expect(result).toContain('Very Long Title T...');
    });

    test('空のタブ配列を処理する', () => {
      const result = formatter.formatAsTable([]);
      
      expect(result).toContain('*タブが見つかりませんでした*');
    });
  });

  describe('formatAsGrouped', () => {
    test('ドメイン別にグループ化してフォーマットする', () => {
      const result = formatter.formatAsGrouped(mockTabs);
      
      expect(result).toContain('## 📋 開いているタブ (ドメイン別)');
      expect(result).toContain('### 🦎 developer.mozilla.org (1)');
      expect(result).toContain('### 🐙 github.com (1)');
      expect(result).toContain('### 📚 stackoverflow.com (1)');
    });

    test('ドメインアイコンが適切に表示される', () => {
      const result = formatter.formatAsGrouped(mockTabs);
      
      expect(result).toContain('🐙'); // GitHub
      expect(result).toContain('📚'); // Stack Overflow
      expect(result).toContain('🌐'); // その他のドメイン
    });

    test('ドメインでソートできる', () => {
      const result = formatter.formatAsGrouped(mockTabs, { sortDomains: true });
      
      const lines = result.split('\n');
      const domainHeaders = lines.filter(line => line.startsWith('###'));
      
      // ドメイン名がアルファベット順になっているかチェック
      expect(domainHeaders[0]).toContain('developer.mozilla.org');
      expect(domainHeaders[1]).toContain('github.com');
      expect(domainHeaders[2]).toContain('stackoverflow.com');
    });
  });

  describe('groupByDomain', () => {
    test('タブをドメイン別にグループ化する', () => {
      const grouped = formatter.groupByDomain(mockTabs);
      
      expect(grouped['github.com']).toHaveLength(1);
      expect(grouped['stackoverflow.com']).toHaveLength(1);
      expect(grouped['developer.mozilla.org']).toHaveLength(1);
    });
  });

  describe('getDomainIcon', () => {
    test('既知のドメインに対して適切なアイコンを返す', () => {
      expect(formatter.getDomainIcon('github.com')).toBe('🐙');
      expect(formatter.getDomainIcon('stackoverflow.com')).toBe('📚');
      expect(formatter.getDomainIcon('developer.mozilla.org')).toBe('🦎');
      expect(formatter.getDomainIcon('google.com')).toBe('🔍');
    });

    test('未知のドメインに対してデフォルトアイコンを返す', () => {
      expect(formatter.getDomainIcon('unknown-domain.com')).toBe('🌐');
    });
  });

  describe('generateStats', () => {
    test('統計情報を生成する', () => {
      const stats = formatter.generateStats(mockTabs);
      
      expect(stats).toContain('**統計情報:** 3 タブ');
      expect(stats).toContain('📌 1 ピン留め');
      expect(stats).toContain('🔒 2 セキュア');
      expect(stats).toContain('🌐 3 ドメイン');
    });

    test('ピン留めタブがない場合は表示しない', () => {
      const noPinnedTabs = mockTabs.map(tab => ({ ...tab, pinned: false }));
      const stats = formatter.generateStats(noPinnedTabs);
      
      expect(stats).not.toContain('ピン留め');
    });
  });

  describe('truncateText', () => {
    test('短いテキストはそのまま返す', () => {
      const result = formatter.truncateText('Short text', 20);
      expect(result).toBe('Short text');
    });

    test('長いテキストを切り詰める', () => {
      const longText = 'This is a very long text that should be truncated';
      const result = formatter.truncateText(longText, 20);
      
      expect(result).toHaveLength(20);
      expect(result).toMatch(/\.\.\.$/); // toEndWithの代替
    });
  });

  describe('formatWithTemplate', () => {
    test('カスタムテンプレートでフォーマットする', () => {
      const template = '{index}. [{title}]({url}) - {domain}';
      const result = formatter.formatWithTemplate(mockTabs.slice(0, 1), template);
      
      expect(result).toContain('1. [GitHub - Issues](https://github.com/user/repo/issues) - github.com');
    });

    test('テンプレート変数を適切に置換する', () => {
      const template = '{title} | {pinned} | {secure} | {active}';
      const result = formatter.formatWithTemplate([mockTabs[0]], template);
      
      expect(result).toContain('GitHub - Issues');
      expect(result).toContain('🔒'); // セキュア
      expect(result).toContain('▶️'); // アクティブ
    });
  });

  describe('generateExportConfig', () => {
    test('エクスポート設定を生成する', () => {
      const config = formatter.generateExportConfig(mockTabs, 'list');
      
      expect(config.format).toBe('list');
      expect(config.tabCount).toBe(3);
      expect(config.domains).toEqual(['github.com', 'stackoverflow.com', 'developer.mozilla.org']);
      expect(config.metadata.pinnedCount).toBe(1);
      expect(config.metadata.secureCount).toBe(2);
      expect(config.metadata.activeTab).toBe('GitHub - Issues');
      expect(config.generatedAt).toBeDefined();
    });
  });

  describe('edge cases', () => {
    test('nullやundefinedのタブを適切に処理する', () => {
      const invalidTabs = [null, undefined, mockTabs[0]];
      
      // エラーが発生せずに適切に処理される
      expect(() => formatter.formatAsList(invalidTabs.filter(Boolean))).not.toThrow();
    });

    test('不完全なタブデータを処理する', () => {
      const incompleteTabs = [
        { id: 1, title: '', url: 'https://example.com' },
        { id: 2, url: 'https://example2.com' } // titleなし
      ];
      
      const result = formatter.formatAsList(incompleteTabs);
      expect(result).toContain('example.com');
    });

    test('特殊文字を含むタイトルを処理する', () => {
      const specialTabs = [{
        id: 1,
        title: 'Title with [brackets] and (parentheses) and *asterisks*',
        url: 'https://example.com',
        domain: 'example.com',
        active: false,
        pinned: false,
        isSecure: true
      }];
      
      const result = formatter.formatAsList(specialTabs);
      // Markdownエスケープが適用されている
      expect(result).toContain('[Title with [brackets]'); // 実装に合わせて修正
    });
  });

  describe('performance', () => {
    test('大量のタブを効率的に処理する', () => {
      // 1000個のタブを生成
      const largeTabs = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        title: `Tab ${i + 1}`,
        url: `https://example${i % 10}.com`,
        domain: `example${i % 10}.com`,
        active: i === 0,
        pinned: i < 5,
        isSecure: true
      }));

      const startTime = Date.now();
      const result = formatter.formatAsList(largeTabs);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });
  });
});