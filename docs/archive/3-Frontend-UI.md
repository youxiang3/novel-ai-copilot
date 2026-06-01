# 3-Frontend-UI

# 🎨 前端架构与 UI 布局

## 1. 技术栈与规范

- **框架**：Next.js (React) 或 Vue 3 (请根据开发者指令选择)
- **样式**：TailwindCSS + Shadcn/UI (用于快速搭建精美的交互组件)
- **编辑器**：TipTap 或 Novel.js (支持 Markdown 与扩展卡片的富文本编辑器)
- **状态管理**：Zustand (React) 或 Pinia (Vue)
- **流式请求处理 (极其关键)**：前端必须使用 `@microsoft/fetch-event-source` 或 `Vercel AI SDK` 来处理后端返回的 SSE (Server-Sent Events) 流，以实现 AI 生成时的\*\*“打字机效果”\*\*，并支持手动“中止 (Abort)”。

## 2. 视图布局 (三栏式沉浸工作台)

要求划分为以下三个主组件（左中右比例大致 2:6:2）：

- **左侧栏 (Left Sidebar - 设定导航区)**
  - 支持收起/展开。
  - Tab 1: 章节目录树 (List of Chapters)，支持拖拽排序。
  - Tab 2: 设定集 (LoreCards) 的 CRUD 列表。
- **中栏 (Main Workspace - 核心编辑器区)**
  - 顶部：当前章节标题与字数统计。
  - 主体：无干扰富文本编辑器。
  - **行间 AI 指令**：支持输入 `/ai` 唤醒输入框（输入短画面生成正文）。
  - **悬浮菜单 (Floating Menu)**：鼠标划选文本后弹出，支持“润色 / 扩写细节 / 重写”。
- **右侧栏 (Right Sidebar - AI 副驾与衍生区)**
  - Tab 1: **AI 伴写聊天**。当前上下文感知对话框（用户可直接提问剧情设定）。
  - Tab 2: **IP 衍生流**。包含“一键转短剧脚本”按钮（将当前章节转为竖屏分镜格式）及漫剧角色图展示。

