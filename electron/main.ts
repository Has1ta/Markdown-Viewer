import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openMarkdownFile, readMarkdownFileByPath, saveMarkdownFile, saveMarkdownFileAs } from "./file-service.js";
import { buildApplicationMenu, type RecentFileMenuItem } from "./menu.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
let isForceClosing = false;
const recentFiles: RecentFileMenuItem[] = [];

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
      sandbox: false,
      navigateOnDragDrop: false
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

function setApplicationMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildApplicationMenu(recentFiles)));
}

function broadcastRecentFiles() {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send("app:recent-files-updated", recentFiles);
  });
}

function addRecentFile(filePath: string | null, fileName: string | null) {
  if (!filePath || !fileName) {
    return;
  }

  const existingIndex = recentFiles.findIndex((file) => file.filePath === filePath);
  if (existingIndex >= 0) {
    recentFiles.splice(existingIndex, 1);
  }

  recentFiles.unshift({ filePath, fileName });
  recentFiles.splice(8);
  setApplicationMenu();
  broadcastRecentFiles();
}

function removeRecentFile(filePath: string) {
  const existingIndex = recentFiles.findIndex((file) => file.filePath === filePath);
  if (existingIndex < 0) {
    return;
  }

  recentFiles.splice(existingIndex, 1);
  setApplicationMenu();
  broadcastRecentFiles();
}

function getOwnerWindow(event: Electron.IpcMainInvokeEvent) {
  const owner = BrowserWindow.fromWebContents(event.sender);
  if (!owner) {
    throw new Error("无法找到当前窗口。");
  }

  return owner;
}

ipcMain.handle("file:open-markdown", async (event) => {
  const result = await openMarkdownFile(getOwnerWindow(event));
  addRecentFile(result.filePath, result.fileName);
  return result;
});

ipcMain.handle("file:open-markdown-by-path", async (_event, filePath: string) => {
  const result = await readMarkdownFileByPath(filePath);
  if (result.canceled) {
    removeRecentFile(filePath);
  } else {
    addRecentFile(result.filePath, result.fileName);
  }

  return result;
});

ipcMain.handle(
  "file:save-markdown",
  async (event, payload: { filePath: string | null; content: string; defaultFileName: string }) => {
    const result = await saveMarkdownFile(getOwnerWindow(event), payload.filePath, payload.content, payload.defaultFileName);
    addRecentFile(result.filePath, result.fileName);
    return result;
  }
);

ipcMain.handle(
  "file:save-markdown-as",
  async (event, payload: { content: string; defaultFileName: string }) => {
    const result = await saveMarkdownFileAs(getOwnerWindow(event), payload.content, payload.defaultFileName);
    addRecentFile(result.filePath, result.fileName);
    return result;
  }
);

ipcMain.handle("recent-files:get", () => recentFiles);

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
  setApplicationMenu();
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
