import { app, MenuItemConstructorOptions } from "electron";

export function buildApplicationMenu(): MenuItemConstructorOptions[] {
  return [
    {
      label: "文件",
      submenu: [
        {
          label: "打开",
          accelerator: "CmdOrCtrl+O",
          enabled: false
        },
        {
          label: "保存",
          accelerator: "CmdOrCtrl+S",
          enabled: false
        },
        { type: "separator" },
        {
          label: "退出",
          role: process.platform === "darwin" ? "close" : "quit"
        }
      ]
    },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "重新加载" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "resetZoom", label: "实际大小" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        { role: "togglefullscreen", label: "切换全屏" }
      ]
    },
    {
      label: "帮助",
      submenu: [
        {
          label: `关于 ${app.name}`,
          enabled: false
        }
      ]
    }
  ];
}
