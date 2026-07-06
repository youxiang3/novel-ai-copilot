# NovelAI Copilot 产品文档

## 1. 产品定位

**产品名称**：NovelAI Copilot，网文全链路 AI 创作副驾。

**一句话定位**：面向长篇连载作者和内容工作室的 AI 叙事操作系统，覆盖从新书开局、长篇创作、记忆管理、设定维护、章节扩写，到短剧、漫剧、互动剧情游戏和角色视觉衍生的完整 IP 生产链路。

**核心目标**：

- 降低作者从 0 到 1 开新书的难度。
- 解决长篇小说创作中的卡文、遗忘伏笔、人物 OOC、节奏崩坏问题。
- 通过动态记忆和设定库，让 AI 能稳定理解百万字级长篇上下文。
- 将小说正文进一步转化为短剧脚本、漫剧分镜、互动剧情游戏设定、角色立绘等 IP 资产。

## 2. 目标用户

### 2.1 个人网文作者

- 需要快速开新书、找钩子、写开篇。
- 经常卡在章节细节、转场、对白、节奏上。
- 希望 AI 辅助但不想完全代写。

### 2.2 连载型作者

- 需要维护长期世界观、人物关系、伏笔、剧情线。
- 需要稳定更新，降低断更风险。
- 需要章节发布后自动生成摘要、状态更新、伏笔提醒。

### 2.3 内容工作室

- 需要批量孵化小说 IP。
- 需要小说转短剧、漫剧、互动剧情游戏、角色立绘、分镜脚本。
- 需要流程化、可复用、可协同的生产系统。

## 3. 产品核心架构

产品整体由五个部分组成：

1. **创作工作台**：三栏式沉浸编辑器，包含章节、设定、灵感、正文编辑、AI 副驾。
2. **结构化开局向导**：通过问答式流程完成题材、情绪、钩子、主角、世界观、第一幕设计。
3. **AI 记忆与生成引擎**：文风克隆、动态记忆、Lore 召回、短画面扩写正文。
4. **多 Agent 协同系统**：摘要、情绪、伏笔、责编、角色一致性、短剧、图像等 Agent。
5. **Skill 工坊**：官方 Skill、用户私有 Skill、社区 Skill 市场，统一承载写作技巧、Prompt 模板和 Agent 工作流。
6. **IP Factory**：小说转短剧、漫剧分镜、互动剧情游戏、角色立绘、场景图、后续配音和视频资产。

### 3.1 Skill 工坊与原功能的关系

Skill 工坊不替代原有功能，而是原有能力的扩展层。

原有功能是平台官方提供的固定能力，例如：

- 问答式开局。
- 短画面扩写。
- 章节摘要。
- 短剧改编。
- 伏笔检查。
- OOC 检测。
- 写作技巧 Agent。
- 文风克隆。
- 去 AI 味。
- 角色立绘 Prompt。

Skill 工坊将这些能力抽象为可复用的官方 Skill，同时允许用户创建自己的 Skill，并允许社区上传、安装和二次改造。

产品层级建议：

- **底层 AI 能力**：大模型、RAG、记忆、Lore、文风、图像模型。
- **中层 Skill 执行器**：输入字段、Prompt 模板、上下文注入、模型调用、输出解析。
- **上层产品功能**：创作工作台、开局向导、编辑器 AI 菜单、右侧副驾、IP Factory、Skill 工坊。

设计原则：

- 新用户不必理解 Skill，也能直接使用官方核心功能。
- 高级用户可以把自己的 Prompt、套路、工作流沉淀为 Skill。
- 官方能力逐步 Skill 化，但仍保留明确入口。
- 社区 Skill 只能访问用户授权的数据，不能越权读取小说、设定或密钥。

## 4. 三大核心引擎

### 4.1 文笔克隆引擎

作者上传或粘贴过往原创文本，系统提取文风特征，生成专属 `author_style_prompt`。

需要提取的维度：

