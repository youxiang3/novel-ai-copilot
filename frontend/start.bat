@echo off
chcp 65001 > nul
echo ================================================
echo    NovelAI Copilot - 前端启动脚本
echo ================================================
echo.

:: 检查 Node.js
node -v > nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)

:: 检查 npm
npm -v > nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 npm
    pause
    exit /b 1
)

:: 安装依赖（如需要）
if not exist "node_modules" (
    echo [提示] 首次运行，正在安装依赖...
    echo        （如已安装可忽略，等待时间较长）
    echo.
    call npm install
)

:: 启动前端
echo.
echo ================================================
echo    启动前端服务...
echo ================================================
echo.
echo    访问地址：http://localhost:3000
echo.
echo    按 Ctrl+C 停止服务
echo ================================================
echo.

cd /d "%~dp0"
npm run dev

pause
