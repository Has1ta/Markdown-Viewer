const fs = require("node:fs");
const path = require("node:path");

const rootDirectory = path.resolve(__dirname, "..");
const releaseDirectory = path.join(rootDirectory, "release");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(rootDirectory, "package.json"), "utf8"),
);

const productName = packageJson.build?.productName ?? "Markdown Viewer";
const version = packageJson.version ?? "0.0.0";

fs.mkdirSync(releaseDirectory, { recursive: true });

const ps1 = `$ErrorActionPreference = "Stop"

$productName = "${productName}"
$registryPaths = @(
  "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
  "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
  "HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"
)

$installedApps = foreach ($registryPath in $registryPaths) {
  Get-ItemProperty -Path $registryPath -ErrorAction SilentlyContinue
}

$app = $installedApps |
  Where-Object { $_.DisplayName -eq $productName } |
  Select-Object -First 1

if (-not $app) {
  Write-Host "$productName is not installed for this Windows user."
  Write-Host "If you used the portable version, delete the portable .exe file to remove it."
  exit 1
}

$uninstallCommand = if ($app.QuietUninstallString) {
  $app.QuietUninstallString
} else {
  $app.UninstallString
}

if (-not $uninstallCommand) {
  Write-Host "No uninstall command was found for $productName."
  exit 1
}

Write-Host "Starting uninstall command:"
Write-Host $uninstallCommand

$process = Start-Process -FilePath $env:ComSpec -ArgumentList @("/d", "/s", "/c", $uninstallCommand) -Wait -PassThru
exit $process.ExitCode
`;

const cmd = `@echo off
setlocal

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"
set "exitCode=%ERRORLEVEL%"

if not "%exitCode%"=="0" (
  echo.
  echo Uninstall helper finished with exit code %exitCode%.
  echo Press any key to close this window.
  pause >nul
)

exit /b %exitCode%
`;

const readme = `Markdown Viewer ${version} 发布目录

目录文件说明：

- Markdown Viewer Setup ${version}.exe
  Windows 安装包。安装后会注册 Markdown 文件打开方式，可通过 Windows“应用和功能”正常卸载。

- Markdown Viewer Portable ${version}.exe
  便携版启动程序。便携版不会自动注册文件关联，移除时直接删除该 exe 即可。

- uninstall.cmd
  可双击的卸载辅助入口。它会查找 ${productName} 的 Windows 卸载注册表项，并执行官方卸载命令。

- uninstall.ps1
  uninstall.cmd 调用的 PowerShell 实现。

- win-unpacked/
  解压版构建结果，主要用于本地冒烟测试。
`;

fs.writeFileSync(path.join(releaseDirectory, "uninstall.ps1"), ps1, "utf8");
fs.writeFileSync(path.join(releaseDirectory, "uninstall.cmd"), cmd, "utf8");
fs.writeFileSync(path.join(releaseDirectory, "README.txt"), readme, "utf8");

console.log(`Release helpers written to ${releaseDirectory}`);
