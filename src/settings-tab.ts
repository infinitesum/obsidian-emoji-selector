import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
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

    constructor(app: App, plugin: EmojiSelectorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // Ensure all settings are loaded when opening settings tab
        this.plugin.loadSettings().then(() => {
            // Re-render the settings after loading
            this.renderSettings();
        });

        // Show loading message initially
        containerEl.createEl('div', { text: 'Loading settings...' });
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
     * Create formatted text with code support using DOM API
     * Safely parses text with `code` markers and creates proper DOM elements
     */
    private createFormattedText(container: HTMLElement, text: string): void {
        const parts = text.split(/(`[^`]+`)/);

        parts.forEach(part => {
            if (part.startsWith('`') && part.endsWith('`')) {
                // This is a code segment
                const codeText = part.slice(1, -1); // Remove backticks
                container.createEl('code', { text: codeText });
            } else if (part.length > 0) {
                // This is regular text
                container.appendText(part);
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

        // OWO JSON URLs setting with confirm button
        const owoUrlsSetting = new Setting(containerEl)
            .setName(i18n.t('owoJsonUrls'))
            .setDesc(''); // Will be set with HTML content below

        // Set description with code support using DOM API
        this.createFormattedText(owoUrlsSetting.descEl, this.getCollectionStatusDescription());

        // Add CSS class for multi-line layout
        owoUrlsSetting.settingEl.addClass('emoji-setting-multiline');

        let urlTextArea: HTMLTextAreaElement;
        let updateButton: HTMLButtonElement;
        let hasUnsavedChanges = false;

        owoUrlsSetting.addTextArea(text => {
            urlTextArea = text.inputEl;
            text.setPlaceholder('https://example.com/emojis.json, https://another.com/more-emojis.json')
                .setValue(this.plugin.settings.owoJsonUrls)
                .onChange((value) => {
                    // Only save the URL text, don't reload collections yet
                    hasUnsavedChanges = value.trim() !== this.plugin.settings.owoJsonUrls.trim();
                    this.hasUnsavedChanges = hasUnsavedChanges;
                    this.updateButtonState();
                });
        });

        owoUrlsSetting.addButton(button => {
            updateButton = button.buttonEl;
            button.setButtonText(i18n.t('updateCollections'))
                .setTooltip(i18n.t('updateCollectionsTooltip'))
                .onClick(async () => {
                    await this.updateEmojiCollections();
                });
        });

        // Store references for later use
        this.urlTextArea = urlTextArea;
        this.updateButton = updateButton;
        this.hasUnsavedChanges = hasUnsavedChanges;

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

        // Custom emoji template setting
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
     * Validate URL format
     */
    private validateUrls(urlString: string): boolean {
        const urls = urlString.split(',').map(url => url.trim()).filter(url => url.length > 0);

        return urls.length > 0 && urls.every(url => {
            try {
                const parsedUrl = new URL(url);
                return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
            } catch {
                return false;
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
            // Save the new URLs
            this.plugin.settings.owoJsonUrls = newUrls;
            await this.plugin.saveSettings();

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

            setTimeout(() => {
                this.updateButtonState();
            }, 2000);

        } catch (error) {
            console.error('Failed to update emoji collections:', error);

            // Show error state
            this.updateButton.addClass('emoji-update-error');
            this.updateButton.textContent = i18n.t('updateFailed');

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            new Notice(i18n.t('collectionsUpdateFailed', errorMessage));

            setTimeout(() => {
                this.updateButtonState();
            }, 3000);
        }
    }
}