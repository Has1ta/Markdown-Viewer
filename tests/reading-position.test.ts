import { describe, expect, it } from "vitest";
import { sectionProgress } from "../src/editor/reading-position";

describe("跨视图章节位置", () => {
  it("在排版高度变化后仍能按章节内相对进度映射位置", () => {
    const progress = sectionProgress(128, -472, 728);
    expect(progress).toBe(0.5);
    expect(2000 + (3600 - 2000) * progress).toBe(2800);
  });

  it("对章节开头、末尾及尚未完成布局的区间使用有效进度", () => {
    expect(sectionProgress(128, 200, 800)).toBe(0);
    expect(sectionProgress(128, -800, 100)).toBe(1);
    expect(sectionProgress(128, 128, 128)).toBe(0);
    expect(sectionProgress(128, 200, 100)).toBe(0);
  });
});
