import sampleDocumentPreviewUrl from "../assets/sample-document-preview.svg";

export const sampleMarkdown = `# Markdown Viewer v2 示例文档

这是一份用于静态渲染阅读阶段的内置文档。它会覆盖标题、段落、链接、图片、列表、任务列表、引用、表格、行内代码、代码块和分割线，方便检查阅读视图是否稳定。

## 阅读优先

Markdown Viewer v2 的默认模式是渲染视图。侧栏、工具条和状态信息都应该服务于正文，不抢走文档本身的注意力。长段落需要保持舒适行宽，即使窗口很宽，也不应该铺成难以阅读的一整行。

> 一个好的阅读工具应该让人感觉内容自然铺开，控件在需要时才出现。

这是一个外部链接示例：[OpenAI](https://openai.com)。渲染器会给外部链接补充安全属性，内部锚点仍保持普通跳转。

### 阅读排版细节

正文里可以出现 \`inline code\`、**适度强调** 和 _轻微语气变化_。这些元素需要和暖白纸面风格融合，而不是像默认浏览器样式一样突兀。

![Markdown Viewer 阅读界面示意](${sampleDocumentPreviewUrl} "阅读界面示意")

## 编辑入口

当前阶段先提供轻量源码输入区，后续会替换为 CodeMirror 6，并继续保留统一 Markdown 状态。

- 渲染视图用于阅读和校对。
- 源码视图用于精修 Markdown。
- 双栏视图用于对照检查。
  - 双栏在窄屏下会改为上下排列。
  - 两侧未来会共享同一份 Markdown 内容。

任务列表用于记录阶段验收：

- [x] 默认进入渲染视图。
- [x] 示例 Markdown 能完整渲染。
- [ ] 后续接入本地打开和保存。

## 表格样式

| 能力 | 当前状态 | 后续阶段 | 备注 |
|---|:---:|---|---|
| Electron 窗口 | 已纳入骨架 | 加入文件菜单 | 主进程和 preload 已分离 |
| React UI | 已纳入骨架 | 拆分更多组件 | 保持文档优先 |
| Markdown 渲染 | 阅读视图增强 | 增强代码块与图片路径 | 表格在窄屏下横向滚动 |
| 长文本列 | 用于验证表格不会撑破布局 | 后续可加入列宽控制 | 这是一段较长的单元格内容，用于确认阅读区不会因为表格内容过长而破坏页面布局。 |

## 代码块

\`\`\`ts
type ViewMode = "render" | "source" | "split";

function describeMode(mode: ViewMode) {
  return mode === "render" ? "阅读校对" : "编辑增强";
}
\`\`\`

---

## 下一步

下一阶段会继续补齐文件打开、保存、目录跳转和更正式的编辑器能力。`;
