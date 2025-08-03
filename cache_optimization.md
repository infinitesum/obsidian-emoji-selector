## 核心改进

1. 分离存储架构：

- data.json：只包含轻量的用户设置（emoji height等）
- cache.json：包含所有emoji缓存数据（单独文件）
- 彻底解决了data.json文件过大的问题

2. 启动时读取用户设置：

- 现在启动时会读取data.json中的emoji height设置
- 由于缓存已分离，data.json文件很小，读取速度快
- 用户的emoji尺寸设置立即生效
## 技术实现

**EmojiCacheManager重构：**

- 使用Obsidian的文件API直接读写 .obsidian/plugins/emoji-selector/cache.json
- 自动迁移：首次运行时将现有缓存从data.json迁移到cache.json
- 迁移后自动清理data.json中的缓存数据，保持文件轻量

**启动流程优化：**

- 恢复启动时读取设置（现在data.json很小）
- 用户的emoji height等设置立即应用
- 缓存按需加载，不影响启动速度
## 优化效果

- 启动速度：显著提升，只读取小的设置文件
- 用户体验：emoji height设置立即生效，现有emoji正确显示
- 向后兼容：现有用户无缝迁移，无需手动操作
- 架构清晰：设置和缓存职责分离，便于维护

这个方案完美解决了你提出的两个需求：既能读取用户的emoji height设置，又把缓存和设置分开存储。现在启动应该会非常快！