# NovelAI Copilot 项目状态

更新时间：2026-06-04

## 2026-06-04 Web AI 模式补充

本轮新增“Web AI 模式”，用于未接 API 或用户主动选择网页 GPT/Gemini 时的半自动协作流程。图稿仅作为流程参考，实际 UI 延续现有浅色、纸张感、轻网格工作台风格，没有照搬海报布局。

已完成：

- 三种模式共存：本地模式、Web AI 模式、API 模式。
- 模型面板新增模式切换入口，并展示当前模式、AI 来源、当前任务、结果来源。
- 右侧 AI 副驾新增“Web”标签页，作为 Web AI 协作面板。
- Web AI 协作面板支持：
  - 选择 GPT Web、Gemini Web、其他 Web。
  - 选择任务类型：开篇问答下一题、整理作品资料、生成第一章、短画面扩写、卡文急救。
  - 预览结构化 Prompt。
  - 一键复制 Prompt。
  - 粘贴网页 AI 返回内容。
  - 解析并应用 JSON 结果。
  - 显示解析失败和应用成功提示。
- 新增前端 Prompt Builder：`frontend/lib/web-ai.ts`。
  - 根据当前作品、脑洞、题材、风格、章节、问答历史、作品资料草稿、主角、世界规则和用户输入生成结构化 Prompt。
  - Prompt 明确要求网页 AI 按用户题材判断，避免强行套玄幻/退婚流/系统流模板。
  - Prompt 明确要求只输出合法 JSON，不输出 Markdown 或解释文字。
- Web AI JSON 解析支持：
  - 直接粘贴纯 JSON。
  - 从 ```json 代码块中提取 JSON。
  - 当回答前后有少量解释文字时，尝试提取第一个合法 JSON 对象。
- Web AI 结果应用支持：
  - `opening_next_question`：追加 Web AI 生成的开篇追问、选项、原因、影响，并标记来源。
  - `novel_draft`：更新作品资料草稿。
  - `first_chapter`：写入当前章节标题、正文和摘要。
  - `chapter_expand`：写入 AI 正文草稿区，保留插入正文按钮。
  - `chapter_rescue`：展示卡文急救方案卡，可继续插入正文。
- 动态开篇问答、第一章生成、短画面扩写、卡文急救旁边已增加 Web AI Prompt 入口。
- 结果来源会标记为 GPT Web / Gemini Web / 其他 Web，不混同为后端 Skill 或本地 fallback。

验证结果：

- `cd frontend && npm run build` 已通过。
- `cd backend && mvn -DskipTests compile` 已通过。

未完成：

- 本轮不接入 Gemini API，不新增模型 API，不做多模型并发。
- Web AI 模式不会自动打开网页 GPT/Gemini，也不会自动读取网页回答，仍由用户复制/粘贴完成。
- Web AI 结果目前只应用到前端当前工作区；真实账号下是否立即入库仍依赖用户后续保存章节/作品资料流程。

## 2026-06-04 交互问题修复补充

针对最新体验走查中暴露的 3 个问题，已在 `frontend/app/page.tsx` 做补充修复：

- 登录后账号面板不再继续暴露用户名/密码输入框；登录或切换本地账号成功后会清空密码、收起账号面板，再次打开时展示当前账号、后端状态和退出登录入口。
- 模型接入状态已显性化：模型面板新增“模型接入状态”和模型角色列表，展示创作模型、记忆模型、审稿模型、Agent 模型；当填写 DeepSeek 参数但仍处于本地账号时，会明确提示“已填写参数，本地账号不会真实调用后端 Skill”，真实账号连接后才会优先调用后端 Skill。
- 正文区灵感和扩写交互已补反馈：点击灵感会把内容送入短画面扩写输入框并提示下一步；正文 AI 扩写在短画面为空时会自动使用选中文本、章节尾段或章节标题作为输入，不再静默无反应；选中文本后的润色/扩写/重写会写入生成输入并给出可见提示。

验证结果：

- `frontend npm run build` 已通过。
- `backend mvn -DskipTests compile` 已通过。
- 当前前端预览已重新启动，`http://127.0.0.1:3000` 返回 200。
- 当前后端 `http://127.0.0.1:8080/v3/api-docs` 返回 200。

## 当前判断

项目处在“可交互前端原型 + 后端 Skill/Agent 工作流已完成真实 PostgreSQL HTTP 闭环验证”阶段。前端已能支撑本地账号、本地作品、多作品切换、作品库管理、作品总览、动态开篇问答、短画面扩写、卡文急救、世界观图谱和 AI 自动开书入口。后端已补齐多个 Skill 接口，并新增可审计、可查询、可取消的 Novel Creation Agent Task MVP；本轮已在 PostgreSQL 17 测试实例上跑通注册、登录、JWT、作品、章节、Lore、模型配置、Skill 接口、Agent Task `FIXED_WORKFLOW` 和 `AUTO` 的真实 HTTP + 数据库写入闭环。`mvn -DskipTests compile`、`npm run build`、前端 dev server 页面加载均已通过。

