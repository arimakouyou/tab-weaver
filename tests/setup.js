/**
 * Jest テストセットアップファイル
 * Chrome Extension API のモックとテスト環境の初期化
 */

// Jest拡張メソッドを有効化
require('jest-extended');

// Chrome Extension API のモック
global.chrome = {
  tabs: {
    query: jest.fn(),
    onCreated: {
      addListener: jest.fn()
    },
    onRemoved: {
      addListener: jest.fn()
    },
    onUpdated: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  },
  runtime: {
    getManifest: jest.fn(() => ({
      version: '1.0.0',
      name: 'Tab Weaver Test'
    })),
    onInstalled: {
      addListener: jest.fn()
    },
    onMessage: {
      addListener: jest.fn()
    },
    onSuspend: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn()
  },
  contextMenus: {
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  },
  notifications: {
    create: jest.fn()
  },
  action: {
    onClicked: {
      addListener: jest.fn()
    }
  }
};

// Clipboard API のモック
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve(''))
  },
  permissions: {
    query: jest.fn(() => Promise.resolve({ state: 'granted' }))
  }
});

// Performance API のモック
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntries: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
};

// PerformanceObserver のモック
global.PerformanceObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn()
}));

// URL のモック（Node.js環境では利用可能だが念のため）
if (typeof URL === 'undefined') {
  global.URL = require('url').URL;
}

// DOM イベントのモック
global.Event = class Event {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = options.bubbles || false;
    this.cancelable = options.cancelable || false;
    this.defaultPrevented = false;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }

  stopPropagation() {
    // モック実装
  }
};

// CustomEvent のモック
global.CustomEvent = class CustomEvent extends Event {
  constructor(type, options = {}) {
    super(type, options);
    this.detail = options.detail;
  }
};

// ResizeObserver のモック
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// IntersectionObserver のモック
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// localStorage のモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.localStorage = localStorageMock;

// sessionStorage のモック
global.sessionStorage = localStorageMock;

// console のモックとログレベル制御
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.log,
  debug: jest.fn(),
  info: originalConsole.info,
  warn: originalConsole.warn,
  error: originalConsole.error
};

// テスト後のクリーンアップ
afterEach(() => {
  // モックのリセット
  jest.clearAllMocks();
  
  // Chrome API モックのデフォルト動作を復元
  chrome.tabs.query.mockReset();
  chrome.storage.local.get.mockReset();
  chrome.storage.local.set.mockReset();
  chrome.runtime.getManifest.mockReturnValue({
    version: '1.0.0',
    name: 'Tab Weaver Test'
  });
});

// グローバルエラーハンドラー
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise rejection in tests:', error);
});

// テスト用ユーティリティ関数
global.testUtils = {
  // テスト用のタブデータを生成
  createMockTab: (overrides = {}) => ({
    id: 1,
    title: 'Test Tab',
    url: 'https://example.com',
    active: false,
    pinned: false,
    windowId: 1,
    favIconUrl: 'https://example.com/favicon.ico',
    ...overrides
  }),

  // テスト用の複数タブデータを生成
  createMockTabs: (count = 3) => {
    return Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      title: `Test Tab ${index + 1}`,
      url: `https://example${index + 1}.com`,
      active: index === 0,
      pinned: index === 0,
      windowId: 1,
      favIconUrl: `https://example${index + 1}.com/favicon.ico`
    }));
  },

  // DOM要素を作成するヘルパー
  createElement: (tag, attributes = {}, textContent = '') => {
    const element = document.createElement(tag);
    Object.assign(element, attributes);
    if (textContent) {
      element.textContent = textContent;
    }
    return element;
  },

  // 非同期処理の待機
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // イベントの発火
  fireEvent: (element, eventType, options = {}) => {
    const event = new Event(eventType, { bubbles: true, ...options });
    element.dispatchEvent(event);
    return event;
  }
};

// デバッグ用の設定
if (process.env.DEBUG_TESTS) {
  console.log('🧪 Test environment initialized');
  console.log('Chrome API mocked:', !!global.chrome);
  console.log('Test utilities available:', !!global.testUtils);
}