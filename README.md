# Markdown Viewer v2 重置

本仓库用于管理 Markdown Viewer v2 重置过程中的产品说明、界面风格规范和后续开发资料。

## 当前内容

- `项目功能与显示效果完整整理.md`：整理 Markdown Viewer 的产品定位、功能范围、界面结构和显示效果。
- `STYLE.md`：记录 Markdown Viewer 的 UI 风格指南，包括布局、字体、颜色、组件和响应式规范。
- `AGENTS.md`：记录后续协作、维护和提交规则。
- `.gitignore`：忽略常见临时文件、依赖目录和构建产物。
- `.gitattributes`：规范文本文件换行，减少跨平台 diff 噪音。

## 项目目标

Markdown Viewer 是一款面向 Windows 桌面的 Markdown 阅读与编辑工具，强调文档优先、长文档阅读体验、渲染校对、源码精修、目录导航、本地文件保存和拖拽导入。

本目录当前主要作为需求与设计资料仓库使用。后续如果加入源码、原型、截图或构建产物，应继续通过 Git 记录每个阶段的变化。

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
- 添加源码原型。
- 修复一个明确问题。
- 完成一次可运行版本。

## 协作约定

- 默认文档使用中文。
- 修改需求或设计文档时，应同步更新本 README 中的项目说明。
- 如果新增开发规则、构建方式或目录结构，应同步更新 `AGENTS.md`。
- Markdown 文档统一按 UTF-8 和 LF 换行维护。
