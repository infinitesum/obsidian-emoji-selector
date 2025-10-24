### 中文 | [English](./README.md)

# Emoji Selector

在 Obsidian 里快速插入自定义表情。支持搜索、自定义样式和插入模板。<img src="https://eu-federal-media.pari.network/pari/88231cbf-7ba8-4c72-8065-b76148e45773.webp" alt="rxy_giveuflower" title="rxy_giveuflower" height="32"> <img src="https://eu-federal-media.pari.network/pari/ba4d1bff-b3f4-4923-b664-3c03f42f92c5.webp" alt="rxy_bukuishiwo" title="rxy_bukuishiwo" height="32"> <img src="https://eu-federal-media.pari.network/pari/97d1f66f-239a-46c6-8ab5-70cfb4eb92f9.gif" alt="ablobcat_fukifuki" title="ablobcat_fukifuki" height="32"> <img src="https://cdn.jsdelivr.net/gh/infinitesum/Twikoo-emoji@master/Blob/cats.png" alt="cats" title="cats" height="32"> <img src="https://cdn.jsdelivr.net/gh/infinitesum/Twikoo-emoji@master/nobeko/nobeko-hope.png" alt="nobeko-hope" title="nobeko-hope" height="32"> <img src="https://cdn.jsdelivr.net/gh/infinitesum/Twikoo-emoji@master/capoo/color.gif" alt="color" title="color" height="32"><img src="https://cdn.jsdelivr.net/gh/infinitesum/Twikoo-emoji@master/capoo/love.gif" alt="love" title="love" height="32"><img src="https://cdn.jsdelivr.net/gh/infinitesum/Twikoo-emoji@master/capoo/whimper.gif" alt="whimper" title="whimper" height="32">

## 截图

面板选择

![面板选择](https://io.pari.network/public.php/dav/files/8zCHa2az8HMJbmw/2025-08-10-0uRPkibD.gif) 

快速插入

![快速插入](https://io.pari.network/public.php/dav/files/8zCHa2az8HMJbmw/2025-08-10-rzt22Jjs.gif)


## 功能特性

- 输入触发字符（默认 `::` 或 `：：`）快速插入
- 表情选择器面板
- 兼容 owo 格式表情包文件，支持大量表情包
- 自定义插入模板和 CSS 样式
- 支持正则、模糊搜索


## 从插件市场安装
1. 在 Obsidian 中打开设置
2. 进入第三方插件
3. 搜索 “Emoji selector”
4. 安装并启用插件

## 快速开始

> [!important] 
> 使用前必须配置表情包：插件需要表情包文件才能正常工作。可以在 [https://emoticons.hzchu.top/](https://emoticons.hzchu.top/) 寻找您喜欢的表情包。

**第 1 步：添加表情包**

插件支持远程/本地 JSON OWO 表情包文件以及远程/本地图片。进入插件设置，在「OWO JSON URLs 或本地路径」中添加表情包：

- 在线表情包：从 https://emoticons.hzchu.top/ 挑选你喜欢的表情包，复制「引用链接」的 OWO 链接
  ![](https://io.pari.network/public.php/dav/files/8zCHa2az8HMJbmw/2025-10-qn3wO.png)
- 或使用本地文件：填入 JSON 文件相对与 vault 根目录的路径，JSON 内的 `icon` 字段填写表情图片相对于 Vault 内的路径
- 多个来源用英文逗号分隔
- 添加后点击「更新」按钮

**第 2 步：快速插入**

在编辑器中输入触发字符 + 表情名称：

- ::smile 或 ：：smile

**第 3 步：使用表情面板**

点击工具栏图标或使用命令面板搜索「Emoji Selector」


### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `::` 或 `：：` | 触发快速插入（默认，可在设置中自定义） |
| `Tab` / `Shift+Tab` | 面板切换表情包集合 |
| `Ctrl+M` | 面板切换多选模式（搜索框聚焦时） |
| `↑` / `↓` | 导航表情选择 |
| `Enter` | 选择表情 |
| `Esc` | 关闭面板 |

## 配置指南

### 触发字符配置

支持多个触发器，用 `|` 分隔。

**配置示例：**

|配置|说明|使用示例|
|---|---|---|
|`::\|：：`|中英文双冒号（推荐）|`::smile` 或 `：：smile`|
|`:\|：`|中英文单冒号|`:smile` 或 `：smile`|
|`::`|仅英文双冒号|`::smile`|


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



**可用变量：**

|变量|说明|示例值|
|---|---|---|
|`{category}`|集合名称|`猫猫虫`|
|`{text}`|`text` 字段|`bugcat_bugcat_shock`|
|`{url}`|从 icon 字段的 HTML 中提取的图片地址|`"https://emoticons.hzchu.top/emoticons/bugcat/bugcat_shock.png"`|
|`{name}`|category + 索引，自动生成唯一标识|`猫猫虫_0`|
|`{type}`|`type` 字段|`image`|
|`{filename}`|从URL提取，不含扩展名的文件名|`bugcat_shock`|
|`{fullfilename}`|从URL提取，含扩展名的完整文件名|`bugcat_shock.png`|
|`{classes}`|根据 type 字段自动添加 CSS 类，以及用户自定义的 CSS 类|`emoji-image`|

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

## 高级搜索
- **模糊匹配**：`sml` 匹配 "smile" 相关表情
- **正则表达式**：可实现集合特定搜索，如 `活字乱刷.*a` 搜索"活字乱刷"集合中包含"a"的表情


## 常见问题

### Q: 表情包加载缓慢？
A: 插件使用了缓存机制，首次加载后会显著提升速度。可在设置中查看缓存状态。

### Q：正则表达式是什么？
A：速成推荐阅读 [Learn Regex the Easy Way(中文版)](https://github.com/ziishaned/learn-regex/blob/master/translations/README-cn.md)。

### Q: 如何添加自定义表情包？
A: 在插件设置中，将表情包 JSON 文件路径添加到“OWL 表情包地址”中。推荐从 https://emoticons.hzchu.top/ 寻找表情包。

### Q: 快速插入不工作？
A: 确保在设置中启用了“开启快捷输入”选项。


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

