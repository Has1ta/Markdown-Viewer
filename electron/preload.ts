import { contextBridge, ipcRenderer, webUtils } from "electron";

type MenuCommand = "open" | "save" | "save-as" | "open-recent";

contextBridge.exposeInMainWorld("markdownViewer", {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  },
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  openMarkdownFile: () => ipcRenderer.invoke("file:open-markdown"),
  openMarkdownFileByPath: (filePath: string) => ipcRenderer.invoke("file:open-markdown-by-path", filePath),
  resolveAssetUrl: (payload: { documentPath: string | null; assetPath: string }) =>
    ipcRenderer.invoke("file:resolve-asset-url", payload),
  saveMarkdownFile: (payload: { filePath: string | null; content: string; defaultFileName: string }) =>
    ipcRenderer.invoke("file:save-markdown", payload),
  saveMarkdownFileAs: (payload: { content: string; defaultFileName: string }) =>
    ipcRenderer.invoke("file:save-markdown-as", payload),
  notifyReady: () => ipcRenderer.send("app:renderer-ready"),
  setDocumentEdited: (isEdited: boolean) => ipcRenderer.send("document:set-edited", isEdited),
  confirmClose: (shouldClose: boolean) => ipcRenderer.send("app:close-response", shouldClose),
  getRecentFiles: () => ipcRenderer.invoke("recent-files:get"),
  onRecentFilesUpdated: (callback: (recentFiles: Array<{ filePath: string; fileName: string }>) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, recentFiles: Array<{ filePath: string; fileName: string }>) =>
      callback(recentFiles);
    ipcRenderer.on("app:recent-files-updated", listener);

    return () => ipcRenderer.removeListener("app:recent-files-updated", listener);
  },
  onMenuCommand: (callback: (command: MenuCommand, payload?: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, command: MenuCommand, payload?: unknown) => callback(command, payload);
    ipcRenderer.on("app:menu-command", listener);

    return () => ipcRenderer.removeListener("app:menu-command", listener);
  },
  onCloseRequested: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("app:close-requested", listener);

    return () => ipcRenderer.removeListener("app:close-requested", listener);
  }
});
