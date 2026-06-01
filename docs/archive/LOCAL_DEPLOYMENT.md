# NovelAI Copilot - 本地部署指南

## 📋 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Java | 17+ | JDK 推荐 Adoptium/Eclipse Temurin |
| Maven | 3.8+ | 后端构建工具 |
| Node.js | 18+ | 前端运行环境 |
| PostgreSQL | 15+ | 数据库（**必须支持 pgvector**） |

---

## 🚀 安装步骤

### 1. 安装 PostgreSQL 18 + pgvector

#### 1.1 下载 PostgreSQL 18
```
下载地址：https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
选择版本：PostgreSQL 18.x / Windows x86-64
```

#### 1.2 安装过程
```
1. 运行安装程序
2. 安装目录：D:\PostgreSQL18
3. 超级用户密码：postgres（记住这个密码）
4. 端口：5432（默认）
5. 语言：Chinese, Simplified
6. 完成安装
```

#### 1.3 安装 pgvector 扩展
打开 "SQL Shell (psql)"，依次执行：

```sql
-- 连接数据库
\c postgres

-- 创建数据库
CREATE DATABASE novel_ai_copilot;

-- 连接目标数据库
\c novel_ai_copilot

-- 安装扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 验证安装
\dx
```

应看到：
```
     Name     | Version |   Schema   |           Description
----------------+---------+------------+------------------------------
pgvector        | 0.7.0   | public     | vector data type and ivfflat
 uuid-ossp     | 1.1     | public     | generate UUIDs
```

#### 1.4 执行建表 SQL
```powershell
# 打开命令提示符
cd d:\aiProject\ai-created-novel\novel-ai-copilot\backend\src\main\resources\db

psql -U postgres -d novel_ai_copilot -f schema.sql

# 验证表创建
psql -U postgres -d novel_ai_copilot -c "\dt"
```

---

### 2. 配置 DeepSeek API Key

你的 API Key 已配置：
```
sk-xxx
```

此 Key 已在 `application.yml` 中设为默认值，无需额外配置。

---

### 3. 启动后端

**方式一：使用启动脚本（推荐）**
```powershell
cd d:\aiProject\ai-created-novel\novel-ai-copilot\backend
start.bat
```

**方式二：手动启动**
```powershell
cd d:\aiProject\ai-created-novel\novel-ai-copilot\backend

# 设置环境变量（如果 YAML 配置不生效）
set AI_API_KEY=sk-xxx
set AI_BASE_URL=https://api.deepseek.com/v1
set DB_PASSWORD=postgres

# 启动
mvn spring-boot:run
```

**验证启动成功**
```
浏览器访问：http://localhost:8080/swagger-ui.html
应看到 Swagger API 文档页面
```

---

### 4. 启动前端

**方式一：使用启动脚本（推荐）**
```powershell
cd d:\aiProject\ai-created-novel\novel-ai-copilot\frontend
start.bat
```

**方式二：手动启动**
```powershell
cd d:\aiProject\ai-created-novel\novel-ai-copilot\frontend
npm install
npm run dev
```

**访问地址**
```
http://localhost:3000
```

---

## 🔧 配置说明

### 数据库密码

如果安装 PostgreSQL 时设置了不同密码，修改 `application.yml`：
```yaml
spring:
  datasource:
    password: your-password  # 修改这里
```

或在启动前设置环境变量：
```powershell
set DB_PASSWORD=your-password
```

### 修改数据库配置

配置文件位置：`backend/src/main/resources/application.yml`

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/novel_ai_copilot?currentSchema=public
    username: postgres
    password: postgres
```

### AI 配置

```yaml
spring:
  ai:
    openai:
      api-key: your-api-key
      base-url: https://api.deepseek.com/v1
      chat:
        options:
          model: deepseek-chat
          temperature: 0.7
          max-tokens: 4096
```

---

## 📝 常见问题

### Q1: pgvector 安装失败

**错误信息**：`could not open extension control file`

**解决方案**：
1. 确保以管理员权限运行 SQL Shell
2. 手动下载 pgvector：
```
https://github.com/pgvector/pgvector/releases
```
3. 将 `vector.dll` 复制到 PostgreSQL 的 `lib` 目录

### Q2: 数据库连接失败

**检查项**：
1. PostgreSQL 服务是否启动（服务列表中查找 postgresql-x64-18）
2. 端口是否被占用：`netstat -an | findstr 5432`
3. 密码是否正确

### Q3: Maven 依赖下载慢

**解决方案**：配置阿里云镜像
在 `pom.xml` 的 `<repositories>` 添加：
```xml
<repository>
    <id>aliyun</id>
    <name>Aliyun Maven</name>
    <url>https://maven.aliyun.com/repository/public</url>
</repository>
```

---

## 🎯 快速测试流程

### 1. 注册账号
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
```

### 2. 登录获取 Token
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
```

### 3. 创建小说
```bash
curl -X POST http://localhost:8080/api/novel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"title":"我的第一部小说"}'
```

---

## 📁 项目结构

```
novel-ai-copilot/
├── backend/
│   ├── src/main/java/com/novel/
│   │   ├── NovelAiCopilotApplication.java
│   │   ├── config/          # 配置类
│   │   ├── controller/      # API 控制器
│   │   ├── service/         # 业务逻辑
│   │   ├── mapper/          # 数据访问层
│   │   ├── entity/           # 实体类
│   │   └── dto/             # 数据传输对象
│   ├── src/main/resources/
│   │   ├── application.yml   # 配置文件
│   │   └── db/schema.sql    # 数据库脚本
│   ├── pom.xml
│   └── start.bat            # 启动脚本
│
├── frontend/
│   ├── app/                 # Next.js 页面
│   ├── components/          # React 组件
│   ├── package.json
│   └── start.bat           # 启动脚本
│
└── README.md
```

---

## ✅ 启动检查清单

启动前确认以下事项：

- [ ] PostgreSQL 18 已安装
- [ ] pgvector 扩展已安装
- [ ] 数据库 `novel_ai_copilot` 已创建
- [ ] 6 张数据表已创建（chapter, lore, memory_summary, novel, story_state, user）
- [ ] DeepSeek API Key 已配置
- [ ] Java 17+ 已安装
- [ ] Maven 已安装
- [ ] Node.js 18+ 已安装

---

## 🎉 启动成功

```
后端：http://localhost:8080
前端：http://localhost:3000
Swagger：http://localhost:8080/swagger-ui.html
```
