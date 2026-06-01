# 文档 1：00-Overview.md

```text

目录
产品总览与架构定位
后端架构与数据库设计
前端架构与 UI 布局
AI 核心工作流
多 Agent 协同系统
Prompt 工程与对话式引导系统
叙事引擎详细设计
IP 工厂：小说→短剧 / 漫剧全链路衍生
AI 角色立绘与世界观视觉生成模块
结构化创作工作流
网文写作技巧 AI 落地模块
去 AI 味・文风保真系统
非线性灵感创作系统
连载运营增强模块
写作实操检测增强模块
核心疑问官方解答
1. 产品总览与架构定位
1.1 产品定位
面向长篇连载与 IP 工业化生产的AI Narrative Operating System（AI 叙事操作系统），从传统 AI 写作工具（仅生成文本）升级为管理长篇世界观、角色成长、情绪节奏、伏笔回收、IP 衍生、AI 角色视觉生成的创作操作系统。
1.2 核心架构
plaintext
NovelCraft AI OS
├── 创作工作台
│ ├── 编辑器+AI副驾
│ ├── 世界状态仪表盘
│ ├── 情绪曲线可视化
│ ├── 人物关系图谱
│ └── 剧情树
├── AI引擎
│ ├── Prompt Orchestrator
│ ├── 长期记忆引擎
│ ├── 情绪引擎
│ ├── 剧情规划引擎
│ ├── 角色一致性引擎
│ └── 伏笔管理引擎
├── Multi-Agent System（10个Agent协同，含Image Agent）
├── Narrative Database（含角色视觉/灵感点数据表）
└── IP Factory（短剧/漫剧/分镜/配音/AI角色立绘/宣发）
1.3 当前优势
长文本动态记忆（RAG+Summary）
创作引导人格（非纯代写）
工作流式创作
编辑器 AI 副驾体系
小说→短剧 / 漫剧 / 角色立绘衍生能力
风格滑条控制
黄金账本 / 状态机意识
非线性点状灵感创作
AI 角色图片统一生成
1.4 v5.0 增强重点
长期剧情规划引擎（防止中后期崩盘）
情绪节奏引擎（爽点密度工业化）
世界动态演化系统（世界自己运转）
角色成长弧系统（OOC 检测）
多 Agent 协同架构（新增 Image Agent）
Prompt 工程分层与 Token 预算器
对话式引导系统全面升级（多人格、状态机、心理陪伴）
IP 工厂链路化（短剧→分镜→配音→角色立绘）
AI 角色立绘自动生成（形象统一不崩）
非线性灵感创作系统（点状灵感发散）
1.5 核心目标
作者登录后，不是面对空白文本框，而是拥有一整个 AI 编辑团队 + 视觉团队辅助的沉浸式创作工作站。
2. 后端架构与数据库设计
2.1 技术栈
框架：SpringBoot 3 (JDK 17+)
数据库：PostgreSQL 15+（启用 pgvector 扩展）
ORM：MyBatis Plus
缓存 / 鉴权：Redis + Spring Security + JWT
API 文档：Springdoc OpenAPI (Swagger 3)
AI 接入：Spring AI，兼容 OpenAI 接口
文件存储：MinIO / 阿里云 OSS（存储角色立绘 / 场景图）
消息队列：RabbitMQ/Kafka（章节发布 / 图片生成异步事件）
2.2 安全规范
全局 CORS 配置
JWT 拦截器：除登录接口外所有请求需携带 Token
数据行级隔离：所有 SQL 携带 user_id 过滤
统一返回结构：
json
{
  "code": 200,
  "message": "success",
  "data": {}
}
2.3 核心数据表
2.3.1 基础表
user：id, username, password, avatar, role
novel：id, user_id, title, global_outline, author_style_prompt
chapter：id, novel_id, chapter_number, title, content, word_count, status
lore：id, novel_id, category, name, content, embedding(vector)
memory_summary：id, novel_id, chapter_id, summary_content, embedding(vector)
story_state：id, novel_id, current_timeline, key_events, protagonist_status
2.3.2 v5.0 新增表
sql
-- 伏笔池
CREATE TABLE foreshadowing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novel(id),
  setup_chapter INT,
  payoff_chapter INT,
  content TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  importance INT DEFAULT 1,
  create_time TIMESTAMPTZ DEFAULT now(),
  update_time TIMESTAMPTZ DEFAULT now()
);

-- 人物关系动态数值
CREATE TABLE character_relationship (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novel(id),
  character_a UUID NOT NULL,
  character_b UUID NOT NULL,
  trust_value INT DEFAULT 50,
  hatred_value INT DEFAULT 0,
  intimacy_value INT DEFAULT 0,
  fear_value INT DEFAULT 0,
  create_time TIMESTAMPTZ DEFAULT now(),
  update_time TIMESTAMPTZ DEFAULT now()
);

-- 情绪曲线
CREATE TABLE emotion_curve (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novel(id),
  chapter_id UUID NOT NULL REFERENCES chapter(id),
  tension INT,
  satisfaction INT,
  mystery INT,
  despair INT,
  warmth INT,
  create_time TIMESTAMPTZ DEFAULT now(),
  update_time TIMESTAMPTZ DEFAULT now()
);

-- AI生成日志
CREATE TABLE ai_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL,
  chapter_id UUID,
  prompt_snapshot TEXT,
  response_snapshot TEXT,
  model_name VARCHAR(50),
  token_usage INT,
  create_time TIMESTAMPTZ DEFAULT now()
);
2.3.3 补充表（灵感 / 技巧 / 角色视觉）
sql
-- 灵感点表（非线性创作核心）
CREATE TABLE inspiration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novel(id),
  content TEXT,
  category VARCHAR(50) DEFAULT 'idea',
  embedding vector(1536),
  status VARCHAR(20) DEFAULT 'pending',
  create_time TIMESTAMPTZ DEFAULT now()
);

-- 写作技巧配置表
CREATE TABLE writing_skill (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novel(id),
  skill_type VARCHAR(50),
  apply_chapter INT,
  status VARCHAR(20) DEFAULT 'applied',
  create_time TIMESTAMPTZ DEFAULT now()
);

-- 角色AI立绘/图片资源表
CREATE TABLE character_image (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novel(id),
  character_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  style VARCHAR(50) DEFAULT 'chinese_anime',
  pose VARCHAR(50) DEFAULT 'normal',
  is_primary BOOLEAN DEFAULT false,
  embedding vector(1536),
  create_time TIMESTAMPTZ DEFAULT now(),
  update_time TIMESTAMPTZ DEFAULT now()
);

-- 世界观场景/道具图片表
CREATE TABLE world_visual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novel(id),
  category VARCHAR(50),
  name VARCHAR(100),
  content TEXT,
  image_url TEXT,
  create_time TIMESTAMPTZ DEFAULT now()
);
2.4 事件驱动架构
章节发布为 published 时，异步触发：
Summarize Agent 生成摘要并向量化
Emotion Agent 更新情绪曲线
Foreshadow Agent 检测伏笔埋收
Vector Embedding 更新
爆款分析数据采集
Image Agent 预生成核心角色立绘（可选）
2.5 向量检索分层策略
表格
向量类型	表	用途
Lore Embedding	lore	世界观设定召回
Summary Embedding	memory_summary	近期剧情关联
Character Embedding	lore (character 类)	人物记忆
Style Embedding	novel.author_style_prompt	文风约束
Character Image Embedding	character_image	角色形象一致性
2.6 核心 API 约定
接口 RESTful，路径如/api/novels/{novelId}/chapters
AI 流式生成用Flux<ServerSentEvent<String>>返回 SSE
文件 / 图片上传返回完整 URL
角色立绘 API：/api/novels/{novelId}/characters/{characterId}/generate-image
3. 前端架构与 UI 布局
3.1 技术栈
框架：Next.js (React)/Vue 3
样式：TailwindCSS + Shadcn/UI
富文本编辑器：TipTap/Novel.js
状态管理：Zustand/Pinia
流式请求：@microsoft/fetch-event-source/Vercel AI SDK
3.2 三栏沉浸式工作台（2:6:2，可折叠）
3.2.1 左侧栏（设定导航区）
章节目录树（拖拽排序、跳转）
LoreCards（CRUD、搜索、向量关联、生成立绘按钮）
3.2.2 中栏（核心编辑器）
章节标题、字数、保存状态
无干扰富文本编辑
/ai唤醒行间扩写
划选文本：润色 / 扩写 / 重写 / 检查 OOC
3.2.3 右侧栏（AI 副驾与衍生区）
AI 伴写聊天（切换人格）
IP 衍生流（一键转短剧 / 漫剧 /角色立绘生成）
世界状态仪表盘、情绪热力图、人物关系图谱
角色立绘库（查看 / 下载 / 复用）
3.3 新增可视化组件
AI 剧情树（树形展示主线 / 支线 / 伏笔）
世界状态仪表盘（势力 / 稳定度 / 通缉度动态刷新）
人物关系图谱（力导向图，关系强度可视化）
情绪曲线可视化（折线图 / 热力图）
AI Prompt Inspector（开发者调试）
角色立绘预览卡片（多姿态 / 多风格展示）
3.4 状态管理规范
全局状态：用户 / 小说 / 章节 / 角色立绘缓存
AI 生成状态：loading/streaming/abort
图片生成状态：generating/success/failed
实时更新：SSE/WebSocket 推送
4. AI 核心工作流
4.1 基础 API 配置
yaml
spring:
  ai:
    openai:
      api-key: ${AI_API_KEY}
      base-url: ${AI_BASE_URL:https://api.deepseek.com/v1}
      chat:
        options:
          model: deepseek-chat
          temperature: 0.7
统一封装 AiService：call (同步)、streamCall (流式 SSE)
4.2 标准工作流
Workflow 1：短画面扩写正文
触发：/ai+ 短画面描述逻辑：文风克隆→近期记忆→实体检索→流式生成
Workflow 2：后台静默记忆提取
触发：章节发布逻辑：生成 200 字摘要→存入 memory_summary→生成向量
Workflow 3：短剧 / 漫剧衍生
触发：一键转短剧逻辑：提取核心冲突→3 秒高能钩子→结构化脚本→分镜预览→调用角色立绘
Workflow 4：章节生成前计划阶段
触发：续写下一章逻辑：生成章节目标 / 冲突 / 情绪 / 伏笔→用户确认→生成正文
Workflow 5：章节结束后自动分析
触发：章节发布输出：情绪值、冲突强度、伏笔统计、角色成长、风险提示
Workflow 6：AI 责编系统
触发：审稿 / 定时检查检测：节奏拖沓、爽点不足、OOC、规则冲突、水文、伏笔遗忘
Workflow 7：AI 角色立绘生成
触发：角色设定→生成立绘逻辑：提取人设→组装文生图 Prompt→生成图片→存入 OSS→保存数据库
5. 多 Agent 协同系统
5.1 Agent 总控架构
plaintext
Master Orchestrator（总控）
├── Story Planner Agent（剧情规划）
├── Character Agent（角色一致性）
├── World Agent（世界规则）
├── Emotion Agent（情绪节奏）
├── Foreshadow Agent（伏笔管理）
├── Editor Agent（文风润色）
├── Screenplay Agent（短剧改编）
├── Memory Agent（长期记忆）
├── Writing Skill Agent（写作技巧落地）
└── Image Agent（角色立绘/视觉生成）
5.2 核心协同流程
章节生成 7 步流程
Master 接收指令
Story Planner 生成本章计划
Emotion Agent 校验情绪目标
Character Agent 约束角色行为
World Agent 补充世界规则
大模型生成正文
Editor 润色 + Foreshadow 更新伏笔
章节发布后流程
Memory 生成摘要→Emotion 计算情绪→Foreshadow 更新伏笔→Story Planner 更新剧情弧→Image Agent 预生成角色图
视觉生成流程
Master 调度→Image Agent 读取 Lore→生成立绘→存入数据库→IP 工厂复用
6. Prompt 工程与对话式引导系统
6.1 Prompt 分层架构
plaintext
System Prompt
├── Persona Layer（AI身份）
├── Style Layer（文风/节奏）
├── World Layer（世界观）
├── Character Layer（角色状态）
├── Memory Layer（近期剧情）
├── Plot Layer（剧情目标）
├── Emotion Layer（情绪要求）
└── Output Constraint Layer（格式/禁忌）
6.2 Token 预算器（8K 上下文）
表格
模块	占比	说明
世界规则	15%	核心 Lore
角色状态	15%	出场角色状态
近期剧情	30%	近 3-5 章摘要
当前目标	20%	章节计划 + 情绪
风格控制	10%	文风约束
安全冗余	10%	防止超限
6.3 对话式引导引擎
核心状态机：创作阶段、目标、已答 / 未答问题、作者状态
AI 动态适配：灵感爆发 / 卡文 / 世界观混乱 / 新手 / 老作者
引导模式：轻陪伴 / 结构引导 / 保姆式
人格切换：编辑型 / 搭子型 / 热血型 / 军师型 / 毒舌型
7. 叙事引擎详细设计
7.1 长期剧情规划引擎
数据结构：plot_arc（卷名、起止章节、情绪目标、核心冲突、高潮）
阶段控制：铺垫期 / 爆发期 / 低谷期 / 高潮期，自动调整生成参数
7.2 情绪节奏引擎
数据：tension/satisfaction/mystery/despair/warmth
检测规则：爽点过密、连续压抑、缺乏冲突自动预警
前端：情绪热力图
7.3 世界动态演化系统
world_event 表：势力、触发条件、事件内容、全局影响
自动触发：满足条件插入事件，融入下一章 Prompt
7.4 角色成长弧系统
character_arc：初始信念、恐惧、欲望、转变、最终状态
OOC 检测：生成前 / 审稿校验，输出偏离警告
8. IP 工厂：小说→短剧 / 漫剧全链路衍生
8.1 衍生管线
章节正文→短剧脚本→镜头拆分→AI 角色立绘 / 场景图→AI 配音→合成竖屏短剧 / 动态漫
8.2 AI 导演模式
支持：竖屏短剧 / 日漫风 / 国漫风 / 悬疑镜头，强制 3 秒高能钩子
8.3 爆款分析系统
数据采集：追读率、完读率、评论情感
策略库：情绪曲线、爽点方式、高潮频率
闭环反馈：自动调整后续章节生成参数
9. AI 角色立绘与世界观视觉生成模块
9.1 功能定位
基于小说 Lore 角色 / 世界观设定，一键生成统一风格、永不 OOC 的角色立绘 / 场景图 / 道具图，支撑 IP 工业化视觉衍生。
9.2 核心能力
角色立绘生成：主角 / 配角 / 反派 / 灵兽自动生成
形象一致性锁死：同一角色多姿态 / 多场景外貌统一
多风格支持：国漫 / 日漫 / 古风 / 写实 / 二次元
场景 / 道具生成：宗门、城池、法宝、徽章
立绘库管理：分类存储、下载、复用、设为封面
IP 联动：短剧 / 漫剧自动调用对应立绘
9.3 Image Agent 职责
读取 Lore 角色 / 世界观设定
组装文生图 Prompt，锁定外貌 / 服饰 / 气质
调用图像模型生成图片
形象一致性校验，杜绝 OOC
上传 OSS 并写入 character_image 表
9.4 角色立绘生成工作流
作者在 Lore 填写角色完整设定
点击「生成立绘」触发 Image Agent
提取人设→生成风格化 Prompt→调用图像模型
图片上传 OSS→写入数据库→前端预览
自动同步至 IP 工厂，短剧 / 漫剧直接复用
9.5 形象一致性保障
角色形象向量锁死：首次生成后固定 embedding
固定特征 Prompt：发色、瞳色、标志性装饰不改变
全书风格统一：禁止混搭画风
OOC 视觉检测：自动对比原设定，剔除不符图片
10. 结构化创作工作流
10.1 核心设计
互补 AI 引导，提供步骤化、可回退、带模板的创作流程，适配新人 / 工作室。
10.2 标准从零开始流程
Step1：定基调（情绪 / 篇幅 / 参考）Step2：核心钩子（Logline 模板，AI 优化）Step3：主角画像（性格 / 欲望 / 成长弧）Step4：世界观框架（类型 / 规则 / 初始场景）Step5：初期大纲（3 幕 / 5 幕式，拖拽调整）Step6：第一章直通车（3 个开篇方向，直接生成）
10.3 预置快捷工作流
拆书模仿工作流
灵感扩写工作流
爆款套路工作流
11. 网文写作技巧 AI 落地模块
11.1 核心技巧 AI 化实现
表格
写作技巧	AI 实现方式	应用场景
倒叙开篇	先结局→回溯，强制叙事顺序	开篇 / 转折
制造悬念	隐藏信息、抛问题、提升 mystery 值	断章 / 剧情转折
比喻 / 修辞	题材专属修辞库，文风层注入	场景 / 心理描写
冲突制造	每章强制小冲突，触发连锁事件	正文推进
细节描写	补充感官细节，拒绝空泛	动作 / 情绪刻画
视角聚焦	单章锁定主视角，检测预警	全文统一
爽点制造	压抑→反转→释放三段式	高潮 / 打脸
11.2 Writing Skill Agent
职责：调度技巧、校验应用效果、优化生硬表达
工作流：选择技巧→注入 Prompt→生成→校验→优化
12. 去 AI 味・文风保真系统
12.1 核心逻辑
用作者结构化设定锁死 AI 边界，AI 仅填充细节，不自主创作引导式链路：世界观→剧情弧→章节计划→细节情节，是去 AI 味最优解。
12.2 技术方案
Prompt 强约束：禁用 AI 自主创造设定，所有元素来自 Lore / 记忆库
文风深度克隆：3000 字原创文本生成风格向量，精细滑条控制
人类化优化：剔除 AI 模板词，补充生活化细节
Token 分配：70% 用于作者设定，30% 用于生成
12.3 前端功能
文风相似度检测
去 AI 味一键优化
13. 非线性灵感创作系统
13.1 核心设计
完整保留原始理念：作者灵感是点状，非线性冒出，支持从任意灵感点发散、完善、拼接。
13.2 系统架构
plaintext
非线性灵感系统
├── 灵感点速记（文字/关键词/片段）
├── 灵感点向量检索（关联现有设定）
├── 灵感点自动扩写（角色/剧情/世界观）
├── 灵感点自由拼接（拖拽生成剧情树）
├── 灵感点→章节一键转化
13.3 核心工作流
录入点状灵感
AI 关联检索现有设定
提供 3 个完善方向
拖拽到剧情树任意位置
一键生成章节情节
14. 连载运营增强模块
14.1 章节末钩子生成器
自动生成 3 类断章钩子：悬念型 / 冲突型 / 爽点卡点型
14.2 平台适配模块
内置起点 / 番茄 / 晋江规则，自动调整字数、排版、节奏
14.3 读者互动闭环
评论情感分析→剧情调整
读者投票选分支
断更自动生成前情提要
15. 写作实操检测增强模块
15.1 三维度核心检测
视角检测：单章切换≤2 次，预警违规
对白检测：校验是否推动剧情 / 塑人设，剔除无效对白
战力检测：预设模板，预警升级过快 / 崩坏
15.2 新手避坑 Agent
工作流每步提示禁忌，自动检测水文、套路、节奏问题，给出优化建议
16. 核心疑问官方解答
疑问 1：AI 能否正确应用倒叙、悬念、比喻等写作技巧？
完全可以。通过 Writing Skill Agent+Prompt 分层强制规则，技巧可精准、自然落地，无生硬感。
疑问 2：引导式创作是去 AI 味最优解？
是。从世界大纲→章节计划→具体情节的逐层收敛，锁死 AI 创作边界，配合文风克隆，100% 贴合作者风格。
疑问 3：是否保留「点状灵感非线性创作」原始理念？
完整保留。非线性灵感系统支持灵感速记、关联、拼接、转化，无任何线性强制。
疑问 4：是否保留 AI 生成人物角色图片功能？
完整保留并工业化落地。包含独立 Image Agent、专属数据表、前端立绘库、IP 工厂联动、形象一致性保障，作者仅需输入文字设定，即可自动生成统一角色立绘。

```

