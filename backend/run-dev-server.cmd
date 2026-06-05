@echo off
setlocal
cd /d "%~dp0"
set "JAVA_HOME=D:\Program Files\Java\jdk-21.0.10"
set "PATH=%JAVA_HOME%\bin;%PATH%"
mvn spring-boot:run > backend-live.log 2>&1
