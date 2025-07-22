import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import EmojiSelectorPlugin from '../main';

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

        // Plugin title
        containerEl.createEl('h2', { text: 'Emoji Selector Settings' });

        // Emoji size setting
        new Setting(containerEl)
            .setName('Emoji height')
            .setDesc('CSS height value for emoji display - width will be auto (e.g., 1.2em, 16px)')
            .addText(text => text
                .setPlaceholder('1.2em')
                .setValue(this.plugin.settings.emojiSize)
                .onChange(async (value) => {
                    this.plugin.settings.emojiSize = value || '1.2em';
                    await this.plugin.saveSettings();
                }));

        // Search placeholder setting
        new Setting(containerEl)
            .setName('Search placeholder')
            .setDesc('Placeholder text shown in the emoji search input')
            .addText(text => text
                .setPlaceholder('Search emojis...')
                .setValue(this.plugin.settings.searchPlaceholder)
                .onChange(async (value) => {
                    this.plugin.settings.searchPlaceholder = value || 'Search emojis...';
                    await this.plugin.saveSettings();
                }));

        // OWO JSON URLs setting with confirm button
        const owoUrlsSetting = new Setting(containerEl)
            .setName('OWO JSON URLs')
            .setDesc(this.getCollectionStatusDescription());

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
            button.setButtonText('Update Collections')
                .setTooltip('Load emoji collections from the URLs above')
                .onClick(async () => {
                    await this.updateEmojiCollections();
                });
        });

        // Store references for later use
        this.urlTextArea = urlTextArea;
        this.updateButton = updateButton;
        this.hasUnsavedChanges = hasUnsavedChanges;



        // Remember last collection setting
        new Setting(containerEl)
            .setName('Remember last collection')
            .setDesc('Remember the last selected emoji collection and restore it when opening the picker')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.rememberLastCollection)
                .onChange(async (value) => {
                    this.plugin.settings.rememberLastCollection = value;
                    // Reset to default when disabled
                    if (!value) {
                        this.plugin.settings.lastSelectedCollection = 'all';
                    }
                    await this.plugin.saveSettings();
                }));

        // Emoji spacing settings section
        containerEl.createEl('h3', { text: 'Emoji Spacing' });

        // Add space after emoji setting (single-select)
        new Setting(containerEl)
            .setName('Add space after emoji (single-select)')
            .setDesc('Automatically add a space after inserting an emoji in single-select mode')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.addSpaceAfterEmoji)
                .onChange(async (value) => {
                    this.plugin.settings.addSpaceAfterEmoji = value;
                    await this.plugin.saveSettings();
                }));

        // Add space after emoji setting (multi-select)
        new Setting(containerEl)
            .setName('Add space after emoji (multi-select)')
            .setDesc('Automatically add a space after inserting an emoji in multi-select mode')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.addSpaceAfterEmojiInMultiSelect)
                .onChange(async (value) => {
                    this.plugin.settings.addSpaceAfterEmojiInMultiSelect = value;
                    await this.plugin.saveSettings();
                }));

        // Custom CSS classes setting
        new Setting(containerEl)
            .setName('Custom CSS classes')
            .setDesc('Additional CSS classes to apply to emoji elements (space-separated)')
            .addText(text => text
                .setPlaceholder('my-emoji-class another-class')
                .setValue(this.plugin.settings.customCssClasses)
                .onChange(async (value) => {
                    this.plugin.settings.customCssClasses = value;
                    await this.plugin.saveSettings();
                }));

        // Custom emoji template setting
        new Setting(containerEl)
            .setName('Custom emoji template')
            .setDesc('Custom template for emoji insertion. Variables: {url}, {name}, {text}, {category}, {type}, {classes}. Leave empty for default HTML.')
            .addTextArea(text => text
                .setPlaceholder('<img src="{url}" alt="{text}" atk-emoticon="{name}" class="{classes}">')
                .setValue(this.plugin.settings.customEmojiTemplate)
                .onChange(async (value) => {
                    this.plugin.settings.customEmojiTemplate = value;
                    await this.plugin.saveSettings();
                }));

        // Keyboard shortcut settings section
        containerEl.createEl('h3', { text: 'Keyboard Shortcuts' });

        // Enable keyboard shortcut setting
        new Setting(containerEl)
            .setName('Enable keyboard shortcut')
            .setDesc('Enable keyboard shortcut to open emoji picker')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableKeyboardShortcut)
                .onChange(async (value) => {
                    this.plugin.settings.enableKeyboardShortcut = value;
                    await this.plugin.saveSettings();
                }));

        // Keyboard shortcut setting
        new Setting(containerEl)
            .setName('Keyboard shortcut')
            .setDesc('Keyboard shortcut to open emoji picker (e.g., Ctrl+Shift+E)')
            .addText(text => text
                .setPlaceholder('Ctrl+Shift+E')
                .setValue(this.plugin.settings.keyboardShortcut)
                .setDisabled(!this.plugin.settings.enableKeyboardShortcut)
                .onChange(async (value) => {
                    this.plugin.settings.keyboardShortcut = value || 'Ctrl+Shift+E';
                    await this.plugin.saveSettings();
                }));

        // Update shortcut input state when toggle changes
        const shortcutSetting = containerEl.querySelector('input[placeholder="Ctrl+Shift+E"]') as HTMLInputElement;
        if (shortcutSetting) {
            const toggleSetting = containerEl.querySelector('input[type="checkbox"]') as HTMLInputElement;
            if (toggleSetting) {
                toggleSetting.addEventListener('change', () => {
                    shortcutSetting.disabled = !toggleSetting.checked;
                });
            }
        }

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
        let statusText = 'Comma-separated URLs for owo.json files to load emoji collections from. JSON files are cached locally until you click "Update Collections".';

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
        this.updateButton.textContent = isUpToDate ? 'Collections Up to Date' : 'Update Collections';
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
            new Notice('Please enter valid URLs separated by commas');
            return;
        }

        // Show loading state
        this.updateButton.removeClass('mod-cta', 'mod-muted', 'emoji-update-success', 'emoji-update-error');
        this.updateButton.textContent = 'Loading...';
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
            this.updateButton.textContent = 'Collections Updated!';

            const collectionCount = emojiManager.getAllCollections().length;
            const emojiCount = emojiManager.getTotalEmojiCount();

            new Notice(`Emoji collections updated! Loaded ${collectionCount} collections with ${emojiCount} emojis.`);

            setTimeout(() => {
                this.updateButtonState();
            }, 2000);

        } catch (error) {
            console.error('Failed to update emoji collections:', error);

            // Show error state
            this.updateButton.addClass('emoji-update-error');
            this.updateButton.textContent = 'Update Failed';

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            new Notice(`Failed to update emoji collections: ${errorMessage}`);

            setTimeout(() => {
                this.updateButtonState();
            }, 3000);
        }
    }
}