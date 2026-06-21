# AGENTS.md

## 项目说明

本项目用于记录 Markdown Viewer v2 重置过程中的需求、界面风格和后续开发资料。当前以 Markdown 文档为主，未来可能加入桌面应用源码、原型资源和构建配置。

## 默认语言

- 项目说明、协作规则和面向用户的文档默认使用中文。
- 代码、命令、配置项和第三方 API 名称保持其原始英文形式。

## 协作规则

- 做 coding 相关任务时，如果项目缺少 `README.md` 或 `AGENTS.md`，需要主动补齐。
- 每次完成代码或项目结构变更后，应检查并按需更新 `README.md` 与 `AGENTS.md`。
- 变更前先查看现有文件，避免覆盖用户已有内容。
- 对用户已有文件保持谨慎，不做无关重构，不删除用户未明确要求删除的内容。
- 修改文档时优先保持 UTF-8 编码。
- Markdown 和常见源码文本遵循 `.gitattributes` 中的换行规范。
- Git 提交应按阶段进行，提交信息用简短中文描述。

## 当前文件说明

- `README.md`：项目入口说明、当前内容、版本控制建议。
- `AGENTS.md`：本文件，记录协作与维护规则。
- `.gitignore`：忽略临时文件、依赖目录和构建产物。
- `.gitattributes`：规范文本文件换行，减少无意义差异。
- `STYLE.md`：Markdown Viewer UI 风格指南。
- `项目功能与显示效果完整整理.md`：产品功能和显示效果说明。
- `软件制作方案.md`：软件技术路线、阶段计划、多 AGENTS 分工和验收清单。
- `package.json`：Electron + Vite + React + TypeScript 工程脚本和依赖。
- `package-lock.json`：npm 依赖锁定文件。
- `electron/`：桌面窗口、preload、安全文件 API、系统菜单和本地文件读写服务。
- `src/`：React 应用源码、Markdown 工具函数、样式和示例数据。
- `public/`：静态资源，例如 favicon 和示例文档图片。
- `output/playwright/`：阶段性视觉验证截图。

## 多 AGENTS 协作建议

- 主控 Agent 负责阶段拆分、架构一致性、最终集成、验证和 Git 提交。
- 产品 Agent 负责把需求文档拆成用户故事、优先级和验收标准。
- UI Agent 负责把 `STYLE.md` 转换为设计令牌、组件样式和响应式规则。
- Electron Agent 负责本地文件、系统菜单、窗口关闭拦截、拖拽导入和 preload API。
- Editor Agent 负责渲染编辑、源码编辑、双栏模式和双向同步。
- Markdown Agent 负责标题解析、目录、图片路径、代码块工具条和统计信息。
- QA Agent 负责测试清单、回归验证、打包冒烟和问题记录。
- Release Agent 负责打包配置、包体积记录、版本号和发布说明。

## 后续维护建议

- 如果新增源码目录，应在 `README.md` 中补充启动、构建、测试命令。
- 如果新增依赖管理文件，例如 `package.json`、`requirements.txt` 或其他构建配置，应在 `.gitignore` 中补充对应忽略项。
- 如果项目从文档阶段进入可运行应用阶段，应建立明确的提交节奏，例如需求整理、UI 原型、核心功能、打包发布分别提交。
- 进入源码阶段后，应以 `软件制作方案.md` 的阶段划分为主线推进，阶段完成后更新验收状态。
- 当前源码阶段使用 `npm run dev` 启动 Electron 开发窗口，使用 `npm run build` 验证 TypeScript 与 Vite 生产构建。
- `dist/`、`dist-electron/`、`node_modules/` 和打包产物不应提交到 Git。
- 做阅读视图相关修改后，应检查宽屏与窄屏下是否存在页面级横向溢出，并优先让表格和代码块在自身容器内滚动。
- 做目录导航相关修改时，应区分“点击目录触发正文滚动”和“普通阅读滚动更新当前章节高亮”；侧栏自动跟随只能滚动侧栏自身，不能反向滚动正文。
- 做目录点击定位相关修改时，应避免直接依赖 `scrollIntoView({ block: "start" })`；优先用固定阅读偏移计算 `window.scrollTo`，并让长距离跳转直接定位、短距离跳转平滑滚动。
- 做目录高亮相关修改时，应保留 `navigationInProgressRef` 之类的显式导航保护，避免平滑滚动过程中被普通 scroll 监听提前抢占高亮。
- 做源码编辑器相关修改时，应保持 `markdown` 字符串作为单一真相源；CodeMirror 只负责编辑表面，外部内容变化必须同步进编辑器但不能造成重复回写循环。
- CodeMirror 依赖应保持懒加载和独立 chunk，避免默认渲染视图首包明显变大。
- 做双栏编辑相关修改时，应继续保持 `markdown` 作为单一真相源；源码侧和渲染编辑侧只能通过来源与版本快照协调，不能让两个编辑器各自持有独立文档真相。
- 渲染编辑侧当前使用 Crepe/Milkdown；外部写入应通过编辑器 API 同步并用 `isApplyingExternalRef` 抑制回写，避免右侧接收源码变化时再次触发父级更新。
- CodeMirror 的 `updateListener` 不应逐事务同步调用父级 `setMarkdown`；源码侧输入应按 animation frame 合并为最新 Markdown 再上抛，避免快速输入造成 React 嵌套更新。
- Crepe 相关资源目前只在双栏视图懒加载；后续若调整功能插件或打包分块，应同时检查 `npm run build` 的 chunk 体积和默认渲染视图首屏资源。
- 做代码块工具条相关修改时，应保持 `RenderEditor` 事件代理方式，语言选择需要写回 fenced code block 的 info string，复制结果用按钮状态和 aria-live 通知反馈。
- 做本地图片路径相关修改时，不能在渲染层直接拼接 Windows 本地路径；应通过 preload 白名单 API 让主进程校验 Markdown 文件目录、图片扩展名和 `file://` URL。
- 做本地文件工作流相关修改时，所有文件读写必须通过 preload 暴露的白名单 API；打开文件、拖拽替换、窗口关闭等危险操作必须复用同一个未保存确认流程。
- 最近文件只保持 session-only，不做持久化；拖拽文件路径应优先通过 preload 暴露的 `webUtils.getPathForFile(file)` 获取，并保持 `navigateOnDragDrop: false` 防止误导航。