- 句式长短。
- 描写密度。
- 对白风格。
- 情绪表达方式。
- 节奏偏好。
- 常用修辞。
- 禁用词和不喜欢的 AI 腔表达。

输出：

- 作者文风 Prompt。
- 文风标签。
- 生成时的风格约束。
- 文风相似度检测结果。

### 4.2 动态分层记忆引擎

用于解决长篇小说上下文过长、AI 遗忘前文的问题。

记忆分层：

- **长期记忆**：全局大纲、世界观、人物设定、势力规则、核心伏笔。
- **中期记忆**：最近若干章的客观剧情摘要。
- **短期记忆**：当前章节正文、最近段落、用户本次输入。
- **实体记忆**：通过 Lore 和向量检索召回人物、地点、物品、势力。

Prompt 组装策略：

- 15% 世界规则。
- 15% 角色状态。
- 30% 近期剧情。
- 20% 当前目标。
- 10% 文风约束。
- 10% 安全冗余。

### 4.3 短画面转正文引擎

用户输入几句短画面，例如：

> 雨夜客栈里，黑衣人逼主角交出玉佩，玉佩突然与玄天剑残片共鸣。

系统自动结合：

- 作者文风。
- 最近章节摘要。
- 相关人物和道具设定。
- 当前章节状态。
- 情绪目标和伏笔状态。

输出 1000-2000 字小说正文，并以流式打字机效果返回。

## 5. 核心功能模块

### 5.1 问答式小说开头创造

用于从 0 到 1 创建新书开篇。

流程：

1. **题材与赛道**：玄幻、都市、悬疑、古言、无限流等。
2. **阅读情绪**：爽、虐、悬疑、宿命感、轻松、压抑后反杀等。
3. **核心钩子**：一句话卖点。
4. **主角画像**：身份、欲望、恐惧、秘密、成长弧。
5. **世界观框架**：规则、势力、禁忌、初始冲突。
6. **第一幕画面**：第一章从哪个具体场景切入。
7. **开篇方案生成**：给出 3 个开头方向。
8. **第一章生成**：生成章节标题、正文、章节摘要。
9. **自动沉淀资产**：生成主角 Lore、世界规则 Lore、后三章大纲、灵感点。

输出内容：

- 第一章正文。
- 第一章标题。
- 后三章推进。
- 核心设定卡。
- 开篇追读点分析。

### 5.2 章节编辑器

中栏为核心写作区。

能力：

- 章节标题编辑。
- 正文编辑。
- 字数统计。
- 草稿 / 已发布状态。
- 保存状态。
- `/ai` 唤醒短画面扩写。
- 选中文本后进行润色、扩写、重写、OOC 检查。

后续应接入 TipTap 或 Novel.js，支持更完善的富文本编辑体验。

### 5.3 章节目录

左侧章节目录树。

能力：

- 章节列表。
- 当前章节切换。
- 新建章节。
- 章节字数显示。
- 章节摘要预览。
- 拖拽排序。
- 发布章节。

### 5.4 Lore 设定库

用于维护世界观资产。

Lore 类型：

- 人物。
- 地点。
- 物品。
- 势力。
- 功法。
- 事件。
- 规则。

每个 Lore 包含：

- 名称。
- 分类。
- 内容描述。
- 标签。
- 向量 embedding。
- 可选角色立绘 Prompt。
- 关联章节。

能力：

- CRUD。
- 搜索。
- 向量召回。
- 生成角色立绘。
- 在 AI 生成时自动注入相关设定。

### 5.5 点状灵感系统

保留作者非线性创作的习惯。

能力：

- 快速记录灵感。
- 灵感分类。
- 灵感向量检索。
- 关联现有设定。
- AI 给出 3 个完善方向。
- 灵感拖拽到剧情树。
- 灵感一键转章节。

### 5.6 AI 伴写聊天

右侧 AI 副驾。

人格模式：

- 责编型：指出问题、节奏、逻辑、商业性。
- 军师型：规划剧情、伏笔、爽点和长期结构。
- 搭子型：陪伴式讨论，适合灵感发散。
- 毒舌型：犀利审稿。
- 热血型：鼓励推进。

