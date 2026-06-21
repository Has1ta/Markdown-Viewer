import { BrowserWindow, dialog } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface MarkdownFileResult {
  canceled: boolean;
  filePath: string | null;
  fileName: string | null;
  content: string | null;
  error?: string;
}

export interface MarkdownSaveResult {
  canceled: boolean;
  filePath: string | null;
  fileName: string | null;
}

const markdownFilters = [{ name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd"] }];

export async function openMarkdownFile(owner: BrowserWindow): Promise<MarkdownFileResult> {
  const result = await dialog.showOpenDialog(owner, {
    title: "打开 Markdown 文件",
    properties: ["openFile"],
    filters: markdownFilters
  });

  if (result.canceled || result.filePaths.length === 0) {
    return {
      canceled: true,
      filePath: null,
      fileName: null,
      content: null
    };
  }

  const filePath = result.filePaths[0];
  return readMarkdownFileByPath(filePath);
}

export async function readMarkdownFileByPath(filePath: string): Promise<MarkdownFileResult> {
  if (!isMarkdownFilePath(filePath)) {
    return {
      canceled: true,
      filePath: null,
      fileName: null,
      content: null,
      error: "请选择 .md 或 .markdown 文件。"
    };
  }

  try {
    const content = await readFile(filePath, "utf8");

    return {
      canceled: false,
      filePath,
      fileName: path.basename(filePath),
      content
    };
  } catch (error) {
    return {
      canceled: true,
      filePath,
      fileName: path.basename(filePath),
      content: null,
      error: error instanceof Error ? error.message : "读取文件失败。"
    };
  }
}

export async function saveMarkdownFile(
  owner: BrowserWindow,
  filePath: string | null,
  content: string,
  defaultFileName: string
): Promise<MarkdownSaveResult> {
  if (filePath) {
    await writeFile(filePath, content, "utf8");
    return {
      canceled: false,
      filePath,
      fileName: path.basename(filePath)
    };
  }

  return saveMarkdownFileAs(owner, content, defaultFileName);
}

export async function saveMarkdownFileAs(
  owner: BrowserWindow,
  content: string,
  defaultFileName: string
): Promise<MarkdownSaveResult> {
  const result = await dialog.showSaveDialog(owner, {
    title: "保存 Markdown 文件",
    defaultPath: ensureMarkdownFileName(defaultFileName),
    filters: markdownFilters
  });

  if (result.canceled || !result.filePath) {
    return {
      canceled: true,
      filePath: null,
      fileName: null
    };
  }

  const filePath = ensureMarkdownExtension(result.filePath);
  await writeFile(filePath, content, "utf8");

  return {
    canceled: false,
    filePath,
    fileName: path.basename(filePath)
  };
}

function ensureMarkdownFileName(fileName: string) {
  return /\.(md|markdown|mdown|mkd)$/i.test(fileName) ? fileName : `${fileName}.md`;
}

function ensureMarkdownExtension(filePath: string) {
  return /\.(md|markdown|mdown|mkd)$/i.test(filePath) ? filePath : `${filePath}.md`;
}

export function isMarkdownFilePath(filePath: string) {
  return /\.(md|markdown|mdown|mkd)$/i.test(filePath);
}
