# NovelAI Copilot Roadmap

## 路线原则

当前产品策略：

- 短期优先：继续完善前端本地闭环。
- 中期准备：以后端全量持久化为目标，但分阶段迁移。
- Prompt 方向：最终进入 Prompt Inspector，而不是只停留在提示词库。
- AI 工具方向：长篇记忆是最高战略优先级，但先做 V0 前置能力，不直接跳到完整 MemoryExtractionSkill。

当前仍是前端 localStorage 闭环，不是后端数据库持久化，不是完整云同步，也没有真实模型调用。

## P0：本地闭环稳定期

目标：让用户可以在当前浏览器中稳定管理作品、章节、设定摘要和作品总览。

已完成：

- 作品库 / 项目管理页 P0。
- WorkManagementModal 作品管理弹窗。
- 作品总览 / 作品驾驶舱 P0。
- 本地作品库持久化：`localStorage:yixie-works-library-v1`。
- 作品库视图模式持久化：`localStorage:yixie-works-library-view-v1`。
- 故事线图本地数据：`localStorage:yixie-storyline-data-v1-${workId}`。
- 本地 E2E 验收清单和基础文档。

P0 仍需收口：

- Prompt 弹窗支持本次编辑、导入、恢复默认和复制当前 Prompt。
- 章节统计联动 P0.5：章节保存、删除、发布标记后，作品库和作品总览的字数、章节数、更新时间尽量保持一致。
- 本地数据异常兜底：继续清理 NaN、undefined、null 和缺失字段导致的页面错误。
- UI 文案继续去除误导性 AI 感：不把原型写成已接入，不把本地保存写成云端同步。

P0 不做：

- 后端持久化。
- 真实云同步。
- 真实模型 API。
- 真实平台发布。
- 复制、导出、归档、删除的完整真实逻辑。
- MemoryExtractionSkill。
- ConsistencyCheckSkill。
- Prompt Inspector。

## P0.5：章节统计和 Prompt 轻增强

建议任务：

| 任务 ID | 目标 | 说明 |
| --- | --- | --- |
| `NOVELAI-COPILOT-WEBAI-PROMPT-EDIT-P0.5` | 外部生成 Prompt 支持编辑 / 导入 | 只影响本次生成，不保存为模板 |
| `NOVELAI-COPILOT-CHAPTER-STATS-LINK-P0.5` | 章节统计联动 | 章节保存、删除、发布标记后刷新作品统计 |
| `NOVELAI-COPILOT-LOCAL-DATA-GUARD-P0.5` | 本地数据兜底 | 防止旧数据字段缺失导致页面报错 |

## P1：可长期使用的轻量版本

目标：从“本地原型”进入“可以长期写作”的轻量产品。

### P1-A：作品管理轻 UX

- 保存成功提示。
- 关闭弹窗前的未保存提醒。
- 标签增删体验优化。
- 发布平台自定义输入。
- 管理弹窗字段分组和校验文案优化。
- 作品总览轻量编辑创作内容字段，例如一句话卖点、大纲摘要、世界规则摘要。

注意：作品管理弹窗负责项目管理字段；作品总览的轻编辑只处理创作资料字段，避免两个入口职责混乱。

### P1-B：安全数据动作

危险动作按顺序单独拆任务：

1. 导出 Markdown / JSON。
2. 复制作品。
3. 归档作品。
4. 删除作品。

这些动作不能混在 UI 优化任务里。删除必须最后做，并需要二次确认。

### P1-C：后端持久化 MVP

第一版后端目标：

- 登录用户可以创建作品。
- 保存作品基础信息。
- 保存章节。
- 重新登录后可以读取作品和章节。
- 游客草稿继续保留本地保存。
- localStorage 迁移到后端需要明确确认，不自动吞掉本地数据。

第一版暂不做：

- 多端冲突合并。
- 实时协作。
- 复杂版本历史。
- 平台发布授权。
- 完整云同步策略。

### P1-D：Prompt 工作流

先做 Prompt 轻量工作流：

- 展示本次上下文来源。
- 展示 Prompt 预览。
- 允许用户补充要求。
- 允许本次编辑 Prompt。
- 复制 Prompt。
- 记录最近一次 Prompt。
- AI 结果回填后必须由用户确认，不自动覆盖正文。

正式提示词库和 Prompt Inspector 放到后续阶段。

## P1.5：长篇记忆 V0 前置能力

长篇记忆是战略优先级最高的官方工具，但不建议第一步直接实现完整 MemoryExtractionSkill。

P1.5 先做 Memory V0：

- 章节摘要。
- 事件摘要。
- 人物状态摘要。
- 伏笔 / 设定摘录。
- 来源章节记录。
- 置信度或用户确认状态。
- 用户确认后写入本地记忆。

Memory V0 的目标不是“AI 已经记住全书”，而是建立可确认、可追溯、可修正的记忆条目。

## P2：智能化和云端化阶段

P2 才进入完整 AI 副驾能力：

- MemoryExtractionSkill：从章节中抽取人物、事件、设定、伏笔和世界规则。
- ConsistencyCheckSkill：基于记忆、人物设定、章节内容进行 OOC 和一致性检查。
- Prompt Inspector：展示 Prompt 上下文来源、引用内容、变量、token 结构和风险。
- AI Copilot Chat：围绕当前作品上下文进行多轮协作。
- 故事线图与章节联动：从章节自动生成事件线，用户确认后写入。
- 后端同步详情：待同步、冲突、失败原因和恢复操作。
- 发布准备增强：简介、标题、标签、章节卖点和发布检查。

## 推荐下一步任务顺序

1. `NOVELAI-COPILOT-WEBAI-PROMPT-EDIT-P0.5`
2. `NOVELAI-COPILOT-CHAPTER-STATS-LINK-P0.5`
3. `NOVELAI-COPILOT-WORKS-MANAGEMENT-P1-LIGHT-UX`
4. `NOVELAI-COPILOT-STORAGE-MIGRATION-DESIGN-P1`
5. `NOVELAI-COPILOT-MEMORY-V0-P1.5`
6. `NOVELAI-COPILOT-PROMPT-INSPECTOR-P2`

## 关键提醒

- 先作品闭环，再 AI 智能。
- 先章节和资料稳定，再长篇记忆。
- 先用户确认，再写入记忆。
- AI 结果不要自动覆盖正文。
- 状态文案必须诚实。
