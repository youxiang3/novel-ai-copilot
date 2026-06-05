@echo off
chcp 65001 > nul
echo ================================================
echo    NovelAI Copilot - 后端启动脚本
echo ================================================
echo.

:: 检查 Java 版本
java -version 2>&1 | find "version" > nul
if errorlevel 1 (
    echo [错误] 未检测到 Java，请先安装 JDK 17+
    echo 下载地址：https://adoptium.net/
    pause
    exit /b 1
)

:: 检查 Maven
mvn -version > nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Maven，请先安装 Maven
    echo 下载地址：https://maven.apache.org/download.cgi
    pause
    exit /b 1
)

:: 设置环境变量
echo [1/3] 设置环境变量...
if "%AI_API_KEY%"=="" set AI_API_KEY=sk-xxx
if "%AI_BASE_URL%"=="" set AI_BASE_URL=https://api.deepseek.com/v1
if "%AI_MODEL%"=="" set AI_MODEL=deepseek-chat
if "%AI_TEMPERATURE%"=="" set AI_TEMPERATURE=0.7
if "%AI_MAX_TOKENS%"=="" set AI_MAX_TOKENS=4096
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=5432
if "%DB_NAME%"=="" set DB_NAME=novel_ai_copilot
if "%DB_SCHEMA%"=="" set DB_SCHEMA=public
if "%DB_USERNAME%"=="" set DB_USERNAME=postgres
if "%DB_PASSWORD%"=="" set DB_PASSWORD=postgres
if "%JWT_SECRET%"=="" set JWT_SECRET=change-me-in-production-at-least-32-chars
echo        AI_API_KEY=***
echo        AI_BASE_URL=%AI_BASE_URL%
echo        AI_MODEL=%AI_MODEL%
echo        DB_HOST=%DB_HOST%
echo        DB_PORT=%DB_PORT%
echo        DB_NAME=%DB_NAME%
echo        DB_USERNAME=%DB_USERNAME%
echo        DB_PASSWORD=***
echo.

:: 检查 PostgreSQL 连接
echo [2/3] 检查数据库连接...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% -c "SELECT 1" > nul 2>&1
if errorlevel 1 (
    echo [警告] 无法连接到 PostgreSQL，请确保：
    echo        1. PostgreSQL 服务已启动
    echo        2. 数据库 %DB_NAME% 已创建
    echo        3. DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD 配置正确
    echo.
)

:: 执行建表 SQL（如需要）
echo [3/3] 检查数据库表结构...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% -d %DB_NAME% -c "\dt" > nul 2>&1
if errorlevel 1 (
    echo [提示] 数据库表不存在，正在创建...
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% -d %DB_NAME% -f "src\main\resources\db\schema.sql"
    if errorlevel 1 (
        echo [错误] 建表失败，请检查数据库配置
        pause
        exit /b 1
    )
    echo [成功] 数据库表创建完成
) else (
    echo        数据库表已存在
)
echo.

:: 启动后端
echo ================================================
echo    启动后端服务...
echo ================================================
echo.
echo    访问地址：
echo    - API 文档：http://localhost:8080/swagger-ui.html
echo    - API 接口：http://localhost:8080/v3/api-docs
echo.
echo    按 Ctrl+C 停止服务
echo ================================================
echo.

cd /d "%~dp0"
mvn spring-boot:run

pause
