# NovelAI Copilot 项目状态
更新时间：2026-07-07

## 2026-07-07 IP Factory 后端模型闭环 P1

任务 ID：`NOVELAI-COPILOT-IP-FACTORY-BACKEND-P1`

本轮把上次已接入写作工作台的 IP Factory 前端入口继续补齐为后端可调用模型的闭环。目标是先让“短剧脚本”和“互动剧情游戏设定包”可从当前章节直接生成，不依赖已经落库的 `novelId` / `chapterId`，以兼容当前前端作品快照和本地草稿。

已完成：

- 新增后端 `IpFactoryRequest`，接收作品标题、章节标题、章节正文、题材、卖点、简介、人物列表、世界规则、目标场景和目标时长。
- 新增 `POST /api/workflow/ip/screenplay-draft`，基于前端传入的章节内容生成竖屏短剧脚本草案。
- 新增 `POST /api/workflow/ip/game-package`，基于前端传入的章节内容生成互动剧情游戏设定包。
- `WorkflowService` 新增 `generateScreenplayDraft` 和 `generateGamePackage`。
- `WorkflowServiceImpl` 新增 IP Factory Prompt：
  - 短剧脚本要求返回 Markdown，包含 3 秒高能钩子、分镜表格、台词、情绪目标和结尾钩子。
  - 游戏设定包要求只返回合法 JSON，包含 `source`、`gameType`、`coreLoop`、`playerGoal`、`characters`、`scenes`、`quests`、`branches`、`failureStates`、`exportNotes`。
- 前端仍保留本地 fallback：后端不可用或模型未配置时，可生成本地短剧 / 游戏 JSON 草案，避免功能空转。

边界说明：

- 当前不是完整 IP Factory 工作流编排；没有多资产版本管理、角色立绘、漫剧分镜、配音或视频合成。
- 当前游戏生成是设定包 / 原型 JSON，不是可直接运行的游戏引擎项目。
- 当前短剧接口是同步模型调用；旧 `/api/workflow/screenplay` 流式接口仍保留，后续可统一到前端流式展示。

验证：

- 已运行 `frontend` 下 `npx tsc --noEmit --pretty false`，通过。
- 已运行 `frontend` 下 `npm run build`，通过。
- 已使用 JDK 21 运行 `backend` 下 `mvn -DskipTests compile`，通过。

## 2026-07-06 多章节快照持久化 P0

任务 ID：`NOVELAI-COPILOT-MULTI-CHAPTER-SNAPSHOT-P0`

本轮按优先级先补齐作品/章节后端持久化底座，不重写完整多章节编辑器，不做云同步冲突解决，不接入新的 AI 能力。

已完成：

- 前端 `SavedWork` 新增 `chapters` 结构，用于承载多章节标题、正文、状态、字数和章节序号。
- 前端保留 `chapterTitle` / `chapterText` 单章兼容字段，旧数据会自动规范化为第一章。
- 前端作品统计改为基于 `chapters` 汇总字数和章节数，同时保持当前编辑器仍读写第一章兼容字段。
- 前端保存到 `/api/work-library` 时会发送 `chapters` 数组，并把规范化后的章节写回 payload。
- 后端新增 `WorkChapterSnapshot`。
- `WorkSnapshotRequest` / `WorkSnapshotResponse` 支持 `chapters`。
- `WorkLibraryController` 保存快照时会同步全部章节到 `chapter` 表；旧请求没有 `chapters` 时仍只同步第一章。
- 当请求显式携带 `chapters` 时，后端会按章节号更新/新增章节，并移除快照中已不存在的旧章节，保持后端章节表与前端快照一致。
- 修复后端 `AIServiceImpl.java` 文件名和 public class 名大小写不一致导致的编译阻塞。
- 修复前端 `npm run build` 脚本中不存在的 Node 20 路径，改为当前机器可用的 `D:\nvm\v20.20.2\node.exe`。

边界说明：

- 当前还不是完整多章节编辑器；主编辑区仍以第一章兼容字段为主要编辑对象。
- 当前还不是完整云同步；没有多端冲突解决、版本历史或恢复策略。
- 当前迁移仍是“前端作品快照 + 后端章节表同步”的过渡方案，不是最终 Work / Chapter / ToolState / MemoryItem 全量规范化后端化。

验证：

- 已运行 `frontend` 下 `npm run build`，通过。
- 已使用 JDK 21 运行 `backend` 下 `mvn -DskipTests compile`，通过。

## 2026-07-06 多章节编辑器本地闭环 P0.5

任务 ID：`NOVELAI-COPILOT-MULTI-CHAPTER-EDITOR-P0.5`

本轮在多章节快照底座之上，把写作工作台从“第一章兼容编辑”推进到可操作的多章节编辑闭环。仍不引入 TipTap / Novel.js，不做拖拽排序，不做复杂版本历史。

已完成：

- 写作工作台左侧章节目录改为读取真实 `chapters` 数组。
- 支持新建章节，自动分配章节序号和默认标题。
- 支持切换当前章节。
- 支持编辑当前章节标题和正文。
- 支持删除章节，至少保留一个章节；删除后重新归一化章节序号。
- 支持章节草稿 / 已发布状态切换。
- 当前章节字数在顶部实时显示。
- 保存作品时沿用现有保存链路：先更新本地作品库，再由后端快照同步接口写入多章节。
- 保留旧 `chapterTitle` / `chapterText` 兼容字段，第一章仍会同步到兼容字段，避免破坏现有助手、导出和工具链路。

边界说明：

- 当前仍是轻量多章节编辑器，不是富文本编辑器。
- 当前不支持章节拖拽排序、批量发布、章节版本历史。
- 当前长篇记忆和 OOC 检查仍默认围绕当前选中章节生成结果，记忆后端化尚未完成。

验证：

- 已运行 `frontend` 下 `npm run build`，通过。
- 已使用 JDK 21 运行 `backend` 下 `mvn -DskipTests compile`，通过。

## 2026-07-05 智能创作助手 AI P0

任务 ID：`NOVELAI-COPILOT-CREATIVE-ASSISTANT-AI-P0`

本轮接入真实模型驱动的智能创作助手主路径，不再把助手做成纯规则向导。P0 只允许安全动作卡，涉及写入必须用户确认，不做自动发布、删除或云同步。

已完成：

- 新增后端 `POST /api/assistant/chat`。
- 复用现有 `AiService`、`user_model_config`、API Key 加密和 OpenAI-compatible 模型调用能力。
- 新增 `AssistantChatRequest`、`AssistantChatResponse`、`AssistantAction`。
- 后端 Prompt 会带入当前作品上下文，并要求模型返回结构化 JSON：`reply`、`actions`、`warnings`。
- 后端会过滤 action 白名单，禁止模型返回未授权动作直接执行。
- 新增前端 `CreativeAssistantPanel` 全局浮动助手。
- 助手读取当前作品上下文，包括作品名、题材、章节正文、卖点、大纲、人物、世界规则、近期任务等。
- 未登录或没有后端 token 时，助手明确提示需要登录并配置模型，不伪装成本地 AI。
- 模型设置页已接入后端：登录且有后端 token 时，保存配置会调用 `/api/model-config`，测试连接会调用 `/api/model-config/test`。
- API Key 仍会先进入后端加密存储，不在配置读取接口中回显明文。
- 支持展示模型回复、风险提示和动作卡。
- P0 已支持确认执行：
  - `appendChapterText`：追加到当前章节。
  - `replaceChapterDraft`：确认后替换当前章节草稿。
  - `openModelSettings`：打开模型设置。
  - `openExportCenter`：打开导出中心。
- 其他模型建议动作先展示为建议，不自动执行。

边界说明：

- 当前不是完整 Agent 编排系统，没有多步工具调用、长期任务队列或自动回滚。
- 当前不支持流式输出。
- 当前 PromptRun 后端记录尚未接入该接口。
- 当前依赖后端登录 token 和用户模型配置；后端不可用时不会伪装 AI 回复。

验证：

- 已运行 `npm run build`，通过。
- 已使用项目内 Maven / JDK 路径运行 `mvn -DskipTests compile`，通过。

## 2026-07-05 后端持久化 MVP P1

任务 ID：`NOVELAI-COPILOT-BACKEND-PERSISTENCE-MVP-P1`

本轮把作品库推进到“后端可用时自动持久化、不可用时继续本地闭环”的渐进式架构，不接真实云同步，不接真实模型。

已完成：

- 后端 `novel` 表新增 `frontend_work_id` 和 `saved_work_payload` 字段，用于迁移期保存前端完整作品快照。
- 新增 `WorkLibraryController`：支持当前用户作品快照列表、保存/更新、删除。
- 新增 `WorkSnapshotRequest` / `WorkSnapshotResponse`。
- 保存作品快照时同步写入现有 `novel` 基础字段，并把当前正文同步到 `chapter` 表第一章。
- 前端登录 / 注册成功后会尝试连接后端认证接口，成功后保存 JWT 到 `localStorage:yixie-backend-token-v1`。
- 登录用户正式作品会自动保存到 `/api/work-library`；后端不可用时不阻塞，继续使用 `localStorage:yixie-works-library-v1`。
- 从后端读取到的作品快照会和当前本地作品库按作品 ID 合并，不清空、不迁移、不重命名现有 localStorage key。
- 删除本地正式作品时，如已有后端 token，会尝试同步删除后端快照；失败不影响本地删除。

边界说明：

- 当前不是完整云同步，没有冲突解决、版本历史、跨设备恢复提示。
- 当前后端保存的是前端 SavedWork 快照，不是最终规范化 Work / Chapter / ToolState / MemoryItem 全量表结构。
- 游客仍完全走本地 localStorage。
- 后端未启动、数据库未连接或认证失败时，前端会自动降级为本地保存。

验证：

- 已运行 `npm run build`，通过。
- 已尝试运行 `mvn -DskipTests compile`，当前环境未安装 Maven 且项目无 Maven Wrapper，因此未能执行后端编译；已完成代码静态巡检。

## 2026-07-05 PromptRun 本地记录 V0

任务 ID：`NOVELAI-COPILOT-PROMPT-RUN-LOCAL-V0`

本轮补齐 Prompt Inspector 的本地运行记录底座，不接后端，不上传 Prompt，不调用真实模型。

已完成：

- `WritingWorkspace` 的 Web AI Prompt 弹窗新增 PromptRun 本地记录区。
- 复制 Prompt 时记录一次本地运行：目标类型、复制时间、Prompt 字符数、估算 token。
- 粘贴并解析网页 AI 结果时记录一次本地运行：目标类型、解析时间、Prompt 字符数、估算 token、结果字符数。
- 记录保存到 `localStorage:yixie-prompt-runs-v1-${workId}`，最多保留最近 20 条。
- 弹窗内展示最近 4 条记录，明确标注“仅当前浏览器”。

边界说明：

- 当前不是完整 PromptRun 审计系统。
- 当前不保存模型名称、真实请求参数、响应 token、费用或延迟。
- 当前不接后端，不跨设备同步。

验证：

- 已运行 `npm run build`，通过。

## 2026-07-05 导出中心本地格式补齐 P1

任务 ID：`NOVELAI-COPILOT-EXPORT-CENTER-FORMATS-P1`

本轮继续补齐无需后端和大型依赖即可落地的本地导出能力，不接云端备份，不做真实平台发布。

已完成：

- 导出中心原有 TXT / Markdown 真实导出保留。
- 新增 DOCX 本地导出，生成最小 Office Open XML 文档，可作为当前作品备份和二次编辑文件。
- 新增 EPUB 本地导出，生成基础 EPUB 3 容器，包含目录和正文 XHTML。
- PDF 改为浏览器打印版：打开可打印页面，由浏览器打印面板另存为 PDF。
- “更多格式”仍保持后续占位，避免误导。
- 导出文件名增加作品名安全处理和本地时间戳。

边界说明：

- DOCX / EPUB 为前端本地生成的基础格式，不包含复杂排版、封面图片嵌入、批注和多章节目录高级结构。
- PDF 当前不是前端直接生成二进制 PDF，而是浏览器打印另存方案。
- 当前导出仍只读取本地作品数据，不上传云端，不修改作品内容。

验证：

- 已运行 `npm run build`，通过。

## 2026-07-05 Prompt Inspector V0 本地预览

任务 ID：`NOVELAI-COPILOT-PROMPT-INSPECTOR-V0-LOCAL`

本轮只补齐 Web AI Prompt 的本地预览检查，不接真实模型 API，不保存 PromptRun，不实现完整 Prompt Inspector。

已完成：

- `WritingWorkspace` 的 Web AI Prompt 弹窗新增 `Prompt Inspector V0` 区块。
- 展示当前 Prompt 的字符数、粗略估算 token、结构化上下文段数量。
- 可识别当前检查目标、章节标题、章节正文、作品资料、长篇记忆摘要、输出格式等上下文段。
- 本地提示明显风险：Prompt 为空、缺少章节正文、作品资料暂缺、长篇记忆暂缺、Prompt 过长、估算 token 较高。
- 文案明确标注为“本地预览”，不误导用户以为已经完成真实模型 Inspector。

边界说明：

- 当前 token 只是粗略估算，不是模型 tokenizer 精确结果。
- 当前不保存 Prompt 历史、不记录 PromptRun、不生成模型调用追踪。
- 当前不接真实模型，不做自动质量评分。

验证：

- 已运行 `npm run build`，通过。

## 2026-07-05 OOC 本地检查增强

任务 ID：`NOVELAI-COPILOT-OOC-LOCAL-CHECK-P1`

本轮只增强本地 OOC / 伏笔检查规则，不接真实模型，不实现完整 ConsistencyCheckSkill。

已完成：

- 本地检查会优先参考已确认记忆。
- 已拒绝记忆不会进入 Web AI 检查 Prompt 的上下文。
- 可能过期的记忆不会作为强依据，并会生成低风险提醒。
- 未回收伏笔检查会同时参考资料库伏笔和已确认的伏笔记忆。
- 人物 OOC 检查会参考已确认规则记忆。
- 新增人物状态记忆的简单冲突提示。
- 检查页文案明确：当前是本地规则检查，真实模型一致性检查仍待接入。
- Web AI 检查 Prompt 中会标记记忆状态，方便人工二次审稿。

验证：

- 已运行 `npm run build`，通过。

边界说明：

- 当前不是完整 ConsistencyCheckSkill。
- 当前没有真实模型推理。
- 当前没有后端记忆库或向量检索。

## 2026-07-05 长篇记忆 Memory V0 本地结构

任务 ID：`NOVELAI-COPILOT-MEMORY-V0-LOCAL-P1`

本轮只补齐长篇记忆的本地可管理结构，不接真实模型，不实现完整 MemoryExtractionSkill，不接后端记忆库。

已完成：

- `MemoryEntry` 增加兼容字段：`status`、`confidence`、`sourceText`、`createdBy`、`createdAt`。
- 旧本地记忆数据会通过 `normalizeMemoryEntry` 自动补齐默认字段。
- 章节摘要生成的记忆条目标记为待确认候选，记录来源片段和本地生成来源。
- Web AI 回填解析出的记忆条目标记为待确认候选，记录来源为网页 AI。
- 长篇记忆视图新增 Memory V0 状态统计：待确认、已确认、可能过期。
- 每条记忆支持确认、拒绝、标记过期。
- 记忆卡片展示类型、来源章节、更新时间、置信度和来源类型。
- 本地持久化仍使用 `localStorage:yixie-phase3-workspace-${workId}`。

边界说明：

- 当前不接真实模型 API。
- 当前不是完整 MemoryExtractionSkill。
- 当前没有向量库或后端记忆库。
- 当前 OOC 检查仍是本地原型，未基于真实长篇记忆模型。

验证：

- 已运行 `npm run build`，通过。

## 2026-07-05 本地作品数据动作 P1

任务 ID：`NOVELAI-COPILOT-LOCAL-WORK-ACTIONS-P1`

本轮在前端 localStorage 闭环内补齐可真实落地的数据动作，不接后端，不接真实云同步，不接真实模型。

已完成：

- 作品库更多菜单启用“复制作品”。
- 复制作品会创建新的本地副本，副本标记为 `local-draft` / `local-only`，避免误显示为云端正式作品。
- 复制作品会保留正文、章节兼容字段和基础资料，但重置工具状态，并添加“副本 / 仅本地保存”标签。
- 作品库更多菜单启用“归档”。
- 归档前有确认提示，归档后将 `projectStatus` 设置为 `archived`，不会删除作品。
- 作品库更多菜单启用“删除”。
- 删除前有两次确认提示，删除只移除当前浏览器 localStorage 作品库中的作品。
- 新增“导入备份”入口，支持导入本产品导出的 JSON 备份。
- 导入备份会创建新的本地作品，不覆盖原作品，不清空 localStorage。
- 导入备份会兼容 `chapters` 数组，并补齐当前单章节工作台所需的 `chapterTitle` / `chapterText`。
- 导入备份会保留可读到的故事线数据在导入对象中，但不会自动写入 `yixie-storyline-data-v1-${workId}`，避免隐式迁移。

验证：

- 已运行 `npm run build`，通过。

仍未完成：

- 后端持久化。
- 真实云同步。
- 真实模型 API。
- 完整多章节编辑器。
- 复杂排版级 DOCX / 原生二进制 PDF 导出。
- 云端备份和跨设备恢复。
- MemoryExtractionSkill。
- ConsistencyCheckSkill。
- 完整 Prompt Inspector。

## 2026-07-05 当前作品导出 P1

任务 ID：`NOVELAI-COPILOT-WORK-EXPORT-P1`

本轮只实现当前作品本地导出，不做导入，不接后端，不接真实云同步，不接真实模型，不实现复制 / 归档 / 删除。

已完成：

- 作品库卡片更多菜单中的“导出作品”已启用。
- 点击“导出作品”打开轻量导出弹窗。
- 支持导出 Markdown 文件。
- 支持导出 JSON 备份文件。
- Markdown 包含作品基础信息、核心信息、全局大纲、人物 / 世界规则和章节正文。
- JSON 包含 `exportVersion`、`exportedAt`、`source`、`work`、`chapters`、`storylineData`。
- JSON 会尝试安全读取 `localStorage:yixie-storyline-data-v1-${workId}`，读取失败时使用空对象。
- 兼容当前单章节模式：使用 `chapterTitle` / `chapterText` 构造章节数组。
- 兼容未来 `chapters` 数组：按章节数组导出。
- 导出文件名使用本地时间和安全作品名：
  - Markdown：`作品名-导出-YYYYMMDD-HHmm.md`
  - JSON：`作品名-备份-YYYYMMDD-HHmm.json`
