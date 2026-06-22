# Markdown Viewer v2 重置

本仓库用于管理 Markdown Viewer v2 重置过程中的产品说明、界面风格规范和后续开发资料。

## 当前内容

- `项目功能与显示效果完整整理.md`：整理 Markdown Viewer 的产品定位、功能范围、界面结构和显示效果。
- `STYLE.md`：记录 Markdown Viewer 的 UI 风格指南，包括布局、字体、颜色、组件和响应式规范。
- `public/favicon.svg` / `public/app-icon.ico`：当前应用图标资源，分别用于网页标签页和 Electron 桌面程序；`public/app-icon.png` 作为同源位图备份保留。
- `软件制作方案.md`：根据项目目标整理技术路线、阶段计划、多 AGENTS 分工和验收清单。
- `AGENTS.md`：记录后续协作、维护和提交规则。
- `.gitignore`：忽略常见临时文件、依赖目录和构建产物。
- `.gitattributes`：规范文本文件换行，减少跨平台 diff 噪音。

## 项目目标

Markdown Viewer 是一款面向 Windows 桌面的 Markdown 阅读与编辑工具，强调文档优先、长文档阅读体验、渲染校对、源码精修、目录导航、本地文件保存和拖拽导入。

本目录已进入源码阶段，当前完成 Electron + Vite + React + TypeScript 应用骨架，并提供一份内置 Markdown 示例用于验证首屏阅读体验。后续如果加入原型、截图或构建产物，应继续通过 Git 记录每个阶段的变化。

## 开发命令

首次拉取或清理依赖后安装：

```powershell
npm install
```

启动桌面开发环境：

```powershell
npm run dev
```

执行类型检查与生产构建：

```powershell
npm run build
```

执行代码检查：

```powershell
npm run lint
```

执行 Markdown 工具函数测试：

```powershell
npm test
```

生成 Windows 安装包和便携版：

```powershell
npm run dist
```

安装版会注册 Markdown 文件关联，安装后可通过双击 `.md`、`.markdown`、`.mdown`、`.mkd` 文件直接用 Markdown Viewer 打开。该文件关联依赖 Windows 安装包写入系统级关联信息，因此安装时通常需要管理员权限；便携版不会自动注册文件关联。

仅检查 TypeScript 类型：

```powershell
npm run typecheck
```

## 当前源码结构

- `electron/`：Electron 主进程、preload、安全文件 API、系统菜单、拖拽路径读取、最近文件菜单和本地文件读写服务。
- `src/app/`：应用状态、类型和入口组件。
- `src/components/`：应用外壳、侧栏、最近文件、拖拽覆盖层、提示条、文档头、空状态、未保存确认弹窗和底部操作栏。
- `src/editor/`：渲染视图、CodeMirror 源码视图、Crepe 渲染编辑视图、双栏同步视图和编辑器主题。
- `src/markdown/`：标题解析、锚点生成和文档统计工具函数。
- `src/assets/`：由源码导入并参与 Vite 打包的内置示例图片等资源。
- `src/styles/`：由 `STYLE.md` 落地的设计令牌、应用布局、Markdown 排版和响应式样式。
- `src/test-data/`：内置示例 Markdown 内容。
- `public/`：favicon 等需要保持固定根路径的公开静态资源。
- `scripts/`：打包阶段脚本，例如清理未使用 Electron locale 的 `after-pack.cjs`，以及生成 release 卸载辅助文件的 `write-release-uninstaller.cjs`。
- `tests/`：关键工具函数测试。
- `docs/`：测试、打包和发布记录。
- `output/playwright/`：阶段性浏览器截图和视觉验证记录。
- `release/`：由 `npm run dist` 生成的发布目录，包含安装包、便携版、解压版和卸载辅助入口；该目录不提交到 Git。

## 当前阶段状态

