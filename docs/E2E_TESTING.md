# NovelAI Copilot 端到端验证指南

更新时间：2026-06-04

## 1. 环境要求

- Java 17+，本机验证使用 `D:\Program Files\Java\jdk-21.0.10`。
- Maven。
- Node.js 18.17+，推荐 Node 20。
- PostgreSQL 15+。
- Redis。
- 可选：OpenAI-compatible 模型 API Key。没有模型 Key 时，Skill 和 Agent 的部分接口会使用 fallback。

## 2. 数据库初始化

创建数据库：

```sql
CREATE DATABASE novel_ai_copilot;
```

初始化 schema：

```powershell
psql -h localhost -p 5432 -U postgres -d novel_ai_copilot -f backend/src/main/resources/db/schema.sql
```

当前 schema 使用单数表名，与实体和 Mapper 保持一致：

- `"user"`
- `novel`
- `chapter`
- `lore`
- `user_model_config`
- `agent_authorization`
- `agent_task`
- `agent_task_step`
- `agent_execution_log`

说明：`embedding` 字段当前按 `TEXT` 保存，避免本地缺少 pgvector 扩展导致初始化失败。后续真正接入向量检索时再迁移为 `vector` 类型。

## 3. Redis 启动

确保 Redis 监听 `localhost:6379`。Windows 可用本机 Redis、WSL Redis 或 Docker Redis。

端口探测：

```powershell
Test-NetConnection -ComputerName localhost -Port 6379
```

Redis 当前不阻塞基础登录、作品、章节、Lore、Agent Task 流程，但后续缓存/异步能力会依赖它。

## 4. 后端启动

环境变量示例见 `.env.example`。

PowerShell 示例：

```powershell
cd D:\aiProject\ai-created-novel\novel-ai-copilot\backend
$env:JAVA_HOME="D:\Program Files\Java\jdk-21.0.10"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_NAME="novel_ai_copilot"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="postgres"
$env:REDIS_HOST="localhost"
$env:REDIS_PORT="6379"
$env:JWT_SECRET="change-me-in-production-at-least-32-chars"
$env:AI_BASE_URL="https://api.deepseek.com/v1"
$env:AI_MODEL="deepseek-chat"
$env:AI_API_KEY="sk-xxx"
mvn spring-boot:run
```

Swagger UI：

```text
http://localhost:8080/swagger-ui.html
```

## 5. 前端启动