- 导出后使用现有轻量 notice 提示：导出来自本地保存数据，不会删除或修改当前作品；JSON 当前不支持导入恢复。

修改文件：

- `frontend/components/phase-one/WorksHome.tsx`
- `docs/PROJECT_STATUS.md`
- `docs/INTERACTION_RULES.md`

边界说明：

- 当前导出只支持本地作品数据。
- 当前作品库支持导入本产品 JSON 备份，导出中心备份页仍只做文件校验提示。
- 当前不支持云端备份。
- 导出中心后续已补齐基础 DOCX / EPUB 本地导出和 PDF 打印版。
- 复制、归档、删除后续已在作品库本地闭环内开放。
- 当前仍未完成后端持久化和真实云同步。

验证：

- 已运行 `npm run build`，通过。

## 2026-07-04 作品管理轻 UX P1

任务 ID：`NOVELAI-COPILOT-WORKS-MANAGEMENT-P1-LIGHT-UX`

本轮只优化作品管理弹窗体验，不接后端，不接真实模型，不修改 localStorage key，不实现复制 / 导出 / 归档 / 删除。

已完成：

- 作品管理弹窗增加未保存修改检测。
- 点击关闭或取消时，如存在未保存修改，会弹出确认提示。
- 标签输入从逗号字符串升级为标签 chips。
- 标签支持输入后按回车添加。
- 标签支持单个删除。
- 发布平台选择“自定义平台”时显示自定义平台名称输入框。
- 自定义平台为空时保存会提示校验错误。
- 数字字段校验文案更明确：目标字数、计划章节数、本周更新目标必须为 0 或正整数。
- 表单分组调整为基础信息、状态规划、内容资料，视觉边界更清楚。
- 保存按钮视觉从强 AI 感紫色调整为更克制的深色按钮。

修改文件：

- `frontend/components/phase-one/WorksHome.tsx`
- `docs/PROJECT_STATUS.md`

仍未实现：

- 保存成功 toast 的更细分动效。
- 复杂表单字段撤销。
- 复制作品。
- 导出作品。
- 归档作品。
- 删除作品。
- 后端持久化。

验证：

- 已运行 `npm run build`，通过。

## 2026-07-04 章节统计联动 P0.5

任务 ID：`NOVELAI-COPILOT-CHAPTER-STATS-LINK-P0.5`

本轮只补齐当前单章节写作模式下的作品统计联动，不重写章节管理，不接后端，不接真实云同步。

已完成：

- 新增章节字数统计工具：按当前章节正文去空白后计算字数。
- 新增作品统计归一化：统一补齐 `words`、`chapterCount`、`monthlyUpdatedChapters`、`updatedAt`。
- 编辑正文时，当前作品的字数和章节数即时更新，切回作品总览时能看到最新统计。
- 点击保存时，统计结果写回 `activeWork` 和作品库数组，并继续落到 `localStorage:yixie-works-library-v1`。
- 作品管理弹窗保存时，保留章节正文反推的统计结果，避免管理字段覆盖掉章节统计。
- 保存成功文案调整为“作品统计已更新”，避免误导为真实云端同步。

修改文件：

- `frontend/app/page.tsx`
- `docs/PROJECT_STATUS.md`

边界说明：

- 当前章节管理仍是既有单章节 / 本地写作模式，本轮没有重写成完整多章节模型。
- 当前没有实现真实章节删除后的多章节重算，因为现有页面没有独立章节表。
- 当前没有实现真实发布统计，因为发布标记仍不是独立章节实体。
- 已运行 `npm run build`，通过。

仍未完成：

- 多章节数据模型。
- 章节删除后的完整作品统计重算。
- 章节发布状态与本月更新数的真实联动。
- 后端持久化。

## 2026-07-04 外部生成 Prompt 编辑 P0.5

任务 ID：`NOVELAI-COPILOT-WEBAI-PROMPT-EDIT-P0.5`

本轮只增强外部生成 Prompt 弹窗，不接后端，不接真实模型，不新增提示词库，不修改 localStorage key。

已完成：

- `WebAiPromptModal` 中默认 Prompt 从固定展示改为可编辑文本区。
- 新增 `promptDraft` 本地状态，复制时复制当前编辑后的 Prompt。
- 新增“导入 Prompt”，支持导入 `.txt` 和 `.md` 文本文件，导入后覆盖当前 Prompt。
- 新增“恢复默认”，可把当前 Prompt 恢复为内置默认模板。
- 保留“粘贴 AI 生成结果”和 `parseWebAiResult(rawResult)` 解析流程。
- 保留 `onParsedResult(parsed)` 进入结果确认页流程。
- 修复该弹窗内历史中文乱码文案和解析标签，恢复正常中文显示。
- 补充文案说明：导入或修改 Prompt 只影响本次生成，不会自动保存为模板。

修改文件：

- `frontend/components/phase-one/WebAiPromptModal.tsx`
- `docs/PROJECT_STATUS.md`

验证：

- 已运行 `npm run build`，通过。
- 首次 build 因本地 Next dev server 占用 `.next/trace` 失败；停止 PID `90472` 后重新 build 通过。

未实现：

- 不保存 Prompt 模板。
- 不记录 Prompt 历史。
- 不做 Prompt Inspector。
- 不接真实模型 API。
- 不修改提示词库。

## 2026-07-04 路线文档 P0

任务 ID：`NOVELAI-COPILOT-ROADMAP-DOCS-P0`

本轮只补充后续产品路线相关文档，不做功能开发，不改业务逻辑，不接后端，不接模型。

用户已确认的方向：

- 接下来优先继续完善前端本地闭环。
- 未来后端化目标覆盖作品、章节、设定库、故事线图、工具状态、Prompt、模型设置和导出记录。
- Prompt 最终目标是 Prompt Inspector。
- 官方工具最高战略优先级是长篇记忆。

已完成：

- 新增 `docs/ROADMAP.md`：记录 P0、P0.5、P1、P1.5、P2 路线，明确 Prompt 可编辑、章节统计联动、作品管理轻 UX、后端 MVP、长篇记忆 V0 和 Prompt Inspector 的阶段顺序。
- 新增 `docs/FEATURE_FLAGS_AND_PLACEHOLDERS.md`：区分本地可用、UI 占位、原型展示、模型待接入、云端待同步和后端待接入，防止状态文案误导。
- 新增 `docs/STORAGE_AND_MIGRATION.md`：记录当前 localStorage key、未来全量后端化目标、Work / Chapter / WorkProfile / Storyline / ToolState / PromptRun / ModelSettings / ExportRecord / MemoryItem 的迁移顺序。
- 新增 `docs/AI_MEMORY_AND_PROMPT_STRATEGY.md`：记录长篇记忆优先策略、Memory V0 前置能力、OOC 依赖关系、Prompt 分期和 AI 结果必须用户确认的原则。

当前路线判断：

- 长篇记忆是战略优先级最高的官方工具，但第一阶段先做 Memory V0，不直接实现完整 MemoryExtractionSkill。
- Prompt 先做本次可编辑 / 导入 / 复制，再做轻工作流，最后进入 Prompt Inspector。
- 后端最终目标是全量持久化，但第一阶段仍应从 Work + Chapter 开始。
- 当前仍是前端 localStorage 闭环，不是完整云同步，也没有真实模型 API 调用。

未运行 `npm run build`：本轮只新增 / 更新文档，没有业务代码、前端组件或依赖改动。

仍未完成：

- 完整 Prompt Inspector。
- 后端持久化。
- 真实云同步。
- 真实模型 API。
- 完整 MemoryExtractionSkill。
- ConsistencyCheckSkill。

## 2026-07-04 文档基线 P0

任务 ID：`NOVELAI-COPILOT-DOCS-BASELINE-P0`

本轮只补齐产品 / 开发基础文档，不做功能开发，不改业务逻辑，不接后端，不接模型。

已完成：

- 新增 `docs/PRD_NOVELAI_COPILOT.md`：记录产品定位、目标用户、当前阶段目标、核心流程、已完成模块、不做模块、P0/P1/P2 优先级和限制风险。
- 新增 `docs/INFORMATION_ARCHITECTURE.md`：记录 App Shell、左侧导航、顶部栏、作品库、作品总览、章节管理、设定库、灵感、世界观图谱、故事线图、官方工具状态区、右侧详情区和页面跳转关系。
- 新增 `docs/WORK_DATA_MODEL.md`：记录 Work、Chapter、ToolState、syncState、localStorage key、字段来源、编辑 / 计算 / 后端持久化预期，以及当前统计规则风险。
- 新增 `docs/INTERACTION_RULES.md`：记录作品管理弹窗、作品总览、全局大纲、游客草稿 / 正式作品提示、官方工具状态、同步状态、危险动作和异常兜底规则。
- 新增 `docs/LOCAL_E2E_CHECKLIST.md`：记录本地启动、新建作品、作品管理、作品总览、章节管理、localStorage 和工具入口验收清单。
- 新增 `docs/CODEX_TASK_RULES.md`：记录后续 Codex 小任务边界、禁止破坏项、localStorage 规则、验证规则和最终回复规则。

当前基线说明：

- 当前仍是前端 localStorage 闭环，不是后端数据库持久化。
- 作品库数据使用 `localStorage:yixie-works-library-v1`。
- 作品库视图模式使用 `localStorage:yixie-works-library-view-v1`。
- 故事线图数据使用 `localStorage:yixie-storyline-data-v1-${workId}`。
- 当前不是完整云同步。
- 当前没有真实模型 API 调用。
- 复制、导出、导入备份、归档、删除后续已在本地闭环内补齐；仍不是后端持久化或云端备份。

未运行 `npm run build`：本轮只新增 / 更新文档，没有业务代码、前端组件或依赖改动。

仍未完成：

- 后端持久化。
- 真实云同步。
- 真实发布。
- 复制、导出、归档、删除。
- MemoryExtractionSkill。
- ConsistencyCheckSkill。
- 完整 Prompt Inspector。

## 2026-07-04 本地 E2E 验收 P0

任务 ID：`NOVELAI-COPILOT-LOCAL-E2E-VERIFY-P0`

本轮不新增大功能、不接后端、不接真实模型、不做复制 / 导出 / 归档 / 删除，只做作品库 P0 和作品总览 P0 的本地链路验收、小兼容修复和状态记录。

已验证 / 巡检：
- 新建作品数据链路：`createSavedWork` 会写入作品库本地数据，并补齐总览所需的标题、题材、简介、卖点、全局大纲、人物、章节正文、章节标题等兼容字段。
- 作品库管理链路：`WorkManagementModal` 保存后经 `handleUpdateWork` 同步刷新作品库数组、当前作品 `activeWork`、作品资料 `materials` 摘要字段，并继续落到 `localStorage:yixie-works-library-v1`。
- 作品总览链路：从作品库打开作品默认进入 `overview`，总览读取当前作品数据，展示身份区、核心信息、全局大纲、创作进度、资料摘要、章节入口、官方工具状态。
- 空状态 / 数值兜底：总览使用安全数值和空状态处理，避免目标字数、计划章节数、章节数缺失时出现 `NaN`、`undefined`、`null`。
- localStorage key 巡检：未重命名、清空或迁移 `yixie-works-library-v1`、`yixie-works-library-view-v1`、`yixie-storyline-data-v1-${workId}`。
- 本地 HTTP 验证：启动 dev server 后，`http://localhost:3000/` 返回 200。
- 最终构建验证：`npm run build` 通过。

本轮小修：
- `WritingWorkspace` 新增工作台级作品规范化，兼容旧作品缺少 `chapterText`、`chapterTitle`、`materials`、标签、同步状态、目标字数等字段时进入总览 / 编辑器不报错。
- `WorksHome.normalizeWork` 补齐总览兼容字段：`sellingPoint`、`description`、`globalOutline`、`protagonists`、`mainCharacters`、`worldRules`、`coreConflict`。

验证限制 / 风险：
- Codex in-app browser 当前对本地错误页后的导航触发 URL policy 拦截，未能完成完整浏览器点击式 E2E；已用 HTTP 200、代码路径巡检和 `npm run build` 兜底验证。
- 章节管理当前仍是既有工作台单章节 / 本地资料逻辑，本轮未重写；章节数、字数和作品库统计的深度联动仍应作为后续风险跟踪。
- 当前仍是前端本地闭环，未接后端数据库、真实云同步、真实平台发布或真实模型。

## 2026-07-04 作品总览页 / 作品驾驶舱 P0

本轮补齐进入单本作品后的“作品总览 / 驾驶舱”，继续沿用作品库同一份前端本地数据：`localStorage:yixie-works-library-v1`。本轮只做前端信息结构与展示闭环，不接后端接口，不接真实模型，不做复制、导出、归档、删除。

已完成：
- 进入作品后默认打开“作品总览”，仍保留原正文编辑、资料库、长篇记忆、OOC 检查入口。
- 总览顶部展示作品名、作者、项目状态、发布状态、发布平台、当前字数 / 目标字数、章节数 / 计划章节数、最近更新时间、同步状态。
- 作品核心信息展示题材、标签、一句话卖点、简介；缺少一句话卖点时显示空状态提示。
- 新增兼容字段：`sellingPoint`、`description`、`globalOutline`、`protagonists`、`mainCharacters`、`worldRules`、`coreConflict`，旧作品缺字段时不报错。
- 全局大纲直接在总览展示，默认显示前 4 条，超过 4 条支持展开 / 收起；无数据时显示空状态。
- 创作进度展示字数完成度、章节完成度、本周更新目标、本月更新章节、最近更新时间，目标缺失或为 0 时不会出现 NaN。
- 作品资料摘要兼容 `protagonists` / `mainCharacters` / `materials.characters` / 资料库人物条目，展示主角、主要人物、世界规则、核心冲突。
- 章节入口展示最近章节、章节数量、新建章节入口和进入章节管理入口；不重写章节管理逻辑。
- 官方工具状态区展示黄金第一章、人物关系图、钩子 / 伏笔线性图、长篇记忆、OOC 检查、卡文急救、发布准备，并区分“功能状态”和“接入状态”。
- 长篇记忆、OOC 检查、人物关系图、钩子 / 伏笔线性图等明确标记为“模型待接入”或“原型展示”，避免误导为真实模型完整接入。
- 游客草稿提示“仅保存在当前浏览器”；正式作品提示当前仍以前端本地保存为准，云端同步为占位。

修改文件：
- `frontend/components/phase-one/WritingWorkspace.tsx`
- `frontend/components/phase-one/types.ts`
- `frontend/app/page.tsx`
- `docs/PROJECT_STATUS.md`

验证：
- 已运行 `npm run build`，构建通过。

当前仍是前端本地闭环：
- 作品库和作品总览读取 / 写入同一份 `localStorage:yixie-works-library-v1`。
- 卡片 / 列表视图偏好仍保存在 `localStorage:yixie-works-library-view-v1`。

未完成 / 后续：
- 后端持久化、真实云同步、真实发布。
- 复制作品、导出作品、归档作品、删除作品真实逻辑。
- `MemoryExtractionSkill`、`ConsistencyCheckSkill`、`Prompt Inspector`。
- 不扩展 `StoryGraphCenter` 核心逻辑。

## 2026-07-01 作品库 / 项目管理页 P0 真实管理动作

本轮补齐作品库仪表盘的第一阶段真实管理动作，仅覆盖作品字段编辑和本地持久化，不接入真实发布、云端同步、复制、导出、归档或删除。

已完成：
- 新增作品管理弹窗，可从作品卡片“作品管理”、列表“管理”、更多菜单“重命名 / 设置目标字数 / 设置发布平台”、右侧详情“作品管理 / 发布设置”打开。
- 弹窗支持编辑：作品名、笔名、项目状态、当前发布状态、目标字数、计划章节数、本周更新目标、发布平台、简介、标签。
- 保存校验：作品名不能为空；目标字数、计划章节数、本周更新目标必须为非负整数。
- 保存后同步刷新作品卡片、列表视图、右侧当前作品详情、完成度进度条和顶部统计。
- 新增本地作品库持久化：`localStorage:yixie-works-library-v1`。刷新页面后保留已编辑的作品字段。
- 保留卡片 / 列表视图偏好持久化：`localStorage:yixie-works-library-view-v1`。
- 旧作品缺少项目管理字段时，作品库会在前端视图层补默认值，避免页面报错。
- 游客临时草稿仍显示“仅本地保存”，不会混入正式作品。
- 该阶段更多菜单中的复制、导出、归档、删除仍为待开放；后续本地动作 P1 已补齐复制、导出、导入备份、归档、删除。
- “查看同步状态”保留轻量提示：本地草稿提示仅本地保存；正式作品显示当前 syncState，云端同步详情后续接入。

修改文件：
- `frontend/components/phase-one/WorksHome.tsx`
- `frontend/app/page.tsx`
- `frontend/app/globals.css`
- `docs/PROJECT_STATUS.md`

验证：
- 已运行 `npm run build`，构建通过。

未完成 / 后续：
- 不做真实平台发布、自动发文、平台授权、会员、评论、社区。
- 不做复制作品、导出作品、归档作品、删除作品真实逻辑。
- 不做后端云同步详情弹窗和真实同步接口。
- 不扩展 StoryGraphCenter 故事线图核心逻辑。
## 2026-06-07 绗竴闃舵涓昏矾寰勪笌銆屾槗鍐欍€嶅紑灞忔敼閫?
鏈疆鐩爣鏄彧钀藉湴绗竴闃舵涓昏矾寰勶紝涓嶇户缁墿灞曟妧鑳藉箍鍦恒€侀暱绡囪蹇嗐€丱OC/浼忕瑪妫€鏌ャ€佹敮浠樹細鍛樸€侀噸绀惧尯绛夎繘闃跺姛鑳姐€傚搧鐗岀粺涓€涓恒€屾槗鍐欍€嶏紝骞舵妸棣栧睆銆佹父瀹㈤椤点€佹柊寤轰綔鍝併€乄eb AI Prompt 澶嶅埗涓庡洖濉覆鎴愬彲楠岃瘉闂幆銆?
宸插畬鎴愶細