能力：

- 读取当前章节。
- 读取近期摘要。
- 读取相关 Lore。
- 回答剧情设定问题。
- 给出下一段建议。
- 分析卡文原因。

### 5.7 Prompt Inspector

用于开发和高级作者调试 AI 输出。

展示内容：

- System Prompt。
- 文风层。
- 世界观层。
- 角色层。
- 近期记忆层。
- 当前指令。
- 实体召回结果。
- Token 预算。
- 模型参数。

### 5.8 IP 衍生工厂

将小说转化为其他内容形态。

能力：

- 一键转短剧脚本。
- 一键转漫剧分镜。
- 一键生成互动剧情游戏设定包。
- 一键生成文字冒险 / 剧情向小游戏原型脚本。
- 生成角色立绘 Prompt。
- 生成场景图 Prompt。
- 生成章节宣传文案。
- 后续接入配音、视频合成。

短剧格式要求：

- 前 3 秒高能钩子。
- 按 `[内/外景] - [角色] - [动作] - [台词]` 输出。
- 保留原著核心冲突。
- 强化反转和悬念。

互动剧情游戏格式要求：

- 保留原著核心世界观、主角动机和关键冲突。
- 输出游戏类型建议，例如文字冒险、互动叙事、AVG、剧情解谜或轻量 RPG。
- 拆分核心玩法循环：探索、选择、对话、事件触发、资源或好感度变化。
- 生成角色卡、场景卡、任务线、分支选择、失败 / 成功反馈。
- 输出可交给前端或游戏引擎继续实现的结构化 JSON 草案。

### 5.9 Skill 工坊

Skill 工坊用于让平台能力可扩展、可复用、可分享。

Skill 类型：

- **官方 Skill**：平台内置能力，例如短画面扩写、章节摘要、伏笔检查、OOC 检测、短剧改编。
- **私有 Skill**：用户自己创建，只能本人使用。
- **团队 Skill**：工作室内部共享。
- **社区 Skill**：用户发布到市场，其他用户可以安装、收藏、评分、评论、复制改造。

典型 Skill：

- 开篇 Skill：退婚流、重生流、雨夜追杀、尸案开局、爽点开局。
- 悬念 Skill：隐藏信息、埋问题、制造异常细节。
- 爽点 Skill：压抑、反转、释放、打脸。
- 对白 Skill：让对白推动剧情、塑造人物、制造冲突。
- 细节 Skill：补感官、动作、环境、心理。
- 节奏 Skill：加快推进、减少水文、强化转场。
- 伏笔 Skill：埋伏笔、回收伏笔、检查遗忘伏笔。
- 人设 Skill：检查 OOC、强化人物欲望、补成长弧。
- 文风 Skill：仿作者风格、去 AI 味、统一语气。
- 平台 Skill：番茄节奏、起点升级、晋江情感线、短剧强钩子。

Skill 基础字段：

- 名称。
- 分类。
- 描述。
- 适用场景。
- 输入字段。
- Prompt 模板。
- 输出格式。
- 可访问上下文范围。
- 示例输入。
- 示例输出。
- 可见性：私有、团队、公开。
- 状态：草稿、审核中、已发布、已下架。

Skill 执行流程：

1. 用户在编辑器、右侧副驾、IP Factory 或 Skill 工坊中选择 Skill。
2. 系统读取 Skill 的输入字段。
3. 用户填写输入，或系统自动注入当前章节、Lore、摘要、文风。
4. Skill 执行器合成 Prompt。
5. 调用大模型或图像模型。
6. 返回正文、建议、大纲、检测报告、脚本或视觉 Prompt。
7. 用户选择插入正文、保存为灵感、写入 Lore、生成新章节或发布到 IP Factory。

Skill 创建流程：

