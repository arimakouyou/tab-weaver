/**
 * MarkdownFormatter - タブ情報をMarkdown形式に変換するクラス
 */
class MarkdownFormatter {
    constructor() {
        this.dateFormatter = new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    /**
     * タブをリスト形式のMarkdownに変換
     * @param {Array} tabs - タブ情報の配列
     * @param {Object} options - オプション設定
     * @returns {string} Markdown形式の文字列
     */
    formatAsList(tabs, options = {}) {
        const {
            includeHeader = true,
            includeStats = true,
            includeTimestamp = true,
            showDomain = false,
            showSecurityStatus = false
        } = options;

        let markdown = '';

        // ヘッダー
        if (includeHeader) {
            markdown += '## 📋 開いているタブ';
            if (includeTimestamp) {
                const timestamp = this.dateFormatter.format(new Date());
                markdown += ` (${timestamp})`;
            }
            markdown += '\n\n';
        }

        // タブリスト
        if (tabs.length === 0) {
            markdown += '*タブが見つかりませんでした*\n\n';
        } else {
            tabs.forEach(tab => {
                let line = `- [${tab.title}](${tab.url})`;
                
                // 追加情報
                const extras = [];
                if (tab.pinned) extras.push('📌');
                if (showSecurityStatus && !tab.isSecure) extras.push('🔓');
                if (showDomain) extras.push(`\`${tab.domain}\``);
                
                if (extras.length > 0) {
                    line += ` ${extras.join(' ')}`;
                }
                
                markdown += line + '\n';
            });
            markdown += '\n';
        }

        // 統計情報
        if (includeStats && tabs.length > 0) {
            const stats = this.generateStats(tabs);
            markdown += stats;
        }

        return markdown.trim();
    }

    /**
     * タブをテーブル形式のMarkdownに変換
     * @param {Array} tabs - タブ情報の配列
     * @param {Object} options - オプション設定
     * @returns {string} Markdown形式の文字列
     */
    formatAsTable(tabs, options = {}) {
        const {
            includeHeader = true,
            includeStats = true,
            includeTimestamp = true,
            maxTitleLength = 40
        } = options;

        let markdown = '';

        // ヘッダー
        if (includeHeader) {
            markdown += '## 📋 開いているタブ';
            if (includeTimestamp) {
                const timestamp = this.dateFormatter.format(new Date());
                markdown += ` (${timestamp})`;
            }
            markdown += '\n\n';
        }

        if (tabs.length === 0) {
            markdown += '*タブが見つかりませんでした*\n\n';
        } else {
            // テーブルヘッダー
            markdown += '| Title | Domain | Status |\n';
            markdown += '|-------|--------|--------|\n';

            // テーブル行
            tabs.forEach(tab => {
                const title = this.truncateText(tab.title, maxTitleLength);
                const domain = tab.domain;
                
                const statusIcons = [];
                if (tab.pinned) statusIcons.push('📌');
                if (tab.active) statusIcons.push('▶️');
                if (!tab.isSecure) statusIcons.push('🔓');
                
                const status = statusIcons.length > 0 ? statusIcons.join(' ') : '-';
                
                markdown += `| [${title}](${tab.url}) | \`${domain}\` | ${status} |\n`;
            });
            markdown += '\n';
        }

        // 統計情報
        if (includeStats && tabs.length > 0) {
            const stats = this.generateStats(tabs);
            markdown += stats;
        }

        return markdown.trim();
    }

    /**
     * タブをドメイン別グループ形式のMarkdownに変換
     * @param {Array} tabs - タブ情報の配列
     * @param {Object} options - オプション設定
     * @returns {string} Markdown形式の文字列
     */
    formatAsGrouped(tabs, options = {}) {
        const {
            includeHeader = true,
            includeStats = true,
            includeTimestamp = true,
            sortDomains = true,
            preGrouped = null
        } = options;

        let markdown = '';

        // ヘッダー
        if (includeHeader) {
            markdown += '## 📋 開いているタブ (ドメイン別)';
            if (includeTimestamp) {
                const timestamp = this.dateFormatter.format(new Date());
                markdown += ` (${timestamp})`;
            }
            markdown += '\n\n';
        }

        if (tabs.length === 0) {
            markdown += '*タブが見つかりませんでした*\n\n';
        } else {
            // ドメイン別にグループ化（preGroupedがあればそれを使用）
            const grouped = preGrouped || this.groupByDomain(tabs);
            const domains = sortDomains ? 
                Object.keys(grouped).sort() : 
                Object.keys(grouped);

            domains.forEach(domain => {
                const domainTabs = grouped[domain];
                const domainIcon = this.getDomainIcon(domain);
                
                markdown += `### ${domainIcon} ${domain} (${domainTabs.length})\n\n`;
                
                domainTabs.forEach(tab => {
                    let line = `- [${tab.title}](${tab.url})`;
                    
                    const extras = [];
                    if (tab.pinned) extras.push('📌');
                    if (tab.active) extras.push('▶️');
                    if (!tab.isSecure) extras.push('🔓');
                    
                    if (extras.length > 0) {
                        line += ` ${extras.join(' ')}`;
                    }
                    
                    markdown += line + '\n';
                });
                
                markdown += '\n';
            });
        }

        // 統計情報
        if (includeStats && tabs.length > 0) {
            const stats = this.generateStats(tabs);
            markdown += stats;
        }

        return markdown.trim();
    }

    /**
     * タブをタブグループ別の形式のMarkdownに変換
     * @param {Object} groupedTabs - タブグループ別にグループ化されたタブ
     * @param {Object} options - オプション設定
     * @returns {string} Markdown形式の文字列
     */
    formatAsTabGroups(groupedTabs, options = {}) {
        const {
            includeHeader = true,
            includeStats = true,
            includeTimestamp = true
        } = options;

        let markdown = '';

        // ヘッダー
        if (includeHeader) {
            markdown += '## 📋 開いているタブ (タブグループ別)';
            if (includeTimestamp) {
                const timestamp = this.dateFormatter.format(new Date());
                markdown += ` (${timestamp})`;
            }
            markdown += '\n\n';
        }

        if (!groupedTabs || Object.keys(groupedTabs).length === 0) {
            markdown += '*タブが見つかりませんでした*\n\n';
        } else {
            // グループ化されたタブを表示
            Object.entries(groupedTabs).forEach(([, groupData]) => {
                if (groupData.type === 'tabGroup') {
                    const group = groupData.group;
                    const groupTabs = groupData.tabs;
                    const colorIcon = this.getTabGroupColorIcon(group.color);
                    const collapsedIcon = group.collapsed ? '📁' : '📂';
                    
                    const title = group.title || 'Untitled Group';
                    markdown += `### ${colorIcon} ${collapsedIcon} ${title} (${groupTabs.length})\n\n`;
                    
                    groupTabs.forEach(tab => {
                        let line = `- [${tab.title}](${tab.url})`;
                        
                        const extras = [];
                        if (tab.pinned) extras.push('📌');
                        if (tab.active) extras.push('▶️');
                        if (!tab.isSecure) extras.push('🔓');
                        
                        if (extras.length > 0) {
                            line += ` ${extras.join(' ')}`;
                        }
                        
                        markdown += line + '\n';
                    });
                    
                    markdown += '\n';
                } else if (groupData.type === 'ungrouped') {
                    const ungroupedTabs = groupData.tabs;
                    markdown += `### 🔗 グループなし (${ungroupedTabs.length})\n\n`;
                    
                    ungroupedTabs.forEach(tab => {
                        let line = `- [${tab.title}](${tab.url})`;
                        
                        const extras = [];
                        if (tab.pinned) extras.push('📌');
                        if (tab.active) extras.push('▶️');
                        if (!tab.isSecure) extras.push('🔓');
                        
                        if (extras.length > 0) {
                            line += ` ${extras.join(' ')}`;
                        }
                        
                        markdown += line + '\n';
                    });
                    
                    markdown += '\n';
                }
            });
        }

        // 統計情報
        if (includeStats && groupedTabs) {
            const allTabs = this.flattenGroupedTabs(groupedTabs);
            if (allTabs.length > 0) {
                const stats = this.generateStats(allTabs);
                markdown += stats;
            }
        }

        return markdown.trim();
    }

    /**
     * タブをドメイン別にグループ化
     * @deprecated TabManager.groupTabsByDomain() を使用してください
     * @param {Array} tabs - タブ情報の配列
     * @returns {Object} ドメイン別にグループ化されたタブ
     */
    groupByDomain(tabs) {
        const grouped = {};

        tabs.forEach(tab => {
            const domain = tab.domain || 'unknown';
            if (!grouped[domain]) {
                grouped[domain] = [];
            }
            grouped[domain].push(tab);
        });
        
        return grouped;
    }

    /**
     * ドメインに対応するアイコンを取得
     * @param {string} domain - ドメイン名
     * @returns {string} アイコン
     */
    getDomainIcon(domain) {
        const iconMap = {
            'github.com': '🐙',
            'stackoverflow.com': '📚',
            'developer.mozilla.org': '🦎',
            'google.com': '🔍',
            'youtube.com': '📺',
            'twitter.com': '🐦',
            'facebook.com': '📘',
            'linkedin.com': '💼',
            'reddit.com': '🤖',
            'wikipedia.org': '📖'
        };
        
        return iconMap[domain] || '🌐';
    }

    /**
     * タブグループカラーに対応するアイコンを取得
     * @param {string} color - タブグループカラー
     * @returns {string} アイコン
     */
    getTabGroupColorIcon(color) {
        const colorIconMap = {
            'grey': '⚪',
            'blue': '🔵',
            'red': '🔴',
            'yellow': '🟡',
            'green': '🟢',
            'pink': '🩷',
            'purple': '🟣',
            'cyan': '🩵',
            'orange': '🟠'
        };
        
        return colorIconMap[color] || '⚫';
    }

    /**
     * グループ化されたタブを平坦化
     * @param {Object} groupedTabs - グループ化されたタブ
     * @returns {Array} 平坦化されたタブ配列
     */
    flattenGroupedTabs(groupedTabs) {
        const allTabs = [];
        
        Object.values(groupedTabs).forEach(groupData => {
            if (groupData.tabs && Array.isArray(groupData.tabs)) {
                allTabs.push(...groupData.tabs);
            }
        });
        
        return allTabs;
    }

    /**
     * 統計情報を生成
     * @param {Array} tabs - タブ情報の配列
     * @returns {string} 統計情報のMarkdown
     */
    generateStats(tabs) {
        const totalTabs = tabs.length;
        const pinnedTabs = tabs.filter(tab => tab.pinned).length;
        const secureTabs = tabs.filter(tab => tab.isSecure).length;
        const groupedTabs = tabs.filter(tab => tab.groupId).length;
        const uniqueDomains = new Set(tabs.map(tab => tab.domain)).size;
        const uniqueGroups = new Set(tabs.filter(tab => tab.groupId).map(tab => tab.groupId)).size;
        
        let stats = '---\n\n';
        stats += `**統計情報:** ${totalTabs} タブ`;
        
        if (pinnedTabs > 0) {
            stats += ` | 📌 ${pinnedTabs} ピン留め`;
        }
        
        if (groupedTabs > 0) {
            stats += ` | 📁 ${groupedTabs} グループ化済み (${uniqueGroups} グループ)`;
        }
        
        stats += ` | 🔒 ${secureTabs} セキュア`;
        stats += ` | 🌐 ${uniqueDomains} ドメイン`;
        
        return stats;
    }

    /**
     * テキストを指定長で切り詰める
     * @param {string} text - 元のテキスト
     * @param {number} maxLength - 最大長
     * @returns {string} 切り詰められたテキスト
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * カスタムフォーマットでタブを変換
     * @param {Array} tabs - タブ情報の配列
     * @param {string} template - テンプレート文字列
     * @returns {string} フォーマット済み文字列
     */
    formatWithTemplate(tabs, template) {
        let output = '';
        
        tabs.forEach((tab, index) => {
            let line = template;
            
            // テンプレート変数を置換
            line = line.replace(/\{title\}/g, tab.title);
            line = line.replace(/\{url\}/g, tab.url);
            line = line.replace(/\{domain\}/g, tab.domain);
            line = line.replace(/\{index\}/g, index + 1);
            line = line.replace(/\{pinned\}/g, tab.pinned ? '📌' : '');
            line = line.replace(/\{secure\}/g, tab.isSecure ? '🔒' : '🔓');
            line = line.replace(/\{active\}/g, tab.active ? '▶️' : '');
            
            output += line + '\n';
        });
        
        return output.trim();
    }

    /**
     * エクスポート用の設定を生成
     * @param {Array} tabs - タブ情報の配列
     * @param {string} format - フォーマット形式
     * @returns {Object} エクスポート設定
     */
    generateExportConfig(tabs, format) {
        const config = {
            format,
            generatedAt: new Date().toISOString(),
            tabCount: tabs.length,
            domains: [...new Set(tabs.map(tab => tab.domain))],
            metadata: {
                pinnedCount: tabs.filter(tab => tab.pinned).length,
                secureCount: tabs.filter(tab => tab.isSecure).length,
                activeTab: tabs.find(tab => tab.active)?.title || null
            }
        };
        
        return config;
    }
}

// エクスポート（モジュール環境の場合）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownFormatter;
}