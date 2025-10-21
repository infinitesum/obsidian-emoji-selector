### [中文](./README-CN.md) | English

# Emoji Selector

Insert custom emojis in Obsidian with fast search, auto-suggestion, and support for OWO format emoji collections.

## Screenshots

Panel Selection

![Panel Selection](https://io.pari.network/s/gwMTTbgFFYffrNc/download)

Quick Insertion

![Quick Insertion](https://io.pari.network/s/RsXtTqLe8rmnwFW/download)

## Features

- **Quick Insertion**: Type `:` to trigger emoji auto-suggestions
- **Emoji Picker Panel**: Browse and search through emoji collections
- **OWO Format Support**: Compatible with a vast library of emoji packs
- **Custom Templates**: Customize how emojis are inserted (HTML, Markdown, custom formats)
- **Advanced Search**: Supports regex and fuzzy matching
- **Keyboard Navigation**: Full keyboard support for accessibility
- **Recent Emojis**: Quick access to recently used emojis
- **Multi-select Mode**: Insert multiple emojis at once
- **Custom CSS Classes**: Style emojis with your own CSS

## Installation

### Method 1: Community Plugin Store
1. Open Obsidian Settings
2. Navigate to Community Plugins
3. Search for "Emoji selector"
4. Install and enable the plugin


## Quick Start

> [!important] 
> **Configuration Required**: The plugin requires emoji collection files to function. Find emoji packs at [https://emoticons.hzchu.top/](https://emoticons.hzchu.top/).

**Initial Setup Steps**:

1. **Add Emoji Collections**: Go to plugin settings, add OWO format JSON URLs in "OWO JSON URLs" field (comma-separated). **Click "Update" after adding URLs**.
2. **Quick Insertion**: Type the trigger string (default `::` or `：：`) followed by emoji name, e.g., `::smile` or `：：smile`
3. **Emoji Panel**: Click toolbar icon or use Command Palette "Emoji Selector"

### Keyboard Shortcuts

| Shortcut | Function |
|----------|----------|
| `::` or `：：` | Trigger quick insertion (default, customizable in settings) |
| `Tab` / `Shift+Tab` | Switch between emoji collections in panel |
| `Ctrl+M` | Toggle multi-select mode (when search is focused) |
| `↑` / `↓` | Navigate emoji selection |
| `Enter` | Select emoji |
| `Esc` | Close panel |

## Configuration Guide

### 🔧 Basic Configuration

#### Emoji Collection Sources (OWO JSON URLs)
- **Recommended Source**: [https://emoticons.hzchu.top/](https://emoticons.hzchu.top/)
- **Remember to click "Update" after adding URLs**

#### Quick Insertion Configuration
- **Trigger String(s)**: Supports multiple alternative triggers separated by `|`
- **Default Config**: `::|：：` (both English and Chinese double colons work)
- **Common Configuration Examples**:
  - `::|：：` - Double colon (supports both English and Chinese, recommended)
  - `:|：` - Single colon (supports both, faster but may trigger accidentally)
  - `::` - English double colon only (strict mode)
  - `@@|##|//` - Multiple custom triggers
  - `,,|，，` - Both English and Chinese commas
- **Usage Examples**:
  - With `::|：：`: Type `::smile` or `：：smile` to trigger
  - With `@@|##`: Type `@@smile` or `##smile` to trigger
  - With `::`: Only `::smile` triggers

### 🎨 Custom Emoji Templates

The plugin automatically parses OWO format emoji collections:

**OWO File Structure Example**:
```json
{
    "Cat Collection": {
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

**Available Template Variables**:
- `{category}` ← `"Cat Collection"` (collection name)
- `{text}` ← `"bugcat_bugcat_shock"` (text field)
- `{url}` ← `"https://emoticons.hzchu.top/emoticons/bugcat/bugcat_shock.png"` (extracted from icon HTML)
- `{name}` ← `"Cat Collection_0"` (category + index, unique identifier)
- `{type}` ← `"image"` (type field)
- `{filename}` ← `"bugcat_shock"` (extracted from URL, no extension)
- `{fullfilename}` ← `"bugcat_shock.png"` (extracted from URL, with extension)
- `{classes}` ← `"emoji-image"` (auto-generated CSS classes based on type)

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

**Custom Styled**:
```html
<span class="my-emoji {classes}">
  <img src="{url}" alt="{text}" loading="lazy">
  <span class="emoji-tooltip">{text}</span>
</span>
```

#### Usage Tips
- Leave template empty to use default HTML format
- Combine with custom CSS classes for advanced styling

## Advanced Search

- **Fuzzy Matching**: `sml` matches "smile" related emojis
- **Regular Expressions**: Use patterns like `Cat Collection.*a` to search for emojis containing "a" in the "Cat Collection"
- **Collection Filtering**: Search within specific collections using regex


## Frequently Asked Questions

### Q: Slow emoji loading?
A: The plugin uses caching for improved performance after initial load. Check cache status in settings.

### Q: What are regular expressions?
A: For a quick tutorial, see [Learn Regex the Easy Way](https://github.com/ziishaned/learn-regex/blob/master/translations/README-cn.md).

### Q: How to add custom emoji collections?
A: Add OWO format JSON file URLs to "OWO JSON URLs" in settings. Find collections at [emoticons.hzchu.top](https://emoticons.hzchu.top/).

### Q: Quick insertion not working?
A: Ensure "Enable Quick Emoji Insertion" is enabled in settings.

### Q: Can I use this on mobile?
A: Yes, the plugin supports both desktop and mobile Obsidian.

## Development

### Building the Project

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build
```

### Project Structure

```
src/
├── emoji-cache.ts           # Emoji caching system
├── emoji-manager.ts         # Emoji data management
├── emoji-picker-modal.ts    # Emoji selection interface
├── emoji-storage.ts         # Data persistence
├── emoji-suggest.ts         # Quick insertion suggestions
├── recent-emoji-manager.ts  # Recent emojis tracking
├── settings-tab.ts          # Settings interface
├── virtual-emoji-renderer.ts # Virtual scrolling renderer
└── performance-monitor.ts   # Performance monitoring
```

## Contributing

Contributions are welcome! Please feel free to:
- ⭐ Star the project
- 🐛 Report bugs
- 💡 Suggest features
- 🤝 Submit pull requests

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

If you find this plugin useful:
- ⭐ Star the repository
- 🐛 Report issues on GitHub
- 💡 Share feature suggestions
- 🤝 Contribute to development

## Author

- **Summer** - [flyalready.com](https://flyalready.com)

---

*Enjoy using emojis in Obsidian!* 😊