## 已完成

### 前端体验

- 首页已改为“脑洞入口”，展示脑洞拆解、黄金第一章、短画面扩写、卡文急救、长篇记忆、伏笔/OOC 检查等特色。
- 已实现三栏创作工作台：左侧作品资产、中心正文编辑、右侧 AI 副驾。
- 已实现本地账号、本地作品列表、本地作品切换和每个作品独立持久化。
- 已新增作品库 / 作品管理入口：
  - 顶部保留作品下拉，并增强为“作品名 + 状态 + 最近更新时间”。
  - 新增作品库弹窗，展示作品卡片列表。
  - 作品卡片包含伪封面、作品名、一句话卖点、状态、字数、章节数、最近更新时间。
  - 支持按关键词搜索作品，按状态筛选，按最近编辑/最近创建/字数/标题排序。
  - 点击作品卡片可展开右侧详情卡，点击“进入创作”切换当前作品，兼容本地账号模式。
  - 支持本地上传封面，预留 AI 生成封面入口，当前以封面占位重新生成为 MVP。
- 已增强作品总览：
  - 顶部展示作品封面、作品名、状态、字数、章节数、最近更新时间。
  - 保留并展示简介/卖点、全局大纲、主角、世界规则、章节列表和创作统计。
  - 创作统计已包含卷数、人物数、伏笔数、已发布章节数等派生数据。
  - 左侧工作台总览新增折叠式“全局大纲”编号列表，便于长篇、多卷、多章节快速扫描。
  - 工作台作品封面卡支持本地换封面，作品库详情支持上传封面和 AI 封面占位入口。
- 已升级引导式开篇问答 / 创作向导：
  - 支持输入标题、脑洞、类型、风格。
  - 支持保存问答历史，并持久化到本地 workspace。
  - 支持根据前序回答动态追问 3-6 个问题。
  - 本地 fallback 覆盖玄幻、仙侠/修真、都市、科幻、悬疑、女频复仇、剑与魔法、系统流、退婚流、无限流等开局方向。
  - 问答完成后生成作品资料草稿，用户确认后生成第一章标题和正文。
  - 第一章正文自动写入当前章节编辑器，并同步章节列表、字数、作品资料、设定、灵感和世界观图谱。
  - 后端可用时优先复用 `/api/novels/draft` 和 `/api/chapters/expand`，失败时自动 fallback。
- 已保留新建作品确认流程：标题 + 脑洞 -> 生成作品资料草稿 -> 用户编辑确认 -> 正式创建。
- 已实现章节编辑、新建、删除、保存、发布标记、字数统计。
- 已实现设定库基础 CRUD、搜索、分类、标签、角色立绘 Prompt 字段。
- 已实现灵感记录、删除、回填到短画面输入。
- 已实现短画面扩写入口：优先调用后端 Skill，失败或本地账号时使用本地 fallback。
- 已实现卡文急救方案卡：优先调用后端 Skill，失败或本地账号时生成 3 个本地方案，点击卡片插入正文。
- 已实现世界观图谱 / 故事关系图谱前端 MVP：
  - 图谱节点：作品、卷、章节、人物、势力、地点、事件、伏笔。
  - 图谱关系：章节归属、出场、属于作品、钩子关联、剧情驱动等。
  - 支持筛选、缩放、拖拽节点、点击节点查看详情。
  - 支持手动新增节点、手动新增关系、编辑节点标题/类型/说明、标记重要节点。

### 后端 Skill 与接口

- 已新增通用接口：`NovelSkill<I, O>`。
- 已新增新建作品草稿接口：
  - `POST /api/novels/draft`
  - `POST /api/novels/confirm`
- 已新增短画面扩写 Skill：
  - `ChapterExpansionSkill`
  - `POST /api/chapters/expand`
- 已新增卡文急救 Skill：
  - `ChapterRescueSkill`
  - `POST /api/chapters/rescue`
- 已新增世界观图谱 Skill：
  - `StoryGraphSkill`
  - `POST /api/story-graph/generate`
  - `GET /api/story-graph/{novelId}`
- Skill 均优先复用现有 `AiService` 和用户模型配置逻辑，模型失败时返回规则 fallback。
- 已修复后端编译基础问题：
  - 固定 Lombok 版本并配置 Maven annotation processor。
  - 修正 `AIServiceImpl` 类名与 Spring AI `1.0.0-M1` 包名。
  - 补齐 `ChapterService`、`NovelService`、`LoreService` 的 UUID 删除方法契约。

### Agent Task MVP

- 已新增自动创作代理任务基础能力，第一版为同步执行的后端工作流服务，未接入复杂外部 Agent SDK。
- 已新增 Agent 授权、任务、步骤、执行日志四类持久化表：
  - `agent_authorization`
  - `agent_task`
  - `agent_task_step`
  - `agent_execution_log`
