# 存储与迁移规划

## 当前存储状态

NovelAI Copilot 已从纯前端 localStorage 闭环进入“本地优先 + 登录后端快照”的迁移期。

当前仍保留 localStorage 作为本地安全副本；登录用户可以显式把正式作品上传到后端作品库，后端返回的 `novelId` 会写回作品的 `backendNovelId`，供资料库同步和后续快照使用。

核心 key：

| Key | 内容 |
| --- | --- |
| `yixie-works-library-v1` | 作品库主数据 |
| `yixie-works-library-view-v1` | 作品库卡片 / 列表视图偏好 |
| `yixie-storyline-data-v1-${workId}` | 单作品故事线图数据 |
| `yixie-phase3-workspace-${workId}` | 写作工作台本地状态 |
| `yixie-model-settings-v1` | 模型设置 |
| `yixie-appearance-settings-v1` | 外观设置 |
| `yixie-local-backup-records-v1` | 本地备份记录 |

普通任务不得重命名、清空或迁移这些 key。

## 当前已实现的迁移行为

- 登录 / 注册成功后会尝试连接后端认证接口，并把 JWT 保存到 `localStorage:yixie-backend-token-v1`。
- 后端连接成功后，会读取当前账号已有作品快照并与本地作品库按作品 ID 合并。
- 如果当前浏览器存在本地作品，会弹出迁移确认，不会自动上传。
- 用户选择“上传正式作品”时，只上传 `status === 'official'` 的作品。
- 临时草稿继续仅保存在当前浏览器，不会自动变成云端作品。
- 上传正式作品时会保存完整作品 payload 和章节数组；后端返回的 `novelId` 会写回本地作品 `backendNovelId`。
- 用户选择“仅读取账号作品”时，只合并后端作品，不上传当前浏览器本地作品。
- 用户选择“稍后处理”时，不上传、不覆盖，并关闭本次自动后端保存。
- 迁移或同步失败时，localStorage 数据仍保留。

当前尚未实现：

- 正式迁移记录表。
- 多端冲突合并。
- 迁移批次回滚。
- Storyline / ToolState / PromptRun / MemoryItem 的全量后端化。
- 真实按设备 / 时间线展示的同步详情。

## 未来后端化目标

用户选择的长期方向是全量后端化，最终后端应覆盖：

- Work：作品。
- Chapter：章节。
- WorkProfile：作品资料。
- Storyline：故事线图。
- ToolState：官方工具状态。
- Prompt / PromptRun：提示词和运行记录。
- ModelSettings：模型配置。
- ExportRecord：导出记录。
- MemoryItem：长篇记忆条目。

但实际迁移必须分阶段，不一次性全量重构。

## 迁移阶段

### 阶段 1：Work + Chapter

目标：登录用户的作品和章节不再只保存在 localStorage。

后端最小模型：

- Work。
- Chapter。

能力：

- 登录用户创建作品。
- 保存作品基础信息。
- 保存章节。
- 重新登录后读取作品和章节。
- 游客仍可创建临时草稿并仅本地保存。

当前进展：

- 已通过作品快照接口保存作品基础信息、完整 payload 和章节数组。
- 已支持登录后读取账号作品快照。
- 已支持显式上传本地正式作品，并回写 `backendNovelId`。
- 仍处于“快照 + 章节数组”的迁移期，不是最终规范化 Work / Chapter 全量后端模型。

不做：

- 多端冲突合并。
- 实时协作。
- 完整版本历史。
- 自动云同步。

### 阶段 2：WorkProfile

目标：保存结构化创作资料。

字段建议：

- `globalOutline`
- `protagonists`
- `mainCharacters`
- `worldRules`
- `coreConflict`
- `sellingPoint`
- `description`
- `themes`
- `highlights`

第一版可以使用 JSON 字段，等结构稳定后再拆细表。

### 阶段 3：ToolState + Storyline

目标：保存工具启用状态和故事线图。

ToolState 字段建议：

- `workId`
- `toolKey`
- `enabled`
- `functionStatus`
- `integrationStatus`
- `lastRunAt`
- `lastResultSummary`
- `riskLevel`

Storyline 第一版建议整体 JSON 存储，不先拆节点表和边表。

### 阶段 4：Prompt / PromptRun

目标：为 Prompt Inspector 做准备。

当前本地 V0：

- `localStorage:yixie-prompt-runs-v1-${workId}`
- 当前只记录 Web AI Prompt 的复制 / 解析事件。
- 最多保留最近 20 条，弹窗展示最近 4 条。
- 不记录真实模型请求、费用、延迟或精确 token。

当前 V0 字段：

- `id`
- `target`
- `status`
- `createdAt`
- `promptCharacters`
- `estimatedTokens`
- `resultCharacters`

PromptRun 字段建议：

- `id`
- `workId`
- `chapterId`
- `toolKey`
- `promptText`
- `contextSummary`
- `contextSources`
- `userInstruction`
- `resultText`
- `resultAction`
- `createdAt`

第一版可以只记录最近若干次 Prompt，不做正式模板库。

### 阶段 5：MemoryItem

目标：支持长篇记忆 V0 和后续 MemoryExtractionSkill。

MemoryItem 字段建议：

- `id`
- `workId`
- `chapterId`
- `type`
- `title`
- `content`
- `sourceText`
- `sourceRange`
- `confidence`
- `status`
- `createdBy`
- `createdAt`
- `updatedAt`

状态建议：

- `draft`：AI 或本地规则提取，尚未确认。
- `confirmed`：用户确认写入。
- `rejected`：用户拒绝。
- `stale`：来源章节修改后可能过期。

## 本地到后端迁移规则

- 迁移必须由用户明确确认。
- 迁移前展示将上传的数据范围。
- 迁移后不要立即删除 localStorage 数据。
- 迁移失败必须保留本地数据。
- 同一作品重复迁移时需要识别本地作品 ID 和后端作品 ID 的映射关系。
- 游客草稿不应自动上传。
- 正式作品如果没有登录，不应显示为云端已保存。

## ID 映射建议

迁移后需要保存映射：

| 字段 | 含义 |
| --- | --- |
| `localWorkId` | localStorage 中的作品 ID |
| `serverWorkId` | 后端作品 ID |
| `lastMigratedAt` | 上次迁移时间 |
| `migrationVersion` | 迁移版本 |

映射可以先保存在后端返回结果和本地缓存中，后续再设计正式迁移记录表。

## 风险

- localStorage 旧数据字段不完整，需要 normalize。
- 章节统计当前由前端基于章节数组统一重算；后端后续仍需要明确最终权威来源。
- Storyline 当前适合 JSON 整体迁移，过早拆表会增加复杂度。
- Prompt 和 Memory 数据可能包含正文片段，后续需要隐私和删除策略。
- 同步状态不能在后端未完成前误显示为云端已同步。
