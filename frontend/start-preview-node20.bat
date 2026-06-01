@echo off
chcp 65001 > nul
cd /d "%~dp0"
"D:\nvm\v20.20.2\node.exe" "%~dp0node_modules\next\dist\bin\next" start -H 0.0.0.0 -p 3000
