# 作品数据模型

## 当前数据来源

当前作品数据以 `WorkItem` / `SavedWork` 前端类型为主，主要存储在：

`localStorage:yixie-works-library-v1`

这不是后端数据库，也不是完整云同步。刷新浏览器后可以恢复，但清理浏览器缓存、更换设备或隐私模式可能导致数据丢失。

## Work 作品字段

| 字段 | 含义 | 当前来源 | 用户可编辑 | 系统计算 | 未来后端持久化 |
| --- | --- | --- | --- | --- | --- |
| `id` | 作品 ID | 前端创建 | 否 | 是 | 是 |
| `title` | 作品名 | 新建流程 / 管理弹窗 | 是 | 否 | 是 |
| `authorName` | 笔名 / 作者名 | 管理弹窗 | 是 | 否 | 是 |
| `type` | 题材 | 新建流程 / mock / 管理数据 | 部分可编辑 | 否 | 是 |
| `status` | 旧版作品状态：`local-draft` / `official` | 新建流程 / normalize | 部分可编辑 | 否 | 是 |
| `projectStatus` | 项目状态 | 管理弹窗 / normalize | 是 | 否 | 是 |
| `currentPublishStatus` | 当前发布状态 | 管理弹窗 | 是 | 否 | 是 |
| `publishPlatform` | 发布平台 | 管理弹窗 | 是 | 否 | 是 |
| `words` | 当前字数 | 章节正文或作品字段 | 否 | 是 | 是 |
| `targetWords` | 目标字数 | 管理弹窗 | 是 | 否 | 是 |
| `plannedChapters` | 计划章节数 | 管理弹窗 | 是 | 否 | 是 |
| `chapterCount` | 当前章节数 | 新建流程 / 章节字段 / normalize | 否 | 是 | 是 |
| `monthlyUpdatedChapters` | 本月更新章节数 | 新建流程 / 作品字段 | 否 | 是 | 是 |
| `weeklyUpdateGoal` | 本周更新目标 | 管理弹窗 | 是 | 否 | 是 |
| `updatedAt` | 最近更新时间 | 保存作品 / 管理弹窗 | 否 | 是 | 是 |
| `createdAt` | 创建时间 | 前端创建 | 否 | 是 | 是 |
| `tags` | 标签 | 新建流程 / 管理弹窗 | 是 | 否 | 是 |
| `summary` | 简介摘要 | 新建流程 / mock | 是 | 否 | 是 |
| `description` | 简介 | 新建流程 / 管理弹窗 / normalize | 是 | 否 | 是 |
| `sellingPoint` | 一句话卖点 | 新建流程 / 兼容字段 | 目前展示为主 | 否 | 是 |
| `globalOutline` | 全局大纲 | 新建流程 / 兼容字段 | 暂无复杂编辑器 | 否 | 是 |
| `protagonists` | 主角摘要 | 新建流程 / 兼容字段 | 暂无复杂编辑器 | 否 | 是 |
| `mainCharacters` | 主要人物摘要 | 新建流程 / 兼容字段 | 暂无复杂编辑器 | 否 | 是 |
| `worldRules` | 世界规则 | 新建流程 / 兼容字段 | 暂无复杂编辑器 | 否 | 是 |
| `coreConflict` | 核心冲突 | 新建流程 / 兼容字段 | 暂无复杂编辑器 | 否 | 是 |
| `cover` | 封面 | mock / 默认封面 | 否 | 否 | 是 |
| `syncState` | 同步状态 | 前端字段 / normalize | 否 | 否 | 是 |
| `enabledTools` | 已启用工具 | mock / 管理数据 | 部分入口操作 | 否 | 是 |
| `toolStates` | 工具状态 | mock / 兼容字段 | 部分入口操作 | 否 | 是 |
| `recentTasks` | 最近任务 | mock / UI 占位 | 否 | 否 | 是 |

## Chapter 章节字段

当前章节数据仍以现有前端结构为主，不是完整独立后端章节表。现有 `SavedWork` 中常见字段包括：

| 字段 | 含义 | 当前规则 | 风险 |
| --- | --- | --- | --- |
| `chapterTitle` | 当前章节标题 | 新建或编辑时保存 | 不等于完整章节列表 |
| `chapterText` | 当前章节正文 | 新建或编辑时保存 | 多章节统计可能不完整 |
| `words` | 作品字数 | 常由正文去空白后长度估算 | 与真实章节库可能不同 |
| `chapterCount` | 章节数量 | 当前按已有字段或正文存在性轻量设置 | 需要后端或独立章节模型统一统计 |
| `updatedAt` | 最近更新时间 | 保存或管理时更新 | 多入口更新时间可能不一致 |

后续需要建立独立 Chapter 模型，例如 `id`、`workId`、`title`、`content`、`wordCount`、`status`、`createdAt`、`updatedAt`、`publishedAt`、`order` 等。

## ToolState 工具状态字段

功能状态当前使用：

| 值 | 文案 | 含义 |
| --- | --- | --- |
| `disabled` | 未启用 | 工具未绑定到当前作品 |
| `enabled` | 已启用 | 工具已绑定或入口可管理 |
| `running` | 进行中 | 工具有进行中状态 |
| `passed` | 上次通过 | 检查类工具最近一次通过 |
| `risk` | 存在风险 | 检查类工具发现风险 |

接入状态用于避免误导用户：原型展示、模型待接入、本地可用、已接入模型、云端待同步。

当前多数官方工具仍是原型展示、模型待接入或本地可用，不应显示为完整模型能力。

## syncState 同步状态

| 值 | 文案 | 当前含义 |
| --- | --- | --- |
| `local-only` | 仅本地 | 仅保存在当前浏览器 |
| `pending` | 待同步 | UI 状态或未来同步占位 |
| `syncing` | 同步中 | UI 状态或未来同步占位 |
| `synced` | 已同步 | 当前不应理解为真实云端已完成 |
| `failed` | 同步失败 | UI 状态或未来同步异常占位 |

游客草稿必须显示为仅本地保存。正式作品当前以本地保存为准，不应误导用户认为已经完成云端同步。

## localStorage key

| Key | 内容 | 说明 |
| --- | --- | --- |
| `yixie-works-library-v1` | 作品库数据 | 当前作品管理和作品总览的主数据源 |
| `yixie-works-library-view-v1` | 作品库视图模式 | 保存卡片视图 / 列表视图选择 |
| `yixie-storyline-data-v1-${workId}` | 单作品故事线图数据 | StoryGraphCenter 本地数据 |
| `yixie-phase3-workspace-${workId}` | 写作工作台本地状态 | 包含部分设定、记忆、检查结果和同步状态 |
| `yixie-model-settings-v1` | 模型设置 | 仍是前端设置，不代表真实模型调用 |
| `yixie-appearance-settings-v1` | 外观设置 | 本地 UI 设置 |
| `yixie-local-backup-records-v1` | 本地备份记录 | 前端备份记录或占位能力 |

不得在小任务中重命名、清空或迁移这些 key。

## 当前统计规则和风险

- `currentWords` / `words`：当前主要使用 `words` 表示当前字数，部分场景会根据章节正文去空白后的长度估算。多章节、草稿、多版本内容尚未统一纳入统计。
- `chapterCount`：当前使用作品字段、章节字段或正文存在性进行轻量推断，可能与真实章节列表不完全一致。
- `updatedAt`：当前在作品创建、保存、管理弹窗保存或章节编辑时更新，多入口保存时更新时间规则仍需统一。
- `monthlyUpdatedChapters`：当前主要来自作品字段或轻量统计，尚未由后端按自然月、发布状态和章节记录统一计算。
