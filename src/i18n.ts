export interface I18nStrings {
    // Command
    openEmojiPicker: string;
    // Settings tab
    settingsTitle: string;
    emojiHeight: string;
    emojiHeightDesc: string;
    searchPlaceholder: string;
    searchPlaceholderDesc: string;
    advancedSearchTip: string;
    owoJsonUrls: string;
    owoJsonUrlsDesc: string;
    updateCollections: string;
    updateCollectionsTooltip: string;
    rememberLastCollection: string;
    rememberLastCollectionDesc: string;
    emojiSpacing: string;
    addSpaceAfterEmojiSingle: string;
    addSpaceAfterEmojiSingleDesc: string;
    addSpaceAfterEmojiMulti: string;
    addSpaceAfterEmojiMultiDesc: string;
    customCssClasses: string;
    customCssClassesDesc: string;
    customEmojiTemplate: string;
    customEmojiTemplateDesc: string;

    // Quick insertion
    quickInsertion: string;
    enableQuickInsertion: string;
    enableQuickInsertionDesc: string;
    quickInsertionTrigger: string;
    quickInsertionTriggerDesc: string;

    // Advanced search
    advancedSearch: string;
    enableRegexSearch: string;
    enableRegexSearchDesc: string;
    enableFuzzySearch: string;
    enableFuzzySearchDesc: string;

    // Recent emojis
    recentEmojis: string;
    enableRecentEmojis: string;
    enableRecentEmojisDesc: string;
    maxRecentEmojis: string;
    maxRecentEmojisDesc: string;
    clearRecentEmojis: string;
    clearRecentEmojisDesc: string;
    clearRecentEmojisButton: string;
    recentEmojisCleared: string;
    failedToClearRecentEmojis: string;
    preferRecentOverRemembered: string;
    preferRecentOverRememberedDesc: string;

    // Button states
    loaded: string;
    update: string;
    loading: string;
    collectionsUpdated: string;
    updateFailed: string;

    // Modal
    multiSelect: string;
    loadingEmojis: string;
    fetchingEmojiCollections: string;
    usingCachedData: string;
    noEmojiCollections: string;
    addOwoJsonUrls: string;
    failedToLoadCollections: string;
    error: string;
    checkOwoJsonUrls: string;
    noEmojisFound: string;
    all: string;
    recent: string;

    // Notices
    invalidUrls: string;
    collectionsUpdateSuccess: string;
    collectionsUpdateFailed: string;
    noActiveCollection: string;
}

