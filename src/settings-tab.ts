import { App, PluginSettingTab, Setting, Notice, Modal } from 'obsidian';
import EmojiSelectorPlugin from '../main';
import { i18n } from './i18n';

/**
 * Settings tab for the Emoji Selector Plugin
 * Provides configuration interface in Obsidian's settings panel
 */
export class EmojiSelectorSettingTab extends PluginSettingTab {
    plugin: EmojiSelectorPlugin;
    private urlTextArea: HTMLTextAreaElement;
    private updateButton: HTMLButtonElement;
    private hasUnsavedChanges: boolean = false;
    private previewCache: Map<string, { name: string; count: number; preview?: string }> | null = null;

    constructor(app: App, plugin: EmojiSelectorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        this.previewCache = null; // 每次打开设置页面时清空缓存，重新随机

        // Show loading message initially
        containerEl.createEl('div', { text: 'Loading settings...' });

        // Ensure all settings are loaded when opening settings tab
        (async () => {
            await this.plugin.loadSettings();
            // Re-render the settings after loading
            this.renderSettings();
        })();
    }

    /**
     * Set description with code formatting support using DOM API
     * Safely creates DOM elements instead of using innerHTML
     */
    private setDescWithCodeSupport(setting: Setting, text: string): Setting {
        setting.setDesc(''); // Clear default description
        this.createFormattedText(setting.descEl, text);
        return setting;
    }

