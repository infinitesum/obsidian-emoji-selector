### [中文](./README-CN.md) | English

# Emoji Selector

Quickly insert custom emojis in Obsidian. Supports search, custom styles, and insertion templates.

## Screenshots

Panel Selection

![Panel Selection](https://io.pari.network/s/gwMTTbgFFYffrNc/download)

Quick Insert

![Quick Insert](https://io.pari.network/s/RsXtTqLe8rmnwFW/download)


## Features

- Quick insert by typing trigger characters (default `::` or `：：`)
- Emoji selector panel
- Compatible with OWO format emoji pack files, supports numerous emoji packs
- Custom insertion templates and CSS styles
- Supports regex and fuzzy search


## Install from Obsidian Community plugins
1. Open Settings in Obsidian
2. Go to Community plugins
3. Search for "Emoji selector"
4. Install and enable the plugin

## Quick Start

> [!important] 
> You must configure emoji packs before use: The plugin requires emoji pack files to work properly. You can find your favorite emoji packs at [https://emoticons.hzchu.top/](https://emoticons.hzchu.top/).

### Three-Step Configuration
**Step 1: Add Emoji Packs**

Go to plugin settings, add emoji packs in "OWO JSON URLs or Local Paths":

- Online emoji packs: Copy the OWO link from "引用链接" on https://emoticons.hzchu.top/
  ![](https://io.pari.network/public.php/dav/files/8zCHa2az8HMJbmw/2025-10-qn3wO.png)
- ~~Local files: Enter relative path (relative to Vault root)~~
- Separate multiple sources with commas
- Click "Update" button after adding

**Step 2: Quick Insertion**

Type trigger character + emoji name in the editor:

- ::smile or ：：smile

**Step 3: Use Emoji Panel**

Click the toolbar icon or use command palette to search for "Emoji Selector"


### Keyboard Shortcuts

| Shortcut | Function |
|--------|------|
| `::` or `：：` | Trigger quick insert (default, customizable in settings) |
| `Tab` / `Shift+Tab` | Switch emoji pack collections in panel |
| `Ctrl+M` | Toggle multi-select mode in panel (when search box is focused) |
| `↑` / `↓` | Navigate emoji selection |
| `Enter` | Select emoji |
| `Esc` | Close panel |

## Configuration Guide

### Trigger Character Configuration

Supports multiple triggers, separated by `|`.

**Configuration Examples:**

|Configuration|Description|Usage Example|
|---|---|---|
|`::\|：：`|Chinese and English double colons (recommended)|`::smile` or `：：smile`|
|`:\|：`|Chinese and English single colons|`:smile` or `：smile`|
|`::`|English double colons only|`::smile`|


### 🎨 Custom Emoji Templates

For owo format emoji packs, the plugin automatically parses and converts:

**OWO File Structure Example**:
```json
{
    "猫猫虫": {
        "type": "image",
        "container": [
            {
                "text": "bugcat_bugcat_shock",
                "icon": "<img src='https://emoticons.hzchu.top/emoticons/bugcat/bugcat_shock.png'>"
            }
        ]
    }
}
```


**Available Variables:**

|Variable|Description|Example Value|
|---|---|---|
|`{category}`|Collection name|`猫猫虫`|
|`{text}`|`text` field|`bugcat_bugcat_shock`|
|`{url}`|Image URL extracted from icon field HTML|`"https://emoticons.hzchu.top/emoticons/bugcat/bugcat_shock.png"`|
|`{name}`|category + index, auto-generated unique identifier|`猫猫虫_0`|
|`{type}`|`type` field|`image`|
|`{filename}`|Filename without extension, extracted from URL|`bugcat_shock`|
|`{fullfilename}`|Complete filename with extension, extracted from URL|`bugcat_shock.png`|
|`{classes}`|CSS classes automatically added based on type field, plus user-defined CSS classes|`emoji-image`|

#### Template Examples

**Default HTML Template**:
```html
<img src="{url}" alt="{text}" title="{text}" class="{classes}">
```

**Markdown Format**:
```markdown
![{text}]({url})
```

**Stellar Tag Component**:
```
{% emoji {category} {fullfilename} %}
```

**Custom Styles**:
```html
<span class="my-emoji {classes}">
  <img src="{url}" alt="{text}" loading="lazy">
  <span class="emoji-tooltip">{text}</span>
</span>
```

## Advanced Search
- **Fuzzy Matching**: `sml` matches "smile" related emojis
- **Regular Expressions**: Enables collection-specific searches, e.g., `活字乱刷.*a` searches for emojis containing "a" in the "活字乱刷" collection


## FAQ

### Q: Emoji packs loading slowly?
A: The plugin uses a caching mechanism. Speed will significantly improve after the first load. You can check cache status in settings.

### Q: What are regular expressions?
A: For a quick introduction, recommended reading: [Learn Regex the Easy Way](https://github.com/ziishaned/learn-regex).

### Q: How to add custom emoji packs?
A: In plugin settings, add the emoji pack JSON file path to "OWL Emoji Pack Address". Find emoji packs at [emoticons.hzchu.top](https://emoticons.hzchu.top/).

### Q: Quick insert not working?
A: Make sure "Enable Quick Input" is enabled in settings.


## Development

### Build Project

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build production version
pnpm build
```


## License

MIT License - See [LICENSE](LICENSE) file for details

## Support

If you find this plugin useful, feel free to:
- ⭐ Star the project
- 🐛 Report issues
- 💡 Suggest features
- 🤝 Contribute code

## Author

- **Summer** - [flyalready.com](https://flyalready.com)

---

*Enjoy using emojis in Obsidian!* 😊