1. 用户进入“我的 Skills”。
2. 点击创建 Skill。
3. 填写基础信息。
4. 设计输入字段。
5. 编写 Prompt 模板。
6. 选择可访问上下文。
7. 配置输出格式。
8. 测试运行。
9. 保存为私有 Skill，或提交公开审核。

Skill 市场能力：

- 搜索。
- 分类筛选。
- 官方推荐。
- 收藏。
- 安装。
- 评分。
- 评论。
- 查看使用量。
- 查看版本记录。
- 复制为自己的 Skill。
- 举报和下架。

Skill 安全边界：

- 官方 Skill 和社区 Skill 视觉上明确区分。
- 社区 Skill 默认不能访问用户所有小说，只能访问用户本次授权的上下文。
- 禁止 Skill 读取 API Key、系统 Prompt、用户隐私字段。
- 公开 Skill 发布需要审核或自动风控。
- 支持举报、下架和版本回滚。
- Skill 运行前展示将要使用的上下文范围。

Skill 与已有功能映射：

| 原功能 | Skill 化之后 |
| --- | --- |
| 短画面扩写 | 官方 Skill：短画面扩写正文 |
| 开局向导 | 官方 Skill：新书开局生成器 |
| 短剧改编 | 官方 Skill：小说转短剧脚本 |
| 游戏生成 | 官方 Skill：小说转互动剧情游戏设定包 |
| 伏笔检查 | 官方 Skill：伏笔池检测 |
| 去 AI 味 | 官方 Skill：人类化润色 |
| 写作技巧 Agent | 一组 Skill：悬念、爽点、对白、细节、断章 |
| 用户自己的 Prompt | 私有 Skill |
| 社区创作套路 | 公共 Skill 市场 |

## 6. 多 Agent 协同系统

### 6.1 Agent 列表

- **Master Orchestrator**：总控调度。
- **Story Planner Agent**：剧情规划。
- **Character Agent**：角色一致性和 OOC 检查。
- **World Agent**：世界规则检查。
- **Emotion Agent**：情绪节奏分析。
- **Foreshadow Agent**：伏笔管理。
- **Editor Agent**：润色和审稿。
- **Screenplay Agent**：短剧改编。
- **Game Adaptation Agent**：互动剧情游戏改编。
- **Memory Agent**：章节摘要和长期记忆。
- **Writing Skill Agent**：写作技巧落地。
- **Image Agent**：角色立绘和视觉资产生成。

### 6.2 章节生成流程

1. 用户输入短画面或章节目标。
2. Master 接收任务。
3. Story Planner 生成本章计划。
4. Emotion Agent 设定情绪目标。
5. Character Agent 检查人物动机。
6. World Agent 补充世界规则。
7. Memory Agent 召回近期摘要。
8. Lore 检索相关设定。
9. 大模型生成正文。
10. Editor Agent 二次润色。
11. Foreshadow Agent 更新伏笔状态。

### 6.3 章节发布后流程

章节状态变为 `published` 后异步触发：

- 生成 200 字客观剧情摘要。
- 更新 memory_summary。
- 生成摘要 embedding。
- 分析情绪曲线。
- 检测伏笔埋设和回收。
- 更新人物状态。
- 写入 AI 生成日志。
- 可选触发角色立绘或场景图生成。

## 7. 叙事引擎

### 7.1 长期剧情规划

维护 `plot_arc`：

- 卷名。
- 起始章节。
- 结束章节。
- 阶段：铺垫、爆发、低谷、高潮。
- 核心冲突。
- 情绪目标。
- 关键伏笔。

### 7.2 情绪节奏引擎

每章记录：

- tension：紧张度。
- satisfaction：爽感。
- mystery：悬念。
- despair：压抑。
- warmth：温情。

用途：

- 检测连续压抑。
- 检测爽点不足。
- 检测节奏拖沓。
- 生成情绪曲线和热力图。

### 7.3 伏笔管理

伏笔状态：

- pending：待使用。
- setup：已埋设。
- payoff：已回收。
- abandoned：废弃。

能力：