- 鍝佺墝浠?NovelAI Copilot 浣撻獙鍏ュ彛缁熶竴璋冩暣涓恒€屾槗鍐欍€嶃€?- 鏂板娌夋蹈寮忓紑灞忛〉锛?  - 鍏ㄥ睆鑳屾櫙锛屼笉鍐嶆槸鐏板簳鍗＄墖寮忓紑灞忋€?  - 淇濈暀闈掓槬灏戝コ銆佹牎鏈嶃€佽€虫満銆佹彙绗斻€佺焊寮犮€佹槦鍏夈€佽摑绱厜姘涘洿銆?  - 涓绘爣棰樹负銆岃鐏垫劅钀界瑪鎴愭晠浜嬨€嶃€?  - 鍓爣棰樹负銆屼笓涓轰腑鏂囧垱浣滆€呮墦閫犵殑 AI 鍐欎綔宸ヤ綔鍙般€嶃€?  - 涓?CTA 鍙繚鐣欍€屽紑濮嬪垱浣溿€嶏紝閲囩敤鐜荤拑鎷熸€佽摑绱笎鍙樸€?  - 鍙充笂瑙掍繚鐣欒交閲忓叆鍙ｃ€屽凡鏈夎处鍙凤紵鐧诲綍銆嶃€?  - 搴曢儴鍗栫偣闄嶇骇涓鸿交閲忓崐閫忔槑淇℃伅鏉★紝涓嶄綔涓哄姛鑳藉叆鍙ｆ姠鍗犳敞鎰忓姏銆?- 鐐瑰嚮銆屽紑濮嬪垱浣溿€嶇洿鎺ヨ繘鍏ユ父瀹㈡ā寮忛椤碉紝涓嶅己鍒剁櫥褰曘€?- 棣栭〉鏀逛负浣滃搧鍗＄墖甯冨眬锛屽寘鍚柊寤轰綔鍝佸崱銆佺ず渚嬩綔鍝佸崱銆佹父瀹㈡ā寮忔彁绀恒€佽交閲忓伐鍏风鍜屾渶杩戣崏绋裤€?- 鏂板缓浣滃搧鏀逛负寮圭獥閫夋嫨鍒涗綔鏂瑰紡锛?  - 缃戦〉 AI 妯″紡銆?  - 鏈湴浣撻獙妯″紡銆?  - API 鐩磋繛妯″紡浣滀负闇€閰嶇疆鍏ュ彛鍗犱綅銆?- 鏈櫥褰?/ 鏈厤缃?API 鏃舵敮鎸?Web AI Prompt 妯″紡锛?  - 灞曠ず鍙鍒?Prompt銆?  - 鎻愪緵鎵撳紑 ChatGPT / DeepSeek / Gemini 鐨勫閮ㄥ叆鍙ｃ€?  - 鏀寔绮樿创缃戦〉 AI 杩斿洖缁撴灉銆?  - 鏀寔瑙ｆ瀽缁撴灉骞朵繚瀛樹负涓存椂浣滃搧鍗＄墖銆?- 鏂板寮€灞忎富瑙嗚璧勪骇锛歚frontend/public/assets/yixie-splash-hero.png`銆?- 鏂板绗竴闃舵缁勪欢鐩綍锛歚frontend/components/phase-one/`銆?
鏂板缁勪欢锛?
- `BrandMark`
- `SplashScreen`
- `WorksHome`
- `CreateWorkModal`
- `WebAiPromptModal`
- `types`

鏈疆涓昏淇敼鏂囦欢锛?
- `frontend/app/page.tsx`
- `frontend/app/layout.tsx`
- `frontend/app/globals.css`
- `frontend/components/phase-one/*`
- `frontend/public/assets/yixie-splash-hero.png`

楠岃瘉缁撴灉锛?
- 宸查€氳繃鍓嶇 TypeScript 璇箟妫€鏌ャ€?- 宸茶繍琛?`next build`锛屾瀯寤洪€氳繃銆?- 宸查噸鍚墠绔瑙堟湇鍔★紝`http://127.0.0.1:3000/` 杩斿洖 200銆?- 宸查獙璇佸紑灞忛〉鍖呭惈涓绘爣棰樸€佸壇鏍囬銆佽交閲忕櫥褰曞叆鍙ｅ拰鍗曚竴銆屽紑濮嬪垱浣溿€岰TA銆?
褰卞搷鑼冨洿锛?
- 鏈疆鏈敼鍔ㄥ悗绔帴鍙ｅ拰鏁版嵁搴撶粨鏋勩€?- 鍘熷畬鏁村啓浣滃伐浣滃彴娌℃湁浣滀负棣栧睆缁х画灞曠ず锛屽綋鍓嶉椤靛叆鍙ｈ鏀舵暃涓虹涓€闃舵涓昏矾寰勶紱鍚庣画鍙啀浠庝綔鍝佸崱杩涘叆姝ｅ紡鍐欎綔宸ヤ綔鍙般€?- Web AI 妯″紡浠嶄负鎵嬪姩澶嶅埗 / 绮樿创鍥炲～锛屼笉鑷姩璇诲彇绗笁鏂圭綉椤?AI 杩斿洖鍐呭銆?
## 2026-06-07 绗簩闃舵鍒涗綔宸ヤ綔鍙颁笌淇濆瓨闂幆

鏈疆鍩轰簬绗竴闃舵涓昏矾寰勭户缁ˉ榻愨€滄柊寤轰綔鍝?-> 寮€涔﹀悜瀵?-> Web AI 鍥炲～纭 -> 淇濆瓨 -> 姝ｅ紡鍐欎綔宸ヤ綔鍙扳€濈殑鏈€灏忛棴鐜€備粛鐒朵笉瀹炵幇鎶€鑳藉箍鍦恒€侀暱绡囪蹇嗗畬鏁磋兘鍔涖€丱OC/浼忕瑪妫€鏌ュ畬鏁磋兘鍔涖€佹敮浠樹細鍛樸€佺Щ鍔ㄧ瀹屾暣閫傞厤銆侀噸绀惧尯鍜屽鍑哄彂甯冦€?
宸插畬鎴愶細

- 鏂板缓浣滃搧寮圭獥閫夋嫨鍒涗綔鏂瑰紡鍚庯紝涓嶅啀鐩存帴鍋滅暀鍦ㄩ椤碉紝鑰屾槸杩涘叆寮€涔﹀悜瀵煎伐浣滃彴銆?- 鏂板寮€涔﹀悜瀵煎伐浣滃彴锛?  - 椤堕儴灞曠ず娴佺▼杩涘害锛氳剳娲炪€佽祫鏂欍€佺涓€绔犻鏋躲€佺涓€绔犺崏绋裤€佺‘璁ゅ垱寤恒€?  - 宸︿晶灞曠ず浣滃搧淇℃伅鍜岄€愭娌夋穩璧勬枡銆?  - 涓棿灞曠ず寮€涔﹂棶棰樸€丄I 鏁寸悊鏂瑰悜鍜屼笅涓€姝ユ搷浣溿€?  - 鍙充晶淇濈暀闄嶅櫔鐗?AI 鍓┚锛屽彧鏄剧ず褰撳墠涓嬩竴姝ャ€丄I 寤鸿鍜屽凡纭鍐呭銆?  - 搴曢儴淇濈暀鏈湴浣撻獙銆佺綉椤?AI銆丄PI 鐩磋繛涓夌鐢熸垚鏂瑰紡鍏ュ彛銆?- Web AI Prompt 寮圭獥璋冩暣涓衡€滃鍒?Prompt -> 绮樿创缁撴灉 -> 瑙ｆ瀽纭鈥濓紝瑙ｆ瀽鎴愬姛鍚庤繘鍏ョ嫭绔嬬‘璁ら〉銆?- 鏂板 AI 缁撴灉鍥炲～ / 瑙ｆ瀽纭椤碉細
  - 灞曠ず鍘熷 AI 杩斿洖鍐呭銆?  - 灞曠ず绯荤粺璇嗗埆鍑虹殑浣滃搧鏍囬銆侀鏉愩€佹牳蹇冨崠鐐广€佷汉鐗┿€佺涓€绔犳爣棰樸€佺涓€绔犳鏂囥€佹憳瑕併€佹柊澧炰紡绗斻€佷笅涓€绔犲缓璁€?  - 瑙ｆ瀽瀛楁鏀寔鍦ㄧ‘璁ら〉鍐呯紪杈戙€?  - 鎻愪緵鍥涚淇濆瓨鏂瑰紡锛氫粎鎻掑叆缂栬緫鍣ㄣ€佷繚瀛樹负涓存椂鑽夌銆佽В鏋愪负浣滃搧璧勬枡銆佷繚瀛樹负姝ｅ紡浣滃搧銆?- 鏈櫥褰曠敤鎴风偣鍑烩€滀繚瀛樹负姝ｅ紡浣滃搧鈥濇椂寮瑰嚭鐧诲綍 / 娉ㄥ唽寮圭獥銆?- 鐧诲綍鎴愬姛鍚庝細缁х画鍒氭墠鐨勬寮忎繚瀛樺姩浣滐紝涓嶄涪澶?Web AI 绮樿创鍜岃В鏋愮粨鏋溿€?- 姝ｅ紡淇濆瓨鍚庤繘鍏ユ寮忓啓浣滃伐浣滃彴銆?- 鏂板姝ｅ紡鍐欎綔宸ヤ綔鍙颁笁鏍忓竷灞€锛?  - 宸︿晶绔犺妭澶х翰鍜岃祫鏂欏簱銆?  - 涓棿姝ｆ枃缂栬緫鍣ㄤ笌鍦烘櫙鎵╁啓杈撳叆銆?  - 鍙充晶 AI 鍓┚锛屽寘鍚綋鍓嶄笅涓€姝ャ€丄I 寤鸿銆佺画鍐欏姪鎵嬨€佽鑹?OOC 妫€鏌ュ崰浣嶃€佷紡绗旀鏌ュ崰浣嶃€侀暱绡囪蹇嗗崰浣嶃€?- 鎵€鏈夊叧閿搷浣滆ˉ鍏呭熀纭€ loading / success / error 鐘舵€侊細
  - 杩涘叆鍚戝銆?  - 澶嶅埗 Prompt銆?  - 瑙ｆ瀽 Web AI 缁撴灉銆?  - 淇濆瓨涓存椂鑽夌銆?  - 瑙ｆ瀽涓轰綔鍝佽祫鏂欍€?  - 淇濆瓨姝ｅ紡浣滃搧銆?  - 鐧诲綍鍚庣户缁繚瀛樸€?  - 宸ヤ綔鍙颁繚瀛樼珷鑺傘€?
鏂板缁勪欢锛?
- `CreationGuideWorkspace`
- `AiResultReview`
- `WritingWorkspace`

涓昏淇敼鏂囦欢锛?
- `frontend/app/page.tsx`
- `frontend/components/phase-one/types.ts`
- `frontend/components/phase-one/WebAiPromptModal.tsx`
- `frontend/components/phase-one/CreationGuideWorkspace.tsx`
- `frontend/components/phase-one/AiResultReview.tsx`
- `frontend/components/phase-one/WritingWorkspace.tsx`

楠岃瘉缁撴灉锛?
- 宸查€氳繃鍓嶇 TypeScript 璇箟妫€鏌ャ€?- 宸茶繍琛?`next build`锛屾瀯寤洪€氳繃銆?- 宸查噸鍚墠绔瑙堟湇鍔★紝`http://127.0.0.1:3000/` 杩斿洖 200銆?
褰卞搷鑼冨洿锛?
- 鏈疆浠嶆湭鏀瑰姩鍚庣鎺ュ彛銆佹暟鎹簱缁撴瀯鍜岀湡瀹炶处鍙锋寔涔呭寲閫昏緫銆?- 姝ｅ紡淇濆瓨褰撳墠涓哄墠绔唴瀛樻€侀棴鐜紝鍒锋柊鍚庝笉浼氳惤鍒扮湡瀹炲悗绔紱鐪熷疄浜戠淇濆瓨闇€瑕佸悗缁帴鍏ョ幇鏈夊悗绔綔鍝?绔犺妭鎺ュ彛銆?- 鍙充晶 AI 鍓┚涓殑 OOC銆佷紡绗斻€侀暱绡囪蹇嗕负鍗犱綅/鎽樿灞曠ず锛屾病鏈夊疄鐜板畬鏁存鏌ラ€昏緫銆?
## 2026-06-04 Web AI 妯″紡琛ュ厖

鏈疆鏂板鈥淲eb AI 妯″紡鈥濓紝鐢ㄤ簬鏈帴 API 鎴栫敤鎴蜂富鍔ㄩ€夋嫨缃戦〉 GPT/Gemini 鏃剁殑鍗婅嚜鍔ㄥ崗浣滄祦绋嬨€傚浘绋夸粎浣滀负娴佺▼鍙傝€冿紝瀹為檯 UI 寤剁画鐜版湁娴呰壊銆佺焊寮犳劅銆佽交缃戞牸宸ヤ綔鍙伴鏍硷紝娌℃湁鐓ф惉娴锋姤甯冨眬銆?
宸插畬鎴愶細

- 涓夌妯″紡鍏卞瓨锛氭湰鍦版ā寮忋€乄eb AI 妯″紡銆丄PI 妯″紡銆?- 妯″瀷闈㈡澘鏂板妯″紡鍒囨崲鍏ュ彛锛屽苟灞曠ず褰撳墠妯″紡銆丄I 鏉ユ簮銆佸綋鍓嶄换鍔°€佺粨鏋滄潵婧愩€?- 鍙充晶 AI 鍓┚鏂板鈥淲eb鈥濇爣绛鹃〉锛屼綔涓?Web AI 鍗忎綔闈㈡澘銆?- Web AI 鍗忎綔闈㈡澘鏀寔锛?  - 閫夋嫨 GPT Web銆丟emini Web銆佸叾浠?Web銆?  - 閫夋嫨浠诲姟绫诲瀷锛氬紑绡囬棶绛斾笅涓€棰樸€佹暣鐞嗕綔鍝佽祫鏂欍€佺敓鎴愮涓€绔犮€佺煭鐢婚潰鎵╁啓銆佸崱鏂囨€ユ晳銆?  - 棰勮缁撴瀯鍖?Prompt銆?  - 涓€閿鍒?Prompt銆?  - 绮樿创缃戦〉 AI 杩斿洖鍐呭銆?  - 瑙ｆ瀽骞跺簲鐢?JSON 缁撴灉銆?  - 鏄剧ず瑙ｆ瀽澶辫触鍜屽簲鐢ㄦ垚鍔熸彁绀恒€?- 鏂板鍓嶇 Prompt Builder锛歚frontend/lib/web-ai.ts`銆?  - 鏍规嵁褰撳墠浣滃搧銆佽剳娲炪€侀鏉愩€侀鏍笺€佺珷鑺傘€侀棶绛斿巻鍙层€佷綔鍝佽祫鏂欒崏绋裤€佷富瑙掋€佷笘鐣岃鍒欏拰鐢ㄦ埛杈撳叆鐢熸垚缁撴瀯鍖?Prompt銆?  - Prompt 鏄庣‘瑕佹眰缃戦〉 AI 鎸夌敤鎴烽鏉愬垽鏂紝閬垮厤寮鸿濂楃巹骞?閫€濠氭祦/绯荤粺娴佹ā鏉裤€?  - Prompt 鏄庣‘瑕佹眰鍙緭鍑哄悎娉?JSON锛屼笉杈撳嚭 Markdown 鎴栬В閲婃枃瀛椼€?- Web AI JSON 瑙ｆ瀽鏀寔锛?  - 鐩存帴绮樿创绾?JSON銆?  - 浠?```json 浠ｇ爜鍧椾腑鎻愬彇 JSON銆?  - 褰撳洖绛斿墠鍚庢湁灏戦噺瑙ｉ噴鏂囧瓧鏃讹紝灏濊瘯鎻愬彇绗竴涓悎娉?JSON 瀵硅薄銆?- Web AI 缁撴灉搴旂敤鏀寔锛?  - `opening_next_question`锛氳拷鍔?Web AI 鐢熸垚鐨勫紑绡囪拷闂€侀€夐」銆佸師鍥犮€佸奖鍝嶏紝骞舵爣璁版潵婧愩€?  - `novel_draft`锛氭洿鏂颁綔鍝佽祫鏂欒崏绋裤€?  - `first_chapter`锛氬啓鍏ュ綋鍓嶇珷鑺傛爣棰樸€佹鏂囧拰鎽樿銆?  - `chapter_expand`锛氬啓鍏?AI 姝ｆ枃鑽夌鍖猴紝淇濈暀鎻掑叆姝ｆ枃鎸夐挳銆?  - `chapter_rescue`锛氬睍绀哄崱鏂囨€ユ晳鏂规鍗★紝鍙户缁彃鍏ユ鏂囥€?- 鍔ㄦ€佸紑绡囬棶绛斻€佺涓€绔犵敓鎴愩€佺煭鐢婚潰鎵╁啓銆佸崱鏂囨€ユ晳鏃佽竟宸插鍔?Web AI Prompt 鍏ュ彛銆?- 缁撴灉鏉ユ簮浼氭爣璁颁负 GPT Web / Gemini Web / 鍏朵粬 Web锛屼笉娣峰悓涓哄悗绔?Skill 鎴栨湰鍦?fallback銆?
楠岃瘉缁撴灉锛?
- `cd frontend && npm run build` 宸查€氳繃銆?- `cd backend && mvn -DskipTests compile` 宸查€氳繃銆?
鏈畬鎴愶細

- 鏈疆涓嶆帴鍏?Gemini API锛屼笉鏂板妯″瀷 API锛屼笉鍋氬妯″瀷骞跺彂銆?- Web AI 妯″紡涓嶄細鑷姩鎵撳紑缃戦〉 GPT/Gemini锛屼篃涓嶄細鑷姩璇诲彇缃戦〉鍥炵瓟锛屼粛鐢辩敤鎴峰鍒?绮樿创瀹屾垚銆?- Web AI 缁撴灉鐩墠鍙簲鐢ㄥ埌鍓嶇褰撳墠宸ヤ綔鍖猴紱鐪熷疄璐﹀彿涓嬫槸鍚︾珛鍗冲叆搴撲粛渚濊禆鐢ㄦ埛鍚庣画淇濆瓨绔犺妭/浣滃搧璧勬枡娴佺▼銆?
## 2026-06-04 浜や簰闂淇琛ュ厖