```powershell
cd D:\aiProject\ai-created-novel\novel-ai-copilot\frontend
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

## 6. 认证 curl

注册：

```powershell
$username = "e2e_author_" + (Get-Date -Format "yyyyMMddHHmmss")
$password = "Password123!"
$registerBody = @{ username = $username; password = $password; avatar = "" } | ConvertTo-Json
$register = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/auth/register" -ContentType "application/json" -Body $registerBody
$token = $register.data.token
```

登录：

```powershell
$loginBody = @{ username = $username; password = $password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $login.data.token
```

未登录访问受保护接口应返回 401：

```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:8080/api/novel/list"
```

## 7. 作品与章节 curl

创建作品：

```powershell
$headers = @{ Authorization = "Bearer $token" }
$novelBody = @{ title = "E2E 测试小说"; globalOutline = "第一卷：测试闭环"; authorStylePrompt = "节奏紧凑" } | ConvertTo-Json
$novel = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/novel" -Headers $headers -ContentType "application/json" -Body $novelBody
$novelId = $novel.data.id
```

查询作品：

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/novel/list" -Headers $headers
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/novel/$novelId" -Headers $headers
```

创建章节：

```powershell
$chapterBody = @{ novelId = $novelId; chapterNumber = 1; title = "第一章：测试"; content = "这是第一章正文。"; status = "draft" } | ConvertTo-Json
$chapter = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/chapter" -Headers $headers -ContentType "application/json" -Body $chapterBody
$chapterId = $chapter.data.id
```

保存章节：

```powershell
$saveBody = @{ title = "第一章：保存成功"; content = "这是更新后的章节正文。"; status = "draft" } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri "http://localhost:8080/api/chapter/$chapterId" -Headers $headers -ContentType "application/json" -Body $saveBody
```

删除章节：

```powershell
Invoke-RestMethod -Method Delete -Uri "http://localhost:8080/api/chapter/$chapterId" -Headers $headers
```

## 8. Lore curl

创建 Lore：

```powershell
$loreBody = @{ novelId = $novelId; category = "character"; name = "测试主角"; content = "用于 E2E 的主角设定。" } | ConvertTo-Json
$lore = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/lore" -Headers $headers -ContentType "application/json" -Body $loreBody
$loreId = $lore.data.id
```

查询、修改、删除：

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/lore/list?novelId=$novelId" -Headers $headers
$loreUpdateBody = @{ name = "测试主角改"; content = "已更新。"; category = "character" } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri "http://localhost:8080/api/lore/$loreId" -Headers $headers -ContentType "application/json" -Body $loreUpdateBody
Invoke-RestMethod -Method Delete -Uri "http://localhost:8080/api/lore/$loreId" -Headers $headers
```

## 9. 模型配置 curl

保存模型配置：

```powershell
$modelBody = @{ provider = "deepseek"; baseUrl = "https://api.deepseek.com/v1"; model = "deepseek-chat"; apiKey = "sk-xxx" } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri "http://localhost:8080/api/model-config" -Headers $headers -ContentType "application/json" -Body $modelBody
```

查询模型配置不会返回明文 API Key：

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/model-config" -Headers $headers
```

测试模型：

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/model-config/test" -Headers $headers -ContentType "application/json" -Body "{}"
```

## 10. Skill 接口 curl

生成作品草稿：

```powershell
$draftBody = @{ title = "Skill 测试小说"; idea = "退婚现场主角反击"; genre = "玄幻"; style = "热血、逆袭" } | ConvertTo-Json
$draft = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/novels/draft" -Headers $headers -ContentType "application/json" -Body $draftBody
```

确认创建作品：

```powershell
$created = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/novels/confirm" -Headers $headers -ContentType "application/json" -Body ($draft.data | ConvertTo-Json -Depth 10)
$skillNovelId = $created.data.id
$skillChapters = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/chapter/list?novelId=$skillNovelId" -Headers $headers
$skillChapterId = $skillChapters.data[0].id
```

短画面扩写：

```powershell
$expandBody = @{ novelId = $skillNovelId; chapterId = $skillChapterId; sceneText = "雨夜客栈里，主角被迫交出玉佩。"; chapterGoal = "写出第一场冲突"; style = "节奏紧凑" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/chapters/expand" -Headers $headers -ContentType "application/json" -Body $expandBody
```

卡文急救：

```powershell
$rescueBody = @{ novelId = $skillNovelId; chapterId = $skillChapterId; currentText = "主角站在门口。"; userDirection = "想增强冲突"; rescueMode = "节奏" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/chapters/rescue" -Headers $headers -ContentType "application/json" -Body $rescueBody
```

世界观图谱：

```powershell
$graphBody = @{ novelId = $skillNovelId; chapterId = $skillChapterId; mode = "full" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/story-graph/generate" -Headers $headers -ContentType "application/json" -Body $graphBody
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/story-graph/$skillNovelId" -Headers $headers
```

## 11. Agent Task curl

创建授权：

```powershell
$authzBody = @{ agentType = "NOVEL_CREATION"; scopes = @("novel:create", "chapter:create", "chapter:update", "storyGraph:generate"); expiresInHours = 24 } | ConvertTo-Json
$authz = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/agent-authorizations" -Headers $headers -ContentType "application/json" -Body $authzBody
$authorizationId = $authz.data.authorizationId
```

创建 Agent 自动开书任务：

```powershell
$agentBody = @{
  authorizationId = $authorizationId
  title = "Agent E2E 小说"
  idea = "退婚现场，主角体内隐藏力量第一次回应。"
  genre = "玄幻"
  style = "热血、逆袭、节奏紧凑"
  autoGenerateFirstChapter = $true
  autoGenerateStoryGraph = $true
  runnerMode = "FIXED_WORKFLOW"
} | ConvertTo-Json
$task = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/agent-tasks/novel-creation" -Headers $headers -ContentType "application/json" -Body $agentBody
$taskId = $task.data.taskId
```

查询任务、日志、取消：

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/agent-tasks/$taskId" -Headers $headers
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/agent-tasks/$taskId/logs" -Headers $headers
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/agent-tasks/$taskId/cancel" -Headers $headers
```

撤销授权：

```powershell
Invoke-RestMethod -Method Delete -Uri "http://localhost:8080/api/agent-authorizations/$authorizationId" -Headers $headers
```

## 12. 常见错误排查

- `No qualifying bean of type ChatClient`：已修复为可选依赖。没有 Spring AI ChatClient 时，请保存用户模型配置，或依赖 Skill fallback。
- `No typehandler found for property id`：已修复 `autoResultMap` 与 UUID 的启动冲突。
- `Type handler was null ... java.util.UUID`：已补充全局 UUID TypeHandler。UUID 主键由应用侧生成并真实写入 PostgreSQL。
- `Cannot convert TIMESTAMPTZ to LocalDateTime`：schema 已统一使用 `TIMESTAMP`，与当前实体 `LocalDateTime` 保持一致。
- PowerShell 5 发送包含中文的 JSON 时建议使用 `Content-Type: application/json; charset=utf-8`，必要时把 JSON 转成 UTF-8 bytes 后再作为 `-Body` 发送。
- `relation ... does not exist`：没有执行 `schema.sql`。
- `connection refused localhost:5432`：PostgreSQL 未启动，或 `DB_HOST/DB_PORT/DB_NAME` 配置不对。
- `401 unauthorized`：受保护接口缺少 `Authorization: Bearer <token>`。
- `缺少授权范围`：Agent 授权 scopes 不包含本次任务需要的 scope。
- `Responses API 调用失败`：仅 OpenAI 官方 `https://api.openai.com/v1` 支持当前 Responses API Runner；其他 OpenAI-compatible Provider 使用 `FIXED_WORKFLOW` 或 `AUTO` fallback。

## 13. 本机验证记录

2026-06-04 本机环境第一轮：

- `mvn -DskipTests compile` 通过。
- `npm run build` 通过。
- Redis 6379 端口可连接。
- PostgreSQL 5432 端口不可连接，且 PATH 中未发现 `psql` 或 Docker，因此未能完成真实数据库写入和 HTTP 闭环验证。
- 后端启动已修复到 Tomcat 可在 8080 启动；完整 HTTP 数据闭环仍需可用 PostgreSQL。

2026-06-04 本机环境第二轮：

- 通过 winget 安装 PostgreSQL 17 二进制，并在项目目录临时初始化 `.tmp_pgdata`。
- 5432 绑定受限，测试实例改用 `127.0.0.1:55432`。
- `schema.sql` 可完整导入 PostgreSQL 17；首次导入只有 trigger 不存在的 NOTICE，属于正常首次初始化提示。
- 后端以 `DB_HOST=127.0.0.1`、`DB_PORT=55432`、`DB_NAME=novel_ai_copilot` 启动成功。
- 真实 HTTP 闭环已验证通过：
  - 注册用户 A / B。
  - 登录用户 A，获取 JWT。
  - 未登录访问受保护接口返回 401。
  - 创建作品、查询作品列表、查询作品详情。
  - 创建章节、保存正文与标题、查询章节、删除章节。
  - 创建 Lore、查询 Lore、修改 Lore、删除 Lore。
  - 保存用户模型配置、查询配置，确认 `apiKey` 不明文返回且仅返回 `apiKeyConfigured=true`。
  - 使用不可达模型地址测试模型，接口返回“测试失败”文本，后端未崩溃。
  - 调用 `POST /api/novels/draft`、`POST /api/novels/confirm`、`POST /api/chapters/expand`、`POST /api/chapters/rescue`、`POST /api/story-graph/generate`、`GET /api/story-graph/{novelId}`。
  - 创建 Agent 授权，创建并查询 Agent Task，查询日志。
  - Agent Task `FIXED_WORKFLOW` 成功，返回 `novelId`、`chapterId`、日志 13 条。
  - Agent Task `AUTO` 在非 OpenAI Responses API 配置下自动回退固定 workflow 并成功，返回 `novelId`、`chapterId`、日志 13 条。
  - 跨用户访问作品、章节、Lore、Agent Task 均返回 403。
- 数据库写入计数：
  - `users=2`
  - `novels=5`
  - `chapters=4`
  - `lore=8`
  - `user_model_config=1`
  - `agent_authorization=3`
  - `agent_task=3`
  - `agent_task_step=15`
  - `agent_execution_log=33`
- 前端 `npm run build` 通过。
- 前端 `npm run dev` 启动成功，`http://localhost:3000` 返回 200，Next 页面可加载。
- 当前未配置真实 OpenAI 官方 Responses API Key，因此 `RESPONSES_API` 模式未做真实模型工具调用验证；`AUTO` 的 fallback 行为已验证。
# 2026-06-04 Opening Guide E2E Addendum

本轮新增开篇向导与第一章生成接口的 curl 清单见 `docs/OPENING_GUIDE_E2E.md`。主清单仍保留注册、登录、作品、章节、Lore、模型配置、Skill、Agent Task 的真实 PostgreSQL E2E 步骤。
