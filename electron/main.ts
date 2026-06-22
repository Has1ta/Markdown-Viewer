import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isMarkdownFilePath,
  openMarkdownFile,
  readMarkdownFileByPath,
  resolveMarkdownAssetUrl,
  saveMarkdownFile,
  saveMarkdownFileAs
} from "./file-service.js";
import { buildApplicationMenu, type RecentFileMenuItem } from "./menu.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
let isForceClosing = false;
let isRendererReady = false;
let mainWindow: BrowserWindow | null = null;
let pendingOpenFilePath: string | null = findMarkdownFileArgument(process.argv);
const recentFiles: RecentFileMenuItem[] = [];

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

function getAppIconPath() {
  return isDev ? path.join(__dirname, "../public/app-icon.ico") : path.join(__dirname, "../dist/app-icon.ico");
}

function createMainWindow() {
  isRendererReady = false;
  const appIconPath = getAppIconPath();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "Markdown Viewer v2",
    icon: appIconPath,
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

  mainWindow.webContents.on("did-fail-load", () => {
    isRendererReady = false;
  });

  mainWindow.webContents.on("render-process-gone", () => {
    isRendererReady = false;
  });

  mainWindow.on("close", (event) => {
    if (isForceClosing || !isRendererReady) {
      return;
    }

    event.preventDefault();
    mainWindow?.webContents.send("app:close-requested");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (isDev) {
    void mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

function findMarkdownFileArgument(argv: string[]) {
  return (
    argv.find((argument) => {
      if (argument.startsWith("--") || !isMarkdownFilePath(argument)) {
        return false;
      }

      return existsSync(argument);
    }) ?? null
  );
}

function requestOpenMarkdownFile(filePath: string | null) {
  if (!filePath || !isMarkdownFilePath(filePath) || !existsSync(filePath)) {
    return;
  }

  if (isRendererReady && mainWindow) {
    mainWindow.webContents.send("app:open-file-requested", filePath);
    return;
  }

  pendingOpenFilePath = filePath;
}

function flushPendingOpenFile() {
  if (!mainWindow || !pendingOpenFilePath) {
    return;
  }

  const nextFilePath = pendingOpenFilePath;
  pendingOpenFilePath = null;
  mainWindow.webContents.send("app:open-file-requested", nextFilePath);
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

ipcMain.handle("file:resolve-asset-url", (_event, payload: { documentPath: string | null; assetPath: string }) =>
  resolveMarkdownAssetUrl(payload.documentPath, payload.assetPath)
);

ipcMain.on("document:set-edited", (event, isEdited: boolean) => {
  BrowserWindow.fromWebContents(event.sender)?.setDocumentEdited(isEdited);
});

ipcMain.on("app:renderer-ready", () => {
  isRendererReady = true;
  flushPendingOpenFile();
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

if (hasSingleInstanceLock) {
  app.on("second-instance", (_event, argv) => {
    const filePath = findMarkdownFileArgument(argv);

    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();
    } else {
      createMainWindow();
    }

    requestOpenMarkdownFile(filePath);
  });

  app.on("open-file", (event, filePath) => {
    event.preventDefault();
    requestOpenMarkdownFile(filePath);
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
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
