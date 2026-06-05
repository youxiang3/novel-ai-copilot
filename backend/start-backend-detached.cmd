@echo off
cd /d "%~dp0"
set "JAVA_HOME=D:\Program Files\Java\jdk-21.0.10"
set "PATH=%JAVA_HOME%\bin;%PATH%"
"D:\Program Files\maven\apache-maven-3.9.16\bin\mvn.cmd" spring-boot:run > backend-live.log 2> backend-live.err.log
