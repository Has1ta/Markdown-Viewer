# CHANGELOG

## 0.1.0 - 2026-06-21

- 完成第 10 阶段测试、打包与发布准备。
- 新增 `lint`、`test`、`dist` 脚本。
- 新增 Markdown 工具函数测试。
- 接入 `electron-builder`，生成 Windows 安装包和便携版。
- 精简发布产物：避免重复打包运行时不需要的前端 `node_modules`，并只保留中英文 Electron locale。
- 记录打包体积、验证结果和后续发布建议。
- 2026-06-22：修复打包后 `file://` 资源路径导致的空白页，并增加渲染进程 ready 握手，避免前端未启动时关闭窗口被拦截。
