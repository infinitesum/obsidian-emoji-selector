export interface I18nStrings {
    // Command
    openEmojiPicker: string;
    // Settings tab
    settingsTitle: string;
    emojiHeight: string;
    emojiHeightDesc: string;
    searchPlaceholder: string;
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
    customLocalEmojiTemplate: string;
    customLocalEmojiTemplateDesc: string;
    customLocalEmojiTemplatePlaceholder: string;

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
    invalidLocalPaths: string;
    // URL management
    addUrl: string;
    addUrlPlaceholder: string;
    urlAdded: string;
    urlRemoved: string;
    urlPreview: string;
    emojiCount: string;
    remove: string;
    editRawConfig: string;
    editRawConfigDesc: string;
    showEditor: string;
    hideEditor: string;
    cancel: string;
    urlExists: string;
    noUrlsConfigured: string;
    duplicateWarning: string;
    addUrlTitle: string;
    addUrlDesc1: string;
    addUrlDesc2: string;
    addUrlInputHint: string;
    confirm: string;
}

const EN_STRINGS: I18nStrings = {
    // Command
    openEmojiPicker: 'Open emoji picker',
    // Settings tab
    settingsTitle: 'General',
    emojiHeight: 'Emoji height',
    emojiHeightDesc: 'e.g., `1.2em`, `2rem`, `16px`',
    searchPlaceholder: 'Search emojis...',
    advancedSearchTip: 'Tip: Use "collection.*pattern" for collection-specific search',
    owoJsonUrls: 'Emoji packs',
    owoJsonUrlsDesc: 'OWO format supported. More packs at https://emoticons.hzchu.top/',
    updateCollections: 'Update',
    updateCollectionsTooltip: 'Reload emoji collections',
    rememberLastCollection: 'Remember last collection',
    rememberLastCollectionDesc: 'Auto-select last used collection when opening',
    emojiSpacing: 'Emoji spacing',
    addSpaceAfterEmojiSingle: 'Add space after emoji (single)',
    addSpaceAfterEmojiSingleDesc: 'Auto-add space after inserting',
    addSpaceAfterEmojiMulti: 'Add space after emoji (multi)',
    addSpaceAfterEmojiMultiDesc: 'Auto-add space after inserting',
    customCssClasses: 'Custom CSS classes',
    customCssClassesDesc: 'Space-separated class names',
    customEmojiTemplate: 'Remote image template',
    customEmojiTemplateDesc: 'Variables: `{url}`, `{name}`, `{text}`, `{category}`, `{type}`, `{classes}`, `{filename}`, `{fullfilename}`',
    customLocalEmojiTemplate: 'Local image template',
    customLocalEmojiTemplateDesc: 'Variables: `{path}`, `{name}`, `{text}`, `{category}`, `{classes}`, `{filename}`, `{fullfilename}`',
    customLocalEmojiTemplatePlaceholder: '<img src="{path}" alt="{text}" title="{text}" class="{classes}">',

    // Quick insertion
    quickInsertion: 'Quick insertion',
    enableQuickInsertion: 'Enable quick insertion',
    enableQuickInsertionDesc: 'Type trigger + emoji name to show suggestions',
    quickInsertionTrigger: 'Trigger string(s)',
    quickInsertionTriggerDesc: 'Use `|` to separate, e.g., `::|：：`, `@@|##`',

    // Advanced search
    advancedSearch: 'Advanced search',
    enableRegexSearch: 'Regex search',
    enableRegexSearchDesc: 'e.g., `.*heart.*`',
    enableFuzzySearch: 'Fuzzy search',
    enableFuzzySearchDesc: 'Tolerates typos',

    // Recent emojis
    recentEmojis: 'Recent emojis',
    enableRecentEmojis: 'Enable recent emojis',
    enableRecentEmojisDesc: 'Show recently used in a separate tab',
    maxRecentEmojis: 'Max count',
    maxRecentEmojisDesc: '1-50',
    clearRecentEmojis: 'Clear history',
    clearRecentEmojisButton: 'Clear',
    recentEmojisCleared: 'Cleared',
    failedToClearRecentEmojis: 'Failed to clear',
    preferRecentOverRemembered: 'Show recent first',
    preferRecentOverRememberedDesc: 'Open to recent tab instead of last collection',

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
    noActiveCollection: 'No active editor found. Please open a note to use the emoji picker.',
    invalidLocalPaths: 'Warning: {0} local image path(s) not found in vault',
    // URL management
    addUrl: 'Add',
    addUrlPlaceholder: 'Enter URL(s), comma or newline separated',
    urlAdded: 'Added {0} collection(s)',
    urlRemoved: 'Removed',
    urlPreview: 'Collections Preview',
    emojiCount: '{0} emojis',
    remove: '×',
    editRawConfig: 'Edit raw config',
    editRawConfigDesc: 'Manually edit the emoji pack URL list',
    showEditor: 'Show',
    hideEditor: 'Hide',
    cancel: 'Cancel',
    urlExists: 'URL already exists',
    noUrlsConfigured: 'No URLs configured',
    duplicateWarning: 'Found {0} duplicate URL(s), will be auto-removed on save',
    addUrlTitle: 'Add Emoji Pack',
    addUrlDesc1: 'Get OWO format emoji packs from ',
    addUrlDesc2: ' or paste your own JSON URLs.',
    addUrlInputHint: 'One URL per line, or comma separated',
    confirm: 'Add'
};

