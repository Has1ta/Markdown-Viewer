export type ViewMode = "render" | "source" | "split";

export interface HeadingItem {
  id: string;
  level: number;
  text: string;
  index: number;
}

export interface DocumentStats {
  characters: number;
  words: number;
  headings: number;
  readingMinutes: number;
}

export interface RecentFile {
  filePath: string;
  fileName: string;
}