- 已新增 Agent 授权接口：
  - `POST /api/agent-authorizations`
  - `DELETE /api/agent-authorizations/{authorizationId}`
- 已新增小说创建 Agent Task 接口：
  - `POST /api/agent-tasks/novel-creation`
  - `GET /api/agent-tasks/{taskId}`
  - `GET /api/agent-tasks/{taskId}/logs`
  - `POST /api/agent-tasks/{taskId}/cancel`
- 已新增 `NovelCreationAgentWorkflow`，执行流程包含：
  - 校验授权归属、状态、过期时间和 scopes。
  - 创建 `agent_task` 并记录输入快照。
  - 执行 `CREATE_DRAFT`，复用 `NovelDraftService`。
  - 执行 `CONFIRM_NOVEL`，复用新建作品确认流程。
  - 可选执行 `GENERATE_FIRST_CHAPTER`，复用 `ChapterExpansionSkill`。
  - 执行 `SAVE_CHAPTER`，保存第一章正文。
  - 可选执行 `GENERATE_STORY_GRAPH`，复用 `StoryGraphSkill`。
  - 每一步写入 `agent_task_step` 和 `agent_execution_log`。
  - 成功写入 `novelId`、`chapterId`、`chapterTitle`、图谱节点/关系统计等结果。
- 已将 Novel Creation Agent Workflow 的每个步骤封装为 Tool：
  - `create_novel_draft`
  - `confirm_novel`
  - `generate_first_chapter`
  - `save_first_chapter`
  - `generate_story_graph`
- 已新增 `AgentRunnerService`：
  - `FIXED_WORKFLOW`：使用固定顺序工具化 workflow。
  - `RESPONSES_API`：在用户模型配置为 OpenAI Responses API 时，通过 `/responses` 工具调用循环让模型选择并调用工具。
  - `AUTO`：可用 Responses API 时优先使用，否则回退固定 workflow。
  - `AGENTS_SDK`：保留为未来 SDK 适配模式；当前 Java 后端没有直接接入外部 Agents SDK，仍回退固定 workflow。
- `POST /api/agent-tasks/novel-creation` 已支持 `runnerMode` 参数：`AUTO`、`FIXED_WORKFLOW`、`RESPONSES_API`、`AGENTS_SDK`。
- 已将原 `NovelDraftController` 中的草稿生成与确认创建逻辑抽出为 `NovelDraftService`，供原接口和 Agent Workflow 共用。
- 前端右侧 AI 副驾已新增“代理”标签页：
  - 输入标题、脑洞、类型、风格。
  - 勾选自动生成第一章、自动生成世界观图谱。
  - 支持选择 Runner：自动、固定 Workflow、Responses API 工具调用、Agents SDK 兼容模式。
  - 点击“授权并开始”后依次调用授权接口和 Agent Task 接口。
  - 展示任务状态、步骤列表、日志列表、成功结果和“进入创作”按钮。
  - 本地账号模式不调用 Agent 接口，不影响现有动态开篇问答。

### 模型与 API

- 前端已提供模型 API 设置入口：Provider、Base URL、模型名、API Key。
- 已支持 DeepSeek、OpenAI、硅基流动、OpenRouter、自定义等 OpenAI-compatible 配置。
- 已实现模型测试入口。
- 后端已添加用户模型配置表、API Key 加密/解密服务和 OpenAI-compatible 调用逻辑。

### 文档与工程

- 前端 `next build` 已通过。
- 后端 `mvn -DskipTests compile` 已通过。
- 前端可在 `http://127.0.0.1:3000/` 访问。
- 已补充 `docs/E2E_TESTING.md`，包含后端启动、前端启动、数据库初始化、Redis 检查、注册/登录 curl、作品/章节 curl、Lore curl、模型配置 curl、Skill curl、Agent Task curl 和常见错误排查。
- 已补充 README 的环境变量、PostgreSQL schema 初始化、Redis 检查和 E2E 指南入口。
- 已添加 Node 20 启动脚本：
  - `frontend/start-node20.bat`
  - `frontend/start-preview-node20.bat`
- 旧文档已归档到 `docs/archive/`。

### 2026-06-04 端到端验证与修复

- 配置验证：
  - `application.yml` 已改为通过 `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_SCHEMA`、`DB_USERNAME`、`DB_PASSWORD` 配置 PostgreSQL。
  - `AI_MODEL`、`AI_TEMPERATURE`、`AI_MAX_TOKENS` 已有环境变量入口，`AI_API_KEY`、`AI_BASE_URL` 在 `.env.example` 与 README 中说明清晰。
  - `.env.example` 已补齐数据库、Redis、JWT、AI、加密、前端源、日志等级等本地启动配置。
  - `JWT_SECRET` 示例已改为至少 32 字符的开发占位值。