- 自动发现伏笔。
- 提醒未回收伏笔。
- 在后续章节生成时注入可回收伏笔。
- 避免遗忘重要线索。

### 7.4 角色成长弧

记录：

- 初始信念。
- 欲望。
- 恐惧。
- 核心伤口。
- 关键转折。
- 当前状态。

用于：

- OOC 检测。
- 人物行为合理性检查。
- 角色关系变化。

## 8. 写作技巧 AI 化

技巧模块：

- 倒叙开篇。
- 制造悬念。
- 比喻和修辞。
- 冲突制造。
- 感官细节描写。
- 单视角聚焦。
- 爽点制造。
- 断章钩子。
- 对白推动剧情。

实现方式：

- 用户选择技巧。
- Writing Skill Agent 将技巧注入 Prompt。
- 生成后检查是否生硬。
- 给出优化建议。

## 9. 去 AI 味与文风保真

核心原则：

> AI 不自由发明设定，只在作者给定边界内填充细节。

能力：

- 文风克隆。
- 禁用模板化表达。
- 检测 AI 腔。
- 增加生活化细节。
- 70% Prompt 用于作者设定，30% 用于生成目标。
- 输出后进行人类化润色。

## 10. 角色立绘与视觉生成

### 10.1 功能定位

基于 Lore 生成统一风格角色立绘、场景图、道具图。

### 10.2 角色立绘流程

1. 用户填写角色 Lore。
2. 点击生成立绘。
3. Image Agent 提取外貌、服饰、气质、标志物。
4. 生成文生图 Prompt。
5. 调用图像模型。
6. 上传 OSS / MinIO。
7. 写入 character_image 表。
8. 前端立绘库预览。

### 10.3 一致性保障

- 首次生成后锁定角色视觉 Prompt。
- 固定发色、瞳色、服饰、标志物。
- 同一作品统一画风。
- 图片生成后进行 OOC 检测。

## 11. 前端架构

### 11.1 技术栈

- Next.js。
- React。
- TypeScript。
- TailwindCSS。
- Shadcn/UI 风格组件。
- lucide-react 图标。
- 后续接入 TipTap 或 Novel.js。
- SSE 使用 fetch-event-source 或 Vercel AI SDK。

### 11.2 页面结构

三栏布局：

- 左侧 20%：章节、设定、灵感。
- 中间 60%：核心编辑器。
- 右侧 20%：开局向导、AI 副驾、IP 衍生、Prompt Inspector。

### 11.3 状态管理

建议引入 Zustand：

- 用户状态。
- 当前小说。
- 当前章节。
- Lore 缓存。
- 灵感列表。
- AI 生成状态。
- SSE 中止状态。
- 图像生成状态。

## 12. 后端架构

### 12.1 技术栈

- Spring Boot 3。
- JDK 17+。
- PostgreSQL 15+。
- pgvector。
- MyBatis Plus。
- Redis。
- JWT。
- Spring AI。
- RabbitMQ / Kafka。
- MinIO / OSS。

### 12.2 统一返回结构

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

### 12.3 AI 配置

```yaml
spring:
  ai:
    openai:
      api-key: ${AI_API_KEY:sk-xxx}
      base-url: ${AI_BASE_URL:https://api.deepseek.com/v1}
      chat:
        options:
          model: deepseek-chat
          temperature: 0.7
```

### 12.4 AI 服务接口

```java
String call(String prompt);
Flux<String> streamCall(String prompt);
```

用途：

- `call`：后台摘要、审稿、分析等同步任务。
- `streamCall`：前台扩写、短剧生成等流式任务。

## 13. 数据库设计

### 13.1 基础表

- `user`：用户。
- `novel`：小说。
- `chapter`：章节。
- `lore`：设定。
- `memory_summary`：章节摘要。
- `story_state`：世界状态。

### 13.2 增强表

- `plot_arc`：剧情弧。
- `foreshadowing`：伏笔池。
- `emotion_curve`：情绪曲线。
- `character_relationship`：人物关系。
- `character_image`：角色立绘。
- `world_visual`：世界观视觉。
- `inspiration`：灵感点。
- `writing_skill`：写作技巧配置。
- `ai_generation_log`：AI 生成日志。