閽堝鏈€鏂颁綋楠岃蛋鏌ヤ腑鏆撮湶鐨?3 涓棶棰橈紝宸插湪 `frontend/app/page.tsx` 鍋氳ˉ鍏呬慨澶嶏細

- 鐧诲綍鍚庤处鍙烽潰鏉夸笉鍐嶇户缁毚闇茬敤鎴峰悕/瀵嗙爜杈撳叆妗嗭紱鐧诲綍鎴栧垏鎹㈡湰鍦拌处鍙锋垚鍔熷悗浼氭竻绌哄瘑鐮併€佹敹璧疯处鍙烽潰鏉匡紝鍐嶆鎵撳紑鏃跺睍绀哄綋鍓嶈处鍙枫€佸悗绔姸鎬佸拰閫€鍑虹櫥褰曞叆鍙ｃ€?- 妯″瀷鎺ュ叆鐘舵€佸凡鏄炬€у寲锛氭ā鍨嬮潰鏉挎柊澧炩€滄ā鍨嬫帴鍏ョ姸鎬佲€濆拰妯″瀷瑙掕壊鍒楄〃锛屽睍绀哄垱浣滄ā鍨嬨€佽蹇嗘ā鍨嬨€佸绋挎ā鍨嬨€丄gent 妯″瀷锛涘綋濉啓 DeepSeek 鍙傛暟浣嗕粛澶勪簬鏈湴璐﹀彿鏃讹紝浼氭槑纭彁绀衡€滃凡濉啓鍙傛暟锛屾湰鍦拌处鍙蜂笉浼氱湡瀹炶皟鐢ㄥ悗绔?Skill鈥濓紝鐪熷疄璐﹀彿杩炴帴鍚庢墠浼氫紭鍏堣皟鐢ㄥ悗绔?Skill銆?- 姝ｆ枃鍖虹伒鎰熷拰鎵╁啓浜や簰宸茶ˉ鍙嶉锛氱偣鍑荤伒鎰熶細鎶婂唴瀹归€佸叆鐭敾闈㈡墿鍐欒緭鍏ユ骞舵彁绀轰笅涓€姝ワ紱姝ｆ枃 AI 鎵╁啓鍦ㄧ煭鐢婚潰涓虹┖鏃朵細鑷姩浣跨敤閫変腑鏂囨湰銆佺珷鑺傚熬娈垫垨绔犺妭鏍囬浣滀负杈撳叆锛屼笉鍐嶉潤榛樻棤鍙嶅簲锛涢€変腑鏂囨湰鍚庣殑娑﹁壊/鎵╁啓/閲嶅啓浼氬啓鍏ョ敓鎴愯緭鍏ュ苟缁欏嚭鍙鎻愮ず銆?
楠岃瘉缁撴灉锛?
- `frontend npm run build` 宸查€氳繃銆?- `backend mvn -DskipTests compile` 宸查€氳繃銆?- 褰撳墠鍓嶇棰勮宸查噸鏂板惎鍔紝`http://127.0.0.1:3000` 杩斿洖 200銆?- 褰撳墠鍚庣 `http://127.0.0.1:8080/v3/api-docs` 杩斿洖 200銆?
## 褰撳墠鍒ゆ柇

椤圭洰澶勫湪鈥滃彲浜や簰鍓嶇鍘熷瀷 + 鍚庣 Skill/Agent 宸ヤ綔娴佸凡瀹屾垚鐪熷疄 PostgreSQL HTTP 闂幆楠岃瘉鈥濋樁娈点€傚墠绔凡鑳芥敮鎾戞湰鍦拌处鍙枫€佹湰鍦颁綔鍝併€佸浣滃搧鍒囨崲銆佷綔鍝佸簱绠＄悊銆佷綔鍝佹€昏銆佸姩鎬佸紑绡囬棶绛斻€佺煭鐢婚潰鎵╁啓銆佸崱鏂囨€ユ晳銆佷笘鐣岃鍥捐氨鍜?AI 鑷姩寮€涔﹀叆鍙ｃ€傚悗绔凡琛ラ綈澶氫釜 Skill 鎺ュ彛锛屽苟鏂板鍙璁°€佸彲鏌ヨ銆佸彲鍙栨秷鐨?Novel Creation Agent Task MVP锛涙湰杞凡鍦?PostgreSQL 17 娴嬭瘯瀹炰緥涓婅窇閫氭敞鍐屻€佺櫥褰曘€丣WT銆佷綔鍝併€佺珷鑺傘€丩ore銆佹ā鍨嬮厤缃€丼kill 鎺ュ彛銆丄gent Task `FIXED_WORKFLOW` 鍜?`AUTO` 鐨勭湡瀹?HTTP + 鏁版嵁搴撳啓鍏ラ棴鐜€俙mvn -DskipTests compile`銆乣npm run build`銆佸墠绔?dev server 椤甸潰鍔犺浇鍧囧凡閫氳繃銆?
## 宸插畬鎴?
### 鍓嶇浣撻獙

- 棣栭〉宸叉敼涓衡€滆剳娲炲叆鍙ｂ€濓紝灞曠ず鑴戞礊鎷嗚В銆侀粍閲戠涓€绔犮€佺煭鐢婚潰鎵╁啓銆佸崱鏂囨€ユ晳銆侀暱绡囪蹇嗐€佷紡绗?OOC 妫€鏌ョ瓑鐗硅壊銆?- 宸插疄鐜颁笁鏍忓垱浣滃伐浣滃彴锛氬乏渚т綔鍝佽祫浜с€佷腑蹇冩鏂囩紪杈戙€佸彸渚?AI 鍓┚銆?- 宸插疄鐜版湰鍦拌处鍙枫€佹湰鍦颁綔鍝佸垪琛ㄣ€佹湰鍦颁綔鍝佸垏鎹㈠拰姣忎釜浣滃搧鐙珛鎸佷箙鍖栥€?- 宸叉柊澧炰綔鍝佸簱 / 浣滃搧绠＄悊鍏ュ彛锛?  - 椤堕儴淇濈暀浣滃搧涓嬫媺锛屽苟澧炲己涓衡€滀綔鍝佸悕 + 鐘舵€?+ 鏈€杩戞洿鏂版椂闂粹€濄€?  - 鏂板浣滃搧搴撳脊绐楋紝灞曠ず浣滃搧鍗＄墖鍒楄〃銆?  - 浣滃搧鍗＄墖鍖呭惈浼皝闈€佷綔鍝佸悕銆佷竴鍙ヨ瘽鍗栫偣銆佺姸鎬併€佸瓧鏁般€佺珷鑺傛暟銆佹渶杩戞洿鏂版椂闂淬€?  - 鏀寔鎸夊叧閿瘝鎼滅储浣滃搧锛屾寜鐘舵€佺瓫閫夛紝鎸夋渶杩戠紪杈?鏈€杩戝垱寤?瀛楁暟/鏍囬鎺掑簭銆?  - 鐐瑰嚮浣滃搧鍗＄墖鍙睍寮€鍙充晶璇︽儏鍗★紝鐐瑰嚮鈥滆繘鍏ュ垱浣溾€濆垏鎹㈠綋鍓嶄綔鍝侊紝鍏煎鏈湴璐﹀彿妯″紡銆?  - 鏀寔鏈湴涓婁紶灏侀潰锛岄鐣?AI 鐢熸垚灏侀潰鍏ュ彛锛屽綋鍓嶄互灏侀潰鍗犱綅閲嶆柊鐢熸垚涓?MVP銆?- 宸插寮轰綔鍝佹€昏锛?  - 椤堕儴灞曠ず浣滃搧灏侀潰銆佷綔鍝佸悕銆佺姸鎬併€佸瓧鏁般€佺珷鑺傛暟銆佹渶杩戞洿鏂版椂闂淬€?  - 淇濈暀骞跺睍绀虹畝浠?鍗栫偣銆佸叏灞€澶х翰銆佷富瑙掋€佷笘鐣岃鍒欍€佺珷鑺傚垪琛ㄥ拰鍒涗綔缁熻銆?  - 鍒涗綔缁熻宸插寘鍚嵎鏁般€佷汉鐗╂暟銆佷紡绗旀暟銆佸凡鍙戝竷绔犺妭鏁扮瓑娲剧敓鏁版嵁銆?  - 宸︿晶宸ヤ綔鍙版€昏鏂板鎶樺彔寮忊€滃叏灞€澶х翰鈥濈紪鍙峰垪琛紝渚夸簬闀跨瘒銆佸鍗枫€佸绔犺妭蹇€熸壂鎻忋€?  - 宸ヤ綔鍙颁綔鍝佸皝闈㈠崱鏀寔鏈湴鎹㈠皝闈紝浣滃搧搴撹鎯呮敮鎸佷笂浼犲皝闈㈠拰 AI 灏侀潰鍗犱綅鍏ュ彛銆?- 宸插崌绾у紩瀵煎紡寮€绡囬棶绛?/ 鍒涗綔鍚戝锛?  - 鏀寔杈撳叆鏍囬銆佽剳娲炪€佺被鍨嬨€侀鏍笺€?  - 鏀寔淇濆瓨闂瓟鍘嗗彶锛屽苟鎸佷箙鍖栧埌鏈湴 workspace銆?  - 鏀寔鏍规嵁鍓嶅簭鍥炵瓟鍔ㄦ€佽拷闂?3-6 涓棶棰樸€?  - 鏈湴 fallback 瑕嗙洊鐜勫够銆佷粰渚?淇湡銆侀兘甯傘€佺骞汇€佹偓鐤戙€佸コ棰戝浠囥€佸墤涓庨瓟娉曘€佺郴缁熸祦銆侀€€濠氭祦銆佹棤闄愭祦绛夊紑灞€鏂瑰悜銆?  - 闂瓟瀹屾垚鍚庣敓鎴愪綔鍝佽祫鏂欒崏绋匡紝鐢ㄦ埛纭鍚庣敓鎴愮涓€绔犳爣棰樺拰姝ｆ枃銆?  - 绗竴绔犳鏂囪嚜鍔ㄥ啓鍏ュ綋鍓嶇珷鑺傜紪杈戝櫒锛屽苟鍚屾绔犺妭鍒楄〃銆佸瓧鏁般€佷綔鍝佽祫鏂欍€佽瀹氥€佺伒鎰熷拰涓栫晫瑙傚浘璋便€?  - 鍚庣鍙敤鏃朵紭鍏堝鐢?`/api/novels/draft` 鍜?`/api/chapters/expand`锛屽け璐ユ椂鑷姩 fallback銆?- 宸蹭繚鐣欐柊寤轰綔鍝佺‘璁ゆ祦绋嬶細鏍囬 + 鑴戞礊 -> 鐢熸垚浣滃搧璧勬枡鑽夌 -> 鐢ㄦ埛缂栬緫纭 -> 姝ｅ紡鍒涘缓銆?- 宸插疄鐜扮珷鑺傜紪杈戙€佹柊寤恒€佸垹闄ゃ€佷繚瀛樸€佸彂甯冩爣璁般€佸瓧鏁扮粺璁°€?- 宸插疄鐜拌瀹氬簱鍩虹 CRUD銆佹悳绱€佸垎绫汇€佹爣绛俱€佽鑹茬珛缁?Prompt 瀛楁銆?- 宸插疄鐜扮伒鎰熻褰曘€佸垹闄ゃ€佸洖濉埌鐭敾闈㈣緭鍏ャ€?- 宸插疄鐜扮煭鐢婚潰鎵╁啓鍏ュ彛锛氫紭鍏堣皟鐢ㄥ悗绔?Skill锛屽け璐ユ垨鏈湴璐﹀彿鏃朵娇鐢ㄦ湰鍦?fallback銆?- 宸插疄鐜板崱鏂囨€ユ晳鏂规鍗★細浼樺厛璋冪敤鍚庣 Skill锛屽け璐ユ垨鏈湴璐﹀彿鏃剁敓鎴?3 涓湰鍦版柟妗堬紝鐐瑰嚮鍗＄墖鎻掑叆姝ｆ枃銆?- 宸插疄鐜颁笘鐣岃鍥捐氨 / 鏁呬簨鍏崇郴鍥捐氨鍓嶇 MVP锛?  - 鍥捐氨鑺傜偣锛氫綔鍝併€佸嵎銆佺珷鑺傘€佷汉鐗┿€佸娍鍔涖€佸湴鐐广€佷簨浠躲€佷紡绗斻€?  - 鍥捐氨鍏崇郴锛氱珷鑺傚綊灞炪€佸嚭鍦恒€佸睘浜庝綔鍝併€侀挬瀛愬叧鑱斻€佸墽鎯呴┍鍔ㄧ瓑銆?  - 鏀寔绛涢€夈€佺缉鏀俱€佹嫋鎷借妭鐐广€佺偣鍑昏妭鐐规煡鐪嬭鎯呫€?  - 鏀寔鎵嬪姩鏂板鑺傜偣銆佹墜鍔ㄦ柊澧炲叧绯汇€佺紪杈戣妭鐐规爣棰?绫诲瀷/璇存槑銆佹爣璁伴噸瑕佽妭鐐广€?
### 鍚庣 Skill 涓庢帴鍙?
- 宸叉柊澧為€氱敤鎺ュ彛锛歚NovelSkill<I, O>`銆?- 宸叉柊澧炴柊寤轰綔鍝佽崏绋挎帴鍙ｏ細
  - `POST /api/novels/draft`
  - `POST /api/novels/confirm`
- 宸叉柊澧炵煭鐢婚潰鎵╁啓 Skill锛?  - `ChapterExpansionSkill`
  - `POST /api/chapters/expand`
- 宸叉柊澧炲崱鏂囨€ユ晳 Skill锛?  - `ChapterRescueSkill`
  - `POST /api/chapters/rescue`
- 宸叉柊澧炰笘鐣岃鍥捐氨 Skill锛?  - `StoryGraphSkill`
  - `POST /api/story-graph/generate`
  - `GET /api/story-graph/{novelId}`
- Skill 鍧囦紭鍏堝鐢ㄧ幇鏈?`AiService` 鍜岀敤鎴锋ā鍨嬮厤缃€昏緫锛屾ā鍨嬪け璐ユ椂杩斿洖瑙勫垯 fallback銆?- 宸蹭慨澶嶅悗绔紪璇戝熀纭€闂锛?  - 鍥哄畾 Lombok 鐗堟湰骞堕厤缃?Maven annotation processor銆?  - 淇 `AIServiceImpl` 绫诲悕涓?Spring AI `1.0.0-M1` 鍖呭悕銆?  - 琛ラ綈 `ChapterService`銆乣NovelService`銆乣LoreService` 鐨?UUID 鍒犻櫎鏂规硶濂戠害銆?
### Agent Task MVP

- 宸叉柊澧炶嚜鍔ㄥ垱浣滀唬鐞嗕换鍔″熀纭€鑳藉姏锛岀涓€鐗堜负鍚屾鎵ц鐨勫悗绔伐浣滄祦鏈嶅姟锛屾湭鎺ュ叆澶嶆潅澶栭儴 Agent SDK銆?- 宸叉柊澧?Agent 鎺堟潈銆佷换鍔°€佹楠ゃ€佹墽琛屾棩蹇楀洓绫绘寔涔呭寲琛細
  - `agent_authorization`
  - `agent_task`
  - `agent_task_step`
  - `agent_execution_log`
- 宸叉柊澧?Agent 鎺堟潈鎺ュ彛锛?  - `POST /api/agent-authorizations`
  - `DELETE /api/agent-authorizations/{authorizationId}`
- 宸叉柊澧炲皬璇村垱寤?Agent Task 鎺ュ彛锛?  - `POST /api/agent-tasks/novel-creation`
  - `GET /api/agent-tasks/{taskId}`
  - `GET /api/agent-tasks/{taskId}/logs`
  - `POST /api/agent-tasks/{taskId}/cancel`
- 宸叉柊澧?`NovelCreationAgentWorkflow`锛屾墽琛屾祦绋嬪寘鍚細
  - 鏍￠獙鎺堟潈褰掑睘銆佺姸鎬併€佽繃鏈熸椂闂村拰 scopes銆?  - 鍒涘缓 `agent_task` 骞惰褰曡緭鍏ュ揩鐓с€?  - 鎵ц `CREATE_DRAFT`锛屽鐢?`NovelDraftService`銆?  - 鎵ц `CONFIRM_NOVEL`锛屽鐢ㄦ柊寤轰綔鍝佺‘璁ゆ祦绋嬨€?  - 鍙€夋墽琛?`GENERATE_FIRST_CHAPTER`锛屽鐢?`ChapterExpansionSkill`銆?  - 鎵ц `SAVE_CHAPTER`锛屼繚瀛樼涓€绔犳鏂囥€?  - 鍙€夋墽琛?`GENERATE_STORY_GRAPH`锛屽鐢?`StoryGraphSkill`銆?  - 姣忎竴姝ュ啓鍏?`agent_task_step` 鍜?`agent_execution_log`銆?  - 鎴愬姛鍐欏叆 `novelId`銆乣chapterId`銆乣chapterTitle`銆佸浘璋辫妭鐐?鍏崇郴缁熻绛夌粨鏋溿€?- 宸插皢 Novel Creation Agent Workflow 鐨勬瘡涓楠ゅ皝瑁呬负 Tool锛?  - `create_novel_draft`
  - `confirm_novel`
  - `generate_first_chapter`
  - `save_first_chapter`
  - `generate_story_graph`
- 宸叉柊澧?`AgentRunnerService`锛?  - `FIXED_WORKFLOW`锛氫娇鐢ㄥ浐瀹氶『搴忓伐鍏峰寲 workflow銆?  - `RESPONSES_API`锛氬湪鐢ㄦ埛妯″瀷閰嶇疆涓?OpenAI Responses API 鏃讹紝閫氳繃 `/responses` 宸ュ叿璋冪敤寰幆璁╂ā鍨嬮€夋嫨骞惰皟鐢ㄥ伐鍏枫€?  - `AUTO`锛氬彲鐢?Responses API 鏃朵紭鍏堜娇鐢紝鍚﹀垯鍥為€€鍥哄畾 workflow銆?  - `AGENTS_SDK`锛氫繚鐣欎负鏈潵 SDK 閫傞厤妯″紡锛涘綋鍓?Java 鍚庣娌℃湁鐩存帴鎺ュ叆澶栭儴 Agents SDK锛屼粛鍥為€€鍥哄畾 workflow銆?- `POST /api/agent-tasks/novel-creation` 宸叉敮鎸?`runnerMode` 鍙傛暟锛歚AUTO`銆乣FIXED_WORKFLOW`銆乣RESPONSES_API`銆乣AGENTS_SDK`銆?- 宸插皢鍘?`NovelDraftController` 涓殑鑽夌鐢熸垚涓庣‘璁ゅ垱寤洪€昏緫鎶藉嚭涓?`NovelDraftService`锛屼緵鍘熸帴鍙ｅ拰 Agent Workflow 鍏辩敤銆?- 鍓嶇鍙充晶 AI 鍓┚宸叉柊澧炩€滀唬鐞嗏€濇爣绛鹃〉锛?  - 杈撳叆鏍囬銆佽剳娲炪€佺被鍨嬨€侀鏍笺€?  - 鍕鹃€夎嚜鍔ㄧ敓鎴愮涓€绔犮€佽嚜鍔ㄧ敓鎴愪笘鐣岃鍥捐氨銆?  - 鏀寔閫夋嫨 Runner锛氳嚜鍔ㄣ€佸浐瀹?Workflow銆丷esponses API 宸ュ叿璋冪敤銆丄gents SDK 鍏煎妯″紡銆?  - 鐐瑰嚮鈥滄巿鏉冨苟寮€濮嬧€濆悗渚濇璋冪敤鎺堟潈鎺ュ彛鍜?Agent Task 鎺ュ彛銆?  - 灞曠ず浠诲姟鐘舵€併€佹楠ゅ垪琛ㄣ€佹棩蹇楀垪琛ㄣ€佹垚鍔熺粨鏋滃拰鈥滆繘鍏ュ垱浣溾€濇寜閽€?  - 鏈湴璐﹀彿妯″紡涓嶈皟鐢?Agent 鎺ュ彛锛屼笉褰卞搷鐜版湁鍔ㄦ€佸紑绡囬棶绛斻€?
### 妯″瀷涓?API

- 鍓嶇宸叉彁渚涙ā鍨?API 璁剧疆鍏ュ彛锛歅rovider銆丅ase URL銆佹ā鍨嬪悕銆丄PI Key銆?- 宸叉敮鎸?DeepSeek銆丱penAI銆佺鍩烘祦鍔ㄣ€丱penRouter銆佽嚜瀹氫箟绛?OpenAI-compatible 閰嶇疆銆?- 宸插疄鐜版ā鍨嬫祴璇曞叆鍙ｃ€?- 鍚庣宸叉坊鍔犵敤鎴锋ā鍨嬮厤缃〃銆丄PI Key 鍔犲瘑/瑙ｅ瘑鏈嶅姟鍜?OpenAI-compatible 璋冪敤閫昏緫銆?
### 鏂囨。涓庡伐绋?
- 鍓嶇 `next build` 宸查€氳繃銆?- 鍚庣 `mvn -DskipTests compile` 宸查€氳繃銆?- 鍓嶇鍙湪 `http://127.0.0.1:3000/` 璁块棶銆?- 宸茶ˉ鍏?`docs/E2E_TESTING.md`锛屽寘鍚悗绔惎鍔ㄣ€佸墠绔惎鍔ㄣ€佹暟鎹簱鍒濆鍖栥€丷edis 妫€鏌ャ€佹敞鍐?鐧诲綍 curl銆佷綔鍝?绔犺妭 curl銆丩ore curl銆佹ā鍨嬮厤缃?curl銆丼kill curl銆丄gent Task curl 鍜屽父瑙侀敊璇帓鏌ャ€?- 宸茶ˉ鍏?README 鐨勭幆澧冨彉閲忋€丳ostgreSQL schema 鍒濆鍖栥€丷edis 妫€鏌ュ拰 E2E 鎸囧崡鍏ュ彛銆?- 宸叉坊鍔?Node 20 鍚姩鑴氭湰锛?  - `frontend/start-node20.bat`
  - `frontend/start-preview-node20.bat`
