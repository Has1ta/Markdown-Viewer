/// <reference types="vite/client" />

type MarkdownMenuCommand = "open" | "save" | "save-as" | "open-recent";

interface RecentMarkdownFile {
  filePath: string;
  fileName: string;
}

interface MarkdownFileResult {
  canceled: boolean;
  filePath: string | null;
  fileName: string | null;
  content: string | null;
  error?: string;
}

interface MarkdownSaveResult {
  canceled: boolean;
  filePath: string | null;
  fileName: string | null;
}

interface Window {
  markdownViewer?: {
    platform: NodeJS.Platform;
    versions: {
      electron: string;
      chrome: string;
      node: string;
    };
    getPathForFile: (file: File) => string;
    openMarkdownFile: () => Promise<MarkdownFileResult>;
    openMarkdownFileByPath: (filePath: string) => Promise<MarkdownFileResult>;
    resolveAssetUrl: (payload: { documentPath: string | null; assetPath: string }) => Promise<string | null>;
    saveMarkdownFile: (payload: {
      filePath: string | null;
      content: string;
      defaultFileName: string;
    }) => Promise<MarkdownSaveResult>;
    saveMarkdownFileAs: (payload: { content: string; defaultFileName: string }) => Promise<MarkdownSaveResult>;
    setDocumentEdited: (isEdited: boolean) => void;
    confirmClose: (shouldClose: boolean) => void;
    getRecentFiles: () => Promise<RecentMarkdownFile[]>;
    onRecentFilesUpdated: (callback: (recentFiles: RecentMarkdownFile[]) => void) => () => void;
    onMenuCommand: (callback: (command: MarkdownMenuCommand, payload?: unknown) => void) => () => void;
    onCloseRequested: (callback: () => void) => () => void;
  };
}