### 13.3 Skill 工坊表

- `skill`：Skill 主表。
- `skill_version`：Skill 版本表。
- `skill_input_field`：Skill 输入字段配置。
- `skill_install`：用户安装 Skill 记录。
- `skill_run_log`：Skill 运行日志。
- `skill_rating`：评分和评论。
- `skill_report`：举报和审核记录。

核心表设计：

```sql
CREATE TABLE skill (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  description TEXT,
  prompt_template TEXT NOT NULL,
  input_schema JSONB,
  output_schema JSONB,
  context_scope JSONB,
  visibility VARCHAR(20) DEFAULT 'private',
  status VARCHAR(20) DEFAULT 'draft',
  is_official BOOLEAN DEFAULT false,
  usage_count INT DEFAULT 0,
  install_count INT DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 0,
  create_time TIMESTAMPTZ DEFAULT now(),
  update_time TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE skill_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skill(id),
  version VARCHAR(20) NOT NULL,
  prompt_template TEXT NOT NULL,
  input_schema JSONB,
  output_schema JSONB,
  changelog TEXT,
  create_time TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE skill_install (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES skill(id),
  installed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

CREATE TABLE skill_run_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES skill(id),
  novel_id UUID,
  chapter_id UUID,
  input_snapshot JSONB,
  prompt_snapshot TEXT,
  output_snapshot TEXT,
  status VARCHAR(20) DEFAULT 'success',
  create_time TIMESTAMPTZ DEFAULT now()
);
```

输入字段示例：

```json
[
  {
    "key": "style",
    "label": "目标文风",
    "type": "select",
    "required": true,
    "options": ["玄幻爽文", "女频虐恋", "悬疑惊悚"]
  },
  {
    "key": "chapter_content",
    "label": "章节正文",
    "type": "textarea",
    "required": true,
    "source": "current_chapter"
  }
]
```

上下文授权示例：

```json
{
  "current_chapter": true,
  "recent_summaries": true,
  "lore": true,
  "author_style": true,
  "all_novel_content": false,
  "private_profile": false
}
```

## 14. 核心 API

### 14.1 小说

- `GET /api/novel/list`
- `GET /api/novel/{id}`
- `POST /api/novel`
- `PUT /api/novel/{id}`
- `DELETE /api/novel/{id}`

### 14.2 章节

- `GET /api/chapter/list?novelId=`
- `GET /api/chapter/{id}`
- `POST /api/chapter`
- `PUT /api/chapter/{id}`
- `DELETE /api/chapter/{id}`
- `POST /api/chapter/{id}/publish`

### 14.3 AI 工作流

- `POST /api/novel/expand-scene`
- `POST /api/workflow/screenplay`
- `POST /api/workflow/chapter-plan`
- `POST /api/workflow/analyze`
- `POST /api/workflow/editor-review`

### 14.4 后续扩展 API

- `POST /api/novels/{novelId}/starter`
- `POST /api/novels/{novelId}/style/extract`
- `POST /api/novels/{novelId}/lore/{loreId}/generate-image`
- `GET /api/novels/{novelId}/emotion-curve`
- `GET /api/novels/{novelId}/foreshadowing`
- `POST /api/novels/{novelId}/inspirations`

### 14.5 Skill 工坊 API

我的 Skill：

- `GET /api/skills/mine`
- `POST /api/skills`
- `GET /api/skills/{skillId}`
- `PUT /api/skills/{skillId}`
- `DELETE /api/skills/{skillId}`
- `POST /api/skills/{skillId}/test`
- `POST /api/skills/{skillId}/submit-review`

Skill 市场：

- `GET /api/skill-market`
- `GET /api/skill-market/{skillId}`
- `POST /api/skill-market/{skillId}/install`
- `DELETE /api/skill-market/{skillId}/install`
- `POST /api/skill-market/{skillId}/rating`
- `POST /api/skill-market/{skillId}/report`