- schema 与实体一致性修复：
  - `schema.sql` 已去掉强依赖 pgvector 的扩展创建。
  - `lore`、`memory_summary`、`inspiration`、`character_image` 的 `embedding` 字段已从 `vector(1536)` 调整为 `TEXT`，与当前实体 `String` 字段一致，避免本地初始化失败。
  - 修正 `character_relationship.hatred_value` 字段注释拼写。
  - Agent 相关表保留 `agent_authorization`、`agent_task`、`agent_task_step`、`agent_execution_log`，与 Entity/Mapper 命名一致。
- 后端启动修复：
  - `AIServiceImpl` 已将 `ChatClient` 改为可选依赖。没有 Spring AI ChatClient Bean 时，优先使用用户模型配置；仍无可用模型时返回清晰错误，不再阻塞 Spring Boot 启动。
  - `PlotArc`、`StoryState`、`WritingSkill` 去掉不必要的 `autoResultMap`/Jackson TypeHandler 组合，修复 MyBatis Plus 启动时报 `No typehandler found for property id` 的问题。
- 权限与数据边界修复：
  - `GET /api/chapter/{id}` 改为按当前用户归属校验。
  - `GET /api/lore/{id}` 改为按当前用户归属校验。
  - 小说更新/删除在目标不存在或不归属当前用户时返回清晰的 404 错误。
  - 章节保存/更新时会根据正文重新计算字数。
- 本机验证结果：
  - `mvn -DskipTests compile` 通过。
  - `npm run build` 通过。
  - Redis 6379 端口可连接。
  - 后端启动已修复到 Tomcat 8080 可启动。
  - 第一轮 PostgreSQL 5432 不可连接；随后通过 PostgreSQL 17 临时实例在 `127.0.0.1:55432` 完成真实数据库验证。
  - `schema.sql` 已成功导入 PostgreSQL 17。
  - 注册/登录/JWT、未登录 401、作品 CRUD、章节创建/保存/删除、Lore 创建/修改/删除、模型配置保存/查询、Skill 接口、Agent Task `FIXED_WORKFLOW`/`AUTO` 均已通过 HTTP 验证。
  - 数据库写入计数已确认：`users=2`、`novels=5`、`chapters=4`、`lore=8`、`user_model_config=1`、`agent_authorization=3`、`agent_task=3`、`agent_task_step=15`、`agent_execution_log=33`。
  - 跨用户访问作品、章节、Lore、Agent Task 均返回 403。
  - 前端 dev server 启动成功，`http://localhost:3000` 返回 200。
- 本轮新增修复：
  - `User` 实体表名改为转义 `"user"`，避免 PostgreSQL 关键字导致注册 SQL 失败。
  - 新增全局 `UuidTypeHandler`，解决 UUID 参数写入 PostgreSQL 时 TypeHandler 缺失。
  - 对 User、Novel、Chapter、Lore、UserModelConfig、AgentAuthorization、AgentTask、AgentTaskStep、AgentExecutionLog 的创建路径显式生成 UUID，避免数据库默认 UUID 无法回填到实体。
  - `schema.sql` 时间字段从 `TIMESTAMP WITH TIME ZONE` 调整为 `TIMESTAMP`，匹配实体 `LocalDateTime`。
  - 修复模型配置首次保存误走 update 的问题。
  - 全局异常和 Agent Controller 对“未登录/无权/不存在”返回 401/403/404，不再把归属校验暴露为 500。

## 未完成

### 后端端到端验证

- 真实 PostgreSQL HTTP 数据闭环已在本机临时 PostgreSQL 17 实例完成。
- 当前未配置真实 OpenAI 官方 Responses API Key，因此 `RESPONSES_API` 模式未做真实模型工具调用验证；`AUTO` 在非 OpenAI Responses API 配置下回退固定 workflow 的行为已验证。
- 开篇问答暂未新增独立后端 `OpeningGuideSkill` / `FirstChapterGenerationSkill`，当前前端优先复用已有接口并提供本地 fallback。
- Spring AI 默认模型调用目前仍使用 `ChatClient.call(Prompt)`，该 API 在当前依赖版本中有过时警告，后续应升级到新版调用写法。
- Agent Task 第一版为同步执行，取消接口可正确标记未完成任务，但不强制中断正在执行的模型调用线程。
- Responses API 工具调用需要用户模型配置使用 OpenAI 官方 Base URL：`https://api.openai.com/v1`，并配置可用 API Key；DeepSeek/OpenRouter 等 OpenAI-compatible Chat Completions 配置会自动回退固定 workflow。
- 当前未直接引入 OpenAI Agents SDK 依赖；工具定义和 Runner 抽象已经预留 SDK 适配位置。

### 产品体验

- 作品封面目前是本地伪封面 / 渐变占位，真实 AI 生成和上传到后端对象存储尚未完成。
- 作品库目前是前端弹窗 MVP，后端作品元数据还未完整持久化状态、封面、更新时间。
- 开篇问答的动态追问目前是规则驱动 fallback，真实模型驱动追问待后端 Skill 化。
- 世界观图谱目前是前端 MVP，未接正式图谱表持久化。
- 章节目录还缺拖拽排序、分卷、批量管理。
- 设定库还未完整细分人物、地点、物品、势力、规则、事件、功法等模型。

