# 4-AI-Workflow

# 🧠 AI 核心工作流与 Prompt 机制

## 0. AI API 基础配置 (Configuration)

后端需在 `application.yml` 中预留 OpenAI 兼容配置（我们将对接 DeepSeek 等大模型）：

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

**后端代码要求**：\
封装一个 AiService 类统一调用大模型。必须包含：

1. String call(String prompt)：用于后台静默摘要生成（阻塞同步等待）。
2. Flux\<String> streamCall(String prompt)：用于前台小说续写（SSE 流式返回）。

## Workflow 1：短画面扩写正文 (Scene-to-Chapter)

**触发**：用户在中栏输入短画面指令后触发。\
**后端组装 Context 逻辑 (RAG + 记忆拼装)**：

1. System = 读取 novel.author\_style\_prompt 作为文风限定。
2. Context: Mid-term Memory = 读取最近 3 章的 memory\_summary。
3. Context: Entities = 利用 pgvector 向量检索出用户短画面指令中涉及的 lore 词条。
4. **最终发送给大模型的 User Prompt**：\
   背景信息：{Entities}。之前剧情：{Mid-term Memory}。请将以下短画面扩写为约 1500 字的小说正文，注意细节描写和对话，保持给定文风：\[{用户的短画面输入}]\
   *(调用 streamCall 流式返回给前端)*

## Workflow 2：后台静默记忆提取 (Summarize Agent)

**触发**：当用户写完一章并手动保存 (章节 status 变为 published) 时，异步触发。\
**逻辑**：

1. 提取当前章全文。
2. **User Prompt**：“作为小说分析师，请将以下章节总结为不超过 200 字的客观剧情摘要。必须包含：登场关键人物的动作、核心冲突结果、获得的物品或境界变化。正文如下：\[{全文}]”
3. 调用同步的 call() 接口，将结果保存至 memory\_summary 表，并针对此摘要生成向量存储到 embedding 字段。

## Workflow 3：短剧/漫剧衍生转换

**触发**：用户点击右侧栏“生成短剧本”。\
**逻辑**：\
将当前章节正文发给模型，限定 Prompt：“你是一个专业的竖屏短剧编剧。请提取以下小说的核心冲突，重构为短剧剧本。格式要求：前 3 秒高能钩子；严格按照 \[内/外景] - \[角色] - \[动作] - \[台词] 的格式排版。”
