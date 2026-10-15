const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

// 使用现有 Vite 服务。npm run 会提供 npm_execpath，直接调用 Node 可避免 Windows shell 转义问题。
const projectDirectory = path.resolve(__dirname, "..");
const outputDirectory = path.join(projectDirectory, "output", "playwright");
const payloadDirectory = path.join(projectDirectory, ".playwright-cli");
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const session = `split-regression-${process.pid}`;
const payloadFile = path.join(payloadDirectory, `split-regression-payload-${process.pid}.js`);
const configuration = {
  url: process.env.SPLIT_TEST_URL || "http://127.0.0.1:5173",
  desktopScreenshot: path.join(outputDirectory, "split-regression-desktop.png"),
  mobileScreenshot: path.join(outputDirectory, "split-regression-mobile.png")
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
  const expectedConsoleErrors = [];
  const stages = [];
  let stage = "初始化";
  let expectInitializationFailure = false;

  function check(condition, message) {
    if (!condition) throw new Error(`${stage}：${message}`);
  }

  const source = () => page.locator(".source-editor .cm-content");
  const rendered = () => page.locator(".render-edit-editor .milkdown > .ProseMirror");
  const tab = (name) => page.getByRole("tab", { name, exact: true });

  async function readSource() {
    return source().evaluate((element) => {
      // CodeMirror 的 DOM 会虚拟化，不能用 innerText 读取完整文档。
      const view = element.cmView?.view || element.cmTile?.view;
      if (!view) throw new Error("无法读取 CodeMirror 文档状态");
      return view.state.doc.toString();
    });
  }

  async function enterSplit() {
    await tab("双栏").click();
    await rendered().waitFor({ state: "visible" });
    check(await rendered().count() === 1, "渲染侧应只有一个正文编辑器");
    check(await page.locator("[role=alert]").count() === 0, "渲染侧出现加载失败提示");
  }

  async function writeSource(markdown) {
    await source().click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.insertText(markdown);
  }

  async function waitForSourceText(text, timeout = 3000) {
    await page.waitForFunction((expected) => {
      const element = document.querySelector(".source-editor .cm-content");
      const view = element?.cmView?.view || element?.cmTile?.view;
      return Boolean(view?.state.doc.toString().includes(expected));
    }, text, { polling: 10, timeout });
  }

  async function addRenderedText(marker) {
    const paragraph = rendered().locator(":scope > p").first();
    await paragraph.click();
    await page.keyboard.press("End");
    await page.keyboard.insertText(marker);
  }

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (expectInitializationFailure && message.text().includes("双栏渲染编辑器初始化失败")) {
      expectedConsoleErrors.push(message.text());
    } else {
      consoleErrors.push(message.text());
    }
  });

  try {
    // 监听先于 reload，确保启动和懒加载阶段的异常也会使测试失败。
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload({ waitUntil: "networkidle" });
    await tab("源码").click();
    await source().waitFor({ state: "visible" });
    const originalMarkdown = await readSource();
    stage = "内置示例首次进入双栏";
    await enterSplit();
    await rendered().locator("h1").waitFor();
    check((await rendered().locator("h1").textContent()).includes("Markdown Viewer"), "示例标题缺失");
    check(await rendered().locator("table").count() > 0, "表格未渲染");
    check(await rendered().locator(".label.checked, .label.unchecked").count() >= 3, "任务列表未渲染");
    check(await rendered().locator(".milkdown-code-block").count() > 0, "代码块未渲染");
    await page.waitForTimeout(250);
    check(await readSource() === originalMarkdown, "仅进入双栏就改写了原始 Markdown");
    stages.push("sample-render-and-source-preservation");

    stage = "源码输入同步渲染";
    const sample = [
      "# 双栏回归验证", "", "这是 **粗体** 与行内公式 $x^2$。", "",
      "- 列表第一项", "- 列表第二项", "", "- [x] 已完成任务", "",
      "| 项目 | 数值 |", "| --- | --- |", "| 示例 | 42 |", "",
      "$$", "E = mc^2", "$$", "", "```js", "console.log('split ok');", "```"
    ].join("\n");
    await writeSource(sample);
    await page.waitForFunction(() => document.querySelector(".render-edit-editor .ProseMirror h1")?.textContent === "双栏回归验证");
    await rendered().locator(".katex").first().waitFor({ state: "visible" });
    await page.waitForFunction(() => document.querySelectorAll(".render-edit-editor .ProseMirror .katex").length >= 2);
    check(await rendered().locator("strong").count() === 1, "粗体未渲染");
    check(await rendered().locator("li.list-item").count() >= 3, "列表未渲染");
    check(await rendered().locator("table.children").count() === 1, "样本表格未渲染");
    check(await rendered().locator(".milkdown-code-block").count() >= 1, "样本代码块未渲染");
    const sourceAfterRendering = await readSource();
    check(sourceAfterRendering === sample, `渲染过程改写了刚输入的 Markdown：${JSON.stringify({ expected: sample, actual: sourceAfterRendering })}`);
    stages.push("source-to-render-with-inline-and-block-math");

    stage = "渲染输入回写源码";
    await addRenderedText("渲染侧回写标记");
    const syncStarted = Date.now();
    // Milkdown 自带 200ms 防抖；预留调度容差，避免把边界抖动误报成输入丢失。
    await waitForSourceText("渲染侧回写标记", 500);
    const renderSyncMs = Date.now() - syncStarted;
    stages.push("render-to-source-with-200ms-debounce");

    stage = "源码更新后立即编辑渲染侧";
    const replacement = sample.replace("双栏回归验证", "更新后立即编辑");
    await writeSource(replacement);
    await page.waitForFunction(() => document.querySelector(".render-edit-editor .ProseMirror h1")?.textContent === "更新后立即编辑");
    await addRenderedText("立即输入不能丢失");
    await waitForSourceText("立即输入不能丢失", 500);
    check((await readSource()).includes("# 更新后立即编辑"), "源码新内容被旧回调覆盖");
    stages.push("immediate-render-edit-after-source-update");

    stage = "反复快速切换视图";
    const beforeSwitches = await readSource();
    for (let round = 0; round < 5; round += 1) {
      await tab("源码").click();
      await tab("双栏").click();
      await tab("渲染").click();
      await enterSplit();
    }
    await page.waitForTimeout(250);
    check(await rendered().count() === 1, "快速切换后残留多个渲染编辑器");
    check(await page.locator(".source-editor .cm-editor").count() === 1, "快速切换后残留多个源码编辑器");
    check(await readSource() === beforeSwitches, "快速切换视图造成内容变化");
    stages.push("five-rapid-mode-switches");

    stage = "宽窄屏布局";
    const layouts = [];
    for (const width of [1440, 1036, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(80);
      const layout = await rendered().evaluate((element) => ({
        viewportWidth: window.innerWidth,
        pageWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        paddingLeft: parseFloat(getComputedStyle(element).paddingLeft),
        paddingRight: parseFloat(getComputedStyle(element).paddingRight)
      }));
      const expectedPadding = width < 768 ? 20 : 32;
      check(layout.pageWidth <= layout.viewportWidth + 1, `${width}px 视口出现页面横向溢出：${JSON.stringify(layout)}`);
      check(layout.paddingLeft === expectedPadding && layout.paddingRight === expectedPadding, `${width}px 正文边距异常：${JSON.stringify(layout)}`);
      layouts.push({ width, ...layout });
      if (width === 1440) await page.screenshot({ path: config.desktopScreenshot, fullPage: true });
      if (width === 390) await page.screenshot({ path: config.mobileScreenshot, fullPage: true });
    }
    stages.push("desktop-tablet-mobile-layout");

    stage = "初始化失败时保留源码编辑能力";
    const faultPattern = "**/src/editor/RenderEditEditor.tsx*";
    let faultInjected = false;
    const injectFailure = async (route) => {
      const response = await route.fetch();
      const original = await response.text();
      const modified = original.replace(".addFeature(codeMirror)", "");
      faultInjected = modified !== original;
      // 不缓存被故意破坏的模块，否则恢复 reload 可能复用原 ETag 对应的错误响应。
      await route.fulfill({ response, body: modified, headers: { ...response.headers(), "cache-control": "no-store" } });
    };
    expectInitializationFailure = true;
    await page.route(faultPattern, injectFailure);
    try {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.reload({ waitUntil: "networkidle" });
      await tab("双栏").click();
      await page.getByRole("alert").waitFor({ state: "visible", timeout: 10000 });
      check(faultInjected, "未成功注入缺失 CodeMirror feature 的初始化故障");
      check((await page.getByRole("alert").textContent()).includes("渲染编辑器加载失败"), "初始化失败没有明确提示");
      await writeSource("# 初始化失败后仍可编辑\n\n源码编辑器保持可用。");
      await waitForSourceText("初始化失败后仍可编辑");
      check(expectedConsoleErrors.length === 1, `初始化失败日志数量异常：${JSON.stringify(expectedConsoleErrors)}`);
    } finally {
      await page.unroute(faultPattern, injectFailure);
      await page.reload({ waitUntil: "networkidle" });
    }
    await enterSplit();
    expectInitializationFailure = false;
    check(await rendered().locator("h1").count() === 1, "撤销故障后编辑器没有恢复");
    stages.push("initialization-error-fallback-and-recovery");

    stage = "浏览器错误检查";
    check(pageErrors.length === 0, `未捕获异常：${JSON.stringify(pageErrors)}`);
    check(consoleErrors.length === 0, `控制台错误：${JSON.stringify(consoleErrors)}`);
    return { splitRegression: "passed", stages, renderSyncMs, layouts, pageErrors: 0, consoleErrors: 0, expectedInitializationErrors: expectedConsoleErrors.length };
  } catch (error) {
    throw new Error(`${stage}：${error.message}\npageerror=${JSON.stringify(pageErrors)}\nconsole.error=${JSON.stringify(consoleErrors)}`);
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
  if (result.splitRegression !== "passed") throw new Error(`验证未通过：${resultText}`);
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
