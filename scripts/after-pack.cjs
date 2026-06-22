const fs = require("node:fs");
const path = require("node:path");

const keptLocales = new Set(["en-US.pak", "zh-CN.pak"]);

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") {
    return;
  }

  const localesDirectory = path.join(context.appOutDir, "locales");

  if (!fs.existsSync(localesDirectory)) {
    return;
  }

  for (const entry of fs.readdirSync(localesDirectory)) {
    if (!entry.endsWith(".pak") || keptLocales.has(entry)) {
      continue;
    }

    fs.rmSync(path.join(localesDirectory, entry), { force: true });
  }
};
