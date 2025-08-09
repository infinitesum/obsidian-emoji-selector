# Recent Emojis 和 Remember Last Collection 优化

## 概述

优化了 recent emojis 功能与 remember last collection 功能之间的交互逻辑，提供更智能的用户体验。

## 主要优化

### 1. 智能优先级策略

新增了 `preferRecentOverRemembered` 设置，提供两种策略：

**策略 A: 优先显示 Recent（默认）**

- 如果启用了 recent emojis 且有数据 → 显示 Recent 标签页
- 如果没有 recent 数据 → 使用 remember last collection 逻辑
- 最后 fallback 到默认集合

**策略 B: 优先显示记住的集合**

- 先使用 remember last collection 逻辑
- 如果记住的集合不存在，再考虑 recent emojis
- 最后 fallback 到默认集合

### 2. 用户主动选择检测

- 跟踪用户是否主动点击了 Recent 标签页
- 只有用户主动选择 Recent 时才会记住这个选择
- 避免自动选择 Recent 时覆盖用户的偏好

### 3. 智能标签页管理

- 当 recent emojis 为空时，自动隐藏 Recent 标签页
- 如果当前选中的是 Recent 但数据为空，智能切换到合适的默认标签页
- 保持标签页状态的一致性

### 4. 高效的异步处理

- 将 `setInitialActiveCollection` 改为异步方法
- 在需要时才查询 recent emojis 数量，避免不必要的性能开销
- 保持 UI 响应性

## 新增设置

### Recent Emojis 设置组

1. **Enable recent emojis** - 启用最近使用的表情符号功能
2. **Max recent emojis** - 最大保存数量（1-50，默认 20）
3. **Prefer recent over remembered collection** - 优先显示最近使用而非记住的集合
4. **Clear recent emojis** - 清除所有最近使用的表情符号

## 用户体验改进

### 场景 1: 新用户

- 首次使用时显示第一个集合或 All
- 开始使用 emoji 后，Recent 标签页会出现
- 根据设置决定是否优先显示 Recent

### 场景 2: 老用户

- 保持原有的 remember last collection 行为
- 可以选择是否优先显示 Recent
- 用户主动选择的偏好会被正确记住

### 场景 3: Recent 数据变化

- Recent 为空时自动隐藏标签页
- 智能切换到合适的默认标签页
- 避免显示空的 Recent 标签页

## 技术实现

### 核心算法

```typescript
async setInitialActiveCollection() {
    // 策略 1: 检查是否优先显示 recent
    if (enableRecentEmojis && preferRecentOverRemembered) {
        if (recentCount > 0) return 'recent';
    }

    // 策略 2: 使用记住的集合
    if (rememberLastCollection) {
        if (lastSelected exists and valid) return lastSelected;
    }

    // 策略 3: 非优先模式下的 recent 检查
    if (enableRecentEmojis && !preferRecentOverRemembered) {
        if (recentCount > 0) return 'recent';
    }

    // 策略 4: 默认 fallback
    return firstCollection || 'all';
}
```

### 性能优化

- 使用 LRU 算法管理 recent emojis，O(1) 操作
- 异步初始化，避免阻塞 UI
- 智能缓存，减少重复查询
- 批量更新，减少 DOM 操作

## 向后兼容性

- 所有现有设置保持不变
- 新设置有合理的默认值
- 不影响现有用户的使用习惯
- 平滑升级体验