```
## 3. 当前优势
- 长文本动态记忆（RAG + Summary）
- 创作引导人格（非纯代写）
- 工作流式创作
- 编辑器 AI 副驾体系
- 小说→短剧衍生能力
- 风格滑条控制
- 黄金账本/状态机意识

## 4. 本次 增强重点
1. 长期剧情规划引擎（防止中后期崩盘）
2. 情绪节奏引擎（爽点密度工业化）
3. 世界动态演化系统（世界自己运转）
4. 角色成长弧系统（OOC 检测）
5. 多 Agent 协同架构（稳定性倍增）
6. Prompt 工程分层与 Token 预算器
7. 对话式引导系统全面升级（多人格、状态机、心理陪伴）
8. IP 工厂链路化（短剧→分镜→配音）

## 5. 目标
作者登录后，不是面对一个空白文本框，而是拥有一整个 AI 编辑团队辅助的沉浸式创作工作站。
```



------

# 文档 2：01-Backend-Arch.md

```
# 后端架构与数据库设计

## 1. 技术栈
- **框架**：SpringBoot 3 (JDK 17+)
- **数据库**：PostgreSQL 15+（必须启用 `pgvector` 扩展）
- **ORM**：MyBatis Plus (`mybatis-plus-spring-boot3-starter`)
- **缓存/鉴权**：Redis + Spring Security + JWT
- **API 文档**：Springdoc OpenAPI (Swagger 3)
- **AI 接入**：Spring AI (`spring-ai-openai-spring-boot-starter`)，兼容 OpenAI 接口
- **文件存储**：MinIO 或阿里云 OSS
- **消息队列**（可选）：RabbitMQ 或 Kafka（用于章节发布后的异步事件）

## 2. 安全规范
- 全局 CORS 配置
- JWT 拦截器：除 `/api/auth/login` 外所有请求需携带 `Authorization: Bearer <token>`
- 数据行级隔离：所有 SQL 必须带上 `user_id` 过滤，A 用户无法访问 B 用户数据
- 统一返回结构：
```json
{
  "code": 200,
  "message": "success",
  "data": {...}
}
```

## 3. 核心数据表（扩展版）

> 所有表使用 UUID 主键，包含 `create_time`、`update_time`。

### 3.1 基础表（保留）

- **user**：`id`, `username`, `password`, `avatar`, `role`
- **novel**：`id`, `user_id`, `title`, `global_outline`, `author_style_prompt`
- **chapter**：`id`, `novel_id`, `chapter_number`, `title`, `content`, `word_count`, `status`
- **lore**：`id`, `novel_id`, `category`, `name`, `content`, `embedding` (vector)
- **memory_summary**：`id`, `novel_id`, `chapter_id`, `summary_content`, `embedding` (vector)
- **story_state**：`id`, `novel_id`, `current_timeline`, `key_events`, `protagonist_status`

### 3.2 新增表（v5.0）

sql

```
-- 伏笔池
CREATE TABLE foreshadowing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novel(id),
  setup_chapter INT,
  payoff_chapter INT,
  content TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  importance INT DEFAULT 1,
  create_time TIMESTAMPTZ DEFAULT now(),
  update_time TIMESTAMPTZ DEFAULT now()
);

