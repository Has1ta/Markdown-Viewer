import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openMarkdownFile, saveMarkdownFile, saveMarkdownFileAs } from "./file-service.js";
import { buildApplicationMenu } from "./menu.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
let isForceClosing = false;

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "Markdown Viewer v2",
    backgroundColor: "#F7F5F0",
    titleBarStyle: "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (event) => {
    if (isForceClosing) {
      return;
    }

    event.preventDefault();
    mainWindow.webContents.send("app:close-requested");
  });

  if (isDev) {
    void mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

function getOwnerWindow(event: Electron.IpcMainInvokeEvent) {
  const owner = BrowserWindow.fromWebContents(event.sender);
  if (!owner) {
    throw new Error("无法找到当前窗口。");
  }

  return owner;
}

ipcMain.handle("file:open-markdown", async (event) => openMarkdownFile(getOwnerWindow(event)));

ipcMain.handle(
  "file:save-markdown",
  async (event, payload: { filePath: string | null; content: string; defaultFileName: string }) =>
    saveMarkdownFile(getOwnerWindow(event), payload.filePath, payload.content, payload.defaultFileName)
);

ipcMain.handle(
  "file:save-markdown-as",
  async (event, payload: { content: string; defaultFileName: string }) =>
    saveMarkdownFileAs(getOwnerWindow(event), payload.content, payload.defaultFileName)
);

ipcMain.on("document:set-edited", (event, isEdited: boolean) => {
  BrowserWindow.fromWebContents(event.sender)?.setDocumentEdited(isEdited);
});

ipcMain.on("app:close-response", (event, shouldClose: boolean) => {
  if (!shouldClose) {
    return;
  }

  const owner = BrowserWindow.fromWebContents(event.sender);
  if (!owner) {
    return;
  }

  isForceClosing = true;
  owner.close();
  isForceClosing = false;
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildApplicationMenu()));
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
