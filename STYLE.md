# Markdown Viewer UI Style Guide

## 1. 设计定位

本界面采用**编辑型文档阅读器**风格，目标是在长篇 Markdown 阅读、技术文档浏览和知识库展示中，同时保证可读性、层级感与安静克制的视觉体验。

整体关键词：

- 温和、克制、轻量
- 编辑出版感
- 低饱和暖色调
- 清晰的内容层级
- 适合长时间阅读
- 文档优先，控件弱化

界面应避免过度装饰、强对比阴影、大面积高饱和色以及密集工具栏。视觉重点始终放在正文内容，而不是应用框架本身。

---

## 2. 布局规范

### 2.1 页面结构

推荐使用双栏布局：

```text
┌──────────────────────────────────────────────┐
│ 左侧目录栏 │          主内容阅读区          │
└──────────────────────────────────────────────┘
```

- 左侧目录栏：固定宽度，用于章节导航、提示信息与折叠按钮。
- 主内容区：自适应宽度，承载 Markdown 正文。
- 页面整体居中展示，左右保留充足安全边距。

### 2.2 推荐尺寸

| 区域 | 建议值 |
|---|---:|
| 页面最大宽度 | `1440px` |
| 页面外边距 | `24px`–`40px` |
| 左侧栏宽度 | `280px`–`320px` |
| 左右栏间距 | `16px`–`24px` |
| 主内容最小宽度 | `680px` |
| 主内容最大宽度 | `960px`–`1080px` |
| 主内容内边距 | `48px`–`64px` |

窄屏下应折叠左侧目录栏，主内容区改为单栏，正文左右内边距缩减至 `20px`–`28px`。

---

## 3. 字体规范

### 3.1 字体组合

界面采用“**衬线标题 + 无衬线正文**”的组合。

#### 标题字体

优先使用：

```css
font-family: "Source Serif 4", "Noto Serif SC", "Songti SC", Georgia, serif;
```

适用范围：

- 页面主标题
- 二级标题
- 三级标题
- 引用内容
- 少量强调型数字或章节标题

#### 正文与界面字体

优先使用：

```css
font-family: Inter, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
```

适用范围：

- 正文段落
- 导航
- 元数据
- 按钮
- 表格
- 提示文字
- 页脚操作区

#### 代码字体

```css
font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
```

### 3.2 字号层级

| 元素 | 字号 | 字重 | 行高 |
|---|---:|---:|---:|
| 页面主标题 H1 | `52px` | `500` | `1.12` |
| 二级标题 H2 | `28px` | `500` | `1.25` |
| 三级标题 H3 | `22px` | `500` | `1.3` |
| 正文 | `16px` | `400` | `1.75` |
| 导航一级项 | `15px` | `500` | `1.4` |
| 导航二级项 | `14px` | `400` | `1.4` |
| 元数据 | `14px` | `400` | `1.4` |
| 表格正文 | `14px` | `400` | `1.5` |
| 按钮文字 | `14px` | `500` | `1` |
| 代码 | `13px`–`14px` | `400` | `1.55` |

### 3.3 字体使用要求

- H1 不使用过重字重，避免 `700` 以上。
- 正文不应低于 `15px`。
- 中文正文建议使用 `16px`–`17px`，以提升长文阅读体验。
- 标题与正文之间应通过字号和字体类型拉开层级，而不是依赖高饱和颜色。
- 正文最大行宽建议控制在 `720px`–`820px`，避免单行过长。

---

## 4. 间距系统

使用 4px 基础栅格，推荐以下间距令牌：

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### 4.1 正文间距

| 场景 | 建议值 |
|---|---:|
| H1 与元数据 | `12px`–`16px` |
| 元数据与首段 | `32px`–`40px` |
| H2 上方 | `36px`–`48px` |
| H2 与正文 | `14px`–`18px` |
| 段落间距 | `14px`–`18px` |
| 列表项间距 | `8px`–`10px` |
| 分割线上下间距 | `32px`–`40px` |
| 表格与上下正文 | `20px`–`28px` |
| 代码块与上下正文 | `20px`–`28px` |
| 引用块与上下正文 | `24px`–`32px` |