const ZH_CN_STRINGS: I18nStrings = {
    // Command
    openEmojiPicker: '打开表情选择器',
    // Settings tab
    settingsTitle: '基本设置',
    emojiHeight: '表情大小',
    emojiHeightDesc: '如 `1.2em`、`2rem`, `16px`',
    searchPlaceholder: '搜索表情...',
    advancedSearchTip: '技巧：输入 "集合名.*关键词" 可在特定集合里搜索',
    owoJsonUrls: '表情包',
    owoJsonUrlsDesc: '支持 OWO 格式，更多表情包：https://emoticons.hzchu.top/',
    updateCollections: '更新',
    updateCollectionsTooltip: '重新加载表情包',
    rememberLastCollection: '记住上次选的表情包',
    rememberLastCollectionDesc: '打开时自动切到上次用的',
    emojiSpacing: '表情间距',
    addSpaceAfterEmojiSingle: '插入后加空格（单选）',
    addSpaceAfterEmojiSingleDesc: '自动在表情后加空格',
    addSpaceAfterEmojiMulti: '插入后加空格（多选）',
    addSpaceAfterEmojiMultiDesc: '自动在表情后加空格',
    customCssClasses: '自定义类名',
    customCssClassesDesc: '空格分隔',
    customEmojiTemplate: '远程图片模板',
    customEmojiTemplateDesc: '变量：`{url}`, `{name}`, `{text}`, `{category}`, `{type}`, `{classes}`, `{filename}`, `{fullfilename}`',
    customLocalEmojiTemplate: '本地图片模板',
    customLocalEmojiTemplateDesc: '变量：`{path}`, `{name}`, `{text}`, `{category}`, `{classes}`, `{filename}`, `{fullfilename}`',
    customLocalEmojiTemplatePlaceholder: '<img src="{path}" alt="{text}" title="{text}" class="{classes}">',

    // Quick insertion
    quickInsertion: '快捷输入',
    enableQuickInsertion: '开启快捷输入',
    enableQuickInsertionDesc: '输入触发词+表情名显示候选',
    quickInsertionTrigger: '触发词',
    quickInsertionTriggerDesc: '用 `|` 分隔，如 `::|：：`、`@@|##`',

    // Advanced search
    advancedSearch: '高级搜索',
    enableRegexSearch: '正则搜索',
    enableRegexSearchDesc: '如 `.*heart.*`',
    enableFuzzySearch: '模糊搜索',
    enableFuzzySearchDesc: '容忍拼写错误',

    // Recent emojis
    recentEmojis: '最近使用',
    enableRecentEmojis: '显示最近使用',
    enableRecentEmojisDesc: '在单独标签页显示',
    maxRecentEmojis: '最大数量',
    maxRecentEmojisDesc: '1-50',
    clearRecentEmojis: '清空历史',
    clearRecentEmojisButton: '清空',
    recentEmojisCleared: '已清空',
    failedToClearRecentEmojis: '清空失败',
    preferRecentOverRemembered: '优先显示最近使用',
    preferRecentOverRememberedDesc: '打开时先显示最近使用而非上次的表情包',

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
    noActiveCollection: '没有打开的笔记。请先打开一个笔记再使用表情选择器',
    invalidLocalPaths: '警告：有 {0} 个本地图片路径无效',
    // URL management
    addUrl: '添加',
    addUrlPlaceholder: '输入 URL，逗号或换行分隔',
    urlAdded: '已添加 {0} 个表情包',
    urlRemoved: '已移除',
    urlPreview: '表情包预览',
    emojiCount: '{0} 个表情',
    remove: '×',
    editRawConfig: '编辑配置',
    editRawConfigDesc: '手动编辑表情包 URL 列表',
    showEditor: '展开',
    hideEditor: '收起',
    cancel: '取消',
    urlExists: 'URL 已存在',
    noUrlsConfigured: '暂无表情包',
    duplicateWarning: '发现 {0} 个重复 URL，保存时会自动去重',
    addUrlTitle: '添加表情包',
    addUrlDesc1: '从 ',
    addUrlDesc2: ' 获取 OWO 格式表情包，或粘贴你自己的 JSON 地址。',
    addUrlInputHint: '每行一个 URL，或用英文逗号分隔',
    confirm: '添加'
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