### AI 能力

- 新建作品、短画面扩写、卡文急救、世界观图谱已有后端 Skill 链路，但真实模型端到端仍需验证。
- 长篇记忆 Skill、OOC/伏笔一致性检查、AI 副驾真实多轮对话尚未完成。
- RAG/向量召回尚未接入图谱和章节扩写。
- 多模型对比、文风克隆、Prompt Inspector 完整 Prompt 展开尚未完成。

## 产品文档完成度

| 能力 | 当前状态 |
| --- | --- |
| 创作工作台 | 已完成前端原型 |
| 作品库 / 作品管理 | 已完成前端 MVP，支持卡片展示、搜索、筛选、排序、详情展开、封面上传、AI 封面占位和切换 |
| 动态开篇问答 | 已完成前端闭环和本地 fallback，后端独立 Skill 待补 |
| 新建作品确认流程 | 已完成前端闭环和后端接口 |
| 短画面扩写 | 已完成 `ChapterExpansionSkill` 和前端优先调用 |
| 卡文急救 | 已完成 `ChapterRescueSkill`、3 方案卡、点击插入 |
| 世界观图谱 | 已完成 `StoryGraphSkill`、后端接口、前端 SVG 交互图谱 MVP |
| Agent Task MVP | 已完成授权、任务、步骤、日志、工具化小说自动创建 Workflow、Responses API Runner 和前端轻量入口 |
| 作品资料总览 | 已完成前端原型和本地持久化 |
| Lore 设定库 | 已完成基础 CRUD，未完成完整知识图谱持久化 |
| Prompt Inspector | 已完成基础展示，未完成 token 预算和完整 Prompt 展开 |
| Skill 工坊 | 已有 Skill 骨架，未完成用户自建/市场/安装/审核 |

## 下一步建议

1. 新增后端 `OpeningGuideSkill` 和 `FirstChapterGenerationSkill`，把动态追问与第一章生成从前端规则升级为统一 Skill 链路。
2. 配置真实 OpenAI 官方 Responses API Key 后，复验 `RESPONSES_API` Runner 的真实工具调用链路。
3. 新增后端 `OpeningGuideSkill` 和 `FirstChapterGenerationSkill`，把动态追问与第一章生成从前端规则升级为统一 Skill 链路。
4. 为作品增加正式封面字段、作品状态字段和更新时间字段，并接入后端持久化。
5. 为封面管理增加上传封面 / AI 生成封面的真实入口。
6. 为世界观图谱增加后端持久化表：`story_graph_node`、`story_graph_edge`。
7. 将 Agent Task 从同步执行升级为异步队列/线程池执行，并支持执行中任务的更细粒度取消与重试。
8. 如需完整 OpenAI Agents SDK 支持，可在 `AgentRunnerService` 后新增 SDK adapter，复用现有 `NovelCreationTool` 列表和 step/log 记录逻辑。

## Agent Task curl 示例

以下示例需要先通过 `/api/auth/login` 获取真实后端 JWT，并设置环境变量：

```powershell
$token = "YOUR_JWT_TOKEN"
```

1. 创建授权：

```powershell
curl -X POST "http://localhost:8080/api/agent-authorizations" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d "{\"agentType\":\"NOVEL_CREATION\",\"scopes\":[\"novel:create\",\"chapter:create\",\"chapter:update\",\"storyGraph:generate\"],\"expiresInHours\":24}"
```

2. 创建小说代理任务：

```powershell
curl -X POST "http://localhost:8080/api/agent-tasks/novel-creation" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d "{\"authorizationId\":\"AUTHORIZATION_ID\",\"title\":\"我的长篇小说\",\"idea\":\"退婚现场，主角体内隐藏力量第一次回应。\",\"genre\":\"玄幻\",\"style\":\"热血、逆袭、节奏紧凑\",\"autoGenerateFirstChapter\":true,\"autoGenerateStoryGraph\":true}"
```

如需指定 Runner：

```powershell
curl -X POST "http://localhost:8080/api/agent-tasks/novel-creation" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d "{\"authorizationId\":\"AUTHORIZATION_ID\",\"title\":\"我的长篇小说\",\"idea\":\"退婚现场，主角体内隐藏力量第一次回应。\",\"genre\":\"玄幻\",\"style\":\"热血、逆袭、节奏紧凑\",\"autoGenerateFirstChapter\":true,\"autoGenerateStoryGraph\":true,\"runnerMode\":\"RESPONSES_API\"}"
```

3. 查询任务：

```powershell
curl -X GET "http://localhost:8080/api/agent-tasks/TASK_ID" `
  -H "Authorization: Bearer $token"
```

4. 查询日志：

```powershell
curl -X GET "http://localhost:8080/api/agent-tasks/TASK_ID/logs" `
  -H "Authorization: Bearer $token"
```

