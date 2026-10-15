const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

// 与现有浏览器回归保持一致：复用 Vite，用文件传递 Playwright 载荷，避免 Windows shell 转义。
const projectDirectory = path.resolve(__dirname, "..");
const outputDirectory = path.join(projectDirectory, "output", "playwright");
const payloadDirectory = path.join(projectDirectory, ".playwright-cli");
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const session = `view-switching-${process.pid}`;
const payloadFile = path.join(payloadDirectory, `view-switching-payload-${process.pid}.js`);
const configuration = {
  url: process.env.VIEW_TEST_URL || process.env.TOC_TEST_URL || "http://127.0.0.1:5173",
  desktopScreenshot: path.join(outputDirectory, "view-switcher-desktop.png"),
  mobileScreenshot: path.join(outputDirectory, "view-switcher-mobile.png"),
  failureScreenshot: path.join(outputDirectory, "view-switcher-failure.png")
};

function runCli(arguments_) {
  const result = spawnSync(process.execPath, [
    npmCli, "exec", "--yes", "--package", "@playwright/cli", "--", "playwright-cli", `-s=${session}`, ...arguments_
  ], { cwd: projectDirectory, encoding: "utf8", windowsHide: true, timeout: 180000, maxBuffer: 5 * 1024 * 1024 });
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
  const layouts = [];
  const progressChecks = [];
  let stage = "初始化";
  const tab = (name) => page.getByRole("tab", { name, exact: true });
  const source = () => page.locator(".source-editor .cm-content");
  const toolbar = () => page.getByRole("tablist", { name: "视图模式", exact: true });
  const tocItems = () => page.locator(".app-sidebar .toc-item");

  function check(condition, message) {
    if (!condition) throw new Error(message);
  }

  async function readMarkdown() {
    return source().evaluate((element) => {
      const view = element.cmView?.view || element.cmTile?.view;
      if (!view) throw new Error("无法读取 CodeMirror 文档");
      return view.state.doc.toString();
    });
  }

  async function waitForActive(id) {
    await page.waitForFunction((expectedId) =>
      document.querySelector('.app-sidebar .toc-item[aria-current="true"]')?.getAttribute("data-heading-id") === expectedId,
    id, { timeout: 8000 });
  }

  async function selectHeading(text) {
    const mobile = await page.getByRole("button", { name: "打开目录", exact: true }).isVisible();
    if (mobile) {
      // 目录入口在文档头部，先滚到顶部；切换器在远离顶部时始终通过实际浮动按钮操作。
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.getByRole("button", { name: "打开目录", exact: true }).click();
    }
    const list = mobile ? page.getByRole("dialog", { name: "移动端文档目录" }) : page.locator(".app-sidebar");
    const button = list.locator(".toc-item").filter({ hasText: text }).first();
    const id = await button.getAttribute("data-heading-id");
    await button.click();
    if (mobile) await page.getByRole("dialog", { name: "移动端文档目录" }).waitFor({ state: "hidden" });
    await waitForActive(id);
    await page.waitForTimeout(200);
    return id;
  }

  async function waitForMode(name) {
    await page.waitForFunction((modeName) =>
      [...document.querySelectorAll('[role="tab"]')].some((element) => element.getAttribute("aria-selected") === "true" && element.textContent === modeName),
    name);
    if (name === "渲染") {
      await page.locator(".markdown-body").waitFor({ state: "visible" });
    } else {
      await source().waitFor({ state: "visible" });
      if (name === "双栏") await page.locator(".render-edit-editor .milkdown > .ProseMirror").waitFor({ state: "visible" });
    }
  }

  async function switchMode(name) {
    await tab(name).click();
    await waitForMode(name);
  }

  async function sourceHeadingVisible(id, expectedMarkdown) {
    await page.waitForFunction(({ headingId, headingMarkdown }) => {
      const element = document.querySelector(".source-editor .cm-content");
      const view = element?.cmView?.view || element?.cmTile?.view;
      if (!view) return false;
      const lines = view.state.doc.toString().split("\n");
      const number = lines.findIndex((line) => line === headingMarkdown) + 1;
      if (!number) return false;
      const rect = view.coordsAtPos(view.state.doc.line(number).from);
      return rect && rect.top >= 8 && rect.bottom < innerHeight - 72 &&
        document.querySelector('.app-sidebar .toc-item[aria-current="true"]')?.getAttribute("data-heading-id") === headingId;
    }, { headingId: id, headingMarkdown: expectedMarkdown }, { timeout: 8000 });
  }

  async function renderHeadingVisible(id) {
    await page.waitForFunction((headingId) => {
      const rect = document.getElementById(headingId)?.getBoundingClientRect();
      return rect && rect.top >= 8 && rect.bottom < innerHeight - 72 &&
        document.querySelector('.app-sidebar .toc-item[aria-current="true"]')?.getAttribute("data-heading-id") === headingId;
    }, id, { timeout: 8000 });
  }

  async function getToolbarLayout() {
    return toolbar().evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const buttons = [...element.querySelectorAll('[role="tab"]')].map((button) => {
        const bounds = button.getBoundingClientRect();
        const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        return { text: button.textContent, width: bounds.width, height: bounds.height,
          visible: bounds.left >= 0 && bounds.top >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight,
          clickable: hit === button || button.contains(hit) };
      });
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right,
        viewport: innerWidth, page: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        scrollY, position: getComputedStyle(element).position, buttons };
    });
  }

  async function assertFixedToolbar(width) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(120);
    const before = await getToolbarLayout();
    check(before.position === "fixed", `${width}px 切换器未固定到视口：${JSON.stringify(before)}`);
    if (width >= 768) check(before.x >= width * 0.8, `${width}px 切换器未常驻右侧：${JSON.stringify(before)}`);
    await page.evaluate(() => window.scrollBy({ top: 650, behavior: "instant" }));
    await page.waitForTimeout(200);
    const after = await getToolbarLayout();
    check(after.scrollY - before.scrollY >= 400, `${width}px 测试没有实际滚动文档`);
    for (const dimension of ["x", "y", "width", "height"]) {
      check(Math.abs(before[dimension] - after[dimension]) <= 1, `${width}px 切换器随页面滚动：${JSON.stringify({ before, after })}`);
    }
    check(after.page <= after.viewport + 1, `${width}px 页面横向溢出：${JSON.stringify(after)}`);
    check(after.buttons.length === 3 && after.buttons.every((button) => button.visible && button.clickable && button.width >= 44 && button.height >= 36),
      `${width}px 切换按钮被遮挡、超出视口或点击区域过小：${JSON.stringify(after)}`);
    layouts.push({ viewportWidth: width, ...after });
  }

  // 区内进度由当前 DOM / CodeMirror 布局读取，检查同一章节的阅读位置，而非复用 App 内部 API。
  async function readPosition(headings) {
    return page.evaluate((expectedHeadings) => {
      const mode = document.querySelector('[role="tab"][aria-selected="true"]')?.textContent;
      const readingY = Math.min(128, innerHeight * 0.24);
      const activeId = document.querySelector('.app-sidebar .toc-item[aria-current="true"]')?.getAttribute("data-heading-id");
      let points;
      let currentY = readingY;
      let end;
      if (mode === "渲染") {
        points = expectedHeadings.map((heading) => ({ ...heading, top: document.getElementById(heading.id)?.getBoundingClientRect().top }));
        end = document.querySelector(".markdown-body").getBoundingClientRect().bottom;
      } else {
        const element = document.querySelector(".source-editor .cm-content");
        const view = element?.cmView?.view || element?.cmTile?.view;
        if (!view) return null;
        const bounds = view.scrollDOM.getBoundingClientRect();
        const visibleTop = Math.max(0, bounds.top);
        const visibleBottom = Math.min(innerHeight, bounds.bottom);
        currentY = Math.min(visibleBottom - 1, Math.max(readingY, visibleTop + Math.min(28, (visibleBottom - visibleTop) / 2)));
        points = expectedHeadings.map((heading) => ({ ...heading, top: view.documentTop + view.lineBlockAt(view.state.doc.line(heading.lineNumber).from).top }));
        end = view.documentTop + view.contentHeight;
      }
      let index = 0;
      for (let candidate = 0; candidate < points.length; candidate += 1) {
        if (points[candidate].top > currentY + 2) break;
        index = candidate;
      }
      const start = points[index].top;
      const bottom = points[index + 1]?.top ?? end;
      return { mode, id: points[index].id, activeId, progress: Math.max(0, Math.min(1, (currentY - start) / (bottom - start))), scrollY };
    }, headings);
  }

  async function waitForPosition(headings, expected, tolerance = 0.07) {
    let actual;
    for (let attempt = 0; attempt < 65; attempt += 1) {
      actual = await readPosition(headings);
      if (actual && actual.id === expected.id && actual.activeId === expected.id && Math.abs(actual.progress - expected.progress) <= tolerance) {
        // 留出旧的异步初始化/导航请求执行机会，确保最终位置不会再被抢回去。
        await page.waitForTimeout(250);
        actual = await readPosition(headings);
        if (actual?.id === expected.id && actual.activeId === expected.id && Math.abs(actual.progress - expected.progress) <= tolerance) return actual;
      }
      await page.waitForTimeout(90);
    }
    throw new Error(`切换后没有保持章节及区内进度：${JSON.stringify({ expected, actual, tolerance })}`);
  }

  async function placeAtProgress(headings, index, progress) {
    // 远处的 CodeMirror 行先用估计高度，滚入视口后才获得软换行实测高度；
    // 因此测试准备也迭代校准起点，避免把虚拟化测量误差误报为切换错误。
    for (let attempt = 0; attempt < 7; attempt += 1) {
      await page.evaluate(({ expectedHeadings, headingIndex, fraction }) => {
        const mode = document.querySelector('[role="tab"][aria-selected="true"]')?.textContent;
        const readingY = Math.min(128, innerHeight * 0.24);
        if (mode === "渲染") {
          const start = document.getElementById(expectedHeadings[headingIndex].id).getBoundingClientRect().top;
          const end = document.getElementById(expectedHeadings[headingIndex + 1].id).getBoundingClientRect().top;
          window.scrollTo({ top: scrollY + start + (end - start) * fraction - readingY, behavior: "instant" });
        } else {
          const element = document.querySelector(".source-editor .cm-content");
          const view = element.cmView?.view || element.cmTile?.view;
          const start = view.lineBlockAt(view.state.doc.line(expectedHeadings[headingIndex].lineNumber).from).top;
          const end = view.lineBlockAt(view.state.doc.line(expectedHeadings[headingIndex + 1].lineNumber).from).top;
          window.scrollTo({ top: scrollY + view.documentTop + start + (end - start) * fraction - readingY, behavior: "instant" });
        }
      }, { expectedHeadings: headings, headingIndex: index, fraction: progress });
      await page.waitForTimeout(150);
      const actual = await readPosition(headings);
      if (actual?.id === headings[index].id && actual.activeId === headings[index].id && Math.abs(actual.progress - progress) <= 0.02) return actual;
    }
    return waitForPosition(headings, { id: headings[index].id, progress }, 0.035);
  }

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload({ waitUntil: "networkidle" });
    stage = "内置表格章节从渲染切换源码";
    const tableId = await selectHeading("表格样式");
    await renderHeadingVisible(tableId);
    await switchMode("源码");
    await sourceHeadingVisible(tableId, "## 表格样式");
    const originalMarkdown = await readMarkdown();
    stages.push("sample-table-render-to-source-keeps-heading-visible");

    stage = "源码目录定位后反向切回渲染";
    const codeId = await selectHeading("代码块");
    await sourceHeadingVisible(codeId, "## 代码块");
    await switchMode("渲染");
    await renderHeadingVisible(codeId);
    stage = "渲染页底章节继续切换双栏";
    await switchMode("双栏");
    await sourceHeadingVisible(codeId, "## 代码块");
    check(await readMarkdown() === originalMarkdown, "仅切换视图改写了内置 Markdown");
    stages.push("sample-source-to-render-to-split-keeps-region-and-document");

    stage = "准备长文档区内阅读进度测试";
    await switchMode("源码");
    const lines = ["# 视图切换位置回归", "", "本测试只在初始准备时写入一次，后续切换必须保持源码逐字不变。", ""];
    const headings = [{ lineNumber: 1 }];
    for (let chapter = 1; chapter <= 14; chapter += 1) {
      headings.push({ lineNumber: lines.length + 1 });
      lines.push(`## 长章节 ${String(chapter).padStart(2, "0")}`, "");
      for (let paragraph = 1; paragraph <= 18; paragraph += 1) {
        lines.push(`章节 ${chapter} 第 ${paragraph} 段。切换视图后应继续阅读相同章节的相近位置。渲染正文与源码软换行高度不同，不能直接沿用滚动像素。这里保留多段足够长的说明，让章节中段偏移能在宽屏与窄屏中被准确观察。`, "");
      }
    }
    const markdown = lines.join("\n");
    await source().click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.insertText(markdown);
    await page.waitForFunction((count) => document.querySelectorAll(".app-sidebar .toc-item").length === count, headings.length);
    const ids = await tocItems().evaluateAll((items) => items.map((item) => item.getAttribute("data-heading-id")));
    headings.forEach((heading, index) => { heading.id = ids[index]; });
    check(await readMarkdown() === markdown, "测试长文档准备失败");
    await switchMode("渲染");

    for (const width of [1440, 1036, 390]) {
      stage = `${width}px 浮动切换器固定位置与可点击区域`;
      await assertFixedToolbar(width);
      stage = `${width}px 渲染章节中段 43% 切换源码`;
      const renderPosition = await placeAtProgress(headings, 7, 0.43);
      await switchMode("源码");
      const sourcePosition = await waitForPosition(headings, renderPosition);
      check(await readMarkdown() === markdown, `${width}px 渲染切源码改写文档`);
      progressChecks.push({ width, from: "render", to: "source", before: renderPosition.progress, after: sourcePosition.progress });

      stage = `${width}px 源码章节中段 72% 切换渲染`;
      const sourceMiddle = await placeAtProgress(headings, 10, 0.72);
      await switchMode("渲染");
      const renderMiddle = await waitForPosition(headings, sourceMiddle);
      progressChecks.push({ width, from: "source", to: "render", before: sourceMiddle.progress, after: renderMiddle.progress });

      stage = `${width}px 连续切换双栏、源码和渲染`;
      const checkpoint = await placeAtProgress(headings, 5, 0.36);
      for (const mode of ["双栏", "源码", "渲染", "双栏", "渲染"]) {
        await switchMode(mode);
        const position = await waitForPosition(headings, checkpoint, 0.085);
        check(position.scrollY > 500, `${width}px 切换 ${mode} 回到了文档顶部`);
        if (mode !== "渲染") check(await readMarkdown() === markdown, `${width}px 切换 ${mode} 改写文档`);
      }
      // 快速连续点击走真实按钮事件，不等待前一视图异步初始化，最终请求必须胜出。
      for (const mode of ["源码", "双栏", "渲染", "源码", "渲染"]) await tab(mode).click();
      await waitForMode("渲染");
      await waitForPosition(headings, checkpoint, 0.10);
      const finalLayout = await getToolbarLayout();
      check(finalLayout.page <= finalLayout.viewport + 1 && finalLayout.buttons.every((button) => button.clickable && button.visible),
        `${width}px 多次切换后布局或按钮异常：${JSON.stringify(finalLayout)}`);
      if (width === 1440) await page.screenshot({ path: config.desktopScreenshot });
      if (width === 390) await page.screenshot({ path: config.mobileScreenshot });
      stages.push(`${width}px-fixed-toolbar-mid-section-progress-roundtrip-and-rapid-switches`);
    }

    stage = "最终源码和浏览器错误检查";
    await switchMode("源码");
    check(await readMarkdown() === markdown, "完成所有视图往返后源码已改变");
    check(pageErrors.length === 0, `未捕获异常：${JSON.stringify(pageErrors)}`);
    check(consoleErrors.length === 0, `控制台错误：${JSON.stringify(consoleErrors)}`);
    return { viewSwitchingRegression: "passed", stages, layouts, progressChecks, pageErrors: 0, consoleErrors: 0 };
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      mode: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent,
      activeHeading: document.querySelector('.app-sidebar .toc-item[aria-current="true"]')?.textContent,
      scrollY, viewport: { width: innerWidth, height: innerHeight },
      toolbar: document.querySelector('[role="tablist"]')?.getBoundingClientRect().toJSON()
    })).catch(() => null);
    await page.screenshot({ path: config.failureScreenshot }).catch(() => {});
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
  if (result.viewSwitchingRegression !== "passed") throw new Error(`验证未通过：${resultText}`);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
} finally {
  if (opened) {
    try { runCli(["close"]); } catch (error) {
      process.stderr.write(`关闭测试会话失败：${error.message}\n`);
      process.exitCode = 1;
    }
  }
}
