import { contextBridge, ipcRenderer } from "electron";

type MenuCommand = "open" | "save" | "save-as";

contextBridge.exposeInMainWorld("markdownViewer", {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  },
  openMarkdownFile: () => ipcRenderer.invoke("file:open-markdown"),
  saveMarkdownFile: (payload: { filePath: string | null; content: string; defaultFileName: string }) =>
    ipcRenderer.invoke("file:save-markdown", payload),
  saveMarkdownFileAs: (payload: { content: string; defaultFileName: string }) =>
    ipcRenderer.invoke("file:save-markdown-as", payload),
  setDocumentEdited: (isEdited: boolean) => ipcRenderer.send("document:set-edited", isEdited),
  confirmClose: (shouldClose: boolean) => ipcRenderer.send("app:close-response", shouldClose),
  onMenuCommand: (callback: (command: MenuCommand) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, command: MenuCommand) => callback(command);
    ipcRenderer.on("app:menu-command", listener);

    return () => ipcRenderer.removeListener("app:menu-command", listener);
  },
  onCloseRequested: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("app:close-requested", listener);

    return () => ipcRenderer.removeListener("app:close-requested", listener);
  }
});