    /**
     * Create formatted text with code support and clickable links using DOM API
     * Safely parses text with `code` markers and URLs, creates proper DOM elements
     */
    private createFormattedText(container: HTMLElement, text: string): void {
        const parts = text.split(/(`[^`]+`)/);

        parts.forEach(part => {
            if (part.startsWith('`') && part.endsWith('`')) {
                // This is a code segment
                const codeText = part.slice(1, -1); // Remove backticks
                container.createEl('code', { text: codeText });
            } else if (part.length > 0) {
                // Parse URLs in regular text and make them clickable
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const segments = part.split(urlRegex);
                
                segments.forEach(segment => {
                    if (segment.match(urlRegex)) {
                        // This is a URL, create a clickable link
                        container.createEl('a', {
                            text: segment,
                            href: segment,
                            attr: {
                                target: '_blank',
                                rel: 'noopener noreferrer'
                            }
                        });
                    } else if (segment.length > 0) {
                        // Regular text
                        container.appendText(segment);
                    }
                });
            }
        });
    }

    private renderSettings(): void {
        const { containerEl } = this;

        containerEl.empty();

        // Made by section
        const madeByEl = containerEl.createDiv('emoji-made-by');
        madeByEl.appendText('Made by ');
        madeByEl.createEl('a', {
            text: 'Summer',
            href: 'https://flyalready.com',
            attr: {
                target: '_blank',
                rel: 'noopener noreferrer'
            }
        });
        madeByEl.appendText(' with ❤️');

        // Emoji size setting
        this.setDescWithCodeSupport(
            new Setting(containerEl)
                .setName(i18n.t('emojiHeight')),
            i18n.t('emojiHeightDesc')
        ).addText(text => text
            .setPlaceholder('1.2em')
            .setValue(this.plugin.settings.emojiSize)
            .onChange(async (value) => {
                this.plugin.settings.emojiSize = value || '1.2em';
                await this.plugin.saveSettings();
            }));

        // Search placeholder setting
        this.setDescWithCodeSupport(
            new Setting(containerEl)
                .setName(i18n.t('searchPlaceholder')),
            i18n.t('searchPlaceholderDesc')
        ).addText(text => text
            .setPlaceholder(i18n.t('searchPlaceholder'))
            .setValue(this.plugin.settings.searchPlaceholder)
            .onChange(async (value) => {
                this.plugin.settings.searchPlaceholder = value || i18n.t('searchPlaceholder');
                await this.plugin.saveSettings();
            }));

        // URL management section with collapsible raw editor
        this.renderUrlManagement(containerEl);

        // Remember last collection setting
        this.setDescWithCodeSupport(
            new Setting(containerEl)
                .setName(i18n.t('rememberLastCollection')),
            i18n.t('rememberLastCollectionDesc')
        ).addToggle(toggle => toggle
            .setValue(this.plugin.settings.rememberLastCollection)
            .onChange(async (value) => {
                this.plugin.settings.rememberLastCollection = value;
                // Reset to default when disabled
                if (!value) {
                    this.plugin.settings.lastSelectedCollection = 'all';
                }
                await this.plugin.saveSettings();
            }));

        // Emoji spacing settings section (moved up to general section)

        new Setting(containerEl)
            .setName(i18n.t('emojiSpacing'))
            .setHeading();
        // Add space after emoji setting (single-select)
        this.setDescWithCodeSupport(
            new Setting(containerEl)
                .setName(i18n.t('addSpaceAfterEmojiSingle')),
            i18n.t('addSpaceAfterEmojiSingleDesc')
        ).addToggle(toggle => toggle
            .setValue(this.plugin.settings.addSpaceAfterEmoji)
            .onChange(async (value) => {
                this.plugin.settings.addSpaceAfterEmoji = value;
                await this.plugin.saveSettings();
            }));

        // Add space after emoji setting (multi-select)
        this.setDescWithCodeSupport(
            new Setting(containerEl)
                .setName(i18n.t('addSpaceAfterEmojiMulti')),
            i18n.t('addSpaceAfterEmojiMultiDesc')
        ).addToggle(toggle => toggle
            .setValue(this.plugin.settings.addSpaceAfterEmojiInMultiSelect)
            .onChange(async (value) => {
                this.plugin.settings.addSpaceAfterEmojiInMultiSelect = value;
                await this.plugin.saveSettings();
            }));

        // Custom CSS classes setting
        this.setDescWithCodeSupport(
            new Setting(containerEl)
                .setName(i18n.t('customCssClasses')),
            i18n.t('customCssClassesDesc')
        ).addText(text => text
            .setPlaceholder('my-emoji-class another-class')
            .setValue(this.plugin.settings.customCssClasses)
            .onChange(async (value) => {
                this.plugin.settings.customCssClasses = value;
                await this.plugin.saveSettings();
            }));

        // Custom emoji template setting (for remote images and text emojis)
        const customTemplateSetting = new Setting(containerEl)
            .setName(i18n.t('customEmojiTemplate'));

        // Set description with code support using DOM API
        this.setDescWithCodeSupport(customTemplateSetting, i18n.t('customEmojiTemplateDesc'));

        // Add CSS class for multi-line layout
        customTemplateSetting.settingEl.addClass('emoji-setting-multiline');

        customTemplateSetting.addTextArea(text => text
            .setPlaceholder('<img src="{url}" alt="{text}" title="{text}" class="{classes}">')
            .setValue(this.plugin.settings.customEmojiTemplate)
            .onChange(async (value) => {
                this.plugin.settings.customEmojiTemplate = value;
                await this.plugin.saveSettings();
            }));

        // Custom local emoji template setting (for vault images)
        const customLocalTemplateSetting = new Setting(containerEl)
            .setName(i18n.t('customLocalEmojiTemplate'));

        // Set description with code support using DOM API
        this.setDescWithCodeSupport(customLocalTemplateSetting, i18n.t('customLocalEmojiTemplateDesc'));

        // Add CSS class for multi-line layout
        customLocalTemplateSetting.settingEl.addClass('emoji-setting-multiline');

        customLocalTemplateSetting.addTextArea(text => text
            .setPlaceholder(i18n.t('customLocalEmojiTemplatePlaceholder'))
            .setValue(this.plugin.settings.customLocalEmojiTemplate)
            .onChange(async (value) => {
                this.plugin.settings.customLocalEmojiTemplate = value;
                await this.plugin.saveSettings();
            }));

        // Quick insertion settings section
        new Setting(containerEl)
            .setName(i18n.t('quickInsertion'))
            .setHeading();

        // Enable quick insertion setting
        this.setDescWithCodeSupport(
            new Setting(containerEl)
                .setName(i18n.t('enableQuickInsertion')),
            i18n.t('enableQuickInsertionDesc')
        ).addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableQuickInsertion)
            .onChange(async (value) => {
                this.plugin.settings.enableQuickInsertion = value;
                await this.plugin.saveSettings();
            }));

        // Quick insertion trigger string setting
        this.setDescWithCodeSupport(
            new Setting(containerEl)
                .setName(i18n.t('quickInsertionTrigger')),
            i18n.t('quickInsertionTriggerDesc')
        ).addText(text => text
            .setPlaceholder('::|：：')
            .setValue(this.plugin.settings.quickInsertionTrigger)
            .onChange(async (value) => {
                this.plugin.settings.quickInsertionTrigger = value || '::|：：';
                await this.plugin.saveSettings();
            }));

        // Recent emojis settings section
        new Setting(containerEl)
            .setName(i18n.t('recentEmojis'))
            .setHeading();

        // Enable recent emojis setting
        const enableRecentEmojisSetting = new Setting(containerEl)
            .setName(i18n.t('enableRecentEmojis'))
            .setDesc(''); // Clear default description
        this.createFormattedText(enableRecentEmojisSetting.descEl, i18n.t('enableRecentEmojisDesc'));
        enableRecentEmojisSetting.addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableRecentEmojis)
            .onChange(async (value) => {
                this.plugin.settings.enableRecentEmojis = value;
                await this.plugin.saveSettings();
            }));

        // Prefer recent over remembered setting
        const preferRecentSetting = new Setting(containerEl)
            .setName(i18n.t('preferRecentOverRemembered'))
            .setDesc(''); // Clear default description
        this.createFormattedText(preferRecentSetting.descEl, i18n.t('preferRecentOverRememberedDesc'));
        preferRecentSetting.addToggle(toggle => toggle
            .setValue(this.plugin.settings.preferRecentOverRemembered)
            .onChange(async (value) => {
                this.plugin.settings.preferRecentOverRemembered = value;
                await this.plugin.saveSettings();
            }));

        // Max recent emojis setting
        const maxRecentEmojisSetting = new Setting(containerEl)
            .setName(i18n.t('maxRecentEmojis'))
            .setDesc(''); // Clear default description
        this.createFormattedText(maxRecentEmojisSetting.descEl, i18n.t('maxRecentEmojisDesc'));
        maxRecentEmojisSetting.addSlider(slider => slider
            .setLimits(1, 50, 1)
            .setValue(this.plugin.settings.maxRecentEmojis)
            .setDynamicTooltip()
            .onChange(async (value) => {
                this.plugin.settings.maxRecentEmojis = value;
                await this.plugin.saveSettings();
            }));

        // Clear recent emojis button
        const clearRecentEmojisSetting = new Setting(containerEl)
            .setName(i18n.t('clearRecentEmojis'))
            .setDesc(''); // Clear default description
        this.createFormattedText(clearRecentEmojisSetting.descEl, i18n.t('clearRecentEmojisDesc'));
        clearRecentEmojisSetting.addButton(button => button
            .setButtonText(i18n.t('clearRecentEmojisButton'))
            .setWarning()
            .onClick(async () => {
                try {
                    const emojiManager = await this.plugin.getEmojiManagerForSettings();
                    await emojiManager.clearRecentEmojis();
                    new Notice(i18n.t('recentEmojisCleared'));
                } catch (error) {
                    console.error('Failed to clear recent emojis:', error);
                    new Notice(i18n.t('failedToClearRecentEmojis'));
                }
            }));

        // Advanced search settings section (moved to the end)
        new Setting(containerEl)
            .setName(i18n.t('advancedSearch'))
            .setHeading();

        // Enable regex search setting
        const enableRegexSearchSetting = new Setting(containerEl)
            .setName(i18n.t('enableRegexSearch'))
            .setDesc(''); // Clear default description
        this.createFormattedText(enableRegexSearchSetting.descEl, i18n.t('enableRegexSearchDesc'));
        enableRegexSearchSetting.addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableRegexSearch)
            .onChange(async (value) => {
                this.plugin.settings.enableRegexSearch = value;
                await this.plugin.saveSettings();
            }));

        // Enable fuzzy search setting
        const enableFuzzySearchSetting = new Setting(containerEl)
            .setName(i18n.t('enableFuzzySearch'))
            .setDesc(''); // Clear default description
        this.createFormattedText(enableFuzzySearchSetting.descEl, i18n.t('enableFuzzySearchDesc'));
        enableFuzzySearchSetting.addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableFuzzySearch)
            .onChange(async (value) => {
                this.plugin.settings.enableFuzzySearch = value;
                await this.plugin.saveSettings();
            }));

        // Debug logging settings section
        new Setting(containerEl)
            .setName('Debug and troubleshooting')
            .setHeading();

        // Debug log level setting
        const debugLogLevelSetting = new Setting(containerEl)
            .setName('Debug log level')
            .setDesc(''); // Clear default description
        this.createFormattedText(debugLogLevelSetting.descEl, 'Control how much logging information is shown in the developer console. `WARN` (default) shows only warnings and errors. `DEBUG` shows all logging for troubleshooting.');
        debugLogLevelSetting.addDropdown(dropdown => dropdown
            .addOption('0', 'DEBUG (All logs)')
            .addOption('1', 'INFO (Info and above)')
            .addOption('2', 'WARN (Warnings and errors only)')
            .addOption('3', 'ERROR (Errors only)')
            .addOption('4', 'NONE (No logs)')
            .setValue(this.plugin.settings.debugLogLevel.toString())
            .onChange(async (value) => {
                this.plugin.settings.debugLogLevel = parseInt(value);
                await this.plugin.saveSettings();
                // Update logger immediately
                const { logger } = await import('./logger');
                logger.setLogLevel(parseInt(value));
            }));

        // Initialize button state
        this.updateButtonState();
    }

    /**
     * Validate URL or local file path format
     */
    private validateUrls(urlString: string): boolean {
        const urls = urlString.split(',').map(url => url.trim()).filter(url => url.length > 0);

        return urls.length > 0 && urls.every(url => {
            // Check if it's a URL
            try {
                const parsedUrl = new URL(url);
                return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
            } catch {
                // If not a URL, check if it's a valid file path (ends with .json)
                return url.endsWith('.json');
            }
        });
    }

    /**
     * Get description with current collection status
     */
    private getCollectionStatusDescription(): string {
        let statusText = i18n.t('owoJsonUrlsDesc');

        if (this.plugin.isEmojiManagerInitialized()) {
            const collectionCount = this.plugin.emojiManager!.getAllCollections().length;
            const emojiCount = this.plugin.emojiManager!.getTotalEmojiCount();

            if (collectionCount > 0) {
                statusText += ` Currently loaded: ${collectionCount} collections with ${emojiCount} emojis.`;
            } else {
                statusText += ' No collections currently loaded.';
            }
        } else {
            statusText += ' Collections will be loaded when first needed.';
        }

        return statusText;
    }

    /**
     * Update the state of the "Update Collections" button
     */
    private updateButtonState(): void {
        if (!this.updateButton) return;

        // Clear all state classes
        this.updateButton.removeClass('mod-muted', 'mod-cta', 'emoji-update-success', 'emoji-update-error');

        const isUpToDate = !this.hasUnsavedChanges;
        this.updateButton.textContent = isUpToDate ? i18n.t('loaded') : i18n.t('update');
        this.updateButton.addClass(isUpToDate ? 'mod-muted' : 'mod-cta');
        this.updateButton.disabled = isUpToDate;
    }

    /**
     * Update emoji collections from the current URL input
     */
    private async updateEmojiCollections(): Promise<void> {
        if (!this.urlTextArea) return;

        const newUrls = this.urlTextArea.value.trim();

        // Validate URLs before processing
        if (newUrls && !this.validateUrls(newUrls)) {
            new Notice(i18n.t('invalidUrls'));
            return;
        }

        // Show loading state
        this.updateButton.removeClass('mod-cta', 'mod-muted', 'emoji-update-success', 'emoji-update-error');
        this.updateButton.textContent = i18n.t('loading');
        this.updateButton.disabled = true;

        try {
            // Save the new URLs (auto dedupe)
            this.plugin.settings.owoJsonUrls = this.parseUrls(newUrls).join(',');
            await this.plugin.saveSettings();
            // Update textarea with deduped value
            if (this.urlTextArea) this.urlTextArea.value = this.plugin.settings.owoJsonUrls;

            // Get emoji manager and force reload emoji collections
            const emojiManager = await this.plugin.getEmojiManagerForSettings();
            await emojiManager.forceReload();

            // Update state
            this.hasUnsavedChanges = false;

            // Show success state
            this.updateButton.addClass('emoji-update-success');
            this.updateButton.textContent = i18n.t('collectionsUpdated');

            const collectionCount = emojiManager.getAllCollections().length;
            const emojiCount = emojiManager.getTotalEmojiCount();

            new Notice(i18n.t('collectionsUpdateSuccess', collectionCount.toString(), emojiCount.toString()));

            window.setTimeout(() => {
                this.updateButtonState();
            }, 2000);

        } catch (error) {
            console.error('Failed to update emoji collections:', error);

            // Show error state
            this.updateButton.addClass('emoji-update-error');
            this.updateButton.textContent = i18n.t('updateFailed');

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            new Notice(i18n.t('collectionsUpdateFailed', errorMessage));

            window.setTimeout(() => {
                this.updateButtonState();
            }, 3000);
        }
    }

    /**
     * Render URL management section: add input, preview list, collapsible raw editor
     */
    private renderUrlManagement(containerEl: HTMLElement): void {
        // Add URL button row
        const addUrlSetting = new Setting(containerEl)
            .setName(i18n.t('owoJsonUrls'))
            .addButton(btn => btn
                .setButtonText(i18n.t('addUrl'))
                .setCta()
                .onClick(() => this.showAddUrlModal()));

        // Preview list container with scroll
        const previewContainer = containerEl.createDiv({ cls: 'emoji-url-preview-list' });
        this.renderPreviewList(previewContainer);

        // Collapsible raw editor with description
        const editorToggle = new Setting(containerEl)
            .setName(i18n.t('editRawConfig'))
            .setDesc(i18n.t('editRawConfigDesc'));
        
        const editorContainer = containerEl.createDiv({ cls: 'emoji-raw-editor hidden' });
        let isEditorVisible = false;

        editorToggle.addButton(btn => btn
            .setButtonText(i18n.t('showEditor'))
            .onClick(() => {
                isEditorVisible = !isEditorVisible;
                editorContainer.toggleClass('hidden', !isEditorVisible);
                btn.setButtonText(isEditorVisible ? i18n.t('hideEditor') : i18n.t('showEditor'));
            }));

        // Raw textarea editor using Setting component
        const rawSetting = new Setting(editorContainer);
        rawSetting.settingEl.addClass('emoji-setting-multiline');
        
        const duplicateWarning = rawSetting.descEl;
        duplicateWarning.addClass('emoji-duplicate-warning');

        rawSetting.addTextArea(text => {
            this.urlTextArea = text.inputEl;
            text.setPlaceholder('https://example.com/emojis.json')
                .setValue(this.plugin.settings.owoJsonUrls)
                .onChange((value) => {
                    this.hasUnsavedChanges = value.trim() !== this.plugin.settings.owoJsonUrls.trim();
                    // 检测重复（复用 parseUrls 逻辑）
                    const rawUrls = value.split(',').map(s => s.trim()).filter(Boolean);
                    const uniqueCount = new Set(rawUrls).size;
                    const dupCount = rawUrls.length - uniqueCount;
                    duplicateWarning.textContent = dupCount > 0 ? i18n.t('duplicateWarning', String(dupCount)) : '';
                    duplicateWarning.toggleClass('mod-warning', dupCount > 0);
                    this.updateButtonState();
                });
        });

        rawSetting.addButton(button => {
            this.updateButton = button.buttonEl;
            button.setButtonText(i18n.t('updateCollections'))
                .onClick(async () => {
                    await this.updateEmojiCollections();
                    duplicateWarning.textContent = '';
                    this.renderPreviewList(previewContainer);
                });
        });

        this.updateButtonState();
    }

    /**
     * Show modal to add new URLs
     */
    private showAddUrlModal(): void {
        const self = this;
        const modal = new class extends Modal {
            private inputValue = '';
            
            onOpen() {
                this.titleEl.setText(i18n.t('addUrlTitle'));
                const { contentEl } = this;
                
                // 说明文字
                const descEl = contentEl.createEl('p', { cls: 'setting-item-description' });
                descEl.createSpan({ text: i18n.t('addUrlDesc1') });
                descEl.createEl('a', { text: 'emoticons.hzchu.top', href: 'https://emoticons.hzchu.top/', attr: { target: '_blank' } });
                descEl.createSpan({ text: i18n.t('addUrlDesc2') });
                
                // 输入框
                let textAreaEl: HTMLTextAreaElement;
                new Setting(contentEl).addTextArea(text => {
                    textAreaEl = text.inputEl;
                    text.setPlaceholder(i18n.t('addUrlInputHint'));
                    text.inputEl.rows = 5;
                    text.inputEl.style.width = '100%';
                    text.onChange(v => this.inputValue = v);
                });
                
                // 自动聚焦
                setTimeout(() => textAreaEl?.focus(), 50);
                
                // 按钮
                new Setting(contentEl)
                    .addButton(btn => btn.setButtonText(i18n.t('cancel')).onClick(() => this.close()))
                    .addButton(btn => btn.setButtonText(i18n.t('confirm')).setCta().onClick(() => this.submit()));
            }
            
            private async submit() {
                const urls = this.inputValue.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
                this.close();
                await self.handleAddUrls(urls);
            }
            
            onClose() { this.contentEl.empty(); }
        }(this.app);
        modal.open();
    }

    /**
     * Handle adding new URLs
     */
    private async handleAddUrls(urls: string[]): Promise<void> {
        const valid = urls.filter(u => this.validateUrl(u));
        if (valid.length === 0) { new Notice(i18n.t('invalidUrls')); return; }
        const existing = this.parseUrls(this.plugin.settings.owoJsonUrls);
        const newUrls = valid.filter(u => !existing.includes(u));
        if (newUrls.length === 0) { new Notice(i18n.t('urlExists')); return; }
        // 新 URL 添加到最前面
        this.plugin.settings.owoJsonUrls = [...newUrls, ...existing].join(',');
        await this.plugin.saveSettings();
        const mgr = await this.plugin.getEmojiManagerForSettings();
        const result = await mgr.addUrlsIncremental(newUrls);
        new Notice(i18n.t('urlAdded', result.loaded.toString()));
        if (this.urlTextArea) this.urlTextArea.value = this.plugin.settings.owoJsonUrls;
        this.display();
    }

    private parseUrls(urlString: string): string[] {
        if (!urlString) return [];
        // 自动去重
        const urls = urlString.split(',').map(s => s.trim()).filter(Boolean);
        return [...new Set(urls)];
    }

    /**
     * Render collections preview list with delete/sort (uses cached data if available)
     */
    private async renderPreviewList(container: HTMLElement): Promise<void> {
        container.empty();
        const urls = this.parseUrls(this.plugin.settings.owoJsonUrls);
        if (urls.length === 0) {
            container.createDiv({ text: i18n.t('noUrlsConfigured'), cls: 'emoji-url-empty' });
            return;
        }

        // 在首次加载时获取预览数据（包含随机图片）
        if (!this.previewCache) {
            this.previewCache = new Map();
            try {
                const mgr = await this.plugin.getEmojiManagerForSettings();
                if (mgr.getTotalEmojiCount() === 0) {
                    await mgr.loadEmojiCollections();
                }
                for (const p of mgr.getCollectionPreviews()) {
                    this.previewCache.set(p.url, p);
                }
            } catch (e) {}
        }

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const info = this.previewCache.get(url);
            const row = container.createDiv({ cls: 'emoji-url-row', attr: { draggable: 'true', 'data-index': String(i) } });

            // 拖拽排序
            row.ondragstart = (e) => { e.dataTransfer?.setData('text/plain', String(i)); row.addClass('dragging'); };
            row.ondragend = () => row.removeClass('dragging');
            row.ondragover = (e) => { e.preventDefault(); row.addClass('drag-over'); };
            row.ondragleave = () => row.removeClass('drag-over');
            row.ondrop = async (e) => {
                e.preventDefault();
                row.removeClass('drag-over');
                const from = parseInt(e.dataTransfer?.getData('text/plain') || '-1');
                if (from >= 0 && from !== i) {
                    const arr = this.parseUrls(this.plugin.settings.owoJsonUrls);
                    const [item] = arr.splice(from, 1);
                    arr.splice(i, 0, item);
                    this.plugin.settings.owoJsonUrls = arr.join(',');
                    await this.plugin.saveSettings();
                    try { (await this.plugin.getEmojiManagerForSettings()).reorderByUrls(arr); } catch {}
                    if (this.urlTextArea) this.urlTextArea.value = this.plugin.settings.owoJsonUrls;
                    await this.renderPreviewList(container);
                }
            };

            // Preview image
            const thumbEl = row.createDiv({ cls: 'emoji-url-thumb-wrap' });
            if (info?.preview) {
                const img = thumbEl.createEl('img', { cls: 'emoji-url-thumb', attr: { src: this.encodeImageUrl(info.preview) } });
                img.onerror = () => { img.remove(); thumbEl.createDiv({ cls: 'emoji-url-thumb-placeholder', text: '📦' }); };
            } else {
                thumbEl.createDiv({ cls: 'emoji-url-thumb-placeholder', text: info ? '📦' : '⏳' });
            }

            // Info: name and count
            const infoDiv = row.createDiv({ cls: 'emoji-url-info' });
            infoDiv.createDiv({ cls: 'emoji-url-name', text: info?.name || this.extractName(url), attr: { title: url } });
            if (info) infoDiv.createDiv({ cls: 'emoji-url-meta', text: i18n.t('emojiCount', info.count.toString()) });

            // Delete button only
            row.createEl('button', { text: '✕', cls: 'emoji-url-btn emoji-url-btn-danger', attr: { title: i18n.t('remove') } }).onclick = () => this.removeUrlAt(container, i, url);
        }
    }

    private extractName(url: string): string {
        try {
            const name = url.split('/').pop()?.replace('.json', '') || url;
            return name.length > 20 ? name.slice(0, 20) + '...' : name;
        } catch { return url; }
    }

    private async removeUrlAt(container: HTMLElement, i: number, url: string): Promise<void> {
        const scrollTop = container.scrollTop;
        const urls = this.parseUrls(this.plugin.settings.owoJsonUrls);
        urls.splice(i, 1);
        this.plugin.settings.owoJsonUrls = urls.join(',');
        await this.plugin.saveSettings();
        try { await (await this.plugin.getEmojiManagerForSettings()).removeUrl(url); } catch {}
        new Notice(i18n.t('urlRemoved'));
        if (this.urlTextArea) this.urlTextArea.value = this.plugin.settings.owoJsonUrls;
        await this.renderPreviewList(container);
        container.scrollTop = scrollTop;
    }

    /**
     * Encode image URL for display (handle Chinese and special chars)
     */
    private encodeImageUrl(url: string): string {
        try {
            const parsed = new URL(url);
            // 只编码路径部分，保留协议和域名
            parsed.pathname = parsed.pathname.split('/').map(segment => 
                encodeURIComponent(decodeURIComponent(segment))
            ).join('/');
            return parsed.toString();
        } catch {
            return url;
        }
    }

    private validateUrl(url: string): boolean {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return url.endsWith('.json');
        }
    }
}