-- 人物关系动态数值
CREATE TABLE character_relationship (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novel(id),
  character_a UUID NOT NULL,
  character_b UUID NOT NULL,
  trust_value INT DEFAULT 50,
  hatred_value INT DEFAULT 0,
  intimacy_value INT DEFAULT 0,
  fear_value INT DEFAULT 0,
  create_time TIMESTAMPTZ DEFAULT now(),
  update_time TIMESTAMPTZ DEFAULT now()
);

-- 情绪曲线
CREATE TABLE emotion_curve (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novel(id),
  chapter_id UUID NOT NULL REFERENCES chapter(id),
  tension INT,
  satisfaction INT,
  mystery INT,
  despair INT,
  warmth INT,
  create_time TIMESTAMPTZ DEFAULT now(),
  update_time TIMESTAMPTZ DEFAULT now()
);

-- AI 生成日志（用于 Debug 和 Prompt 进化）
CREATE TABLE ai_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL,
  chapter_id UUID,
  prompt_snapshot TEXT,
  response_snapshot TEXT,
  model_name VARCHAR(50),
  token_usage INT,
  create_time TIMESTAMPTZ DEFAULT now()
);
```



## 4. 事件驱动架构

章节状态变为 `published` 时，异步触发以下任务（建议使用 Spring Event 或 RabbitMQ）：

- Summarize Agent（生成摘要并向量化）
- Emotion Agent（更新 `emotion_curve` 表）
- Foreshadow Agent（检测伏笔埋设与回收）
- Vector Embedding 更新（lore / memory_summary）
- 爆款分析数据采集

## 5. 向量检索分层策略

通过 `pgvector` 实现，根据场景使用不同的向量表：

| 向量类型            | 表                                   | 用途           |
| :------------------ | :----------------------------------- | :------------- |
| Lore Embedding      | lore                                 | 世界观设定召回 |
| Summary Embedding   | memory_summary                       | 近期剧情关联   |
| Character Embedding | （暂存于 lore 中 character 类）      | 人物记忆       |
| Style Embedding     | novel.author_style_prompt 生成的缓存 | 文风约束       |

## 6. 核心 API 约定

- 所有接口 RESTful，路径如 `/api/novels/{novelId}/chapters`
- AI 流式生成使用 `Flux<ServerSentEvent<String>>` 返回 SSE
- 文件上传返回完整 URL（OSS/CDN）

```
---

