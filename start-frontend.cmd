@echo off
cd /d D:\aiwork\ai-novel-copilot\novel-ai-copilot\frontend
set "PATH=D:\aiwork\dev-tools\node-v20.20.2-win-x64;%PATH%"
"D:\aiwork\dev-tools\node-v20.20.2-win-x64\node.exe" "D:\aiwork\ai-novel-copilot\novel-ai-copilot\frontend\node_modules\next\dist\bin\next" dev -H 127.0.0.1 -p 3000