- 鏃ф枃妗ｅ凡褰掓。鍒?`docs/archive/`銆?
### 2026-06-04 绔埌绔獙璇佷笌淇

- 閰嶇疆楠岃瘉锛?  - `application.yml` 宸叉敼涓洪€氳繃 `DB_HOST`銆乣DB_PORT`銆乣DB_NAME`銆乣DB_SCHEMA`銆乣DB_USERNAME`銆乣DB_PASSWORD` 閰嶇疆 PostgreSQL銆?  - `AI_MODEL`銆乣AI_TEMPERATURE`銆乣AI_MAX_TOKENS` 宸叉湁鐜鍙橀噺鍏ュ彛锛宍AI_API_KEY`銆乣AI_BASE_URL` 鍦?`.env.example` 涓?README 涓鏄庢竻鏅般€?  - `.env.example` 宸茶ˉ榻愭暟鎹簱銆丷edis銆丣WT銆丄I銆佸姞瀵嗐€佸墠绔簮銆佹棩蹇楃瓑绾х瓑鏈湴鍚姩閰嶇疆銆?  - `JWT_SECRET` 绀轰緥宸叉敼涓鸿嚦灏?32 瀛楃鐨勫紑鍙戝崰浣嶅€笺€?- schema 涓庡疄浣撲竴鑷存€т慨澶嶏細
  - `schema.sql` 宸插幓鎺夊己渚濊禆 pgvector 鐨勬墿灞曞垱寤恒€?  - `lore`銆乣memory_summary`銆乣inspiration`銆乣character_image` 鐨?`embedding` 瀛楁宸蹭粠 `vector(1536)` 璋冩暣涓?`TEXT`锛屼笌褰撳墠瀹炰綋 `String` 瀛楁涓€鑷达紝閬垮厤鏈湴鍒濆鍖栧け璐ャ€?  - 淇 `character_relationship.hatred_value` 瀛楁娉ㄩ噴鎷煎啓銆?  - Agent 鐩稿叧琛ㄤ繚鐣?`agent_authorization`銆乣agent_task`銆乣agent_task_step`銆乣agent_execution_log`锛屼笌 Entity/Mapper 鍛藉悕涓€鑷淬€?- 鍚庣鍚姩淇锛?  - `AIServiceImpl` 宸插皢 `ChatClient` 鏀逛负鍙€変緷璧栥€傛病鏈?Spring AI ChatClient Bean 鏃讹紝浼樺厛浣跨敤鐢ㄦ埛妯″瀷閰嶇疆锛涗粛鏃犲彲鐢ㄦā鍨嬫椂杩斿洖娓呮櫚閿欒锛屼笉鍐嶉樆濉?Spring Boot 鍚姩銆?  - `PlotArc`銆乣StoryState`銆乣WritingSkill` 鍘绘帀涓嶅繀瑕佺殑 `autoResultMap`/Jackson TypeHandler 缁勫悎锛屼慨澶?MyBatis Plus 鍚姩鏃舵姤 `No typehandler found for property id` 鐨勯棶棰樸€?- 鏉冮檺涓庢暟鎹竟鐣屼慨澶嶏細
  - `GET /api/chapter/{id}` 鏀逛负鎸夊綋鍓嶇敤鎴峰綊灞炴牎楠屻€?  - `GET /api/lore/{id}` 鏀逛负鎸夊綋鍓嶇敤鎴峰綊灞炴牎楠屻€?  - 灏忚鏇存柊/鍒犻櫎鍦ㄧ洰鏍囦笉瀛樺湪鎴栦笉褰掑睘褰撳墠鐢ㄦ埛鏃惰繑鍥炴竻鏅扮殑 404 閿欒銆?  - 绔犺妭淇濆瓨/鏇存柊鏃朵細鏍规嵁姝ｆ枃閲嶆柊璁＄畻瀛楁暟銆?- 鏈満楠岃瘉缁撴灉锛?  - `mvn -DskipTests compile` 閫氳繃銆?  - `npm run build` 閫氳繃銆?  - Redis 6379 绔彛鍙繛鎺ャ€?  - 鍚庣鍚姩宸蹭慨澶嶅埌 Tomcat 8080 鍙惎鍔ㄣ€?  - 绗竴杞?PostgreSQL 5432 涓嶅彲杩炴帴锛涢殢鍚庨€氳繃 PostgreSQL 17 涓存椂瀹炰緥鍦?`127.0.0.1:55432` 瀹屾垚鐪熷疄鏁版嵁搴撻獙璇併€?  - `schema.sql` 宸叉垚鍔熷鍏?PostgreSQL 17銆?  - 娉ㄥ唽/鐧诲綍/JWT銆佹湭鐧诲綍 401銆佷綔鍝?CRUD銆佺珷鑺傚垱寤?淇濆瓨/鍒犻櫎銆丩ore 鍒涘缓/淇敼/鍒犻櫎銆佹ā鍨嬮厤缃繚瀛?鏌ヨ銆丼kill 鎺ュ彛銆丄gent Task `FIXED_WORKFLOW`/`AUTO` 鍧囧凡閫氳繃 HTTP 楠岃瘉銆?  - 鏁版嵁搴撳啓鍏ヨ鏁板凡纭锛歚users=2`銆乣novels=5`銆乣chapters=4`銆乣lore=8`銆乣user_model_config=1`銆乣agent_authorization=3`銆乣agent_task=3`銆乣agent_task_step=15`銆乣agent_execution_log=33`銆?  - 璺ㄧ敤鎴疯闂綔鍝併€佺珷鑺傘€丩ore銆丄gent Task 鍧囪繑鍥?403銆?  - 鍓嶇 dev server 鍚姩鎴愬姛锛宍http://localhost:3000` 杩斿洖 200銆?- 鏈疆鏂板淇锛?  - `User` 瀹炰綋琛ㄥ悕鏀逛负杞箟 `"user"`锛岄伩鍏?PostgreSQL 鍏抽敭瀛楀鑷存敞鍐?SQL 澶辫触銆?  - 鏂板鍏ㄥ眬 `UuidTypeHandler`锛岃В鍐?UUID 鍙傛暟鍐欏叆 PostgreSQL 鏃?TypeHandler 缂哄け銆?  - 瀵?User銆丯ovel銆丆hapter銆丩ore銆乁serModelConfig銆丄gentAuthorization銆丄gentTask銆丄gentTaskStep銆丄gentExecutionLog 鐨勫垱寤鸿矾寰勬樉寮忕敓鎴?UUID锛岄伩鍏嶆暟鎹簱榛樿 UUID 鏃犳硶鍥炲～鍒板疄浣撱€?  - `schema.sql` 鏃堕棿瀛楁浠?`TIMESTAMP WITH TIME ZONE` 璋冩暣涓?`TIMESTAMP`锛屽尮閰嶅疄浣?`LocalDateTime`銆?  - 淇妯″瀷閰嶇疆棣栨淇濆瓨璇蛋 update 鐨勯棶棰樸€?  - 鍏ㄥ眬寮傚父鍜?Agent Controller 瀵光€滄湭鐧诲綍/鏃犳潈/涓嶅瓨鍦ㄢ€濊繑鍥?401/403/404锛屼笉鍐嶆妸褰掑睘鏍￠獙鏆撮湶涓?500銆?
## 鏈畬鎴?
### 鍚庣绔埌绔獙璇?
- 鐪熷疄 PostgreSQL HTTP 鏁版嵁闂幆宸插湪鏈満涓存椂 PostgreSQL 17 瀹炰緥瀹屾垚銆?- 褰撳墠鏈厤缃湡瀹?OpenAI 瀹樻柟 Responses API Key锛屽洜姝?`RESPONSES_API` 妯″紡鏈仛鐪熷疄妯″瀷宸ュ叿璋冪敤楠岃瘉锛沗AUTO` 鍦ㄩ潪 OpenAI Responses API 閰嶇疆涓嬪洖閫€鍥哄畾 workflow 鐨勮涓哄凡楠岃瘉銆?- 寮€绡囬棶绛旀殏鏈柊澧炵嫭绔嬪悗绔?`OpeningGuideSkill` / `FirstChapterGenerationSkill`锛屽綋鍓嶅墠绔紭鍏堝鐢ㄥ凡鏈夋帴鍙ｅ苟鎻愪緵鏈湴 fallback銆?- Spring AI 榛樿妯″瀷璋冪敤鐩墠浠嶄娇鐢?`ChatClient.call(Prompt)`锛岃 API 鍦ㄥ綋鍓嶄緷璧栫増鏈腑鏈夎繃鏃惰鍛婏紝鍚庣画搴斿崌绾у埌鏂扮増璋冪敤鍐欐硶銆?- Agent Task 绗竴鐗堜负鍚屾鎵ц锛屽彇娑堟帴鍙ｅ彲姝ｇ‘鏍囪鏈畬鎴愪换鍔★紝浣嗕笉寮哄埗涓柇姝ｅ湪鎵ц鐨勬ā鍨嬭皟鐢ㄧ嚎绋嬨€?- Responses API 宸ュ叿璋冪敤闇€瑕佺敤鎴锋ā鍨嬮厤缃娇鐢?OpenAI 瀹樻柟 Base URL锛歚https://api.openai.com/v1`锛屽苟閰嶇疆鍙敤 API Key锛汥eepSeek/OpenRouter 绛?OpenAI-compatible Chat Completions 閰嶇疆浼氳嚜鍔ㄥ洖閫€鍥哄畾 workflow銆?- 褰撳墠鏈洿鎺ュ紩鍏?OpenAI Agents SDK 渚濊禆锛涘伐鍏峰畾涔夊拰 Runner 鎶借薄宸茬粡棰勭暀 SDK 閫傞厤浣嶇疆銆?
### 浜у搧浣撻獙

- 浣滃搧灏侀潰鐩墠鏄湰鍦颁吉灏侀潰 / 娓愬彉鍗犱綅锛岀湡瀹?AI 鐢熸垚鍜屼笂浼犲埌鍚庣瀵硅薄瀛樺偍灏氭湭瀹屾垚銆?- 浣滃搧搴撶洰鍓嶆槸鍓嶇寮圭獥 MVP锛屽悗绔綔鍝佸厓鏁版嵁杩樻湭瀹屾暣鎸佷箙鍖栫姸鎬併€佸皝闈€佹洿鏂版椂闂淬€?- 寮€绡囬棶绛旂殑鍔ㄦ€佽拷闂洰鍓嶆槸瑙勫垯椹卞姩 fallback锛岀湡瀹炴ā鍨嬮┍鍔ㄨ拷闂緟鍚庣 Skill 鍖栥€?- 涓栫晫瑙傚浘璋辩洰鍓嶆槸鍓嶇 MVP锛屾湭鎺ユ寮忓浘璋辫〃鎸佷箙鍖栥€?- 绔犺妭鐩綍杩樼己鎷栨嫿鎺掑簭銆佸垎鍗枫€佹壒閲忕鐞嗐€?- 璁惧畾搴撹繕鏈畬鏁寸粏鍒嗕汉鐗┿€佸湴鐐广€佺墿鍝併€佸娍鍔涖€佽鍒欍€佷簨浠躲€佸姛娉曠瓑妯″瀷銆?
### AI 鑳藉姏

- 鏂板缓浣滃搧銆佺煭鐢婚潰鎵╁啓銆佸崱鏂囨€ユ晳銆佷笘鐣岃鍥捐氨宸叉湁鍚庣 Skill 閾捐矾锛屼絾鐪熷疄妯″瀷绔埌绔粛闇€楠岃瘉銆?- 闀跨瘒璁板繂 Skill銆丱OC/浼忕瑪涓€鑷存€ф鏌ャ€丄I 鍓┚鐪熷疄澶氳疆瀵硅瘽灏氭湭瀹屾垚銆?- RAG/鍚戦噺鍙洖灏氭湭鎺ュ叆鍥捐氨鍜岀珷鑺傛墿鍐欍€?- 澶氭ā鍨嬪姣斻€佹枃椋庡厠闅嗐€丳rompt Inspector 瀹屾暣 Prompt 灞曞紑灏氭湭瀹屾垚銆?
## 浜у搧鏂囨。瀹屾垚搴?
| 鑳藉姏 | 褰撳墠鐘舵€?|
| --- | --- |
| 鍒涗綔宸ヤ綔鍙?| 宸插畬鎴愬墠绔師鍨?|
| 浣滃搧搴?/ 浣滃搧绠＄悊 | 宸插畬鎴愬墠绔?MVP锛屾敮鎸佸崱鐗囧睍绀恒€佹悳绱€佺瓫閫夈€佹帓搴忋€佽鎯呭睍寮€銆佸皝闈笂浼犮€丄I 灏侀潰鍗犱綅鍜屽垏鎹?|
| 鍔ㄦ€佸紑绡囬棶绛?| 宸插畬鎴愬墠绔棴鐜拰鏈湴 fallback锛屽悗绔嫭绔?Skill 寰呰ˉ |
| 鏂板缓浣滃搧纭娴佺▼ | 宸插畬鎴愬墠绔棴鐜拰鍚庣鎺ュ彛 |
| 鐭敾闈㈡墿鍐?| 宸插畬鎴?`ChapterExpansionSkill` 鍜屽墠绔紭鍏堣皟鐢?|
| 鍗℃枃鎬ユ晳 | 宸插畬鎴?`ChapterRescueSkill`銆? 鏂规鍗°€佺偣鍑绘彃鍏?|
| 涓栫晫瑙傚浘璋?| 宸插畬鎴?`StoryGraphSkill`銆佸悗绔帴鍙ｃ€佸墠绔?SVG 浜や簰鍥捐氨 MVP |
| Agent Task MVP | 宸插畬鎴愭巿鏉冦€佷换鍔°€佹楠ゃ€佹棩蹇椼€佸伐鍏峰寲灏忚鑷姩鍒涘缓 Workflow銆丷esponses API Runner 鍜屽墠绔交閲忓叆鍙?|
| 浣滃搧璧勬枡鎬昏 | 宸插畬鎴愬墠绔師鍨嬪拰鏈湴鎸佷箙鍖?|
| Lore 璁惧畾搴?| 宸插畬鎴愬熀纭€ CRUD锛屾湭瀹屾垚瀹屾暣鐭ヨ瘑鍥捐氨鎸佷箙鍖?|
| Prompt Inspector | 宸插畬鎴愬熀纭€灞曠ず锛屾湭瀹屾垚 token 棰勭畻鍜屽畬鏁?Prompt 灞曞紑 |
| Skill 宸ュ潑 | 宸叉湁 Skill 楠ㄦ灦锛屾湭瀹屾垚鐢ㄦ埛鑷缓/甯傚満/瀹夎/瀹℃牳 |