Skill 执行：

- `POST /api/skills/{skillId}/run`
- `POST /api/novels/{novelId}/chapters/{chapterId}/skills/{skillId}/run`

执行请求示例：

```json
{
  "inputs": {
    "style": "玄幻爽文",
    "chapter_content": "当前章节正文"
  },
  "context": {
    "novelId": "uuid",
    "chapterId": "uuid",
    "includeRecentSummaries": true,
    "includeLore": true
  }
}
```

## 15. 当前实现状态

### 15.1 已实现

- 三栏式创作工作台。
- 章节编辑。
- 章节列表。
- Lore 设定展示。
- 点状灵感列表。
- 短画面扩写入口。
- AI 伴写聊天。
- 开局问答向导。
- 第一章生成并写入项目。
- IP 衍生入口。
- Prompt Inspector。
- 写作技巧 Skill 雏形：悬念、感官、冲突、断章、修辞可注入 AI 指令。
- 本地持久化：章节、Lore、灵感、开局向导回答可保存到浏览器本地。
- 后端小说、章节、扩写、短剧、分析接口雏形。

### 15.2 部分实现

- 文风克隆：已有字段和 Prompt，但没有样本文风提取。
- 动态记忆：已有摘要和近期记忆雏形，但未完整分层。
- RAG：有设计和后端服务雏形，前端目前是关键词匹配。
- 多 Agent：后端有部分 Agent 类，前端未完整展示。
- 角色立绘：有 Prompt 和表设计，未接图像模型。
- 短剧：有入口和模拟结果，未完整流式联调。
- 游戏生成：产品规划已保留，当前未实现入口、模型流程和导出格式。
- Skill 工坊：已有写作技巧 Skill 雏形，但还没有用户自建、市场、安装、评分、审核。

### 15.3 未实现

- 登录注册前端。
- 小说列表和新建小说。
- TipTap / Novel.js 富文本编辑器。
- 章节拖拽排序。
- Lore 完整 CRUD。
- 真实向量检索。
- 情绪曲线可视化。
- 人物关系图谱。
- 剧情树。
- 伏笔池管理。
- OOC 检测。
- 去 AI 味检测。
- 写作技巧 Agent 界面。
- Skill 工坊：我的 Skill、创建 Skill、Skill 市场、安装、运行测试、发布审核。
- 图像生成和立绘库。
- 互动剧情游戏生成。
- OSS / MinIO 上传。
- 平台适配。
- 读者评论分析。
- 视频和配音生成。

## 16. 推荐开发路线

### Phase 1：可用创作工具

- 完善问答式开局向导。
- 接入真实后端章节和小说数据。
- 完善章节保存、发布、摘要生成。
- 完善 Lore CRUD。
- 接入真实 AI SSE 扩写。
- 将现有写作技巧 Agent 改造为官方 Skill 列表。

### Phase 2：长篇记忆系统

- 完善 memory_summary。
- 接入 pgvector。
- 建立 Lore 向量召回。
- 实现 Prompt Orchestrator。
- 加入 Token 预算器。

### Phase 3：专业创作辅助

- 伏笔池。
- 情绪曲线。
- OOC 检测。
- 责编审稿。
- 写作技巧 Agent。
- 去 AI 味检测。
- Skill 工坊 MVP：我的 Skill、创建 Skill、测试运行、安装官方 Skill。

### Phase 4：IP Factory

- 短剧脚本流式生成。
- 漫剧分镜。
- 互动剧情游戏设定包生成。
- 文字冒险 / AVG 原型脚本导出。
- 角色立绘生成。
- 视觉资产库。
- 场景图和道具图。
- Skill 市场：公开发布、搜索、评分、复制改造、举报审核。

### Phase 5：工业化生产

- 多作品管理。
- 团队协作。
- 权限系统。
- 批量生成。
- 运营数据分析。
- 平台适配和投放辅助。