# 文档 3：02-Frontend-Arch.md

```markdown
# 前端架构与 UI 布局

## 1. 技术栈
- **框架**：Next.js (React) 或 Vue 3（根据团队选型）
- **样式**：TailwindCSS + Shadcn/UI
- **富文本编辑器**：TipTap 或 Novel.js（支持 Markdown 与扩展卡片）
- **状态管理**：Zustand (React) / Pinia (Vue)
- **流式请求**：必须使用 `@microsoft/fetch-event-source` 或 Vercel AI SDK 处理 SSE，实现打字机效果并支持 Abort

## 2. 三栏沉浸式工作台布局
比例大致为 2:6:2，左右侧栏可折叠。

### 2.1 左侧栏（设定导航区）
- 切换 Tab：章节目录树 / 设定集 (LoreCards)
- 章节目录树：支持拖拽排序、点击跳转
- LoreCards：CRUD 列表，支持搜索和向量关联查看

### 2.2 中栏（核心编辑器）
- 顶部：当前章节标题、字数统计、保存状态
- 主体：无干扰富文本编辑区
- 行间 AI 指令：输入 `/ai` 唤醒 AI 输入框（短画面扩写）
- 悬浮菜单：划选文本后弹出“润色 / 扩写 / 重写 / 检查 OOC”

### 2.3 右侧栏（AI 副驾与衍生区）
- Tab 1：**AI 伴写聊天**（上下文感知对话，可切换 AI 人格）
- Tab 2：**IP 衍生流**（一键转短剧、漫剧、查看分镜/立绘）
- 可扩展：世界状态仪表盘、情绪热力图、人物关系图谱、Prompt Inspector

## 3. 新增可视化组件
### 3.1 AI 剧情树
- 以树形结构展示主线、支线、伏笔线
- 节点可点击编辑，拖拽关联章节
- 颜色标记各剧情阶段

### 3.2 世界状态仪表盘
- 数值化显示宗门势力、皇朝稳定度、主角通缉度等
- 随时间/事件动态刷新

### 3.3 人物关系图谱
- 力导向图展示人物节点，边粗细表示关系强度
- 支持点击查看详情和修改关系数值

### 3.4 情绪曲线可视化
- 折线图/热力图，横轴章节，纵轴情绪值
- 辅助作者判断爽点分布

### 3.5 AI Prompt Inspector（开发者模式）
- 弹窗展示当前会话的完整 Prompt、Token 分配、召回的记忆/Lore
- 允许高级用户调试和优化

## 4. 状态管理规范
- 全局状态：当前用户、当前小说、当前章节
- AI 生成状态：loading / streaming / abort
- 右侧栏对话历史、上下文快照
- 所有实时更新通过 SSE 或 WebSocket 推送
```



