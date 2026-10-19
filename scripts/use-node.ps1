# Dot-source this file: . .\scripts\use-node.ps1
$taskProjectRoot = Split-Path $PSScriptRoot -Parent
$taskNodeVersion = (Get-Content -LiteralPath (Join-Path $taskProjectRoot '.node-version')).Trim()
$taskNodeDirectory = Join-Path $taskProjectRoot ".tools\node-v$taskNodeVersion-win-x64"
if (-not (Test-Path -LiteralPath (Join-Path $taskNodeDirectory 'node.exe'))) {
  throw 'Project Node.js is missing. Install Node.js 24 or download the official Windows ZIP into .tools as described in README.md.'
}
$env:Path = "$taskNodeDirectory;$env:Path"
node --version
npm.cmd --version
