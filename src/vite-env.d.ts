/// <reference types="vite/client" />

type MarkdownMenuCommand = "open" | "save" | "save-as";

interface MarkdownFileResult {
  canceled: boolean;
  filePath: string | null;
  fileName: string | null;
  content: string | null;
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
    openMarkdownFile: () => Promise<MarkdownFileResult>;
    saveMarkdownFile: (payload: {
      filePath: string | null;
      content: string;
      defaultFileName: string;
    }) => Promise<MarkdownSaveResult>;
    saveMarkdownFileAs: (payload: { content: string; defaultFileName: string }) => Promise<MarkdownSaveResult>;
    setDocumentEdited: (isEdited: boolean) => void;
    confirmClose: (shouldClose: boolean) => void;
    onMenuCommand: (callback: (command: MarkdownMenuCommand) => void) => () => void;
    onCloseRequested: (callback: () => void) => () => void;
  };
}
