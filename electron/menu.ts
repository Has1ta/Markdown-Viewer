import { app, BrowserWindow, MenuItemConstructorOptions } from "electron";

function sendCommand(command: string) {
  BrowserWindow.getFocusedWindow()?.webContents.send("app:menu-command", command);
}

export function buildApplicationMenu(): MenuItemConstructorOptions[] {
  return [
    {
      label: "文件",
      submenu: [
        {
          label: "打开",
          accelerator: "CmdOrCtrl+O",
          click: () => sendCommand("open")
        },
        {
          label: "保存",
          accelerator: "CmdOrCtrl+S",
          click: () => sendCommand("save")
        },
        {
          label: "另存为",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => sendCommand("save-as")
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