5. 取消任务：

```powershell
curl -X POST "http://localhost:8080/api/agent-tasks/TASK_ID/cancel" `
  -H "Authorization: Bearer $token"
```
# 2026-06-04 Opening Guide Skill Update

本轮已新增后端 `OpeningGuideSkill` 与 `FirstChapterGenerationSkill`，并将前端动态开篇问答升级为真实账号优先调用后端、本地账号或后端失败时继续使用本地 fallback。

新增后端接口：

- `POST /api/novels/opening-guide/next-question`
- `POST /api/novels/opening-guide/generate-first-chapter`

增强接口：

- `POST /api/novels/draft` 继续兼容旧字段，同时支持 `answers`、`draftPatch`，并补齐 `subtitle`、`openingChapterGoal`、`firstChapterTitle`。

Agent Task 更新：

- `GENERATE_FIRST_CHAPTER` 现在优先使用 `FirstChapterGenerationSkill`。
- 新 Skill 失败时仍回退到原 `ChapterExpansionSkill`。
- `SAVE_CHAPTER` 优先使用新 Skill 返回的章节标题，其次使用草稿 `firstChapterTitle`，最后使用旧规则生成标题。

验证结果：

- 后端：使用 `D:\Program Files\Java\jdk-21.0.10` 执行 `mvn -DskipTests compile` 通过。
- 前端：执行 `npm run build` 通过。
- 当前轮未重新启动 PostgreSQL/后端/前端做真实 HTTP 写库复验；上一轮真实 PostgreSQL E2E 结论仍见 `docs/E2E_TESTING.md`，本轮新增接口 curl 见 `docs/OPENING_GUIDE_E2E.md`。

当前风险：

- 真实模型返回 JSON 质量仍需在实际 API Key 环境复验。
- 新增开篇向导接口尚未在可用 PostgreSQL 环境中跑完整真实账号 HTTP 闭环。
- `PROJECT_STATUS.md` 中较早的“开篇问答后端 Skill 待补”历史描述已被本节 supersede，后续可统一清理旧状态表述。
# 2026-06-04 创作体验收敛优化 V1

本轮目标不是继续堆新能力，而是把已有创作链路的可见反馈、来源标识和作品管理体验收敛到更可用的状态。

## 已完成

- 登录与账号状态反馈：登录/注册增加 loading、成功、失败、后端不可用切换本地账号、401 重新登录提示；顶部账号区现在展示本地账号/真实账号、后端连接状态、模型配置状态。
- 当前生成链路可视化：模型面板展示 Provider、Model Name、Skill、RunnerMode、是否使用后端、是否 fallback，并预留创作模型、记忆模型、审稿模型、Agent 模型概念。
- 结果来源标识：动态开篇问答、作品草稿、第一章生成、短画面扩写、卡文急救、Agent 自动开书等结果区域展示后端、本地规则、fallback 或具体 Skill 来源。
- 动态开篇问答优化：问题卡片展示当前步骤、为什么问、影响方向；支持选项、自定义回答、跳过、上一步；问答历史可展开/收起；生成草稿前展示已收集信息摘要。
- 作品库删除：作品详情和当前作品区增加删除入口；删除前二次确认并说明会删除作品资料、章节、设定、灵感、本地图谱数据；本地账号删除 localStorage 数据，真实账号接入现有后端删除接口。
- 操作反馈统一：登录、新建作品、生成草稿、确认创建、开篇问答、生成第一章、短画面扩写、卡文急救、Agent 自动开书、删除作品、保存章节、保存设定均增加可见 loading/success/error/fallback 提示，loading 时禁用对应按钮。

## 验证结果

- 后端：已运行 `cd backend; mvn -DskipTests compile`，JDK 21 环境下通过，结果为 `BUILD SUCCESS`。
- 前端：已运行 `cd frontend; npm run build`，Next.js 构建通过。
- 浏览器冒烟：已启动最新前端预览，`http://127.0.0.1:3000` 返回 200；页面顶部可见本地账号、后端不可用/本地模式、模型未配置等状态。

## 当前风险

- 本轮未连接真实 PostgreSQL/Redis/后端服务做真实账号删除与 Agent Task 全链路复验；真实账号路径仍需在后端启动后按 `docs/E2E_TESTING.md` 清单验证。
- 真实账号删除作品依赖后端现有 `DELETE /api/novel/{novelId}` 和数据库级联/Service 级联行为，需在 PostgreSQL 环境中确认章节、设定等关联数据删除完整。
- 模型来源可视化已在 UI 层补齐，但真实模型返回中的来源字段仍以现有前端链路推断为主。

## 下一步建议

- 在 PostgreSQL 和 Redis 可用环境中启动后端，使用真实账号创建测试作品后验证删除闭环。
- 按 `docs/E2E_TESTING.md` 复跑 Agent Task FIXED_WORKFLOW/AUTO，确认 UI 中 RunnerMode、Skill、fallback 状态与后端日志一致。
- 对动态开篇问答做一次真实用户流程录屏式走查，继续压缩无效点击和等待时间。
# 2026-06-05 工作台状态栏与作品库空状态修复