## 涓嬩竴姝ュ缓璁?
1. 鏂板鍚庣 `OpeningGuideSkill` 鍜?`FirstChapterGenerationSkill`锛屾妸鍔ㄦ€佽拷闂笌绗竴绔犵敓鎴愪粠鍓嶇瑙勫垯鍗囩骇涓虹粺涓€ Skill 閾捐矾銆?2. 閰嶇疆鐪熷疄 OpenAI 瀹樻柟 Responses API Key 鍚庯紝澶嶉獙 `RESPONSES_API` Runner 鐨勭湡瀹炲伐鍏疯皟鐢ㄩ摼璺€?3. 鏂板鍚庣 `OpeningGuideSkill` 鍜?`FirstChapterGenerationSkill`锛屾妸鍔ㄦ€佽拷闂笌绗竴绔犵敓鎴愪粠鍓嶇瑙勫垯鍗囩骇涓虹粺涓€ Skill 閾捐矾銆?4. 涓轰綔鍝佸鍔犳寮忓皝闈㈠瓧娈点€佷綔鍝佺姸鎬佸瓧娈靛拰鏇存柊鏃堕棿瀛楁锛屽苟鎺ュ叆鍚庣鎸佷箙鍖栥€?5. 涓哄皝闈㈢鐞嗗鍔犱笂浼犲皝闈?/ AI 鐢熸垚灏侀潰鐨勭湡瀹炲叆鍙ｃ€?6. 涓轰笘鐣岃鍥捐氨澧炲姞鍚庣鎸佷箙鍖栬〃锛歚story_graph_node`銆乣story_graph_edge`銆?7. 灏?Agent Task 浠庡悓姝ユ墽琛屽崌绾т负寮傛闃熷垪/绾跨▼姹犳墽琛岋紝骞舵敮鎸佹墽琛屼腑浠诲姟鐨勬洿缁嗙矑搴﹀彇娑堜笌閲嶈瘯銆?8. 濡傞渶瀹屾暣 OpenAI Agents SDK 鏀寔锛屽彲鍦?`AgentRunnerService` 鍚庢柊澧?SDK adapter锛屽鐢ㄧ幇鏈?`NovelCreationTool` 鍒楄〃鍜?step/log 璁板綍閫昏緫銆?
## Agent Task curl 绀轰緥

浠ヤ笅绀轰緥闇€瑕佸厛閫氳繃 `/api/auth/login` 鑾峰彇鐪熷疄鍚庣 JWT锛屽苟璁剧疆鐜鍙橀噺锛?
```powershell
$token = "YOUR_JWT_TOKEN"
```

1. 鍒涘缓鎺堟潈锛?
```powershell
curl -X POST "http://localhost:8080/api/agent-authorizations" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d "{\"agentType\":\"NOVEL_CREATION\",\"scopes\":[\"novel:create\",\"chapter:create\",\"chapter:update\",\"storyGraph:generate\"],\"expiresInHours\":24}"
```

2. 鍒涘缓灏忚浠ｇ悊浠诲姟锛?
```powershell
curl -X POST "http://localhost:8080/api/agent-tasks/novel-creation" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d "{\"authorizationId\":\"AUTHORIZATION_ID\",\"title\":\"鎴戠殑闀跨瘒灏忚\",\"idea\":\"閫€濠氱幇鍦猴紝涓昏浣撳唴闅愯棌鍔涢噺绗竴娆″洖搴斻€俓",\"genre\":\"鐜勫够\",\"style\":\"鐑銆侀€嗚銆佽妭濂忕揣鍑慭",\"autoGenerateFirstChapter\":true,\"autoGenerateStoryGraph\":true}"
```

濡傞渶鎸囧畾 Runner锛?
```powershell
curl -X POST "http://localhost:8080/api/agent-tasks/novel-creation" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d "{\"authorizationId\":\"AUTHORIZATION_ID\",\"title\":\"鎴戠殑闀跨瘒灏忚\",\"idea\":\"閫€濠氱幇鍦猴紝涓昏浣撳唴闅愯棌鍔涢噺绗竴娆″洖搴斻€俓",\"genre\":\"鐜勫够\",\"style\":\"鐑銆侀€嗚銆佽妭濂忕揣鍑慭",\"autoGenerateFirstChapter\":true,\"autoGenerateStoryGraph\":true,\"runnerMode\":\"RESPONSES_API\"}"
```

3. 鏌ヨ浠诲姟锛?
```powershell
curl -X GET "http://localhost:8080/api/agent-tasks/TASK_ID" `
  -H "Authorization: Bearer $token"
```

4. 鏌ヨ鏃ュ織锛?
```powershell
curl -X GET "http://localhost:8080/api/agent-tasks/TASK_ID/logs" `
  -H "Authorization: Bearer $token"
```

5. 鍙栨秷浠诲姟锛?
```powershell
curl -X POST "http://localhost:8080/api/agent-tasks/TASK_ID/cancel" `
  -H "Authorization: Bearer $token"
```
# 2026-06-04 Opening Guide Skill Update

鏈疆宸叉柊澧炲悗绔?`OpeningGuideSkill` 涓?`FirstChapterGenerationSkill`锛屽苟灏嗗墠绔姩鎬佸紑绡囬棶绛斿崌绾т负鐪熷疄璐﹀彿浼樺厛璋冪敤鍚庣銆佹湰鍦拌处鍙锋垨鍚庣澶辫触鏃剁户缁娇鐢ㄦ湰鍦?fallback銆?
鏂板鍚庣鎺ュ彛锛?
- `POST /api/novels/opening-guide/next-question`
- `POST /api/novels/opening-guide/generate-first-chapter`

澧炲己鎺ュ彛锛?
- `POST /api/novels/draft` 缁х画鍏煎鏃у瓧娈碉紝鍚屾椂鏀寔 `answers`銆乣draftPatch`锛屽苟琛ラ綈 `subtitle`銆乣openingChapterGoal`銆乣firstChapterTitle`銆?
Agent Task 鏇存柊锛?
- `GENERATE_FIRST_CHAPTER` 鐜板湪浼樺厛浣跨敤 `FirstChapterGenerationSkill`銆?- 鏂?Skill 澶辫触鏃朵粛鍥為€€鍒板師 `ChapterExpansionSkill`銆?- `SAVE_CHAPTER` 浼樺厛浣跨敤鏂?Skill 杩斿洖鐨勭珷鑺傛爣棰橈紝鍏舵浣跨敤鑽夌 `firstChapterTitle`锛屾渶鍚庝娇鐢ㄦ棫瑙勫垯鐢熸垚鏍囬銆?
楠岃瘉缁撴灉锛?
- 鍚庣锛氫娇鐢?`D:\Program Files\Java\jdk-21.0.10` 鎵ц `mvn -DskipTests compile` 閫氳繃銆?- 鍓嶇锛氭墽琛?`npm run build` 閫氳繃銆?- 褰撳墠杞湭閲嶆柊鍚姩 PostgreSQL/鍚庣/鍓嶇鍋氱湡瀹?HTTP 鍐欏簱澶嶉獙锛涗笂涓€杞湡瀹?PostgreSQL E2E 缁撹浠嶈 `docs/E2E_TESTING.md`锛屾湰杞柊澧炴帴鍙?curl 瑙?`docs/OPENING_GUIDE_E2E.md`銆?
褰撳墠椋庨櫓锛?
- 鐪熷疄妯″瀷杩斿洖 JSON 璐ㄩ噺浠嶉渶鍦ㄥ疄闄?API Key 鐜澶嶉獙銆?- 鏂板寮€绡囧悜瀵兼帴鍙ｅ皻鏈湪鍙敤 PostgreSQL 鐜涓窇瀹屾暣鐪熷疄璐﹀彿 HTTP 闂幆銆?- `PROJECT_STATUS.md` 涓緝鏃╃殑鈥滃紑绡囬棶绛斿悗绔?Skill 寰呰ˉ鈥濆巻鍙叉弿杩板凡琚湰鑺?supersede锛屽悗缁彲缁熶竴娓呯悊鏃х姸鎬佽〃杩般€?# 2026-06-04 鍒涗綔浣撻獙鏀舵暃浼樺寲 V1

鏈疆鐩爣涓嶆槸缁х画鍫嗘柊鑳藉姏锛岃€屾槸鎶婂凡鏈夊垱浣滈摼璺殑鍙鍙嶉銆佹潵婧愭爣璇嗗拰浣滃搧绠＄悊浣撻獙鏀舵暃鍒版洿鍙敤鐨勭姸鎬併€?
## 宸插畬鎴?
- 鐧诲綍涓庤处鍙风姸鎬佸弽棣堬細鐧诲綍/娉ㄥ唽澧炲姞 loading銆佹垚鍔熴€佸け璐ャ€佸悗绔笉鍙敤鍒囨崲鏈湴璐﹀彿銆?01 閲嶆柊鐧诲綍鎻愮ず锛涢《閮ㄨ处鍙峰尯鐜板湪灞曠ず鏈湴璐﹀彿/鐪熷疄璐﹀彿銆佸悗绔繛鎺ョ姸鎬併€佹ā鍨嬮厤缃姸鎬併€?- 褰撳墠鐢熸垚閾捐矾鍙鍖栵細妯″瀷闈㈡澘灞曠ず Provider銆丮odel Name銆丼kill銆丷unnerMode銆佹槸鍚︿娇鐢ㄥ悗绔€佹槸鍚?fallback锛屽苟棰勭暀鍒涗綔妯″瀷銆佽蹇嗘ā鍨嬨€佸绋挎ā鍨嬨€丄gent 妯″瀷姒傚康銆?- 缁撴灉鏉ユ簮鏍囪瘑锛氬姩鎬佸紑绡囬棶绛斻€佷綔鍝佽崏绋裤€佺涓€绔犵敓鎴愩€佺煭鐢婚潰鎵╁啓銆佸崱鏂囨€ユ晳銆丄gent 鑷姩寮€涔︾瓑缁撴灉鍖哄煙灞曠ず鍚庣銆佹湰鍦拌鍒欍€乫allback 鎴栧叿浣?Skill 鏉ユ簮銆?- 鍔ㄦ€佸紑绡囬棶绛斾紭鍖栵細闂鍗＄墖灞曠ず褰撳墠姝ラ銆佷负浠€涔堥棶銆佸奖鍝嶆柟鍚戯紱鏀寔閫夐」銆佽嚜瀹氫箟鍥炵瓟銆佽烦杩囥€佷笂涓€姝ワ紱闂瓟鍘嗗彶鍙睍寮€/鏀惰捣锛涚敓鎴愯崏绋垮墠灞曠ず宸叉敹闆嗕俊鎭憳瑕併€?- 浣滃搧搴撳垹闄わ細浣滃搧璇︽儏鍜屽綋鍓嶄綔鍝佸尯澧炲姞鍒犻櫎鍏ュ彛锛涘垹闄ゅ墠浜屾纭骞惰鏄庝細鍒犻櫎浣滃搧璧勬枡銆佺珷鑺傘€佽瀹氥€佺伒鎰熴€佹湰鍦板浘璋辨暟鎹紱鏈湴璐﹀彿鍒犻櫎 localStorage 鏁版嵁锛岀湡瀹炶处鍙锋帴鍏ョ幇鏈夊悗绔垹闄ゆ帴鍙ｃ€?- 鎿嶄綔鍙嶉缁熶竴锛氱櫥褰曘€佹柊寤轰綔鍝併€佺敓鎴愯崏绋裤€佺‘璁ゅ垱寤恒€佸紑绡囬棶绛斻€佺敓鎴愮涓€绔犮€佺煭鐢婚潰鎵╁啓銆佸崱鏂囨€ユ晳銆丄gent 鑷姩寮€涔︺€佸垹闄や綔鍝併€佷繚瀛樼珷鑺傘€佷繚瀛樿瀹氬潎澧炲姞鍙 loading/success/error/fallback 鎻愮ず锛宭oading 鏃剁鐢ㄥ搴旀寜閽€?
## 楠岃瘉缁撴灉

- 鍚庣锛氬凡杩愯 `cd backend; mvn -DskipTests compile`锛孞DK 21 鐜涓嬮€氳繃锛岀粨鏋滀负 `BUILD SUCCESS`銆?- 鍓嶇锛氬凡杩愯 `cd frontend; npm run build`锛孨ext.js 鏋勫缓閫氳繃銆?- 娴忚鍣ㄥ啋鐑燂細宸插惎鍔ㄦ渶鏂板墠绔瑙堬紝`http://127.0.0.1:3000` 杩斿洖 200锛涢〉闈㈤《閮ㄥ彲瑙佹湰鍦拌处鍙枫€佸悗绔笉鍙敤/鏈湴妯″紡銆佹ā鍨嬫湭閰嶇疆绛夌姸鎬併€?
## 褰撳墠椋庨櫓

- 鏈疆鏈繛鎺ョ湡瀹?PostgreSQL/Redis/鍚庣鏈嶅姟鍋氱湡瀹炶处鍙峰垹闄や笌 Agent Task 鍏ㄩ摼璺楠岋紱鐪熷疄璐﹀彿璺緞浠嶉渶鍦ㄥ悗绔惎鍔ㄥ悗鎸?`docs/E2E_TESTING.md` 娓呭崟楠岃瘉銆?- 鐪熷疄璐﹀彿鍒犻櫎浣滃搧渚濊禆鍚庣鐜版湁 `DELETE /api/novel/{novelId}` 鍜屾暟鎹簱绾ц仈/Service 绾ц仈琛屼负锛岄渶鍦?PostgreSQL 鐜涓‘璁ょ珷鑺傘€佽瀹氱瓑鍏宠仈鏁版嵁鍒犻櫎瀹屾暣銆?- 妯″瀷鏉ユ簮鍙鍖栧凡鍦?UI 灞傝ˉ榻愶紝浣嗙湡瀹炴ā鍨嬭繑鍥炰腑鐨勬潵婧愬瓧娈典粛浠ョ幇鏈夊墠绔摼璺帹鏂负涓汇€?
## 涓嬩竴姝ュ缓璁?
- 鍦?PostgreSQL 鍜?Redis 鍙敤鐜涓惎鍔ㄥ悗绔紝浣跨敤鐪熷疄璐﹀彿鍒涘缓娴嬭瘯浣滃搧鍚庨獙璇佸垹闄ら棴鐜€?- 鎸?`docs/E2E_TESTING.md` 澶嶈窇 Agent Task FIXED_WORKFLOW/AUTO锛岀‘璁?UI 涓?RunnerMode銆丼kill銆乫allback 鐘舵€佷笌鍚庣鏃ュ織涓€鑷淬€?- 瀵瑰姩鎬佸紑绡囬棶绛斿仛涓€娆＄湡瀹炵敤鎴锋祦绋嬪綍灞忓紡璧版煡锛岀户缁帇缂╂棤鏁堢偣鍑诲拰绛夊緟鏃堕棿銆?# 2026-06-05 宸ヤ綔鍙扮姸鎬佹爮涓庝綔鍝佸簱绌虹姸鎬佷慨澶?
鏈疆鍙仛浣撻獙鍜岀姸鎬佷慨澶嶏紝娌℃湁鏂板 Web AI銆丮emoryExtractionSkill銆丆onsistencyCheckSkill 鎴栧叾浠栧ぇ鍔熻兘銆?
宸插畬鎴愶細

- 椤堕儴鐘舵€佹爮鎷嗘垚涓ゅ眰锛氬叏灞€鐘舵€佸尯灞曠ず浜у搧鍚嶃€佸綋鍓嶆ā寮忋€佹ā鍨嬬煭鏍囩銆佽处鍙风煭鏍囩銆佸悗绔姸鎬併€乫allback/鍚庣 Skill 鐘舵€併€佷綔鍝佸簱鍏ュ彛銆佹ā鍨嬭缃叆鍙ｃ€佽处鍙峰叆鍙ｏ紱鍒涗綔涓婁笅鏂囧尯灞曠ず褰撳墠浣滃搧銆佺珷鑺傘€佹柊浣滃搧鏍囬銆佷竴鍙ヨ剳娲炪€佺敓鎴愯崏绋裤€佺‘璁ゅ垱寤恒€佷粠鑴戞礊寮€涔︺€?- 椤堕儴鐭爣绛句笉鍐嶅钩閾洪暱璇存槑锛屽鏉傝鏄庢斁鍏ユā鍨?璐﹀彿璇︽儏鍗°€?- 妯″瀷璇︽儏鍗¤ˉ鍏?Provider銆丮odel Name銆丅ase URL銆佽处鍙风被鍨嬨€佸悗绔姸鎬併€佹槸鍚︾湡瀹炶皟鐢ㄥ悗绔?Skill銆乫allback 鍘熷洜銆?- 棣栭〉鑴戞礊銆侀《閮ㄦ柊浣滃搧鏍囬銆丄gent 鑷姩寮€涔﹁緭鍏ヤ笉鍐嶉粯璁ゅ～鍏ョ巹骞?閫€濠氱ず渚嬶紱绀轰緥鍙繚鐣欏湪 placeholder銆?- 绌鸿緭鍏ョ偣鍑烩€滄暣鐞嗘垚鏁呬簨鈥濇垨鈥滅敓鎴愮涓€绔犺崏绋库€濇椂缁欏嚭鎻愮ず锛屼笉鍐嶈嚜鍔ㄥ鐢ㄩ粯璁ょ巹骞诲唴瀹广€?- 浣滃搧搴撳垪琛ㄤ负绌烘椂鏄剧ず鈥滄殏鏃犱綔鍝佲€濈┖鐘舵€侊紝骞舵彁绀哄彲鏂板缓浣滃搧鎴栦粠鑴戞礊寮€涔︺€?- 浣滃搧搴撳彸渚ц鎯呭湪娌℃湁鐪熷疄浣滃搧鏃朵笉鍐?fallback 鍒板綋鍓?workspace锛屼笉鍐嶅睍绀衡€滄湭鍛藉悕浣滃搧鈥濃€滀笢鏂圭巹骞烩€濈瓑榛樿鍐呭銆?- 涓存椂鑽夌鍜屾寮忎綔鍝佸尯鍒嗭細鐢ㄦ埛杈撳叆鑴戞礊銆佸紑绡囬棶绛旀垨鑽夌鐢熸垚灞炰簬涓存椂鐘舵€侊紝纭鍒涘缓鍚庢墠杩涘叆浣滃搧搴撱€?- 鍒犻櫎鎵€鏈変綔鍝佸悗杩涘叆绌虹櫧宸ヤ綔鍖猴紝涓嶅啀閲嶆柊鏋勯€犻粯璁ょ巹骞讳綔鍝併€?
楠岃瘉缁撴灉锛?
- `cd frontend && npm run build` 宸查€氳繃銆?- `cd backend && mvn -DskipTests compile` 宸查€氳繃銆?- 鍓嶇棰勮宸插惎鍔紝`http://127.0.0.1:3000/?v=status-clean` 杩斿洖 200銆?- 宸查€氳繃浠ｇ爜璺緞纭锛氫綔鍝佸簱绌哄垪琛ㄤ笉鍐?fallback 鍒板綋鍓?workspace锛涚┖鑴戞礊涓嶄細鑷姩鐢熸垚榛樿鐜勫够鏁呬簨銆傚彈褰撳墠鐜缂哄皯 Playwright 渚濊禆闄愬埗锛屾竻绌?localStorage 鍚庣殑娴忚鍣ㄧ偣鍑婚獙鏀堕渶浜哄伐鍒锋柊椤甸潰纭銆?
## 2026-06-05 姝︿緺寮€绡囬棶绛斾笌妯″瀷鐘舵€佷慨澶?
閽堝鈥滅儫闆ㄦ睙婀?/ 鏋剁┖鍘嗗彶姝︿緺鈥濆疄娴嬫毚闇茬殑闂锛屽凡鍋氭敹鏁涗慨澶嶏細

