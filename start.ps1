$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$bundledNode = "C:\Users\linyan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$node = Get-Command node -ErrorAction SilentlyContinue

if ($node) {
    $nodePath = $node.Source
} elseif (Test-Path $bundledNode) {
    $nodePath = $bundledNode
} else {
    throw "未找到 Node.js。请先安装 Node.js 20 或更高版本。"
}

Set-Location $project
Write-Host "正在启动 RunningHub 快捷生成器..."
Write-Host "打开地址：http://127.0.0.1:4173"
& $nodePath "$project\server.mjs"