------

# 文档 4：03-AI-Core-Workflows.md

markdown

```
# AI 核心工作流

## 0. 基础 API 配置
Spring AI 配置示例：
```yaml
spring:
  ai:
    openai:
      api-key: ${AI_API_KEY}
      base-url: ${AI_BASE_URL:https://api.deepseek.com/v1}
      chat:
        options:
          model: deepseek-chat
          temperature: 0.7
```

统一封装 `AiService`：

- `String call(String prompt)` — 用于后台同步任务（摘要生成）
- `Flux<String> streamCall(String prompt)` — 用于前台 SSE 流式输出

------

## Workflow 1：短画面扩写正文（Scene-to-Chapter）

**触发**：用户在编辑器中输入 `/ai` + 短画面描述

**后端组装 Prompt 逻辑**：

1. System = `novel.author_style_prompt`（文风克隆）
2. 短期记忆 = 最近 3 章的 `memory_summary.summary_content`（拼接）
3. 实体检索 = 用 `pgvector` 查询用户输入相关的 Lore（向量相似度 > 0.8）
4. 组装 User Prompt：

```
背景设定：
{实体详情}

之前剧情：
{最近3章摘要}

请将以下短画面扩写为约1500字的小说正文，注意保持文风一致：
{用户输入}
```



1. 通过 `streamCall` 返回 SSE 打字机流给前端

------

## Workflow 2：后台静默记忆提取

**触发**：章节状态变为 `published`（异步）

**逻辑**：

1. 提取当前章全文
2. 调用 `call` 方法，User Prompt：

text

```
作为小说分析师，请将以下章节总结为不超过200字的客观剧情摘要。
必须包含：登场关键人物的动作、核心冲突结果、获得的物品或境界变化。

正文：
{全文}
```

1. 保存结果到 `memory_summary` 表，并为 `summary_content` 生成向量写入 `embedding` 字段

------

## Workflow 3：短剧/漫剧衍生

**触发**：右侧栏“一键转短剧”按钮

**Prompt**：

text

```
你是专业竖屏短剧编剧。请提取以下小说的核心冲突，重构为短剧剧本。
要求：
- 前3秒高能钩子
- 严格按照 [内/外景] - [角色] - [动作] - [台词] 格式
- 每集8-15个镜头

正文：
{当前章节全文}
```



结果解析为结构化 JSON 返回前端，支持分镜预览。

------

## Workflow 4：章节生成前计划阶段（新增）

**触发**：用户请求 AI 续写下一章

**流程**：

1. AI 先输出：
   - 本章目标（推进哪条线）
   - 核心冲突
   - 预期情绪（爽点/压抑/揭秘）
   - 计划埋设的伏笔
2. 用户确认或修改
3. AI 正式生成正文（复用 Workflow 1）

**目的**：防止 AI 自由发挥导致剧情偏离主线。

------

## Workflow 5：章节结束后自动分析（新增）

**触发**：章节发布后

**输出示例**：

text

```
📊 本章分析
情绪值：78 (上一章 62)
冲突强度：84
伏笔新增：2
伏笔回收：1（玉佩异动）
角色成长：女主黑化进度 +12%
潜在风险：连续3章未提及皇城主线
```



数据存入 `emotion_curve` 表，并可在前端展示。

------

## Workflow 6：AI 责编系统（新增）

**触发**：用户请求“审稿”或自动定时检查

**检测项**：

- 节奏拖沓（连续3章无有效冲突）
- 爽点不足（连续4章无明确爽点事件）
- 角色 OOC（基于 `character_arc` 检测）
- 世界规则冲突（事件与 Lore 矛盾）
- 重复套路（与前文相似度过高）
- 水文风险（对白占比 > 70%）
- 伏笔遗忘（超过10章未回收的高权重伏笔）

输出报告，并提供修改建议。

```
---

# 文档 5：04-Agent-System.md

```markdown
# 多 Agent 协同系统

## 1. Agent 总控架构
Master Orchestrator（总控）
│
├── Story Planner Agent（剧情规划）
├── Character Agent（角色一致性）
├── World Agent（世界规则）
├── Emotion Agent（情绪节奏）
├── Foreshadow Agent（伏笔管理）
├── Editor Agent（文风润色）
├── Screenplay Agent（短剧改编）
└── Memory Agent（长期记忆）
```

text

```
## 2. Agent 职责表
| Agent | 职责 | 输入 | 输出 |
|-------|------|------|------|
| Master Orchestrator | 接收用户意图，拆解任务，调度其他 Agent | 用户消息 + 上下文快照 | 任务指令 |
| Story Planner | 规划章节目标、冲突、剧情走向 | 大纲 + 最近摘要 | 本章计划 JSON |
| Character Agent | 检查角色行为一致性、成长弧推进 | 角色设定 + 拟生成文本 | OOC 警告/调整建议 |
| World Agent | 校验事件是否符合世界观规则 | 世界设定 + 事件描述 | 冲突提示/连锁事件 |
| Emotion Agent | 分析当前情绪曲线，建议情绪调整 | 历史情绪数据 + 本章计划 | 情绪目标值 |
| Foreshadow Agent | 管理伏笔埋设与回收，避免遗忘 | 伏笔池 + 新章节文本 | 伏笔状态更新 |
| Editor Agent | 润色文风、调整节奏、消除语病 | 生成文本 | 润色后文本 |
| Screenplay Agent | 将章节转为短剧/漫剧脚本 | 章节全文 | 分镜脚本 |
| Memory Agent | 生成摘要、更新向量、管理记忆召回 | 新章节全文 | 摘要 + 向量 |

## 3. 章节生成协同流程（标准 7 步）
1. **Master Orchestrator** 接收“续写下一章”指令
2. **Story Planner** 生成本章计划（目标/冲突/情绪/伏笔）
3. **Emotion Agent** 校验并调整情绪目标
4. **Character Agent** 检查当前状态下角色行为边界
5. **World Agent** 根据近期世界事件补充背景约束
6. **Writer（或调用大模型）** 根据所有约束生成正文
7. **Editor Agent** 润色，**Foreshadow Agent** 更新伏笔状态

## 4. 章节发布后协同流程
- **Memory Agent** 生成摘要 → 写入 memory_summary → 生成向量
- **Emotion Agent** 计算章节情绪值 → 写入 emotion_curve
- **Foreshadow Agent** 自动检测伏笔回收 → 更新 foreshadowing.status
- **Story Planner** 更新 plot_arc 进度

## 5. AI 责编分析时的 Agent 协作
当用户点击“审稿”时，Master Orchestrator 调度：
- Character Agent 检查 OOC
- World Agent 检查规则冲突
- Emotion Agent 检查情绪节奏
- Foreshadow Agent 检查伏笔健康度
- 汇总生成审稿报告
```

------

# 文档 6：05-Prompt-Engineering.md

```
# Prompt 工程与对话式引导系统

## 1. Prompt 分层架构
System Prompt
├── Persona Layer // AI 身份（如资深编辑·军师型）
├── Style Layer // 句长、对话密度、节奏、文风
├── World Layer // 当前相关世界观设定
├── Character Layer // 场景中出场角色的状态
├── Memory Layer // 最近剧情摘要 + 相关记忆
├── Plot Layer // 本章目标、当前剧情阶段
├── Emotion Layer // 预期情绪目标
└── Output Constraint Layer // 字数、格式、禁止项
```

```
## 2. Token 预算器
每次组装 Prompt 时动态分配 Token（以 8K 上下文为例）：
| 模块 | 预算占比 | 说明 |
|------|----------|------|
| 世界规则 | 15% | 必须的 Lore 设定 |
| 角色状态 | 15% | 出场角色最近状态 |
| 近期剧情 | 30% | 最近3-5章摘要 |
| 当前目标 | 20% | 本章计划 + 情绪要求 |
| 风格控制 | 10% | 文风、人称、禁忌 |
| 安全冗余 | 10% | 预留避免超限 |

实现：后端根据 `ai_generation_log` 统计各模块历史消耗，动态裁剪。

## 3. 对话式引导引擎（Narrative Conversation Engine）
**核心状态机**：
```json
{
  "current_phase": "world_building",  // 创作阶段
  "current_goal": "define_magic_system",
  "answered_questions": ["protagonist_motivation", "core_conflict"],
  "unresolved_questions": ["villain_goal"],
  "user_emotion": "frustrated",       // 焦虑/灵感爆发/卡文
  "creativity_level": "high",
  "guidance_depth": "structure_guided" // 轻陪伴/结构引导/保姆式
}
```

## 4. AI 根据作者状态动态调整策略

| 作者状态   | AI 行为                          |
| :--------- | :------------------------------- |
| 灵感爆发   | 少限制，多接住，快速推进         |
| 卡文       | 提供3个分支方案，附带示例开篇    |
| 世界观混乱 | 强结构化引导，回到 Lore 表格填空 |
| 情绪低     | 多鼓励，指出优点，降低压力       |
| 新手作者   | 每步给出模板，解释网文规律       |
| 老作者     | 少教学，直接讨论结构和技巧       |

## 5. 引导深度模式

- **轻陪伴模式**：仅在作者主动提问时回应，风格简练
- **结构引导模式**：主动指出缺失的结构元素（如缺少阶段性反派）
- **保姆式创作模式**：拆解到单句级引导，如“现在只解决第一章最后一句”

## 6. 创作者心理陪伴设计原则

- 避免空洞鼓励，要具体指出进步（如“上一章对话的情绪控制更成熟了”）
- 在长时间连续写作后提醒休息、整理伏笔池
- 提供进度追踪：“今日目标2000字，已完成1400字”

## 7. AI 主动推进创作的触发条件

- 检测到女主超过10章无高光时刻
- 主线反派连续5章未施加压力
- 爽点密度连续下降
- 伏笔超期未回收

触发后 AI 主动发送建议（右侧栏消息形式）。

## 8. 对话人格切换

| 人格   | 风格描述                   |
| :----- | :------------------------- |
| 编辑型 | 冷静专业，直接指出问题     |
| 搭子型 | 陪伴感强，多用“咱们”       |
| 热血型 | 情绪感染力强，经常用感叹号 |
| 军师型 | 擅长布局，提供策略性建议   |
| 毒舌型 | 犀利批判，但一针见血       |

用户可在右侧栏设置中切换，影响 Persona Layer 的 Prompt 片段。

text

```
---

# 文档 7：06-Narrative-Engines.md

```markdown
# 叙事引擎详细设计

## 1. 长期剧情规划引擎
### 数据结构 plot_arc
```json
{
  "id": "uuid",
  "novel_id": "uuid",
  "arc_name": "皇城篇",
  "start_chapter": 50,
  "end_chapter": 120,
  "emotional_target": "压抑→爆发→真相",
  "core_conflict": "皇权之争",
  "villain_goal": "篡位",
  "protagonist_growth": "从逃避到承担",
  "climax_event": "太庙对峙",
  "resolution_type": "新皇登基，主角隐退"
}
```

### 阶段控制器

生成章节前判断当前卷的进度，自动调整生成参数：

- 铺垫期：伏笔密度+30%，冲突密度降低
- 爆发期：句长缩短，动作描写增加，反转频率提高
- 低谷期：心理描写和感官细节加强
- 高潮期：连续小反转，每500字一个小爆点

## 2. 情绪节奏引擎

### emotion_curve 数据

每章一条记录，字段：tension, satisfaction, mystery, despair, warmth

### 检测规则（示例）

- 爽点过密：连续3章 satisfaction>85 → 建议插入过渡章
- 连续压抑：连续4章 tension>70 且 satisfaction<30 → 建议安排一次打脸/身份揭露
- 缺乏冲突：连续2章 tension<30 → 提示增加冲突或悬念

### 前端热力图

用颜色深浅表示各情绪维度，作者可直观看到哪些章情绪单一。

## 3. 世界动态演化系统

### world_event 表设计（可在后端代码中实现或单独建表）

json

```
{
  "id": "uuid",
  "novel_id": "uuid",
  "faction": "玄天宗",
  "trigger_condition": "protagonist_killed_elder",
  "event_content": "玄天宗发出追杀令，联合正道各派",
  "global_impact": "正魔势力平衡打破，黑市丹药价格翻倍",
  "timeline_position": "chapter_35_after"
}
```

章节发布后，World Agent 检查 `trigger_condition` 是否满足，自动插入待触发事件，下一章生成时作为背景加入 Prompt。

## 4. 角色成长弧系统

### character_arc 结构（可存储在 Lore 的扩展字段中）

json

```
{
  "character_id": "uuid",
  "initial_belief": "力量即正义",
  "false_belief": "只有变强才能保护所有人",
  "fear": "再次失去重要之人",
  "desire": "成为最强",
  "transformation": "明白守护比力量更重要",
  "final_state": "牺牲自己封印魔渊"
}
```

### OOC 检测

Character Agent 在生成前/审稿时检查角色行为是否偏离弧光阶段。
检测到偏离时输出警告：

text

```
⚠ 角色【萧寒】当前处于“冷血无情”阶段，但出现主动救人的行为。
建议增加：内心挣扎或外部利益驱动。
```

```
---

# 文档 8：07-IP-Factory.md

```markdown
# IP 工厂：从小说到短剧/漫剧的全链路衍生

## 1. 衍生管线
章节正文
↓
短剧脚本（Screenplay Agent）
↓
镜头拆分 + 分镜描述
↓
AI 生图（角色立绘/场景图）
↓
AI 配音台词（TTS）
↓
合成竖屏短剧/动态漫
```

text

```
## 2. AI 导演模式
用户在右侧栏选择风格：
- 竖屏短剧（默认）
- 日漫风（强调夸张表情和速度线）
- 国漫风（重意境和色彩）
- 悬疑镜头（特写/阴影/慢推）

转换 Prompt 示例（竖屏短剧）：
```

你是一位资深竖屏短剧导演。请将以下小说内容改编为拍摄脚本。
要求：

1. 前3秒必须有强冲突或悬念钩子
2. 格式：[镜头编号] [景别] [画面描述] [角色动作/台词]
3. 每集包含8-15个镜头
4. 重点突出表情特写和反转瞬间

text

```
## 3. 分镜与角色立绘生成
- 后台将分镜描述发送至图像生成服务（如 Stable Diffusion API）
- 根据 `lore` 中的角色设定生成统一形象的角色立绘
- 图片存入 OSS，返回 URL 在前端展示

## 4. 爆款分析系统
### 数据采集
- 如果平台有读者端，记录每章追读率、完读率、评论情感分析
- 对于外部发布的作品，允许作者手动标注订阅/追读数据

### 策略数据库
分析形成“爆款策略”：
- 哪一种情绪曲线模式带来最高追读
- 哪种打脸方式（身份揭露/实力碾压/智商压制）最有效
- 多少章一个小高潮用户留存最好

### 建议闭环
分析结果反馈到 **Story Planner Agent** 和 **Emotion Agent**，自动调整后续章节的建议参数，形成数据驱动的创作辅助。

## 5. 技术实现要点
- 图像生成建议异步任务，避免阻塞主流程
- 短剧脚本生成可复用现有 `streamCall` 或同步生成
- 爆款数据需要独立的数据仓库表，与创作表分离
- 前端展示分镜可用卡片滑动形式，支持手动微调
```

# 08-Creation-Workflows.md

```
# 结构化创作工作流（Creation Workflows）

## 1. 概述
与自由对话式的“AI 引导”互补，提供**步骤化、可回退、带模板**的小说创建流程。  
适合：喜欢明确路径的新人作者、需要快速搭建框架的工作室。

## 2. 工作流与 AI 引导的关系
- **AI 引导模式**：像编辑一样通过提问逐步引出设定，适合灵感发散。
- **工作流模式**：按固定顺序填写核心要素，AI 实时辅助填充、校验和优化。
- **切换方式**：在创作启动界面提供两个入口：
  - “🎙️ AI 编辑引导我”（进入对话状态机）
  - “📋 使用创作工作流”（进入分步向导）

## 3. 工作流步骤设计（标准“从零开始”路径）
Step 1: 定基调
├─ 目标情绪/爽点类型 (多选：打脸、升级、甜宠、烧脑、虐心…)
├─ 预期篇幅 (短篇/中长篇/超长篇)
└─ 参考作品 (可选，用于风格分析)

Step 2: 核心钩子 (Logline)
├─ 一句话梗概模板：【当____的____遇到____，他必须____】
└─ AI 自动生成 3 个优化版本供选择

Step 3: 主角画像
├─ 身份、表面性格、真实性格
├─ 核心欲望、恐惧、缺陷
└─ 成长弧光快速选择 (如：平凡→英雄、堕落→救赎)

Step 4: 世界观框架
├─ 世界类型 (东方玄幻/都市/科幻/架空历史…)
├─ 关键规则 (魔法/科技/社会结构)
└─ 初始场景 (故事开始的地点与氛围)

Step 5: 初期大纲
├─ AI 根据前 4 步自动生成 3 幕/5 幕式分阶段大纲
├─ 用户拖拽调整节点、添加/删除事件
└─ 支持手动输入章节要点

Step 6: 第一章直通车
├─ AI 基于大纲第一章要点，生成 3 个开篇方向 (倒叙、冲突、日常突变)
└─ 用户选择一个，直接生成第一章初稿（进入 Workflow 4 计划阶段）
```

```
## 4. 每个步骤的 AI 辅助
- 每一步右侧显示 AI 建议、范例或自动填充选项。
- 用户可随时点击“交给 AI 完成”自动填充当前步骤。
- 支持**回退修改**：修改前一步时，后续内容智能适配（如主角性格改变，大纲自动调整）。

## 5. 其他预置工作流
除“从零开始”，还可预置快捷工作流：

### 5.1 拆书模仿工作流
1. 输入模仿作品名称（或粘贴简介）
2. AI 分析该作品的节奏模板、人设公式、爽点分布
3. 映射到当前新书的相同结构位置
4. 生成适配新世界的节点大纲

### 5.2 灵感扩写工作流
1. 输入一个灵感段落（可来自碎片笔记）
2. AI 提取核心钩子、潜在冲突、人物种子
3. 补全 Logline 和角色设定
4. 建议 3 个可能的故事走向

### 5.3 爆款套路工作流
- 提供热门类型模板库（如“战神归来”、“退婚逆袭”、“无限流生存”）
- 作者选择模板，填写个性化变量（世界背景、主角特征）
- AI 套用模板生成定制化大纲和第一章

## 6. 工作流与 AI Agent 的集成
工作流产生的设定，会自动存入后端：
- **主角画像** → `lore` 表 (character 类)
- **世界观规则** → `lore` 表 (world_rule 类)
- **大纲** → `novel.global_outline` 和 `plot_arc` 表
- **风格参考** → `novel.author_style_prompt` 的初始版本

之后进入连载阶段时，所有 Agent（Story Planner、Character、World）都能直接读取这些结构化数据。

## 7. 前端实现要点
- 使用分步表单组件（Stepper），支持步骤指示器。
- 每步的数据保存至临时状态（Zustand/Pinia），最终一次性提交或分步保存。
- 与右侧栏 AI 聊天共存：用户在工作流某一步卡住时，可随时唤起对话询问细节。
- 进度条显示“基础搭建已完成 XX%”，给作者成就感。

## 8. 后端 API
- `POST /api/novels/workflow/start` - 创建工作流会话，返回 session_id
- `PUT /api/novels/workflow/{session_id}/step/{step_number}` - 保存某步数据
- `GET /api/novels/workflow/{session_id}/suggestions` - 获取 AI 对该步的建议
- `POST /api/novels/workflow/{session_id}/finalize` - 将所有步骤保存为正式 novel + 关联数据
```