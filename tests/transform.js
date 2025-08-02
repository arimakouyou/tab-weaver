/**
 * Jest Transform for ES6 Classes to CommonJS
 * Chrome Extension用のクラスをテスト環境で使用可能にする
 */

module.exports = {
  process(sourceText, sourcePath, options) {
    // Chrome Extension用のES6クラスをCommonJS形式に変換
    if (sourcePath.includes('popup/') && sourcePath.endsWith('.js')) {
      let transformedCode = sourceText;
      
      // ES6クラスメソッド構文を従来の関数構文に変換
      transformedCode = transformedCode.replace(
        /(\s+)(\w+)\(([^)]*)\)\s*{/g,
        '$1$2: function($3) {'
      );
      
      // ES6オブジェクトメソッド省略記法を変換
      transformedCode = transformedCode.replace(
        /(\s+)(\w+)\s*\(/g,
        '$1$2: function('
      );
      
      // アロー関数を通常の関数に変換
      transformedCode = transformedCode.replace(
        /=>\s*{/g,
        'function() {'
      );
      transformedCode = transformedCode.replace(
        /=>\s*([^{])/g,
        'function() { return $1; }'
      );
      
      // ファイル末尾にmodule.exports追加
      const classMatch = sourceText.match(/^class\s+(\w+)/m);
      if (classMatch) {
        const className = classMatch[1];
        transformedCode += `\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = ${className};\n}\n`;
      }
      
      return {
        code: transformedCode
      };
    }
    
    // その他のファイルはそのまま返す
    return {
      code: sourceText
    };
  }
};