### 中文 | [English](./README-EN.md)

# Emoji Selector 表情选择器

在 Obsidian 里快速插入自定义表情。支持搜索、自定义样式和插入模板。

## 截图

面板选择

![面板选择](https://io.pari.network/s/gwMTTbgFFYffrNc/download)

快速插入

![快速插入](https://io.pari.network/s/RsXtTqLe8rmnwFW/download)


## 功能特性

- 输入 `:` 快速插入
- 表情选择器面板
- 兼容 owo 格式表情包文件，支持大量表情包
- 自定义插入模板和 CSS 样式
- 支持正则、模糊搜索
- 快捷键操作

## 快速开始

### 安装

#### 方法一：插件市场安装（暂未发布，请使用方法二）

1. 在 Obsidian 中打开设置
2. 进入第三方插件
3. 搜索 “Emoji Selector”
4. 安装并启用插件

#### 方法二：手动安装

1. 前往 [Releases 页面](https://github.com/infinitesum/obsidian-emoji-selector/releases)
2. 下载最新版本的 `main.js`、`manifest.json` 和 `styles.css`
3. 在 Obsidian 库文件夹中创建路径：`.obsidian/plugins/emoji-selector/`
4. 将下载的文件放入该文件夹
5. 重启 Obsidian 或在设置中重新加载插件
6. 在第三方插件设置中启用 “Emoji Selector”

### 基础使用

> [!important] 
> 使用前必须配置表情包：插件需要表情包文件才能正常工作。可以在 [https://emoticons.hzchu.top/](https://emoticons.hzchu.top/) 寻找您喜欢的表情包。


**首次使用配置步骤**：

1. **添加表情包**：进入插件设置，在“OWO JSON URLs”中添加 owo 格式的表情包文件链接，多个 URL 用英文逗号分隔。**添加后点击“更新”**
2. **快速插入**：在编辑器中输入 `:` 后跟表情名称，如 `:smile:`
3. **表情面板**：点击工具栏图标或使用命令面板搜索 “Emoji Selector”

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `:` | 触发快速插入 |
| `Tab` / `Shift+Tab` | 面板切换表情包集合 |
| `Ctrl+M` | 面板切换多选模式（搜索框聚焦时） |
| `↑` / `↓` | 导航表情选择 |
| `Enter` | 选择表情 |
| `Esc` | 关闭面板 |

## 配置指南

### 🔧 基础配置

#### 表情包源 (OWO JSON URLs)
- **推荐来源**：[https://emoticons.hzchu.top/](https://emoticons.hzchu.top/)
- **添加URL后必须点击“更新”按钮**

### 🎨 自定义表情模板

对于 owo 格式的表情包，插件会自动解析和转换：

**OWO文件结构示例**：
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

**变量自动生成规则**：
- `{category}` ← `"猫猫虫"` (集合名称)
- `{text}` ← `"bugcat_bugcat_shock"` (text字段)
- `{url}` ← `"https://emoticons.hzchu.top/emoticons/bugcat/bugcat_shock.png"` (从icon的HTML中提取)
- `{name}` ← `"猫猫虫_0"` (category + 索引，自动生成唯一标识)
- `{type}` ← `"image"` (type字段)
- `{filename}` ← `"bugcat_shock"` (从URL提取，不含扩展名)
- `{fullfilename}` ← `"bugcat_shock.png"` (从URL提取，含扩展名)
- `{classes}` ← `"emoji-image"` (根据 type 自动添加 CSS 类，以及用户自定义的 CSS 类)

#### 模板示例

**默认 HTML 模板**：
```html
<img src="{url}" alt="{text}" title="{text}" class="{classes}">
```

**Markdown 格式**：
```markdown
![{text}]({url})
```

**Stellar 标签组件**：
```
{% emoji {category} {fullfilename} %}
```

**自定义样式**：
```html
<span class="my-emoji {classes}">
  <img src="{url}" alt="{text}" loading="lazy">
  <span class="emoji-tooltip">{text}</span>
</span>
```

#### 使用技巧
- 留空使用默认 HTML 格式
- 可结合自定义 CSS 类实现复杂样式


## 高级搜索
- **模糊匹配**：`sml` 匹配 "smile" 相关表情
- **正则表达式**：可实现集合特定搜索，如 `活字乱刷.*a` 搜索"活字乱刷"集合中包含"a"的表情


## 常见问题

### Q: 表情包加载缓慢？
A: 插件使用了缓存机制，首次加载后会显著提升速度。可在设置中查看缓存状态。

### Q：正则表达式是什么？
A：速成推荐阅读 [Learn Regex the Easy Way(中文版)](https://github.com/ziishaned/learn-regex/blob/master/translations/README-cn.md)。

### Q: 如何添加自定义表情包？
A: 在插件设置中，将表情包 JSON 文件路径添加到“表情包文件”列表中。可在 [这里](https://emoticons.hzchu.top/) 寻找您喜欢的表情包。

### Q: 快速插入不工作？
A: 确保在设置中启用了“启用快速表情符号插入”选项。


## 开发

### 构建项目

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建生产版本
pnpm build
```

### 项目结构

```
src/
├── emoji-cache.ts           # 表情缓存管理
├── emoji-manager.ts         # 表情数据管理
├── emoji-picker-modal.ts    # 表情选择面板
├── emoji-storage.ts         # 数据存储
├── emoji-suggest.ts         # 快速插入建议
├── recent-emoji-manager.ts  # 最近使用管理
├── settings-tab.ts          # 设置面板
├── virtual-emoji-renderer.ts # 虚拟渲染
└── performance-monitor.ts   # 性能监控
```

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 支持

如果您觉得这个插件有用，欢迎：
- ⭐ 给项目点星
- 🐛 报告问题
- 💡 提出功能建议
- 🤝 贡献代码

## 作者

- **Summer** - [flyalready.com](https://flyalready.com)

---

*享受在 Obsidian 中使用表情的乐趣！* 😊

