import { describe, expect, it } from "vitest";
import { findHeadingAtSourceLine, sourceReadingPosition } from "../src/editor/source-navigation";
import { parseHeadings } from "../src/markdown/parse-headings";

describe("源码目录导航", () => {
  const headings = parseHeadings("前言\n\n# 标题\n正文\n\n## 标题\n正文\n\n### 结尾\n");

  it("按真实源行选择当前章节，包含重复标题、标题前言和末尾正文", () => {
    expect(findHeadingAtSourceLine(headings, 1)?.id).toBe("标题");
    expect(findHeadingAtSourceLine(headings, 5)?.id).toBe("标题");
    expect(findHeadingAtSourceLine(headings, 6)?.id).toBe("标题-2");
    expect(findHeadingAtSourceLine(headings, 8)?.id).toBe("标题-2");
    expect(findHeadingAtSourceLine(headings, 100)?.id).toBe("结尾");
    expect(findHeadingAtSourceLine([], 1)).toBeUndefined();
  });

  it("阅读位置同时适应页面滚动、独立滚动容器和窄窗口裁剪", () => {
    expect(sourceReadingPosition(900, -2000, 3000)).toBe(128);
    expect(sourceReadingPosition(900, 300, 800)).toBe(328);
    expect(sourceReadingPosition(400, -2000, 3000)).toBe(96);
    expect(sourceReadingPosition(900, -2000, 100)).toBe(99);
    expect(sourceReadingPosition(900, -2000, -20)).toBe(-21);
    expect(sourceReadingPosition(900, 1000, 2000)).toBe(1001);
  });
});
