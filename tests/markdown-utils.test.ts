import { describe, expect, it } from "vitest";
import { cleanHeadingText } from "../src/markdown/heading-text";
import { getMarkdownStats } from "../src/markdown/markdown-stats";
import { parseHeadings } from "../src/markdown/parse-headings";
import { slugifyHeading } from "../src/markdown/slug";

describe("Markdown 工具函数", () => {
  it("清理标题中的 Markdown 装饰和链接", () => {
    expect(cleanHeadingText("**[阶段十](#stage-10)** `发布` ![图](a.png)")).toBe("阶段十 发布");
  });

  it("生成稳定且可读的标题锚点", () => {
    expect(slugifyHeading("第 10 阶段：测试、打包与发布")).toBe("第-10-阶段测试打包与发布");
  });

  it("解析 1 到 3 级标题，跳过代码块内伪标题并处理重复标题", () => {
    const headings = parseHeadings(`# 总览

## 功能

\`\`\`md
# 代码块里的标题
\`\`\`

### 功能
#### 忽略四级
`);

    expect(headings).toEqual([
      { id: "总览", level: 1, text: "总览", index: 1 },
      { id: "功能", level: 2, text: "功能", index: 2 },
      { id: "功能-2", level: 3, text: "功能", index: 3 }
    ]);
  });

  it("统计正文时排除代码块、图片和 Markdown 标记", () => {
    const stats = getMarkdownStats(`# 标题

正文 text 123。

\`\`\`ts
const hidden = true;
\`\`\`

![截图](preview.png)
`, 1);

    expect(stats.headings).toBe(1);
    expect(stats.words).toBe(6);
    expect(stats.readingMinutes).toBe(1);
    expect(stats.characters).toBeGreaterThan(0);
  });
});