本轮只做体验和状态修复，没有新增 Web AI、MemoryExtractionSkill、ConsistencyCheckSkill 或其他大功能。

已完成：

- 顶部状态栏拆成两层：全局状态区展示产品名、当前模式、模型短标签、账号短标签、后端状态、fallback/后端 Skill 状态、作品库入口、模型设置入口、账号入口；创作上下文区展示当前作品、章节、新作品标题、一句脑洞、生成草稿、确认创建、从脑洞开书。
- 顶部短标签不再平铺长说明，复杂说明放入模型/账号详情卡。
- 模型详情卡补充 Provider、Model Name、Base URL、账号类型、后端状态、是否真实调用后端 Skill、fallback 原因。
- 首页脑洞、顶部新作品标题、Agent 自动开书输入不再默认填入玄幻/退婚示例；示例只保留在 placeholder。
- 空输入点击“整理成故事”或“生成第一章草稿”时给出提示，不再自动套用默认玄幻内容。
- 作品库列表为空时显示“暂无作品”空状态，并提示可新建作品或从脑洞开书。
- 作品库右侧详情在没有真实作品时不再 fallback 到当前 workspace，不再展示“未命名作品”“东方玄幻”等默认内容。
- 临时草稿和正式作品区分：用户输入脑洞、开篇问答或草稿生成属于临时状态，确认创建后才进入作品库。
- 删除所有作品后进入空白工作区，不再重新构造默认玄幻作品。

验证结果：

- `cd frontend && npm run build` 已通过。
- `cd backend && mvn -DskipTests compile` 已通过。
- 前端预览已启动，`http://127.0.0.1:3000/?v=status-clean` 返回 200。
- 已通过代码路径确认：作品库空列表不再 fallback 到当前 workspace；空脑洞不会自动生成默认玄幻故事。受当前环境缺少 Playwright 依赖限制，清空 localStorage 后的浏览器点击验收需人工刷新页面确认。

## 2026-06-05 武侠开篇问答与模型状态修复

针对“烟雨江湖 / 架空历史武侠”实测暴露的问题，已做收敛修复：

- 顶部模型状态不再把默认 Provider 当成“已配置”。只有 `apiKeyConfigured=true` 或当前输入了 API Key 才显示“已接入”，否则显示“DeepSeek 未接入”。
- 模型详情文案补充说明：Provider 已选不等于 API Key 已保存；未保存 Key 时生成会走本地/后端 fallback。
- 前端本地 Opening Guide fallback 新增武侠专属追问链：
  - 退隐原因
  - 谁在热闹处认出他
  - 不拔刀如何破局
  - 江湖代价
  - 章末追读钩子
- 后端 `OpeningGuideSkill` fallback 同步新增武侠专属追问链，真实账号但模型不可用时不再问玄幻式“底牌/异常”。
- 后端 `FirstChapterGenerationSkill` fallback 新增武侠首章模板：茶楼、旧刀、封刀誓、筷夹刀、旧案回潮，不再使用发光道具、经脉觉醒、血脉等玄幻元素。
- 实测后端 fallback 对“烟雨江湖”生成：
  - 第 1 问：`三年前他退出江湖，真正原因更接近哪一种？`
  - 第 2 问：`第一章开场，谁最适合在热闹处认出这个退隐少年？`
  - 第一章标题：`第一章：三年不拔刀`

验证结果：

- `cd frontend && npm run build` 已通过。
- `cd backend && mvn -DskipTests compile` 已通过。

## 2026-06-05 顶部后端状态文案修正

针对实测截图中“本地账号 + 后端不可用”容易造成误解的问题，已将前端顶部状态拆清：

- 本地账号时不再显示“后端不可用”，改为“后端未使用”。
- 真实账号登录成功但作品列表为空时，仍保持 `syncState=synced`，顶部显示后端已连接/后端可用，不再因为 0 个作品误判为本地状态。
- “后端不可用/后端异常”只保留给真实后端请求失败场景。

验证：
- `cd frontend && npm run build` 已重新运行并通过。
- `cd backend && mvn -DskipTests compile` 已使用 JDK 21 重新运行并通过。

## 2026-06-05 开篇向导上下文清洗修复

针对《烟雨江湖》实测中“首页输入武侠脑洞，进入问答向导后仍混入玄幻/上古残剑默认内容”的问题，已完成第一轮收敛修复：