const EN_STRINGS: I18nStrings = {
    // Command
    openEmojiPicker: 'Open emoji picker',
    // Settings tab
    settingsTitle: 'General',
    emojiHeight: 'Emoji height',
    emojiHeightDesc: 'CSS height value for emoji display - width will be auto (e.g., 1.2em, 16px)',
    searchPlaceholder: 'Search placeholder',
    searchPlaceholderDesc: 'Placeholder text shown in the emoji search input',
    advancedSearchTip: 'Advanced search: Use "collection.*pattern" for collection-specific search, regex patterns, or fuzzy matching',
    owoJsonUrls: 'OWO JSON URLs or local paths',
    owoJsonUrlsDesc: 'OWO emoji packs are supported; separate multiple entries with commas. Find more emoji packs at: https://emoticons.hzchu.top/ `JSON` OWO Files will be cached until you click "Update". ',
    updateCollections: 'Update collections',
    updateCollectionsTooltip: 'Load emoji collections from the URLs above',
    rememberLastCollection: 'Remember last collection',
    rememberLastCollectionDesc: 'Open last selected emoji collection when opening the picker',
    emojiSpacing: 'Emoji spacing',
    addSpaceAfterEmojiSingle: 'Add space after emoji (single-select)',
    addSpaceAfterEmojiSingleDesc: 'Automatically add a space after inserting an emoji in single-select mode',
    addSpaceAfterEmojiMulti: 'Add space after emoji (multi-select)',
    addSpaceAfterEmojiMultiDesc: 'Automatically add a space after inserting an emoji in multi-select mode',
    customCssClasses: 'Custom CSS classes',
    customCssClassesDesc: 'Additional CSS classes to apply to emoji elements (space-separated)',
    customEmojiTemplate: 'Custom emoji template',
    customEmojiTemplateDesc: 'Custom template for emoji insertion. Variables: `{url}`, `{name}`, `{text}`, `{category}`, `{type}`, `{classes}`, `{filename}`, `{fullfilename}`. Leave empty for default HTML.',

    // Quick insertion
    quickInsertion: 'Quick insertion',
    enableQuickInsertion: 'Enable quick emoji insertion',
    enableQuickInsertionDesc: 'Allow typing trigger string followed by emoji name to show a dropdown with matching emojis',
    quickInsertionTrigger: 'Trigger string(s)',
    quickInsertionTriggerDesc: 'Use `|` to separate alternatives. Examples: `::|：：` (both work), `:` (single), `@@|##` (custom). Leave empty for default trigger',

    // Advanced search
    advancedSearch: 'Advanced search',
    enableRegexSearch: 'Enable regex search',
    enableRegexSearchDesc: 'Support regular expression patterns in search (e.g., ".*heart.*").',
    enableFuzzySearch: 'Enable fuzzy search',
    enableFuzzySearchDesc: 'Support fuzzy matching and phonetic similarity in search.',

    // Recent emojis
    recentEmojis: 'Recent emojis',
    enableRecentEmojis: 'Enable recent emojis',
    enableRecentEmojisDesc: 'Show recently used emojis in a separate tab',
    maxRecentEmojis: 'Max recent emojis',
    maxRecentEmojisDesc: 'Maximum number of recent emojis to keep (1-50)',
    clearRecentEmojis: 'Clear recent emojis',
    clearRecentEmojisDesc: 'Remove all recently used emojis',
    clearRecentEmojisButton: 'Clear',
    recentEmojisCleared: 'Recent emojis cleared',
    failedToClearRecentEmojis: 'Failed to clear recent emojis',
    preferRecentOverRemembered: 'Prefer recent over remembered collection',
    preferRecentOverRememberedDesc: 'When opening the picker, show recent emojis first if available, instead of the last remembered collection',

    // Button states
    loaded: 'Loaded',
    update: 'Update',
    loading: 'Loading...',
    collectionsUpdated: 'Collections updated!',
    updateFailed: 'Update failed',

    // Modal
    multiSelect: 'Multi-select',
    loadingEmojis: 'Loading emojis...',
    fetchingEmojiCollections: 'Fetching emoji collections...',
    usingCachedData: 'Using cached data, refreshing...',
    noEmojiCollections: 'No emoji collections configured.',
    addOwoJsonUrls: 'Please add OWO JSON URLs in the plugin settings.',
    failedToLoadCollections: 'Failed to load emoji collections.',
    error: 'Error: ',
    checkOwoJsonUrls: 'Please check your OWO JSON URLs in the plugin settings.',
    noEmojisFound: 'No emojis found',
    all: 'All',
    recent: 'Recent',

    // Notices
    invalidUrls: 'Please enter valid URLs or local file paths (.json) separated by commas',
    collectionsUpdateSuccess: 'Emoji collections updated! Loaded {0} collections with {1} emojis.',
    collectionsUpdateFailed: 'Failed to update emoji collections: {0}',
    noActiveCollection: 'No active editor found. Please open a note to use the emoji picker.'
};

