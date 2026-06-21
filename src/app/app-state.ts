import type { ViewMode } from "./app-types";
import { sampleMarkdown } from "../test-data/sample";

export const initialAppState = {
  markdown: sampleMarkdown,
  fileName: "示例文档.md",
  filePath: null as string | null,
  viewMode: "render" as ViewMode,
  lastSavedLabel: "尚未保存",
  isDirty: false
};
