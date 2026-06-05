export type WebAiMode = 'LOCAL' | 'WEB_AI' | 'API'

export type WebAiProvider = 'GPT_WEB' | 'GEMINI_WEB' | 'OTHER_WEB'

export type WebAiTaskType =
  | 'opening_next_question'
  | 'novel_draft'
  | 'first_chapter'
  | 'chapter_expand'
  | 'chapter_rescue'

export interface WebAiPromptContext {
  novelTitle: string
  idea: string
  genre: string
  style: string
  chapterTitle: string
  chapterSummary: string
  chapterExcerpt: string
  openingHistory: Array<{
    question: string
    answer: string
    reason?: string
    impact?: string
  }>
  draft?: unknown
  protagonist: string
  worldRules: string
  userInput: string
}

const taskLabels: Record<WebAiTaskType, string> = {
  opening_next_question: '开篇问答下一题',
  novel_draft: '整理作品资料',
  first_chapter: '生成第一章',
  chapter_expand: '短画面扩写',
  chapter_rescue: '卡文急救',
}

const outputSchemas: Record<WebAiTaskType, string> = {
  opening_next_question: `{
  "finished": false,
  "question": "",
  "options": [],
  "helperText": "",
  "reason": "",
  "impact": "",
  "draftPatch": {}
}`,
  novel_draft: `{
  "title": "",
  "subtitle": "",
  "genre": "",
  "style": "",
  "sellPoint": "",
  "globalOutline": [],
  "mainCharacter": {},
  "worldRules": [],
  "openingChapterGoal": "",
  "firstChapterTitle": ""
}`,
  first_chapter: `{
  "chapterTitle": "",
  "chapterText": "",
  "chapterSummary": "",
  "suggestedNextStep": ""
}`,
  chapter_expand: `{
  "chapterText": "",
  "chapterSummary": "",
  "newWorldFacts": [],
  "newForeshadowing": []
}`,
  chapter_rescue: `{
  "solutions": [
    {
      "title": "",
      "reason": "",
      "conflictHint": "",
      "continuationText": "",
      "nextPlotSuggestion": ""
    }
  ]
}`,
}

export function getWebAiTaskLabel(taskType: WebAiTaskType) {
  return taskLabels[taskType]
}

export function buildWebAiPrompt(taskType: WebAiTaskType, context: WebAiPromptContext) {
  const history = context.openingHistory.length
    ? context.openingHistory.map((item, index) => `${index + 1}. 问：${item.question}\n答：${item.answer}\n影响：${item.impact || '未标注'}\n原因：${item.reason || '未标注'}`).join('\n\n')
    : '暂无'

  return `你是专业网文创作助手。请根据用户真实题材判断，不要强行套玄幻、退婚流、系统流模板。
如果用户题材是青春、都市、悬疑、武侠、科幻、校园、女性向、现实主义等，请按对应题材追问和生成。

任务类型：${taskType}
任务说明：${taskLabels[taskType]}

作品标题：
${context.novelTitle || '未命名作品'}

用户脑洞：
${context.idea || '暂无'}

类型：
${context.genre || '待判断'}

风格：
${context.style || '待判断'}

当前章节标题：
${context.chapterTitle || '暂无章节'}

当前章节摘要：
${context.chapterSummary || '暂无摘要'}

当前章节正文节选：
${context.chapterExcerpt || '暂无正文'}

已有开篇问答历史：
${history}

作品资料草稿：
${JSON.stringify(context.draft || {}, null, 2)}

主角设定：
${context.protagonist || '暂无'}

世界规则：
${context.worldRules || '暂无'}

用户本次输入：
${context.userInput || '暂无'}

输出要求：
1. 只输出合法 JSON。
2. 不要输出 Markdown。
3. 不要输出解释文字。
4. 不要把 JSON 包在代码块里。
5. 字段名必须符合下面的 JSON 格式。

JSON 格式：
${outputSchemas[taskType]}
`
}

export function extractFirstJsonObject(raw: string): unknown {
  const text = raw.trim()
  if (!text) throw new Error('请先粘贴网页 AI 返回内容')

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const source = fenced?.[1]?.trim() || text

  const direct = tryParseJson(source)
  if (direct !== undefined) return direct

  const start = source.indexOf('{')
  if (start < 0) throw new Error('没有找到 JSON 对象')

  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }
    if (char === '"') inString = true
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (depth === 0) {
      const candidate = source.slice(start, index + 1)
      const parsed = tryParseJson(candidate)
      if (parsed !== undefined) return parsed
    }
  }

  throw new Error('JSON 不完整或格式不合法')
}

function tryParseJson(source: string) {
  try {
    return JSON.parse(source)
  } catch {
    return undefined
  }
}