- 新增首页脑洞解析：识别 `标题：`、`故事背景：`、`类型：`、`风格：` 等输入，并从“江湖、武侠、退隐、封刀”等关键词推断题材。
- “进入问答向导”不再只是打开右栏，而是会把首页脑洞同步到开篇向导标题、脑洞、题材、风格、starter 蓝图和临时作品资料。
- 进入向导时会清空旧的开篇问答、旧 draftPatch 和旧作品草稿，避免继续沿用默认玄幻上下文。
- `inferStarterAnswersFromIdea` 增加武侠/江湖识别，生成“退隐、旧案、封刀、不拔刀破局”方向的主角、世界规则和第一幕画面。
- Web AI Prompt 构建时，如果当前存在临时开书脑洞，会使用干净临时 draft；默认 demo 中的“林青云、玄天剑、东方玄幻、紫云宗、灵根”等内容不再混入 Prompt。
- 问答卡片的 reason/impact 增加“江湖、退隐、封刀、旧案、不拔刀”等识别，展示更贴合武侠开篇的追问意图。

验证：
- `cd frontend && npm run build` 已通过。
- `cd backend && mvn -DskipTests compile` 已使用 JDK 21 通过。
- 前端已重启，`http://127.0.0.1:3000/?v=clean-context` 返回 200。
- 后端保持运行，`http://127.0.0.1:8080/v3/api-docs` 此前探活返回 200。

## 2026-06-05 新手开书主线收敛

针对“还不如直接问 GPT”的体验反馈，已把首页主流程从功能堆叠收敛为“一句脑洞 -> 帮我开书 -> 关键追问 -> 作品资料 -> 第一章”的主线：

- 首页 H1 改为“一句脑洞，先帮你开成第一章”，减少工具说明感。
- 首页主按钮改为“帮我开书”，点击后会解析脑洞、进入工作台、打开右侧创作向导，并自动生成第一道开篇追问。
- 原“整理成故事 / 生成第一章草稿 / 进入问答向导”三按钮降级为“只整理资料 / 直接出第一章 / 继续上次创作”等辅助入口。
- 首页输入框 placeholder 改为结构化示例，提示用户可直接输入标题、故事背景和类型。
- 向导顶部新增“下一步”提示，按阶段告诉用户当前该回答问题、继续追问、生成草稿还是生成第一章。
- `startOpeningGuide` 复用新的首题生成逻辑，减少“打开向导后还要再点一次开始”的空转。

验证：
- `cd frontend && npm run build` 已通过。
- 前端已重启，`http://127.0.0.1:3000/?v=one-button-open` 返回 200。
- 浏览器校验已确认首页出现“一句脑洞，先帮你开成第一章”“帮我开书”和三步开书说明。

## 2026-06-05 创作编排层 V0

为接近 GPT 式“理解 -> 判断 -> 推进”的体验，前端新增最小创作编排层雏形：

- 新增 `CreativeBrief` 状态，用于承载 assistantMessage、核心钩子、建议开场、为什么这样写、关键追问和建议动作。
- 新增 `buildCreativeBrief` 本地编排器。当前先用规则生成“我理解的故事”卡片，后续可替换为后端 `CreativeConversationService` + 多模型 API。
- “帮我开书”后会先生成创作理解卡，再生成第一道开篇追问，让用户先看到工具的判断，而不是直接进入表单。
- 创作理解卡提供三个动作：
  - 回答关键问题
  - 直接生成第一章
  - 交给网页 GPT 深挖
- 前端本地第一章生成新增武侠分支，避免本地直接生成时重新掉回玄幻/灵根/玉佩模板。
- 当前仍未新增后端大功能，未引入新框架，现有 OpeningGuideSkill、FirstChapterGenerationSkill、Web AI Prompt 流程继续复用。

验证：
- `cd frontend && npm run build` 已通过。
- 前端已重启，`http://127.0.0.1:3000/?v=orchestrator-v1` 返回 200。
- 后端保持运行，`http://127.0.0.1:8080/v3/api-docs` 返回 200。

后续建议：
- 将 `buildCreativeBrief` 下沉为后端 `CreativeConversationService`，统一 DeepSeek / OpenAI / Gemini / OpenRouter 调用。
- 建立 `ModelGateway`，让所有模型返回统一结构：assistantMessage、analysisCard、nextQuestion、suggestedActions、draftPatch。
- 前端把 Skill 结果和 Agent 结果都渲染成同一种“对话 + 动作”体验，减少按钮式工具感。

## 2026-06-05 退出登录清空当前工作区

针对“退出登录后仍能看到上一账号/上一工作区数据”的问题，已修复前端 logout 行为：

- 退出登录时清空当前内存工作区：章节、设定、灵感、图谱、选中作品、临时草稿、开篇向导、创作编排卡、Web AI 粘贴区、Agent 面板状态。
- 退出登录时移除匿名 workspace 缓存 `novel-ai-copilot-workspace-v1`，避免刷新后重新恢复旧的临时工作区。
- 退出登录后进入首页空状态，并提示“已退出登录，当前工作区已清空”。
- 不删除本地账号对应的持久作品库数据，避免“退出登录”等同于“删除作品”；同一账号再次登录时仍可读取该账号作品。

验证：
- `cd frontend && npm run build` 已通过。
- 前端已重启，`http://127.0.0.1:3000/?v=logout-clear` 返回 200。