### 4.2 左侧目录间距

- 一级章节项高度：`44px`–`48px`
- 二级章节项高度：`34px`–`38px`
- 一级组之间：`10px`–`14px`
- 图标与文字：`10px`–`12px`
- 目录容器内边距：`12px`–`16px`
- 左侧栏整体内边距：`16px`

---

## 5. 颜色规范

整体使用暖白、浅米灰、柔和灰绿色及少量陶土橙作为强调色。

### 5.1 基础色板

```css
:root {
  --bg-page: #F7F5F0;
  --bg-panel: #FCFBF8;
  --bg-subtle: #F3F0E9;
  --bg-hover: #EEEAE2;

  --text-primary: #22211F;
  --text-secondary: #5F5B55;
  --text-muted: #8D877E;
  --text-disabled: #B8B2A9;

  --border-default: #DDD8CF;
  --border-light: #EAE6DE;
  --divider: #E6E1D8;

  --accent-primary: #C96A49;
  --accent-hover: #B85C3E;
  --accent-soft: #F4E5DD;

  --success: #7E9684;
  --success-soft: #E6ECE7;

  --warning: #B88A45;
  --warning-soft: #F5ECDD;

  --code-bg: #F4F1EA;
  --quote-bg: #F7F3EB;
}
```

### 5.2 色彩使用规则

- 页面背景与内容面板之间只保留轻微明度差。
- 主文字使用接近黑色的暖灰，而不是纯黑。
- 边框统一采用浅暖灰，避免纯冷灰。
- 强调色只用于：
  - 当前导航项
  - 链接
  - 主操作按钮
  - 少量图标或状态
- 单个页面内强调色面积不应超过整体的 5%。
- 成功状态采用低饱和灰绿色，避免鲜亮绿色。
- 不使用大面积渐变。

### 5.3 深色模式建议

```css
[data-theme="dark"] {
  --bg-page: #1D1C1A;
  --bg-panel: #24221F;
  --bg-subtle: #2B2925;
  --bg-hover: #34312C;

  --text-primary: #F1EEE8;
  --text-secondary: #C8C2B8;
  --text-muted: #989187;

  --border-default: #3B3833;
  --border-light: #312E2A;
  --divider: #35322D;

  --accent-primary: #D97B59;
  --accent-hover: #E28968;
  --accent-soft: #3C2B24;

  --code-bg: #292722;
  --quote-bg: #2B2823;
}
```

---

## 6. 容器、边框与圆角

### 6.1 边框

统一采用单像素细边框：

```css
border: 1px solid var(--border-default);
```

分割线：

```css
border-color: var(--divider);
```

禁止使用粗边框或高对比描边。

### 6.2 圆角

```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-xl: 18px;
```

建议：

- 按钮、导航项：`8px`–`10px`
- 表格、代码块、提示框：`10px`–`12px`
- 主内容面板、左侧栏：`14px`–`18px`

### 6.3 阴影

整体以边框区分层级，阴影仅作轻微辅助：

```css
box-shadow: 0 1px 2px rgba(44, 39, 32, 0.03);
```

浮层可使用：

```css
box-shadow: 0 8px 24px rgba(44, 39, 32, 0.08);
```

主面板不应使用明显悬浮阴影。

---

## 7. Markdown 元素样式

### 7.1 标题

- H1 使用衬线字体，页面内通常只出现一次。
- H2 作为主要章节标题，顶部留白明显。
- H3 以下逐步切换为无衬线字体亦可，但需保持字重克制。
- 标题下方不默认加彩色装饰线。

### 7.2 正文

```css
.markdown-body p {
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.75;
  margin: 0 0 16px;
}
```