- 椤堕儴妯″瀷鐘舵€佷笉鍐嶆妸榛樿 Provider 褰撴垚鈥滃凡閰嶇疆鈥濄€傚彧鏈?`apiKeyConfigured=true` 鎴栧綋鍓嶈緭鍏ヤ簡 API Key 鎵嶆樉绀衡€滃凡鎺ュ叆鈥濓紝鍚﹀垯鏄剧ず鈥淒eepSeek 鏈帴鍏モ€濄€?- 妯″瀷璇︽儏鏂囨琛ュ厖璇存槑锛歅rovider 宸查€変笉绛変簬 API Key 宸蹭繚瀛橈紱鏈繚瀛?Key 鏃剁敓鎴愪細璧版湰鍦?鍚庣 fallback銆?- 鍓嶇鏈湴 Opening Guide fallback 鏂板姝︿緺涓撳睘杩介棶閾撅細
  - 閫€闅愬師鍥?  - 璋佸湪鐑椆澶勮鍑轰粬
  - 涓嶆嫈鍒€濡備綍鐮村眬
  - 姹熸箹浠ｄ环
  - 绔犳湯杩借閽╁瓙
- 鍚庣 `OpeningGuideSkill` fallback 鍚屾鏂板姝︿緺涓撳睘杩介棶閾撅紝鐪熷疄璐﹀彿浣嗘ā鍨嬩笉鍙敤鏃朵笉鍐嶉棶鐜勫够寮忊€滃簳鐗?寮傚父鈥濄€?- 鍚庣 `FirstChapterGenerationSkill` fallback 鏂板姝︿緺棣栫珷妯℃澘锛氳尪妤笺€佹棫鍒€銆佸皝鍒€瑾撱€佺澶瑰垁銆佹棫妗堝洖娼紝涓嶅啀浣跨敤鍙戝厜閬撳叿銆佺粡鑴夎閱掋€佽鑴夌瓑鐜勫够鍏冪礌銆?- 瀹炴祴鍚庣 fallback 瀵光€滅儫闆ㄦ睙婀栤€濈敓鎴愶細
  - 绗?1 闂細`涓夊勾鍓嶄粬閫€鍑烘睙婀栵紝鐪熸鍘熷洜鏇存帴杩戝摢涓€绉嶏紵`
  - 绗?2 闂細`绗竴绔犲紑鍦猴紝璋佹渶閫傚悎鍦ㄧ儹闂瑰璁ゅ嚭杩欎釜閫€闅愬皯骞达紵`
  - 绗竴绔犳爣棰橈細`绗竴绔狅細涓夊勾涓嶆嫈鍒€`

楠岃瘉缁撴灉锛?
- `cd frontend && npm run build` 宸查€氳繃銆?- `cd backend && mvn -DskipTests compile` 宸查€氳繃銆?
## 2026-06-05 椤堕儴鍚庣鐘舵€佹枃妗堜慨姝?
閽堝瀹炴祴鎴浘涓€滄湰鍦拌处鍙?+ 鍚庣涓嶅彲鐢ㄢ€濆鏄撻€犳垚璇В鐨勯棶棰橈紝宸插皢鍓嶇椤堕儴鐘舵€佹媶娓咃細

- 鏈湴璐﹀彿鏃朵笉鍐嶆樉绀衡€滃悗绔笉鍙敤鈥濓紝鏀逛负鈥滃悗绔湭浣跨敤鈥濄€?- 鐪熷疄璐﹀彿鐧诲綍鎴愬姛浣嗕綔鍝佸垪琛ㄤ负绌烘椂锛屼粛淇濇寔 `syncState=synced`锛岄《閮ㄦ樉绀哄悗绔凡杩炴帴/鍚庣鍙敤锛屼笉鍐嶅洜涓?0 涓綔鍝佽鍒や负鏈湴鐘舵€併€?- 鈥滃悗绔笉鍙敤/鍚庣寮傚父鈥濆彧淇濈暀缁欑湡瀹炲悗绔姹傚け璐ュ満鏅€?
楠岃瘉锛?- `cd frontend && npm run build` 宸查噸鏂拌繍琛屽苟閫氳繃銆?- `cd backend && mvn -DskipTests compile` 宸蹭娇鐢?JDK 21 閲嶆柊杩愯骞堕€氳繃銆?
## 2026-06-05 寮€绡囧悜瀵间笂涓嬫枃娓呮礂淇

閽堝銆婄儫闆ㄦ睙婀栥€嬪疄娴嬩腑鈥滈椤佃緭鍏ユ渚犺剳娲烇紝杩涘叆闂瓟鍚戝鍚庝粛娣峰叆鐜勫够/涓婂彜娈嬪墤榛樿鍐呭鈥濈殑闂锛屽凡瀹屾垚绗竴杞敹鏁涗慨澶嶏細

- 鏂板棣栭〉鑴戞礊瑙ｆ瀽锛氳瘑鍒?`鏍囬锛歚銆乣鏁呬簨鑳屾櫙锛歚銆乣绫诲瀷锛歚銆乣椋庢牸锛歚 绛夎緭鍏ワ紝骞朵粠鈥滄睙婀栥€佹渚犮€侀€€闅愩€佸皝鍒€鈥濈瓑鍏抽敭璇嶆帹鏂鏉愩€?- 鈥滆繘鍏ラ棶绛斿悜瀵尖€濅笉鍐嶅彧鏄墦寮€鍙虫爮锛岃€屾槸浼氭妸棣栭〉鑴戞礊鍚屾鍒板紑绡囧悜瀵兼爣棰樸€佽剳娲炪€侀鏉愩€侀鏍笺€乻tarter 钃濆浘鍜屼复鏃朵綔鍝佽祫鏂欍€?- 杩涘叆鍚戝鏃朵細娓呯┖鏃х殑寮€绡囬棶绛斻€佹棫 draftPatch 鍜屾棫浣滃搧鑽夌锛岄伩鍏嶇户缁部鐢ㄩ粯璁ょ巹骞讳笂涓嬫枃銆?- `inferStarterAnswersFromIdea` 澧炲姞姝︿緺/姹熸箹璇嗗埆锛岀敓鎴愨€滈€€闅愩€佹棫妗堛€佸皝鍒€銆佷笉鎷斿垁鐮村眬鈥濇柟鍚戠殑涓昏銆佷笘鐣岃鍒欏拰绗竴骞曠敾闈€?- Web AI Prompt 鏋勫缓鏃讹紝濡傛灉褰撳墠瀛樺湪涓存椂寮€涔﹁剳娲烇紝浼氫娇鐢ㄥ共鍑€涓存椂 draft锛涢粯璁?demo 涓殑鈥滄灄闈掍簯銆佺巹澶╁墤銆佷笢鏂圭巹骞汇€佺传浜戝畻銆佺伒鏍光€濈瓑鍐呭涓嶅啀娣峰叆 Prompt銆?- 闂瓟鍗＄墖鐨?reason/impact 澧炲姞鈥滄睙婀栥€侀€€闅愩€佸皝鍒€銆佹棫妗堛€佷笉鎷斿垁鈥濈瓑璇嗗埆锛屽睍绀烘洿璐村悎姝︿緺寮€绡囩殑杩介棶鎰忓浘銆?
楠岃瘉锛?- `cd frontend && npm run build` 宸查€氳繃銆?- `cd backend && mvn -DskipTests compile` 宸蹭娇鐢?JDK 21 閫氳繃銆?- 鍓嶇宸查噸鍚紝`http://127.0.0.1:3000/?v=clean-context` 杩斿洖 200銆?- 鍚庣淇濇寔杩愯锛宍http://127.0.0.1:8080/v3/api-docs` 姝ゅ墠鎺㈡椿杩斿洖 200銆?
## 2026-06-05 鏂版墜寮€涔︿富绾挎敹鏁?
閽堝鈥滆繕涓嶅鐩存帴闂?GPT鈥濈殑浣撻獙鍙嶉锛屽凡鎶婇椤典富娴佺▼浠庡姛鑳藉爢鍙犳敹鏁涗负鈥滀竴鍙ヨ剳娲?-> 甯垜寮€涔?-> 鍏抽敭杩介棶 -> 浣滃搧璧勬枡 -> 绗竴绔犫€濈殑涓荤嚎锛?
- 棣栭〉 H1 鏀逛负鈥滀竴鍙ヨ剳娲烇紝鍏堝府浣犲紑鎴愮涓€绔犫€濓紝鍑忓皯宸ュ叿璇存槑鎰熴€?- 棣栭〉涓绘寜閽敼涓衡€滃府鎴戝紑涔︹€濓紝鐐瑰嚮鍚庝細瑙ｆ瀽鑴戞礊銆佽繘鍏ュ伐浣滃彴銆佹墦寮€鍙充晶鍒涗綔鍚戝锛屽苟鑷姩鐢熸垚绗竴閬撳紑绡囪拷闂€?- 鍘熲€滄暣鐞嗘垚鏁呬簨 / 鐢熸垚绗竴绔犺崏绋?/ 杩涘叆闂瓟鍚戝鈥濅笁鎸夐挳闄嶇骇涓衡€滃彧鏁寸悊璧勬枡 / 鐩存帴鍑虹涓€绔?/ 缁х画涓婃鍒涗綔鈥濈瓑杈呭姪鍏ュ彛銆?- 棣栭〉杈撳叆妗?placeholder 鏀逛负缁撴瀯鍖栫ず渚嬶紝鎻愮ず鐢ㄦ埛鍙洿鎺ヨ緭鍏ユ爣棰樸€佹晠浜嬭儗鏅拰绫诲瀷銆?- 鍚戝椤堕儴鏂板鈥滀笅涓€姝モ€濇彁绀猴紝鎸夐樁娈靛憡璇夌敤鎴峰綋鍓嶈鍥炵瓟闂銆佺户缁拷闂€佺敓鎴愯崏绋胯繕鏄敓鎴愮涓€绔犮€?- `startOpeningGuide` 澶嶇敤鏂扮殑棣栭鐢熸垚閫昏緫锛屽噺灏戔€滄墦寮€鍚戝鍚庤繕瑕佸啀鐐逛竴娆″紑濮嬧€濈殑绌鸿浆銆?
楠岃瘉锛?- `cd frontend && npm run build` 宸查€氳繃銆?- 鍓嶇宸查噸鍚紝`http://127.0.0.1:3000/?v=one-button-open` 杩斿洖 200銆?- 娴忚鍣ㄦ牎楠屽凡纭棣栭〉鍑虹幇鈥滀竴鍙ヨ剳娲烇紝鍏堝府浣犲紑鎴愮涓€绔犫€濃€滃府鎴戝紑涔︹€濆拰涓夋寮€涔﹁鏄庛€?
## 2026-06-05 鍒涗綔缂栨帓灞?V0

涓烘帴杩?GPT 寮忊€滅悊瑙?-> 鍒ゆ柇 -> 鎺ㄨ繘鈥濈殑浣撻獙锛屽墠绔柊澧炴渶灏忓垱浣滅紪鎺掑眰闆忓舰锛?
- 鏂板 `CreativeBrief` 鐘舵€侊紝鐢ㄤ簬鎵胯浇 assistantMessage銆佹牳蹇冮挬瀛愩€佸缓璁紑鍦恒€佷负浠€涔堣繖鏍峰啓銆佸叧閿拷闂拰寤鸿鍔ㄤ綔銆?- 鏂板 `buildCreativeBrief` 鏈湴缂栨帓鍣ㄣ€傚綋鍓嶅厛鐢ㄨ鍒欑敓鎴愨€滄垜鐞嗚В鐨勬晠浜嬧€濆崱鐗囷紝鍚庣画鍙浛鎹负鍚庣 `CreativeConversationService` + 澶氭ā鍨?API銆?- 鈥滃府鎴戝紑涔︹€濆悗浼氬厛鐢熸垚鍒涗綔鐞嗚В鍗★紝鍐嶇敓鎴愮涓€閬撳紑绡囪拷闂紝璁╃敤鎴峰厛鐪嬪埌宸ュ叿鐨勫垽鏂紝鑰屼笉鏄洿鎺ヨ繘鍏ヨ〃鍗曘€?- 鍒涗綔鐞嗚В鍗℃彁渚涗笁涓姩浣滐細
  - 鍥炵瓟鍏抽敭闂
  - 鐩存帴鐢熸垚绗竴绔?  - 浜ょ粰缃戦〉 GPT 娣辨寲
- 鍓嶇鏈湴绗竴绔犵敓鎴愭柊澧炴渚犲垎鏀紝閬垮厤鏈湴鐩存帴鐢熸垚鏃堕噸鏂版帀鍥炵巹骞?鐏垫牴/鐜変僵妯℃澘銆?- 褰撳墠浠嶆湭鏂板鍚庣澶у姛鑳斤紝鏈紩鍏ユ柊妗嗘灦锛岀幇鏈?OpeningGuideSkill銆丗irstChapterGenerationSkill銆乄eb AI Prompt 娴佺▼缁х画澶嶇敤銆?
楠岃瘉锛?- `cd frontend && npm run build` 宸查€氳繃銆?- 鍓嶇宸查噸鍚紝`http://127.0.0.1:3000/?v=orchestrator-v1` 杩斿洖 200銆?- 鍚庣淇濇寔杩愯锛宍http://127.0.0.1:8080/v3/api-docs` 杩斿洖 200銆?
鍚庣画寤鸿锛?- 灏?`buildCreativeBrief` 涓嬫矇涓哄悗绔?`CreativeConversationService`锛岀粺涓€ DeepSeek / OpenAI / Gemini / OpenRouter 璋冪敤銆?- 寤虹珛 `ModelGateway`锛岃鎵€鏈夋ā鍨嬭繑鍥炵粺涓€缁撴瀯锛歛ssistantMessage銆乤nalysisCard銆乶extQuestion銆乻uggestedActions銆乨raftPatch銆?- 鍓嶇鎶?Skill 缁撴灉鍜?Agent 缁撴灉閮芥覆鏌撴垚鍚屼竴绉嶁€滃璇?+ 鍔ㄤ綔鈥濅綋楠岋紝鍑忓皯鎸夐挳寮忓伐鍏锋劅銆?
## 2026-06-05 閫€鍑虹櫥褰曟竻绌哄綋鍓嶅伐浣滃尯

