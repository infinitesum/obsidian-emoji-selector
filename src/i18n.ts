/**
 * Internationalization support for Emoji Selector Plugin
 */

export interface I18nStrings {
    // Command
    openEmojiPicker: string;
    // Settings tab
    settingsTitle: string;
    emojiHeight: string;
    emojiHeightDesc: string;
    searchPlaceholder: string;
    searchPlaceholderDesc: string;
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
    keyboardShortcuts: string;
    enableKeyboardShortcut: string;
    enableKeyboardShortcutDesc: string;
    keyboardShortcut: string;
    keyboardShortcutDesc: string;

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

    // Notices
    invalidUrls: string;
    collectionsUpdateSuccess: string;
    collectionsUpdateFailed: string;
    noActiveCollection: string;
}

const EN_STRINGS: I18nStrings = {
    // Command
    openEmojiPicker: 'Open Emoji Picker',
    // Settings tab
    settingsTitle: 'Emoji Selector Settings',
    emojiHeight: 'Emoji height',
    emojiHeightDesc: 'CSS height value for emoji display - width will be auto (e.g., 1.2em, 16px)',
    searchPlaceholder: 'Search placeholder',
    searchPlaceholderDesc: 'Placeholder text shown in the emoji search input',
    owoJsonUrls: 'OWO JSON URLs',
    owoJsonUrlsDesc: 'Comma-separated URLs for owo.json files to load emoji collections from. JSON files are cached locally until you click "Update".',
    updateCollections: 'Update Collections',
    updateCollectionsTooltip: 'Load emoji collections from the URLs above',
    rememberLastCollection: 'Remember last collection',
    rememberLastCollectionDesc: 'Remember the last selected emoji collection and restore it when opening the picker',
    emojiSpacing: 'Emoji Spacing',
    addSpaceAfterEmojiSingle: 'Add space after emoji (single-select)',
    addSpaceAfterEmojiSingleDesc: 'Automatically add a space after inserting an emoji in single-select mode',
    addSpaceAfterEmojiMulti: 'Add space after emoji (multi-select)',
    addSpaceAfterEmojiMultiDesc: 'Automatically add a space after inserting an emoji in multi-select mode',
    customCssClasses: 'Custom CSS classes',
    customCssClassesDesc: 'Additional CSS classes to apply to emoji elements (space-separated)',
    customEmojiTemplate: 'Custom emoji template',
    customEmojiTemplateDesc: 'Custom template for emoji insertion. Variables: {url}, {name}, {text}, {category}, {type}, {classes}, {filename}, {fullfilename}. Leave empty for default HTML.',
    keyboardShortcuts: 'Keyboard Shortcuts',
    enableKeyboardShortcut: 'Enable keyboard shortcut',
    enableKeyboardShortcutDesc: 'Enable keyboard shortcut to open emoji picker',
    keyboardShortcut: 'Keyboard shortcut',
    keyboardShortcutDesc: 'Keyboard shortcut to open emoji picker (e.g., Ctrl+Shift+E)',

    // Button states
    loaded: 'Loaded',
    update: 'Update',
    loading: 'Loading...',
    collectionsUpdated: 'Collections Updated!',
    updateFailed: 'Update Failed',

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

    // Notices
    invalidUrls: 'Please enter valid URLs separated by commas',
    collectionsUpdateSuccess: 'Emoji collections updated! Loaded {0} collections with {1} emojis.',
    collectionsUpdateFailed: 'Failed to update emoji collections: {0}',
    noActiveCollection: 'No active editor found. Please open a note to use the emoji picker.'
};

const ZH_CN_STRINGS: I18nStrings = {
    // Command
    openEmojiPicker: '打开表情符号选择器',
    // Settings tab
    settingsTitle: '表情符号选择器设置',
    emojiHeight: '表情符号高度',
    emojiHeightDesc: '表情符号显示的 CSS 高度值 - 宽度将自动调整（例如：1.2em, 16px）',
    searchPlaceholder: '搜索占位符',
    searchPlaceholderDesc: '表情符号搜索输入框中显示的占位符文本',
    owoJsonUrls: 'OWO JSON URLs',
    owoJsonUrlsDesc: '用逗号分隔的 owo.json 文件 URL，用于加载表情符号集合。JSON 文件会在本地缓存，直到您点击"更新"。',
    updateCollections: '更新集合',
    updateCollectionsTooltip: '从上述 URL 加载表情符号集合',
    rememberLastCollection: '记住上次选择的集合',
    rememberLastCollectionDesc: '记住上次选择的表情符号集合，并在打开选择器时恢复',
    emojiSpacing: '表情符号间距',
    addSpaceAfterEmojiSingle: '表情符号后添加空格（单选）',
    addSpaceAfterEmojiSingleDesc: '在单选模式下插入表情符号后自动添加空格',
    addSpaceAfterEmojiMulti: '表情符号后添加空格（多选）',
    addSpaceAfterEmojiMultiDesc: '在多选模式下插入表情符号后自动添加空格',
    customCssClasses: '自定义 CSS 类',
    customCssClassesDesc: '应用于表情符号元素的额外 CSS 类（用空格分隔）',
    customEmojiTemplate: '自定义表情符号模板',
    customEmojiTemplateDesc: '表情符号插入的自定义模板。变量：{url}, {name}, {text}, {category}, {type}, {classes}, {filename}, {fullfilename}。留空使用默认 HTML。',
    keyboardShortcuts: '键盘快捷键',
    enableKeyboardShortcut: '启用键盘快捷键',
    enableKeyboardShortcutDesc: '启用键盘快捷键打开表情符号选择器',
    keyboardShortcut: '键盘快捷键',
    keyboardShortcutDesc: '打开表情符号选择器的键盘快捷键（例如：Ctrl+Shift+E）',

    // Button states
    loaded: '已加载',
    update: '更新',
    loading: '加载中...',
    collectionsUpdated: '集合已更新！',
    updateFailed: '更新失败',

    // Modal
    multiSelect: '多选',
    loadingEmojis: '加载表情符号中...',
    fetchingEmojiCollections: '获取表情符号集合中...',
    usingCachedData: '使用缓存数据，正在刷新...',
    noEmojiCollections: '未配置表情符号集合。',
    addOwoJsonUrls: '请在插件设置中添加 OWO JSON URLs。',
    failedToLoadCollections: '加载表情符号集合失败。',
    error: '错误：',
    checkOwoJsonUrls: '请检查插件设置中的 OWO JSON URLs。',
    noEmojisFound: '未找到表情符号',
    all: '全部',

    // Notices
    invalidUrls: '请输入用逗号分隔的有效 URL',
    collectionsUpdateSuccess: '表情符号集合已更新！加载了 {0} 个集合，共 {1} 个表情符号。',
    collectionsUpdateFailed: '更新表情符号集合失败：{0}',
    noActiveCollection: '未找到活动编辑器。请打开一个笔记使用表情符号选择器。'
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
        const obsidianLang = (window as any).moment?.locale?.() || navigator.language;

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

// Export singleton instance
export const i18n = I18n.getInstance();