### 7.3 链接

```css
.markdown-body a {
  color: var(--accent-primary);
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
```

### 7.4 列表

- 项目符号尺寸较小。
- 列表左缩进建议 `22px`–`26px`。
- 多层列表层级缩进增量不超过 `20px`。
- 任务列表选中状态使用灰绿色。

### 7.5 表格

- 外层圆角容器。
- 表头仅使用浅背景，不使用重色填充。
- 单元格边框采用浅色细线。
- 单元格内边距：`12px 16px`。
- 表头字重：`500`。

```css
.markdown-body table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  overflow: hidden;
}
```

### 7.6 引用块

引用块采用完整浅色容器，而非仅一条高饱和左边框。

```css
.markdown-body blockquote {
  margin: 24px 0;
  padding: 22px 24px;
  background: var(--quote-bg);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  color: var(--text-secondary);
}
```

引用正文可使用衬线字体或斜体，但不要同时使用过大字号和高字重。

### 7.7 行内代码

```css
.markdown-body code:not(pre code) {
  padding: 2px 6px;
  background: var(--code-bg);
  border: 1px solid var(--border-light);
  border-radius: 5px;
  font-size: 0.9em;
}
```

### 7.8 代码块

- 背景为浅米灰。
- 可显示行号。
- 右上角放置复制按钮。
- 复制按钮默认弱化，悬停后增强。
- 语法高亮使用低饱和色。

```css
.markdown-body pre {
  position: relative;
  margin: 24px 0;
  padding: 18px 20px;
  background: var(--code-bg);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  overflow-x: auto;
}
```

### 7.9 分割线

```css
.markdown-body hr {
  border: 0;
  border-top: 1px solid var(--divider);
  margin: 36px 0;
}
```

---

## 8. 左侧目录栏规范

### 8.1 基础容器

- 背景：`var(--bg-panel)`
- 边框：`1px solid var(--border-default)`
- 圆角：`14px`
- 内边距：`12px`
- 默认固定定位或随页面滚动保持可见。

### 8.2 当前项

当前目录项使用浅色背景与适度字重，不使用强烈色块。

```css
.toc-item.active {
  background: var(--bg-subtle);
  color: var(--text-primary);
  font-weight: 500;
}
```

可以增加一条 2px 的陶土橙左侧标识，但不要同时再使用高饱和背景。

### 8.3 编号

章节编号放置在小型圆角方框中：

- 尺寸：`32px × 32px`
- 圆角：`8px`
- 边框：`1px solid var(--border-light)`
- 背景：透明或浅暖白
- 当前项编号可使用更明显的背景

### 8.4 折叠层级

- 一级目录展示标题与折叠箭头。
- 二级目录通过缩进和竖向引导线区分。
- 二级目录颜色使用 `text-secondary`。
- 三级目录默认不展开，避免目录过于拥挤。

---

## 9. 底部操作栏

底部操作栏应作为弱化的辅助区，而不是强工具栏。

推荐结构：

```text
返回顶部    内容反馈    复制链接    导出
```

要求：

- 高度：`56px`–`64px`
- 内边距：`12px`–`16px`
- 背景：`var(--bg-panel)`
- 边框：`1px solid var(--border-default)`
- 圆角：`12px`
- 主按钮使用陶土橙填充
- 其余按钮使用透明或浅色背景

主按钮示例：

```css
.button-primary {
  background: var(--accent-primary);
  color: #FFFFFF;
  border: 0;
  border-radius: 8px;
  padding: 10px 16px;
}
```

---

## 10. 图标规范

- 使用线性图标。
- 线宽保持 `1.5px`–`1.75px`。
- 常规尺寸：`16px`–`18px`。
- 重要操作尺寸：`20px`。
- 图标默认使用 `text-muted`。
- 不混用填充图标与线性图标。
- 推荐图标库：Lucide、Phosphor、Tabler Icons。