const ZH_CN_STRINGS: I18nStrings = {
    // Command
    openEmojiPicker: '打开表情选择器',
    // Settings tab
    settingsTitle: '基本设置',
    emojiHeight: '表情大小',
    emojiHeightDesc: '设置表情的高度，宽度会自动适应（如：1.2em 或 16px）',
    searchPlaceholder: '搜索框提示文字',
    searchPlaceholderDesc: '搜索框里显示的提示文字',
    advancedSearchTip: '搜索技巧：输入 "集合名.*关键词" 可以在特定集合里搜索，支持正则表达式和模糊搜索',
    owoJsonUrls: 'OWO 表情包地址',
    owoJsonUrlsDesc: '支持 OWO 格式的表情包，多个地址用英文逗号隔开。可在 https://emoticons.hzchu.top/ 找到更多表情包。OWO 格式的`JSON`文件会保存在本地，直到你点“更新”才会重新加载。',
    updateCollections: '更新表情包',
    updateCollectionsTooltip: '从上面填的地址重新加载表情包',
    rememberLastCollection: '记住上次用的表情包',
    rememberLastCollectionDesc: '下次打开时自动切换到上次选的表情包',
    emojiSpacing: '表情间距',
    addSpaceAfterEmojiSingle: '插入后自动加空格（单选时）',
    addSpaceAfterEmojiSingleDesc: '选一个表情插入后，自动在后面加入空格',
    addSpaceAfterEmojiMulti: '插入后自动加空格（多选时）',
    addSpaceAfterEmojiMultiDesc: '选多个表情插入后，自动在后面加入空格',
    customCssClasses: '自定义样式类名',
    customCssClassesDesc: '给表情添加额外的 CSS 类名（多个用空格隔开）',
    customEmojiTemplate: '自定义插入模板',
    customEmojiTemplateDesc: '自定义表情插入的格式。可用变量：`{url}`、`{name}`、`{text}`、`{category}`、`{type}`、`{classes}`、`{filename}`、`{fullfilename}`。留空使用默认 HTML。',

    // Quick insertion
    quickInsertion: '快捷输入',
    enableQuickInsertion: '开启快捷输入',
    enableQuickInsertionDesc: '输入触发词 + 表情名显示快速插入候选框',
    quickInsertionTrigger: '触发词',
    quickInsertionTriggerDesc: '用 `|` 分隔多个触发词。比如：`::|：：`（中英文冒号都行）、`:` (单个冒号)、`@@|##`（自定义符号）。留空使用默认',

    // Advanced search
    advancedSearch: '高级搜索',
    enableRegexSearch: '开启正则搜索',
    enableRegexSearchDesc: '支持用正则表达式搜索（比如 ".*heart.*" 能匹配所有包含 heart 的表情）',
    enableFuzzySearch: '开启模糊搜索',
    enableFuzzySearchDesc: '支持模糊匹配，输错几个字母也能搜到',

    // Recent emojis
    recentEmojis: '最近使用',
    enableRecentEmojis: '显示最近使用的表情',
    enableRecentEmojisDesc: '在单独的标签页中显示最近使用的表情符号',
    maxRecentEmojis: '最大最近表情符号数量',
    maxRecentEmojisDesc: '保留的最近表情符号的最大数量（1-50）',
    clearRecentEmojis: '清空历史记录',
    clearRecentEmojisDesc: '删除所有最近使用的表情记录',
    clearRecentEmojisButton: '清空',
    recentEmojisCleared: '历史记录已清空',
    failedToClearRecentEmojis: '清空失败',
    preferRecentOverRemembered: '优先显示最近使用',
    preferRecentOverRememberedDesc: '打开选择器时，如果有最近用过的表情，就先显示最近使用页面，而不是上次记住的表情包',

    // Button states
    loaded: '已加载',
    update: '更新',
    loading: '加载中...',
    collectionsUpdated: '更新成功！',
    updateFailed: '更新失败',

    // Modal
    multiSelect: '多选模式',
    loadingEmojis: '正在加载表情...',
    fetchingEmojiCollections: '正在获取表情包...',
    usingCachedData: '使用缓存数据，正在刷新...',
    noEmojiCollections: '还没有添加表情包',
    addOwoJsonUrls: '去插件设置里添加表情包地址吧',
    failedToLoadCollections: '表情包加载失败',
    error: '出错了：',
    checkOwoJsonUrls: '检查一下设置里的表情包地址是否正确',
    noEmojisFound: '没找到表情',
    all: '全部',
    recent: '最近',

    // Notices
    invalidUrls: '请输入正确的网址或本地文件路径（.json 文件），多个用逗号隔开',
    collectionsUpdateSuccess: '表情包更新成功！加载了 {0} 个表情包，一共 {1} 个表情',
    collectionsUpdateFailed: '表情包更新失败：{0}',
    noActiveCollection: '没有打开的笔记。请先打开一个笔记再使用表情选择器'
};

export class I18n {
    private static instance: I18n;
    private currentLanguage: string = 'en';
    private strings: I18nStrings = EN_STRINGS;

    private constructor() {
        this.detectLanguage();
    }

    public static getInstance(): I18n {
        if (!I18n.instance) {
            I18n.instance = new I18n();
        }
        return I18n.instance;
    }

    private detectLanguage(): void {
        // Detect language from Obsidian locale or browser
        interface WindowWithMoment extends Window {
            moment?: {
                locale?: () => string;
            };
        }

        const obsidianLang = (window as WindowWithMoment).moment?.locale?.() || navigator.language;

        if (obsidianLang.startsWith('zh')) {
            this.setLanguage('zh-CN');
        } else {
            this.setLanguage('en');
        }
    }

    public setLanguage(language: string): void {
        this.currentLanguage = language;

        switch (language) {
            case 'zh-CN':
            case 'zh':
                this.strings = ZH_CN_STRINGS;
                break;
            default:
                this.strings = EN_STRINGS;
                break;
        }
    }

    public t(key: keyof I18nStrings, ...args: string[]): string {
        let text = this.strings[key] || key;

        // Simple string interpolation for {0}, {1}, etc.
        args.forEach((arg, index) => {
            text = text.replace(`{${index}}`, arg);
        });

        return text;
    }

    public getCurrentLanguage(): string {
        return this.currentLanguage;
    }
}

// Export lazy-loaded singleton instance
let _i18nInstance: I18n | null = null;
export const i18n = {
    t: (key: keyof I18nStrings, ...args: string[]): string => {
        if (!_i18nInstance) {
            _i18nInstance = I18n.getInstance();
        }
        return _i18nInstance.t(key, ...args);
    },
    setLanguage: (language: string): void => {
        if (!_i18nInstance) {
            _i18nInstance = I18n.getInstance();
        }
        _i18nInstance.setLanguage(language);
    },
    getCurrentLanguage: (): string => {
        if (!_i18nInstance) {
            _i18nInstance = I18n.getInstance();
        }
        return _i18nInstance.getCurrentLanguage();
    }
};