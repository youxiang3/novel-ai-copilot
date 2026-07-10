# 智能助手 Agent 改造交接

更新时间：2026-07-10

## 已确认的产品方向

当前智能助手从“固定 Prompt + 少量前端动作”升级为可执行的轻量业务助手。小说系统是第一套实现，公共核心需要避免依赖小说实体，以便后续在其他项目中复用；每个项目仍保留独立数据、权限、工具和部署，不建设默认跨系统操作的超级助手。

模型负责理解、推理和选择动作；Agent Runtime 负责上下文、工具执行、权限确认、步骤限制和结果记录；Tool 负责实际读写业务数据；Codex 只作为后期可选的工程执行器。

## 当前实现边界

- `AssistantController` 仍在 Controller 内拼固定 Prompt，并只允许固定动作白名单。
- 全局模型助手、写作工作台本地搜索助手和既有后端 Agent Task 尚未统一。
- 工作台本地搜索主要嵌在 `WritingWorkspace.tsx`，写入动作仍依赖前端页面回调。
- 当前没有统一 `ModelProvider`、`AssistantTool`、`ToolRegistry` 和稳定的多步执行循环。
- 当前不是可迁移的独立 Agent 模块，也没有完成助手调用 Codex、CLI、MCP 或插件安装链路。

## P0：先修通真实用户流程

暂停继续堆助手按钮，先对现有功能做真实登录态端到端验收。每条主流程的完成标准统一为：

`页面点击 -> 请求成功 -> 数据落库 -> 刷新后仍存在 -> 失败时有明确提示`

必须覆盖：

- 登录并载入正式作品、章节及后端 ID 映射。
- 任务卡保存和状态切换。
- 章节保存、留版本、AI 采用和版本恢复。
- 诊断运行、历史读取及问题状态更新。
- 记忆候选同步、确认、拒绝、过期和删除。
- 八阶段工作流自动推进与非法跳转提示。
- API 改稿、流式返回、历史、diff、确认采用和失败状态。
- 页面刷新、重新登录、后端不可用和纯本地作品降级路径。

验收不能只依赖编译和 API smoke test，需要浏览器点击、Network、数据库记录和刷新恢复共同验证。

## P0：轻量 Agent Core

第一轮只实现五个公共组件，不直接建设完整 Agent 平台：

1. `ModelProvider`：统一 DeepSeek、OpenAI-compatible 和后续模型的请求、流式输出、结构化输出及 Tool Calling 能力描述。
2. `AssistantTool`：统一工具名称、参数 Schema、权限等级和执行结果。
3. `ToolRegistry`：注册并查询当前系统可用工具。
4. `AssistantRunner`：最多执行 3 至 5 步的有限循环，支持模型选择 Tool、回填结果和生成最终答复。
5. `ExecutionRecord`：记录模型、步骤、Tool 参数摘要、结果、错误和用户确认。

第一批 Novel Tools：

- `work.get`
- `chapter.search`
- `chapter.read`
- `chapter.updateDraft`
- `chapter.saveVersion`
- `memory.search`
- `memory.create`
- `diagnostic.run`
- `task.create`
- `task.update`

权限先分为三档：读取可自动执行；普通写入必须确认；删除、覆盖和外部执行属于高风险操作，必须二次确认并留下记录。

## P1：统一助手体验

- 合并全局模型助手与工作台本地搜索助手，保留一个绑定当前作品、章节和账号状态的助手入口。
- 本地搜索改为 Tool，不再维护第二套助手逻辑。
- UI 展示对话、当前上下文、待确认动作、执行步骤、失败原因和最终结果。
- 保留现有安全动作和接口兼容层，按 Tool 逐项迁移，避免一次性重写。

## P1：Skill 兼容

- Tool 是可执行能力，Skill 是指导模型组合 Tools 的工作方法，两者必须分离。
- 第一版只支持内置或本地受信任 `SKILL.md`，包含名称、描述、适用条件、步骤和所需 Tools。
- 格式尽量兼容 Codex Skill 的 Markdown 思路，但只实现项目需要的子集，不承诺直接兼容全部 Codex 行为。
- 暂不做第三方代码执行、在线插件市场、自动安装和复杂版本治理。
- Plugin 只预留 Manifest 和目录边界，后期再组合 Skills、Tools、配置及可选 UI。

## P2：Codex 双向协作

方向一，Codex 使用小说系统：

- 提供结构化 `novel-agent` CLI、JSON 输出、`AGENTS.md`、Codex Skill，后续按需提供 MCP Server。
- Codex 通过 CLI/MCP 读取作品上下文、诊断、任务和版本，并在业务权限范围内调用工具。

方向二，小说助手调用 Codex：

- 把 Codex 视为可选高级 Tool，仅处理代码分析、修改、测试和工程验证。
- 增加稳定的工程任务协议，包括项目目录、任务说明、验收标准、权限模式、超时和结果摘要。
- Java 后端通过独立 Node `codex-bridge` 调用 `@openai/codex-sdk`，使用 HTTP/SSE 隔离 SDK 版本变化。
- 浏览器不得直接启动 Codex 或持有 Codex 凭证；写文件、运行命令和保留改动必须遵守确认与审计策略。

## 暂缓事项

- 多 Agent 自动编排。
- Agent 工作流可视化编辑器。
- 插件市场和不受信任插件代码执行。
- 自动跨系统数据操作。
- 多个 Codex 任务的自动并行调度。
- 完整长期任务恢复、自动回滚和分布式队列。

上述能力只有在单助手 + Tools 的真实流程稳定后才重新评估。

## 推荐实施顺序

1. 修复并录制现有关键页面端到端流程。
2. 建立 `ModelProvider`、`AssistantTool`、`ToolRegistry`、`AssistantRunner`。
3. 用 Novel Tools 替换固定动作白名单，并保留旧接口兼容。
4. 合并两个助手 UI，补执行步骤和确认状态。
5. 接入本地受信任 Skill。
6. 完成助手调用 Codex 的单任务闭环。
7. 再做 CLI/MCP，让 Codex 反向使用小说系统。

## 第一阶段完成标准

- DeepSeek 配置可完成一次真实对话和至少一条只读 Tool 调用。
- “搜索章节 -> 分析问题 -> 用户确认 -> 创建修改任务”可完整执行并持久化。
- 刷新页面后可以查看执行结果和新建任务。
- 切换模型不修改 Novel Tools 和前端业务流程。
- Tool 越权、参数错误、模型输出异常和后端不可用均有可理解提示。
- 前后端构建通过，并有覆盖上述主流程的浏览器验收记录。
