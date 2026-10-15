const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

// 复用已启动的 Vite 服务；直接调用 npm CLI，避免 Windows shell 破坏代码载荷。
const projectDirectory = path.resolve(__dirname, "..");
const outputDirectory = path.join(projectDirectory, "output", "playwright");
const payloadDirectory = path.join(projectDirectory, ".playwright-cli");
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const session = `source-navigation-${process.pid}`;
const payloadFile = path.join(payloadDirectory, `source-navigation-payload-${process.pid}.js`);
const configuration = {
  url: process.env.TOC_TEST_URL || process.env.SPLIT_TEST_URL || "http://127.0.0.1:5173",
  desktopScreenshot: path.join(outputDirectory, "source-navigation-desktop.png"),
  mobileScreenshot: path.join(outputDirectory, "source-navigation-mobile.png")
};

function runCli(arguments_) {
  const result = spawnSync(process.execPath, [
    npmCli, "exec", "--yes", "--package", "@playwright/cli", "--", "playwright-cli", `-s=${session}`, ...arguments_
  ], {
    cwd: projectDirectory,
    encoding: "utf8",
    windowsHide: true,
    timeout: 180000,
    maxBuffer: 5 * 1024 * 1024
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error || result.status !== 0 || /^### Error/m.test(output)) {
    throw new Error(`${arguments_[0]} 失败：${result.error?.message || output || result.status}`);
  }
  return output;
}

async function browserRegression(page, config) {
  const pageErrors = [];
  const consoleErrors = [];
  const stages = [];
  let stage = "初始化";
  const source = () => page.locator(".source-editor .cm-content");
  const desktopToc = () => page.locator(".app-sidebar .toc-list");
  const tab = (name) => page.getByRole("tab", { name, exact: true });

  function check(condition, message) {
    if (!condition) throw new Error(message);
  }

  async function readSourceState() {
    return source().evaluate((element) => {
      const view = element.cmView?.view || element.cmTile?.view;
      if (!view) throw new Error("无法读取 CodeMirror 文档状态");
      return { markdown: view.state.doc.toString(), selection: view.state.selection.main.head, viewport: view.viewport };
    });
  }

  async function writeSource(markdown) {
    await source().click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.insertText(markdown);
    await page.waitForFunction((expected) => {
      const element = document.querySelector(".source-editor .cm-content");
      const view = element?.cmView?.view || element?.cmTile?.view;
      return view?.state.doc.toString() === expected;
    }, markdown);
  }

  async function getHeading(index, mobile = false) {
    const list = mobile ? page.getByRole("dialog", { name: "移动端文档目录" }).locator(".toc-list") : desktopToc();
    const button = list.locator(".toc-item").nth(index);
    return { button, id: await button.getAttribute("data-heading-id") };
  }

  async function sourceHeadingRect(lineNumber) {
    return source().evaluate((element, targetLine) => {
      const view = element.cmView?.view || element.cmTile?.view;
      const line = view.state.doc.line(targetLine);
      const rect = view.coordsAtPos(line.from);
      return rect && { top: rect.top, bottom: rect.bottom, text: line.text, scrollY: window.scrollY };
    }, lineNumber);
  }

  async function waitForSourceHeading(heading, id, mode = "源码") {
    await page.waitForFunction(({ lineNumber, expectedId, modeName }) => {
      const element = document.querySelector(".source-editor .cm-content");
      const view = element?.cmView?.view || element?.cmTile?.view;
      const line = view?.state.doc.line(lineNumber);
      const rect = line && view.coordsAtPos(line.from);
      const selectedTab = Array.from(document.querySelectorAll('[role="tab"]')).find((node) => node.getAttribute("aria-selected") === "true");
      const active = document.querySelector('.app-sidebar .toc-item[aria-current="true"]');
      return selectedTab?.textContent === modeName && active?.getAttribute("data-heading-id") === expectedId &&
        rect && rect.top >= 24 && rect.bottom < Math.min(window.innerHeight - 40, 360);
    }, { lineNumber: heading.lineNumber, expectedId: id, modeName: mode }, { timeout: 8000 });
    const rect = await sourceHeadingRect(heading.lineNumber);
    check(rect?.text === heading.markdown, `导航到了错误源码行：${JSON.stringify({ heading, rect })}`);
  }

  async function clickSourceHeading(index, headings, mode = "源码", mobile = false) {
    const { button, id } = await getHeading(index, mobile);
    await button.click();
    await waitForSourceHeading(headings[index], id, mode);
    return id;
  }

  async function scrollSourceSectionToReadingLine(heading) {
    // 使用 CodeMirror 的行布局读取目标高度。只滚动真实窗口，不移动光标或派发编辑事务。
    await source().evaluate((element, lineNumber) => {
      const view = element.cmView?.view || element.cmTile?.view;
      const line = view.state.doc.line(lineNumber);
      const block = view.lineBlockAt(line.from);
      window.scrollTo({ top: Math.max(0, window.scrollY + view.documentTop + block.top - 120), behavior: "instant" });
    }, heading.lineNumber);
  }

  async function waitForActive(id) {
    await page.waitForFunction((expectedId) => {
      return document.querySelector('.app-sidebar .toc-item[aria-current="true"]')?.getAttribute("data-heading-id") === expectedId;
    }, id, { timeout: 6000 });
  }

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload({ waitUntil: "networkidle" });
    await tab("源码").click();
    await source().waitFor({ state: "visible" });

    const lines = [];
    const headings = [];
    const addHeading = (markdown) => {
      headings.push({ lineNumber: lines.length + 1, markdown });
      lines.push(markdown, "");
    };
    addHeading("# 源码目录导航回归");
    lines.push("这份长文档用于验证视口、目录和源码行的对应关系。", "");
    for (let section = 1; section <= 56; section += 1) {
      addHeading(section === 12 || section === 43 ? "## 重复标题" : `## 章节 ${String(section).padStart(2, "0")}`);
      for (let paragraph = 1; paragraph <= 10; paragraph += 1) {
        lines.push(`章节 ${section} 第 ${paragraph} 段：阅读位置应决定左侧目录高亮，编辑光标无需跟随滚动。这里保留足够正文以检测长距离定位和屏幕宽度变化。`, "");
      }
      if (section === 7) lines.push("```markdown", "# 代码块伪标题不应出现在目录", "## 代码块伪子标题", "```", "");
      if (section === 25) lines.push("~~~text", "## 波浪围栏伪标题也应忽略", "~~~", "");
    }
    const markdown = lines.join("\n");

    stage = "长文档和目录解析";
    await writeSource(markdown);
    await page.waitForFunction((count) => document.querySelectorAll(".app-sidebar .toc-item").length === count, headings.length);
    check(!((await desktopToc().textContent()).includes("伪标题")), "代码块中的伪标题进入了目录");
    const duplicateOne = await getHeading(12);
    const duplicateTwo = await getHeading(43);
    check(duplicateOne.id !== duplicateTwo.id, "重复标题缺少独立导航 ID");
    stages.push("long-source-with-duplicate-headings-and-fenced-pseudo-headings");

    stage = "源码目录点击保留模式并定位到虚拟化文档后部";
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForFunction((documentLength) => {
      const element = document.querySelector(".source-editor .cm-content");
      const view = element?.cmView?.view || element?.cmTile?.view;
      return view && view.viewport.to < documentLength / 2;
    }, markdown.length);
    const initialState = await readSourceState();
    check(initialState.viewport.to < markdown.length / 2, "测试文档未触发 CodeMirror 视口虚拟化");
    const lateId = await clickSourceHeading(51, headings);
    check(await tab("源码").getAttribute("aria-selected") === "true", "点击源码目录切换了视图");
    await page.waitForTimeout(200);
    await waitForActive(lateId);
    const lateState = await readSourceState();
    check(lateState.viewport.from > markdown.length / 2, "后部目标没有进入 CodeMirror 虚拟视口");
    check(lateState.markdown === markdown, "仅点击目录就改写了源码");
    stages.push("source-mode-click-to-virtualized-late-heading");

    stage = "重复标题与同一目录项重复定位";
    await clickSourceHeading(12, headings);
    await clickSourceHeading(43, headings);
    // 在同一章内滚走后仍然点击同一目录项，验证每次点击都会发出新导航请求。
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.evaluate(() => window.scrollBy({ top: 400, behavior: "instant" }));
      await clickSourceHeading(43, headings);
    }
    stages.push("duplicate-heading-and-repeated-same-target-navigation");

    stage = "目录快速连点以最后一项为准";
    const fastIndexes = [3, 48, 8, 46];
    for (const index of fastIndexes) {
      const { button } = await getHeading(index);
      // click() 仍走真实按钮事件，避免执行 App 的内部处理函数。
      await button.click();
    }
    const finalFast = await getHeading(46);
    await waitForSourceHeading(headings[46], finalFast.id);
    stages.push("rapid-toc-clicks-use-final-target");

    stage = "滚动浏览高亮跟随且不移动编辑光标";
    await page.waitForTimeout(250);
    const selectionBeforeScrolling = (await readSourceState()).selection;
    const scrollTargets = [10, 38, 6];
    for (const index of scrollTargets) {
      stage = `真实窗口滚动到章节索引 ${index}`;
      const { id } = await getHeading(index);
      await scrollSourceSectionToReadingLine(headings[index]);
      await waitForActive(id);
      check((await readSourceState()).selection === selectionBeforeScrolling, "阅读滚动改变了编辑光标位置");
    }
    // 真正的鼠标滚轮触发页面阅读，检查向下和向上都重新计算当前章节。
    const readingState = async () => source().evaluate((element, expectedHeadings) => {
      const view = element.cmView?.view || element.cmTile?.view;
      const readingY = Math.min(128, window.innerHeight * 0.24);
      let index = 0;
      for (let candidate = 0; candidate < expectedHeadings.length; candidate += 1) {
        const line = view.state.doc.line(expectedHeadings[candidate].lineNumber);
        const block = view.lineBlockAt(line.from);
        if (view.documentTop + block.top > readingY + 1) break;
        index = candidate;
      }
      return { index, activeId: document.querySelector('.app-sidebar .toc-item[aria-current="true"]')?.getAttribute("data-heading-id"), scrollY: window.scrollY };
    }, headings);
    await page.mouse.move(1150, 550);
    for (const delta of [2600, -1700]) {
      stage = `鼠标滚轮 ${delta}px 阅读高亮`;
      const before = await readingState();
      await page.mouse.wheel(0, delta);
      await page.waitForTimeout(250);
      const after = await readingState();
      check(Math.abs(after.scrollY - before.scrollY) > 500, "鼠标滚轮没有实际滚动文档");
      check(after.index !== before.index, "滚轮没有跨越章节，无法验证高亮");
      const { id } = await getHeading(after.index);
      await waitForActive(id);
      check((await readSourceState()).selection === selectionBeforeScrolling, "滚轮阅读改变了编辑光标位置");
    }
    stages.push("window-and-mouse-wheel-scroll-update-outline-without-caret-change");

    stage = "侧栏自动跟随只滚动自身";
    const { id: followId } = await getHeading(49);
    await scrollSourceSectionToReadingLine(headings[49]);
    await waitForActive(followId);
    await page.waitForTimeout(150);
    const documentScrollBeforeSidebarSettles = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(650);
    const following = await desktopToc().evaluate((list) => {
      const active = list.querySelector('[aria-current="true"]');
      const bounds = list.getBoundingClientRect();
      const item = active?.getBoundingClientRect();
      return { scrollTop: list.scrollTop, top: item?.top, bottom: item?.bottom, listTop: bounds.top, listBottom: bounds.bottom, documentScroll: window.scrollY };
    });
    check(following.scrollTop > 0, "目录没有自动滚动到后部当前章节");
    check(following.top >= following.listTop - 1 && following.bottom <= following.listBottom + 1, `当前目录项不可见：${JSON.stringify(following)}`);
    check(Math.abs(following.documentScroll - documentScrollBeforeSidebarSettles) <= 1, "侧栏自动跟随反向移动了正文");
    stages.push("sidebar-autofollow-scrolls-only-sidebar");

    stage = "前方插入行后目录重新映射";
    await source().click();
    await page.keyboard.press("ControlOrMeta+Home");
    const prefix = "新增说明第一行。\n\n新增说明第二行。\n\n新增说明第三行。\n\n";
    await page.keyboard.insertText(prefix);
    const shifted = headings.map((heading) => ({ ...heading, lineNumber: heading.lineNumber + 6 }));
    await page.waitForFunction((expected) => {
      const element = document.querySelector(".source-editor .cm-content");
      const view = element?.cmView?.view || element?.cmTile?.view;
      return view?.state.doc.toString() === expected;
    }, prefix + markdown);
    await clickSourceHeading(43, shifted);
    await clickSourceHeading(20, shifted);
    check((await readSourceState()).markdown === prefix + markdown, "插行后的目录定位更改了正文");
    await page.screenshot({ path: config.desktopScreenshot });
    stages.push("source-line-mapping-refreshes-after-prefix-insertion");

    stage = "单栏阅读目录保持定位和滚动跟随";
    await tab("渲染").click();
    await page.locator(".markdown-body").waitFor({ state: "visible" });
    const { button: renderedButton, id: renderedId } = await getHeading(18);
    await renderedButton.click();
    await page.waitForFunction((id) => {
      const rect = document.getElementById(id)?.getBoundingClientRect();
      return rect && rect.top >= 24 && rect.bottom < 360;
    }, renderedId);
    check(await tab("渲染").getAttribute("aria-selected") === "true", "阅读目录切换了模式");
    await page.waitForTimeout(250);
    const { id: renderedScrollId } = await getHeading(30);
    await page.evaluate((id) => {
      const element = document.getElementById(id);
      window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 120, behavior: "instant" });
    }, renderedScrollId);
    await waitForActive(renderedScrollId);
    stages.push("render-view-navigation-and-reading-scroll-preserved");

    stage = "双栏目录保留双栏并定位源码";
    await tab("双栏").click();
    await page.locator(".render-edit-editor .milkdown > .ProseMirror").waitFor({ state: "visible" });
    await clickSourceHeading(35, shifted, "双栏");
    check(await page.locator(".render-edit-editor .milkdown > .ProseMirror").count() === 1, "双栏目录点击后右侧编辑器丢失");
    stages.push("split-view-outline-keeps-mode-and-targets-source");

    stage = "窄屏目录抽屉导航关闭并保留源码";
    await tab("源码").click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.getByRole("button", { name: "打开目录", exact: true }).click();
    await page.getByRole("dialog", { name: "移动端文档目录" }).waitFor({ state: "visible" });
    await clickSourceHeading(43, shifted, "源码", true);
    await page.getByRole("dialog", { name: "移动端文档目录" }).waitFor({ state: "hidden" });
    check(await tab("源码").getAttribute("aria-selected") === "true", "窄屏目录点击切换了源码模式");
    const mobileWidth = await page.evaluate(() => ({ viewport: innerWidth, page: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) }));
    check(mobileWidth.page <= mobileWidth.viewport + 1, `窄屏页面横向溢出：${JSON.stringify(mobileWidth)}`);
    await page.screenshot({ path: config.mobileScreenshot });
    stages.push("mobile-drawer-closes-and-source-heading-is-visible");

    stage = "跳级标题滚动时自动展开祖先";
    await page.setViewportSize({ width: 1440, height: 1000 });
    const skippedLines = ["# 跨级父标题", ""];
    for (let paragraph = 0; paragraph < 20; paragraph += 1) skippedLines.push(`父级正文 ${paragraph}：滚动阅读应自动展开当前标题所属的目录祖先。`, "");
    const childLineNumber = skippedLines.length + 1;
    skippedLines.push("### 跨级子标题", "");
    for (let paragraph = 0; paragraph < 20; paragraph += 1) skippedLines.push(`子级正文 ${paragraph}：即使文档从一级跳到三级，也能定位和显示当前章节。`, "");
    skippedLines.push("# 后续父标题", "", "末尾正文。");
    await writeSource(skippedLines.join("\n"));
    await page.waitForFunction(() => document.querySelectorAll(".app-sidebar .toc-item").length === 3);
    const { id: skippedParentId } = await getHeading(0);
    await scrollSourceSectionToReadingLine({ lineNumber: 1 });
    await waitForActive(skippedParentId);
    await desktopToc().locator(".toc-row").first().getByRole("button", { name: "折叠子目录", exact: true }).click();
    const { button: skippedChild, id: skippedChildId } = await getHeading(1);
    check(!(await skippedChild.isVisible()), "折叠父目录没有隐藏跳级子标题");
    await scrollSourceSectionToReadingLine({ lineNumber: childLineNumber });
    await waitForActive(skippedChildId);
    await skippedChild.waitFor({ state: "visible" });
    check(await desktopToc().locator(".toc-row").first().getByRole("button", { name: "折叠子目录", exact: true }).getAttribute("aria-expanded") === "true", "滚到跳级子标题后父目录没有展开");
    stages.push("skipped-heading-level-autoexpands-collapsed-ancestor");

    stage = "浏览器错误检查";
    check(pageErrors.length === 0, `未捕获异常：${JSON.stringify(pageErrors)}`);
    check(consoleErrors.length === 0, `控制台错误：${JSON.stringify(consoleErrors)}`);
    return { sourceNavigationRegression: "passed", headingCount: headings.length, sourceLines: lines.length, stages, pageErrors: 0, consoleErrors: 0 };
  } catch (error) {
    const diagnostics = await source().evaluate((element) => {
      const view = element.cmView?.view || element.cmTile?.view;
      const active = document.querySelector('.app-sidebar .toc-item[aria-current="true"]');
      const block = view?.lineBlockAtHeight(Math.max(0, 128 - view.documentTop));
      const line = block && view.state.doc.lineAt(block.from);
      const hiddenAncestors = [];
      for (let ancestor = active?.parentElement; ancestor; ancestor = ancestor.parentElement) {
        if (getComputedStyle(ancestor).display === "none") hiddenAncestors.push({ className: ancestor.className, tagName: ancestor.tagName });
      }
      const outline = Array.from(document.querySelectorAll(".app-sidebar .toc-row")).slice(0, 4).map((row) => ({
        text: row.textContent, display: getComputedStyle(row).display, itemClass: row.closest("li")?.className,
        expanded: row.querySelector(".toc-toggle")?.getAttribute("aria-expanded")
      }));
      return { scrollY: window.scrollY, documentTop: view?.documentTop, active: active?.textContent, readingLine: line?.number, readingText: line?.text, hiddenAncestors, outline };
    }).catch(() => null);
    throw new Error(`${stage}：${error.message}\ndiagnostics=${JSON.stringify(diagnostics)}\npageerror=${JSON.stringify(pageErrors)}\nconsole.error=${JSON.stringify(consoleErrors)}`);
  }
}

let opened = false;
try {
  if (!fs.existsSync(npmCli)) throw new Error(`找不到 npm CLI：${npmCli}`);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.mkdirSync(payloadDirectory, { recursive: true });
  fs.writeFileSync(payloadFile, `async (page) => (${browserRegression.toString()})(page, ${JSON.stringify(configuration)})`, "utf8");
  runCli(["open", configuration.url]);
  opened = true;
  const output = runCli(["run-code", "--filename", payloadFile]);
  const resultText = output.match(/^### Result\r?\n([\s\S]*?)(?=\r?\n### |$)/m)?.[1]?.trim();
  if (!resultText) throw new Error(`未返回验证结果：${output}`);
  const result = JSON.parse(resultText);
  if (result.sourceNavigationRegression !== "passed") throw new Error(`验证未通过：${resultText}`);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
} finally {
  if (opened) {
    try {
      runCli(["close"]);
    } catch (error) {
      process.stderr.write(`关闭测试会话失败：${error.message}\n`);
      process.exitCode = 1;
    }
  }
}