---

## 11. 交互与动效

### 11.1 悬停

- 背景轻微变深。
- 图标或文字颜色提升一级。
- 不使用明显缩放。

```css
transition: background-color 160ms ease,
            color 160ms ease,
            border-color 160ms ease;
```

### 11.2 展开与折叠

- 时长：`180ms`–`220ms`
- 缓动：`ease-out`
- 不使用弹性动画。

### 11.3 滚动定位

- 点击目录后平滑滚动。
- 当前章节在滚动过程中自动同步高亮。
- 标题定位顶部需预留 `24px`–`40px` 空间。

---

## 12. 响应式规范

### ≥ 1200px

- 双栏完整展示。
- 左侧栏固定宽度。
- 主内容区域最大宽度受限。

### 768px–1199px

- 左侧栏宽度缩小至 `240px`–`260px`。
- 主内容内边距缩小至 `32px`–`40px`。
- 次要元数据可隐藏。

### < 768px

- 默认隐藏左侧栏。
- 顶部增加目录按钮。
- 目录以抽屉形式展开。
- 页面外边距：`12px`–`16px`。
- 主内容内边距：`20px`–`24px`。
- H1 缩小至 `36px`–`40px`。
- 表格允许横向滚动。
- 底部操作栏只保留关键操作。

---

## 13. 可访问性要求

- 正文与背景对比度至少达到 WCAG AA。
- 正文文字对比度不低于 `4.5:1`。
- 大号标题对比度不低于 `3:1`。
- 所有交互控件必须有明确的焦点状态。
- 不仅依赖颜色表达当前状态。
- 图标按钮必须提供 `aria-label`。
- 点击区域不小于 `40px × 40px`。
- 支持系统减少动态效果设置。

焦点样式建议：

```css
:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent-primary) 65%, white);
  outline-offset: 2px;
}
```

---

## 14. 核心设计令牌

```css
:root {
  /* Typography */
  --font-serif: "Source Serif 4", "Noto Serif SC", "Songti SC", Georgia, serif;
  --font-sans: Inter, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-mono: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;

  /* Colors */
  --bg-page: #F7F5F0;
  --bg-panel: #FCFBF8;
  --bg-subtle: #F3F0E9;
  --bg-hover: #EEEAE2;
  --text-primary: #22211F;
  --text-secondary: #5F5B55;
  --text-muted: #8D877E;
  --border-default: #DDD8CF;
  --border-light: #EAE6DE;
  --divider: #E6E1D8;
  --accent-primary: #C96A49;
  --accent-hover: #B85C3E;
  --accent-soft: #F4E5DD;
  --success: #7E9684;
  --success-soft: #E6ECE7;
  --code-bg: #F4F1EA;
  --quote-bg: #F7F3EB;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;

  /* Layout */
  --sidebar-width: 296px;
  --content-max-width: 1040px;
  --article-max-width: 820px;

  /* Motion */
  --duration-fast: 160ms;
  --duration-normal: 200ms;
  --ease-standard: ease-out;
}
```

---

## 15. 禁止项

- 不使用纯白背景配纯黑正文。
- 不使用高饱和蓝色作为默认主色。
- 不使用重阴影制造卡片层级。
- 不在同一页面混用多种圆角尺寸。
- 不使用过粗的标题字重。
- 不让正文行宽无限扩展。
- 不在左侧目录堆叠过多图标和状态标签。
- 不让操作按钮抢占正文视觉焦点。
- 不使用明显玻璃拟态、霓虹、渐变描边等风格。

---

## 16. 最终视觉目标

成品应呈现为一款安静、成熟、适合长时间阅读的 Markdown 查看器。页面具有纸张与编辑出版物的质感，但仍保留现代应用的交互效率。用户进入页面后，第一视觉焦点应是文档标题和正文内容，目录、操作栏与工具控件均作为辅助信息存在。