- 已完成第 1 阶段应用骨架：桌面窗口、React UI、暖白纸面样式、侧栏、文档头、主内容区和底部栏。
- 已完成第 2 阶段静态渲染阅读体验：标题、段落、链接、图片、列表、任务列表、引用、表格、行内代码、代码块、分割线、空状态和加载状态均有基础渲染与样式。
- 已完成第 3 阶段目录生成与侧栏导航：目录自动生成层级编号，支持折叠子目录、当前章节高亮、点击平滑跳转、源码视图点击目录自动切回渲染视图、移动端目录抽屉。
- 已完成第 4 阶段源码编辑视图：源码模式接入 CodeMirror 6，支持行号、当前行、括号匹配、历史记录、软换行、Markdown 语法高亮和暖白主题，并以懒加载方式隔离编辑器体积。
- 已完成第 5 阶段本地文件工作流：支持主界面顶部按钮与菜单打开 Markdown 文件、保存、另存为、未保存确认、窗口关闭保护、菜单快捷键和窗口标题未保存标记。
- 已完成第 6 阶段拖拽导入与最近文件：支持拖拽 Markdown 打开、非 Markdown 提示、拖拽替换前未保存保护、session-only 最近文件、侧栏最近文件列表和系统菜单最近文件。
- 已完成第 7 阶段双栏同步编辑：源码侧和渲染编辑侧共享同一份 Markdown，双向更新使用来源与版本快照保护，避免递归回写；窄屏下双栏自动改为上下排列。
- 已完成第 8 阶段代码块工具条与图片路径：代码块支持语言显示、复制、复制成功提示、语言搜索选择、预览开关；渲染视图可基于当前 Markdown 文件路径解析相对图片，并为缺失图片显示占位。
- 已完成第 9 阶段滚动联动、响应式与可访问性：阅读滚动可更新当前章节，目录跟随只滚动侧栏自身，目录点击与普通滚动逻辑分离，小屏目录抽屉和键盘焦点状态已补齐。
- 阅读视图在页面离开顶部后会轻微淡入独立的固定“返回顶部”按钮，长文档中段和末段无需滚到底部操作栏即可回到顶部；接近底部栏时按钮会自动上移避让。
- 已完成第 10 阶段测试、打包与发布准备：补齐 lint/test/dist 脚本、Markdown 工具函数测试、electron-builder 安装包与便携版配置、locale 精简脚本和发布记录。
- 已通过 Playwright 检查桌面和窄屏阅读视图，第二阶段移动端截图位于 `output/playwright/stage-2-mobile-preview.png`。
- 第三阶段已通过 Playwright 检查桌面目录跳转、源码视图切回渲染定位、折叠子目录和移动端目录抽屉，截图位于 `output/playwright/stage-3-mobile-toc-drawer.png`。
- 第四阶段已通过 Playwright 检查 CodeMirror 可编辑、切回渲染后内容同步、目录重新解析和控制台无错误，截图位于 `output/playwright/stage-4-codemirror-source.png`。
- 第五阶段已通过 Playwright 注入测试版文件 API 检查打开、保存、另存为、未保存取消保护、窗口标题未保存标记和控制台无错误，截图位于 `output/playwright/stage-5-unsaved-dialog.png`。
- 第六阶段已通过 Playwright 注入测试版拖拽/最近文件 API 检查 Markdown 拖入、非 Markdown 提示、未保存取消保护、最近文件排序和控制台无错误，截图位于 `output/playwright/stage-6-drag-recent-files.png`。
- 第七阶段已通过 Playwright 检查源码视图编辑后切入双栏、源码侧编辑更新渲染编辑侧、渲染编辑侧回写源码侧、表格与任务列表内容保留、桌面双列布局、窄屏单列布局、滚动保持和控制台无错误，截图位于 `output/playwright/stage-7-audit.png`。
- 第八阶段已通过 Playwright 检查代码复制、语言搜索筛选、语言选择写回 Markdown 围栏、预览开关、相对图片解析、缺失图片占位、移动端无横向溢出和控制台无错误，截图位于 `output/playwright/stage-8-code-image-tools.png`。
- 第九阶段已通过 Playwright 检查普通滚动目录高亮、侧栏跟随不影响正文滚动、目录点击定位、折叠父级自动展开、移动端目录抽屉、键盘焦点可见和控制台无错误，截图位于 `output/playwright/stage-9-scroll-responsive-a11y.png`。

## 体积优化记录

- 2026-06-21：在不缩减功能的前提下，将渲染编辑侧从 `@milkdown/crepe` 根入口改为 `CrepeBuilder` 加按需功能导入，并将 Crepe 通用样式拆为当前启用功能所需的 CSS。
- 本次优化后 `npm run build` 通过，`dist/` 中 JavaScript 总体积从约 2.861 MB 降至约 1.424 MB，CSS 总体积从约 0.099 MB 降至约 0.049 MB。
- 主要收益来自移除已禁用的 Crepe AI、Latex、内置 CodeMirror、KaTeX 字体和全量通用样式；保留源码编辑、渲染编辑、双栏同步、表格、图片块、链接提示、工具栏等现有功能。
- 2026-06-21：第十阶段打包时将运行时不需要的前端库移入开发依赖，避免 `node_modules` 重复进入 `app.asar`；打包后仅保留 `zh-CN` 与 `en-US` locale。当前安装包约 89.26 MB，便携版约 89.08 MB，`win-unpacked/` 约 309.54 MB，`app.asar` 约 1.55 MB。

## 打包问题修复记录

- 2026-06-22：修复打包后窗口只有米白色背景、菜单和关闭键无响应的问题。原因是 Vite 默认生成 `/assets/...` 绝对路径，Electron 打包后通过 `file://` 打开页面时无法加载前端 JS/CSS；现已将 Vite `base` 固定为 `./`。
- 同步增加渲染进程 ready 握手：只有 React 启动后才拦截关闭做未保存保护；如果前端启动失败，窗口仍可关闭，避免再次出现“空白且关不掉”的状态。
- 2026-06-22：`npm run dist` 会在 `release/` 中自动补充 `uninstall.cmd`、`uninstall.ps1` 和 `README.txt`，方便从发布目录直接启动已安装版本的卸载流程；便携版仍通过删除 exe 移除。
- 2026-06-22：安装包新增 Markdown 文件关联，并在主进程接收系统双击文件传入的路径；如果应用已运行，再次双击 Markdown 文件会聚焦现有窗口并按未保存保护流程打开新文件。
- 2026-06-22：页面滚离顶部后新增独立固定“返回顶部”按钮，并补充轻微淡入淡出和接近底部栏自动避让；保留底部栏原有返回顶部入口。

## 本地版本控制建议

常用命令：

```powershell
git status --short --branch
git add .
git commit -m "描述本次变更"
git log --oneline --decorate -5
```

建议每完成一个清晰阶段就提交一次，例如：

- 完成一版需求整理。
- 修改 UI 风格规范。
- 完成一个制作方案或阶段计划。
- 添加源码原型。
- 修复一个明确问题。
- 完成一次可运行版本。

## 协作约定

- 默认文档使用中文。
- 修改需求或设计文档时，应同步更新本 README 中的项目说明。
- 如果新增开发规则、构建方式或目录结构，应同步更新 `AGENTS.md`。
- Markdown 文档统一按 UTF-8 和 LF 换行维护。