閽堝鈥滈€€鍑虹櫥褰曞悗浠嶈兘鐪嬪埌涓婁竴璐﹀彿/涓婁竴宸ヤ綔鍖烘暟鎹€濈殑闂锛屽凡淇鍓嶇 logout 琛屼负锛?
- 閫€鍑虹櫥褰曟椂娓呯┖褰撳墠鍐呭瓨宸ヤ綔鍖猴細绔犺妭銆佽瀹氥€佺伒鎰熴€佸浘璋便€侀€変腑浣滃搧銆佷复鏃惰崏绋裤€佸紑绡囧悜瀵笺€佸垱浣滅紪鎺掑崱銆乄eb AI 绮樿创鍖恒€丄gent 闈㈡澘鐘舵€併€?- 閫€鍑虹櫥褰曟椂绉婚櫎鍖垮悕 workspace 缂撳瓨 `novel-ai-copilot-workspace-v1`锛岄伩鍏嶅埛鏂板悗閲嶆柊鎭㈠鏃х殑涓存椂宸ヤ綔鍖恒€?- 閫€鍑虹櫥褰曞悗杩涘叆棣栭〉绌虹姸鎬侊紝骞舵彁绀衡€滃凡閫€鍑虹櫥褰曪紝褰撳墠宸ヤ綔鍖哄凡娓呯┖鈥濄€?- 涓嶅垹闄ゆ湰鍦拌处鍙峰搴旂殑鎸佷箙浣滃搧搴撴暟鎹紝閬垮厤鈥滈€€鍑虹櫥褰曗€濈瓑鍚屼簬鈥滃垹闄や綔鍝佲€濓紱鍚屼竴璐﹀彿鍐嶆鐧诲綍鏃朵粛鍙鍙栬璐﹀彿浣滃搧銆?
楠岃瘉锛?- `cd frontend && npm run build` 宸查€氳繃銆?- 鍓嶇宸查噸鍚紝`http://127.0.0.1:3000/?v=logout-clear` 杩斿洖 200銆?## 2026-06-07 鏄撳啓绗竴/绗簩闃舵涓昏矾寰勭籂鍋?
鏈疆涓嶆槸鏂板澶у姛鑳斤紝鑰屾槸淇娓稿鑽夌銆丄pp Shell銆佷晶杈规爮鏀舵暃銆佺櫥褰曠画瀛樼瓑涓昏矾寰勪氦浜掑亸宸€?
宸插畬鎴愶細
- 娓稿妯″紡涓嶅啀棰勭疆鎴栧睍绀哄亣姝ｅ紡浣滃搧锛涢椤垫敼涓衡€滄柊寤轰綔鍝?/ 涓存椂鑽夌 / 姝ｅ紡浣滃搧鈥濅笁娈点€?- 娓稿鍒涘缓銆佹彃鍏ョ紪杈戝櫒銆佷繚瀛樹复鏃跺唴瀹瑰潎钀戒负 `local-draft`锛屽崱鐗囨樉绀衡€滀复鏃惰崏绋?/ 浠呮湰鍦颁繚瀛?/ 鏈悓姝モ€濄€?- 鈥滀繚瀛樹负姝ｅ紡浣滃搧鈥濆湪娓稿鐘舵€佷笅浼氬厛淇濆瓨褰撳墠鏈湴涓存椂鑽夌锛屽啀寮圭櫥褰?/ 娉ㄥ唽锛涚櫥褰曟垨娉ㄥ唽鎴愬姛鍚庣户缁垰鎵嶇殑淇濆瓨鍔ㄤ綔锛屽苟鎶婁复鏃惰崏绋胯浆涓?`official`銆?- 棣栭〉銆佸紑涔﹀悜瀵笺€丄I 鍥炲～瑙ｆ瀽椤点€佹寮忓啓浣滃伐浣滃彴缁熶竴鍖呰繘 `AppShell`锛屽乏渚у鑸拰椤堕儴鎼滅储/鐘舵€?鐢ㄦ埛鍖轰繚鎸佷竴鑷淬€?- 鏂板鍙敹缂╀晶杈规爮锛屽睍寮€鏄剧ず鍥炬爣鍜屾枃瀛楋紝鏀惰捣鍙樉绀哄浘鏍囷紝hover 鏄剧ず tooltip锛岀姸鎬佷繚瀛樺埌 `localStorage:yixie-app-shell-collapsed`銆?- 鐧诲綍寮圭獥閲嶅仛涓虹櫥褰?/ 娉ㄥ唽鍙?Tab锛屾敮鎸佷繚瀛樿Е鍙戞枃妗堛€佷富鍔ㄧ櫥褰曟枃妗堛€乴oading 绂佺敤銆佸け璐ユ彁绀恒€佸井淇℃巿鏉冨崰浣嶃€?
楠岃瘉锛?- 鍓嶇鏋勫缓閫氳繃锛歚next build`銆?- 鏈疆鏈帴鍏ョ湡瀹炲悗绔处鍙凤紱鐧诲綍 / 娉ㄥ唽涓哄墠绔ā鎷熺姸鎬侊紝鐢ㄤ簬楠岃瘉鈥滅画瀛樻寮忎綔鍝佲€濅富璺緞銆?
褰撳墠闄愬埗锛?- 寮€涔﹀悜瀵笺€丄I 鍥炲～椤点€佸啓浣滃伐浣滃彴鍐呴儴浠嶄繚鐣欏悇鑷殑鍐呭鍖哄伐鍏锋潯鍜屽眬閮ㄦ爣棰橈紝鍚庣画鍙户缁仛瑙嗚缁熶竴锛屼絾涓嶄細鍐嶄涪澶卞乏渚?App Shell銆?- 渚ц竟鏍忔姌鍙犵姸鎬佷负鍓嶇 localStorage 璁板繂锛屾湭鍚屾鍒版湇鍔＄銆?## 2026-06-07 鏄撳啓绗笁闃舵锛氳祫鏂欏簱 / 闀跨瘒璁板繂 / 妫€鏌ラ棴鐜?
鏈疆鍦ㄦ寮忓啓浣滃伐浣滃彴鍐呰ˉ榻愰暱绡囧垱浣滄牳蹇冭兘鍔涳紝娌℃湁鏂板棣栭〉銆佹妧鑳藉箍鍦恒€佺ぞ鍖烘垨鏀粯鑳藉姏銆?
宸插畬鎴愶細
- 姝ｅ紡鍐欎綔宸ヤ綔鍙扮户缁繚鎸佷笁鏍忓竷灞€锛屽苟鍦ㄤ腑闂翠富鍐呭鍖烘敮鎸佲€滄鏂?/ 璧勬枡搴?/ 闀跨瘒璁板繂 / 妫€鏌ョ粨鏋溾€濆垏鎹€?- 宸︿晶宸ヤ綔鍙拌祫鏂欏叆鍙ｆ敮鎸侊細浣滃搧璧勬枡銆佷汉鐗╄瀹氥€佷笘鐣岃璁惧畾銆佸湴鐐硅瀹氥€佺墿鍝佽瀹氥€佸娍鍔涜瀹氥€佷紡绗旂嚎绱€佺珷鑺傛憳瑕併€侀暱绡囪蹇嗐€?- 鏂板璧勬枡搴撴湰鍦扮鐞嗭細鏂板銆佺紪杈戙€佸垹闄ゃ€佹悳绱€佹寜绫诲瀷绛涢€夈€佺偣鍑昏祫鏂欐煡鐪嬭鎯呫€?- 鏂板闀跨瘒璁板繂闈㈡澘锛氬睍绀哄凡鍙戠敓浜嬩欢銆佷汉鐗╃姸鎬佸彉鍖栥€佷笘鐣岃浜嬪疄銆佹湭鍥炴敹浼忕瑪銆佹渶杩戠珷鑺傛憳瑕併€佺姝㈣繚鑳岃瀹氥€?- 鏀寔浠庡綋鍓嶇珷鑺傛湰鍦拌鍒欑敓鎴愮珷鑺傛憳瑕侊紝骞跺悓鏃跺啓鍏ョ珷鑺傛憳瑕佽祫鏂欏拰闀跨瘒璁板繂銆?- 鍙充晶 AI 鍓┚鏂板鈥滄鏌モ€濆叆鍙ｏ紝鏀寔鏈湴瑙勫垯鐢熸垚 OOC / 浼忕瑪 / 绔犺妭鐩爣绛夋鏌ョ粨鏋滃崱鐗囥€?- 妫€鏌ュ崱鐗囨敮鎸佹煡鐪嬪師鏂囦綅缃€佸鍒朵慨鏀瑰缓璁€佹彃鍏ヤ慨鏀瑰尯銆佸拷鐣ャ€佹爣璁板凡澶勭悊銆?- Web AI 妯″紡鍏煎璧勬枡搴撱€侀暱绡囪蹇嗗拰妫€鏌ワ細鍙敓鎴愬寘鍚綋鍓嶇珷鑺傛鏂囥€佷綔鍝佽祫鏂欍€佷汉鐗╄瀹氥€佷笘鐣岃瑙勫垯銆侀暱绡囪蹇嗘憳瑕佸拰妫€鏌ョ洰鏍囩殑 Prompt銆?- 鏀寔绮樿创 Web AI 杩斿洖缁撴灉骞惰В鏋愪负妫€鏌ョ粨鏋滃崱鐗囨垨闀跨瘒璁板繂鏉＄洰銆?- 娓稿/鏈湴鑽夌鐨勭涓夐樁娈垫暟鎹娇鐢?`localStorage:yixie-phase3-workspace-{workId}` 淇濆瓨锛屼笉鏍囪涓轰簯绔悓姝ャ€?
鏂板绫诲瀷锛?- `LoreEntry` / `LoreType`
- `MemoryEntry` / `MemoryType`
- `CheckIssue` / `CheckIssueType` / `IssueSeverity` / `IssueStatus`

鎺ュ彛棰勭暀锛?- 璧勬枡搴撲繚瀛樸€侀暱绡囪蹇嗕繚瀛樸€丮emory Skill銆丱OC/浼忕瑪妫€鏌?Skill 褰撳墠鍧囦负鍓嶇闂幆鍜屾湰鍦拌鍒欙紝鍚庣画鍙帴鍚庣 API銆?
楠岃瘉锛?- 鍓嶇鏋勫缓閫氳繃锛歚next build`銆?- 鏈疆鏈帴鍏ュ鏉?RAG / 鍚戦噺鍙洖 / 鐪熷疄妯″瀷璋冪敤銆?## 2026-06-07 鏄撳啓绗洓闃舵锛氭妧鑳藉箍鍦?/ Prompt 骞垮満 MVP

鏈疆鍙疄鐜版妧鑳藉箍鍦哄墠绔?MVP锛屼笉鍖呭惈鏀粯浼氬憳銆佸鏍稿悗鍙般€佺敤鎴峰叕寮€涓婁紶銆佽瘎璁哄尯銆佺ぞ鍖恒€佺Щ鍔ㄧ瀹屾暣閫傞厤鎴栫湡瀹炲競鍦轰氦鏄撱€?
宸插畬鎴愶細
- App Shell 宸︿晶鏂板鈥滄妧鑳藉箍鍦衡€濆叆鍙ｃ€?- 鏂板鎶€鑳藉箍鍦轰富鍐呭椤碉紝浣跨敤鏈湴 mock 鎶€鑳芥暟鎹睍绀哄崱鐗囥€?- 鏀寔鍒嗙被绛涢€夛細寮€涔︺€佸ぇ绾层€佺珷鑺傘€佷汉鐗┿€佷笘鐣岃銆佹鏌ャ€佹鼎鑹层€?- 鏀寔鍏抽敭璇嶆悳绱笌鍏煎妯″瀷绛涢€夛細ChatGPT銆丏eepSeek銆丟emini銆侀€氱敤銆?- 鎶€鑳藉崱鐗囨敮鎸侊細绔嬪嵆浣跨敤銆佽鎯呫€佸鍒?Prompt銆佹敹钘忋€?- 鎶€鑳借鎯呭脊绐楁敮鎸侊細璇存槑銆佽緭鍏ヨ姹傘€佽緭鍑哄唴瀹广€乄eb AI 妯″紡銆佺珛鍗充娇鐢ㄣ€佸鍒?Prompt銆佹敹钘忔妧鑳姐€?- 娓稿鍙鍒?Prompt锛涙父瀹㈢偣鍑绘敹钘忎細寮圭櫥褰?/ 娉ㄥ唽銆?- 鈥滅珛鍗充娇鐢ㄢ€濅笉浼氳鐩栨鏂囷紝浼氱敓鎴愮粨鏋勫寲缁撴灉骞惰繘鍏ョ幇鏈?AI 缁撴灉纭椤点€?- Web AI 妯″紡鏀寔澶嶅埗 Prompt銆佺矘璐寸綉椤?AI 杩斿洖缁撴灉锛屽苟杩涘叆缁撴灉纭椤点€?
鏂板缁勪欢锛?- `SkillPlaza`
- `SkillDetailModal`
- `SkillCard`
- 鎶€鑳藉箍鍦哄眬閮ㄧ瓫閫夈€佹帹鑽愩€佽鏄庣粍浠?
鏂板绫诲瀷锛?- `SkillCategory`
- `SkillTemplate`

鎺ュ彛棰勭暀锛?- 鎶€鑳藉垪琛ㄦ帴鍙?- 鎶€鑳芥敹钘忔帴鍙?- 鎶€鑳戒娇鐢ㄥ巻鍙叉帴鍙?- 鐢ㄦ埛鑷畾涔?Prompt 淇濆瓨鎺ュ彛

楠岃瘉锛?- 鍓嶇鏋勫缓閫氳繃锛歚next build`銆?- 鏁版嵁褰撳墠鍏ㄩ儴涓哄墠绔湰鍦?mock锛屼笉鍐欏叆鍚庣銆?## 2026-06-07 鏄撳啓绗簲闃舵 A锛氭ā鍨嬭缃?/ 澶栬鍋忓ソ / 瀵煎嚭澶囦唤鍙戝竷涓績

鏈疆缁х画娌跨敤宸叉湁绗竴鍒扮鍥涢樁娈典富璺緞锛屽彧琛ラ綈璁剧疆涓庝綔鍝佸伐鍏蜂腑蹇冪殑鍓嶇 MVP锛屾病鏈夐噸鏋?App Shell锛屼篃娌℃湁鏂板鏀粯銆佺ぞ鍖恒€佺Щ鍔ㄧ瀹屾暣閫傞厤鎴栫湡瀹炲彂甯冨钩鍙拌兘鍔涖€?
宸插畬鎴愶細
- App Shell 宸︿晶鏂板銆屾ā鍨嬭缃€嶃€屽瑙備富棰樸€嶃€屽鍑哄彂甯冧腑蹇冦€嶅叆鍙ｏ紝椤甸潰鍒囨崲浠嶅彧鏇挎崲涓诲唴瀹瑰尯銆?- 鏂板妯″瀷璁剧疆椤碉細
  - 鏀寔鏈湴浣撻獙銆乄eb AI銆丄PI 鐩磋繛涓夌鐢熸垚妯″紡銆?  - 鏀寔 OpenAI銆丏eepSeek銆丟emini銆丱penRouter銆佽嚜瀹氫箟鏈嶅姟鍟嗐€?  - 鏀寔 Base URL銆佹ā鍨嬪悕绉般€丄PI Key銆佽繛鎺ユ祴璇曘€佷繚瀛橀厤缃€佽繛鎺ョ姸鎬佷笌澶辫触鍘熷洜灞曠ず銆?  - 鏀寔缁熶竴妯″瀷 / 鎸変换鍔¤矾鐢憋紝浠诲姟鍖呭惈鍒涗綔銆佽蹇嗐€佹鏌ャ€丄gent銆?  - 鏀寔 Web AI 鐩爣缃戠珯銆丳rompt 娉ㄥ叆绛栫暐銆佺矘璐磋В鏋愬己搴︺€佸け璐ュ洖閫€绛栫暐灞曠ず銆?- 鏂板澶栬涓庡啓浣滃亸濂介〉锛?  - 鏀寔榛樿钃濄€佹姢鐪肩豢銆佹殩绾告ā寮忋€佹繁鑹插鍐欏洓濂椾富棰橀€夋嫨銆?  - 鏀寔渚ц竟鏍忛粯璁ゆ姌鍙犮€佺晫闈㈠瘑搴︺€佸唴瀹瑰睍绀烘ā寮忋€佺紪杈戝櫒瀛椾綋銆佸瓧鍙枫€佽闂磋窛銆佹钀芥渶澶у搴︺€佷笓娉ㄦā寮忋€佹墦瀛楁満婊氬姩銆佹嫾鍐欒娉曟鏌ュ崰浣嶃€佸姩鐢绘晥鏋滃己搴︺€?  - 鏀寔鑷姩淇濆瓨闂撮殧銆佸巻鍙茬増鏈繚鐣欏懆鏈熴€佹湰鍦颁繚瀛樹笌瀹炴椂棰勮銆?- 鏂板瀵煎嚭 / 澶囦唤 / 鍙戝竷涓績锛?  - 瀵煎嚭鏀寔 TXT 鍜?Markdown 鐪熷疄涓嬭浇銆?  - DOCX銆丳DF銆丒PUB銆佹洿澶氭牸寮忎繚鐣欏崰浣嶆彁绀恒€?  - 鏀寔褰撳墠绔犺妭 / 閫夊畾绔犺妭 / 鏁撮儴浣滃搧鐨勮寖鍥撮€夐」 UI銆?  - 鏀寔灏侀潰銆佹爣棰樹俊鎭€佺洰褰曘€佹壒娉ㄥ鐞嗙瓑瀵煎嚭璁剧疆 UI銆?  - 鏀寔鏈湴 JSON 澶囦唤涓嬭浇銆丣SON 澶囦唤瀵煎叆鏍￠獙銆佹渶杩戝浠借褰曘€?  - 鍙戝竷椤典粎鍋氬崰浣嶏紝涓嶆帴鍏ョ湡瀹炲钩鍙般€佷笉鑷姩鍙戝竷銆?  - 娓稿鍙娇鐢ㄦ湰鍦板鍑哄拰鏈湴澶囦唤锛涗簯澶囦唤涓庡彂甯冧細瑙﹀彂鐧诲綍 / 娉ㄥ唽寮圭獥銆?
鏂板缁勪欢锛?- `ModelSettingsPage`
- `AppearanceSettingsPage`
- `ExportCenterPage`
- 妯″瀷/澶栬/瀵煎嚭椤靛唴閮ㄧ殑璁剧疆鍗＄墖銆乀ab銆佸紑鍏炽€佸鍑洪瑙堛€佸浠借褰曠瓑灞€閮ㄧ粍浠躲€?
鏂板绫诲瀷锛?- `GenerationMode`
- `ModelProvider`
- `AppTheme`
- `ExportFormat`
- `ExportScope`
- `ModelSettings`
- `AppearanceSettings`

鏈湴淇濆瓨锛?- `localStorage:yixie-model-settings-v1`
- `localStorage:yixie-appearance-settings-v1`
- `localStorage:yixie-local-backup-records-v1`
- `localStorage:yixie-app-shell-collapsed`

鎺ュ彛棰勭暀锛?- 妯″瀷閰嶇疆浜戠淇濆瓨鎺ュ彛銆?- API Key 鍔犲瘑鎵樼鎺ュ彛銆?- 妯″瀷杩炴帴鐪熷疄鎺㈡祴鎺ュ彛銆?- 浜戝浠芥帴鍙ｃ€?- 鍙戝竷骞冲彴鎺堟潈涓庡彂甯冩帴鍙ｃ€?- DOCX / PDF / EPUB 鍚庣瀵煎嚭鎺ュ彛銆?
楠岃瘉缁撴灉锛?- 鍓嶇 `next build` 宸查€氳繃銆?- 褰撳墠瀹炵幇涓嶄細鐮村潖寮€灞忛〉銆侀椤点€佹柊寤轰綔鍝佸脊绐椼€乄eb AI Prompt 妯″紡銆丄I 缁撴灉纭椤点€佺櫥褰?/ 娉ㄥ唽缁瓨銆佽祫鏂欏簱銆侀暱绡囪蹇嗐€佹鏌ラ〉銆佹妧鑳藉箍鍦虹瓑鏃㈡湁涓昏矾寰勩€?
