/// <reference types="vite/client" />

interface Window {
  markdownViewer?: {
    platform: NodeJS.Platform;
    versions: {
      electron: string;
      chrome: string;
      node: string;
    };
  };
}
