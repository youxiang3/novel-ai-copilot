'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Copy,
  Trash2,
  FileText,
  Flame,
  Image,
  KeyRound,
  Layers3,
  ListTree,
  Loader2,
  MapPin,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  Plus,
  RefreshCcw,
  Save,
  Scissors,
  Search,
  Send,
  Settings2,
  Sparkles,
  Square,
  Wand2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  buildWebAiPrompt,
  extractFirstJsonObject,
  getWebAiTaskLabel,
  type WebAiMode,
  type WebAiProvider,
  type WebAiTaskType,
} from '@/lib/web-ai'

type ChapterStatus = 'draft' | 'published'
type LoreCategory = 'character' | 'location' | 'item' | 'faction'
type RightTab = 'starter' | 'agent' | 'webai' | 'copilot' | 'factory' | 'inspector'
type LeftTab = 'overview' | 'chapters' | 'lore' | 'ideas' | 'graph'
type AssistantMode = 'editor' | 'partner' | 'planner'
type StarterField = 'genre' | 'tone' | 'hook' | 'protagonist' | 'world' | 'opening'
type WritingSkill = 'suspense' | 'sensory' | 'conflict' | 'hook' | 'metaphor'

interface Chapter {
  id: string
  number: number
  title: string
  content: string
  status: ChapterStatus
  summary: string
  tension: number
  satisfaction: number
  mystery: number
}

interface LoreItem {
  id: string
  category: LoreCategory
  name: string
  content: string
  tags: string[]
  imagePrompt?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface PromptSnapshot {
  style: string
  memory: string[]
  entities: LoreItem[]
  scene: string
}

interface StoryProfile {
  logline: string
  outline: string
  protagonist: string
  worldRules: string
  storyArc: string
  currentThread: string
}

type StoryGraphNodeType = 'character' | 'faction' | 'location' | 'event' | 'hook' | 'chapter' | 'volume'
type StoryGraphEdgeType = 'relationship' | 'located_in' | 'belongs_to' | 'related_hook' | 'conflict' | 'appears_in' | 'causes' | 'follows'

interface StoryGraphNode {
  id: string
  type: StoryGraphNodeType
  label: string
  metadata: Record<string, unknown>
  x?: number
  y?: number
  important?: boolean
}

interface StoryGraphEdge {
  sourceId: string
  targetId: string
  type: StoryGraphEdgeType
  label: string
  metadata: Record<string, unknown>
}

interface StoryGraphData {
  nodes: StoryGraphNode[]
  edges: StoryGraphEdge[]
}

interface NovelDraft {
  title: string
  subtitle?: string
  sellPoint: string
  genre: string
  style: string
  globalOutline: string[]
  mainCharacter: {
    name: string
    identity: string
    desire: string
    weakness: string
    initialSituation: string
    growthArc: string
  }
  worldRules: Array<{
    name: string
    description: string
  }>
  longTermArcs: string[]
  currentHookLine: string[]
  firstChapterOpeningScene: string
  openingChapterGoal?: string
  firstChapterTitle?: string
}

interface OpeningGuideApiAnswer {
  question: string
  answer: string
}

interface OpeningGuideApiResponse {
  finished: boolean
  question?: string
  options?: string[]
  helperText?: string
  draftPatch?: {
    mainConflict?: string
    openingHook?: string
    protagonistHint?: string
    worldRuleHint?: string
  }
}

interface FirstChapterGenerationResult {
  chapterTitle: string
  chapterText: string
  chapterSummary: string
  suggestedNextStep?: string
}

interface StarterQuestion {
  field: StarterField
  title: string
  prompt: string
  placeholder: string
  chips: string[]
}

type StarterAnswers = Record<StarterField, string>

interface OpeningGuideQuestion {
  id: string
  title: string
  prompt: string
  placeholder: string
  options: string[]
  answer: string
  reason?: string
  impact?: string
  source?: 'backend' | 'local' | 'web'
}

interface CreativeBrief {
  assistantMessage: string
  title: string
  genre: string
  coreHook: string
  openingSuggestion: string
  whyThisWorks: string
  keyQuestion: string
  actions: Array<{
    label: string
    hint: string
    action: 'CONTINUE_ASK' | 'GENERATE_FIRST_CHAPTER' | 'WEB_AI'
  }>
}

type OpeningGuidePhase = 'idle' | 'questioning' | 'draft' | 'generating' | 'done'

interface WorkspaceSnapshot {
  chapters: Chapter[]
  activeChapterId: string
  lore: LoreItem[]
  ideas: string[]
  editingLoreId: string | null
  loreSearch: string
  leftTab: LeftTab
  rightTab: RightTab
  sceneInput: string
  starterStep: number
  starterAnswers: StarterAnswers
  openingGuidePhase?: OpeningGuidePhase
  openingGuideTitle?: string
  openingGuideIdea?: string
  openingGuideGenre?: string
  openingGuideStyle?: string
  openingGuideQuestions?: OpeningGuideQuestion[]
  openingGuideDraft?: NovelDraft | null
  selectedWritingSkill: WritingSkill
  modelConfig?: ModelConfig
  storyProfile?: StoryProfile
  storyGraph?: StoryGraphData
}

interface ApiResult<T> {
  code: number
  message: string
  data: T
}

interface BackendNovel {
  id: string
  title: string
  globalOutline?: string | null
  authorStylePrompt?: string | null
  status?: 'draft' | 'serializing' | 'completed'
  updatedAt?: string | null
  coverSeed?: string | null
  coverUrl?: string | null
  genre?: string | null
  tags?: string[] | null
}

interface NovelLibraryItem {
  id: string
  title: string
  logline: string
  outline: string
  protagonist: string
  worldRules: string
  status: 'draft' | 'serializing' | 'completed'
  statusLabel: string
  wordCount: number
  chapterCount: number
  volumeCount: number
  characterCount: number
  hookCount: number
  draftChapterCount: number
  publishedChapterCount: number
  updatedAtLabel: string
  updatedAtValue: number
  createdAtValue: number
  lastEditedChapter?: Chapter
  genre: string
  tags: string[]
  coverUrl?: string | null
  coverStyle: CSSProperties
}

interface BackendChapter {
  id: string
  novelId: string
  chapterNumber: number
  title: string
  content: string
  wordCount?: number
  status?: string
}

interface BackendLore {
  id: string
  novelId: string
  category: string
  name: string
  content: string
}

interface ChapterExpansionResult {
  chapterText: string
  chapterSummary: string
  characterUpdates: Array<{
    characterName: string
    stateChange: string
    relationshipChange: string
  }>
  newForeshadowing: Array<{
    title: string
    description: string
    payoffSuggestion: string
  }>
  newWorldFacts: string[]
}

interface ChapterRescueSolution {
  title: string
  reason: string
  conflictHint: string
  continuationText: string
  nextPlotSuggestion: string
}

interface ChapterRescueResult {
  solutions: ChapterRescueSolution[]
}

interface AgentTaskStepResponse {
  stepId: string
  stepKey: string
  stepName: string
  status: string
  errorMessage?: string
  startedAt?: string
  finishedAt?: string
}

interface AgentTaskLogResponse {
  logId: string
  level: 'INFO' | 'WARN' | 'ERROR'
  message: string
  metadataJson?: string
  createdAt?: string
}

interface AgentTaskResponse {
  taskId: string
  agentType: string
  status: string
  message?: string
  input: Record<string, unknown>
  result: {
    novelId?: string
    novelTitle?: string
    chapterId?: string
    chapterTitle?: string
    storyGraphGenerated?: boolean
    storyGraphNodeCount?: number
    storyGraphEdgeCount?: number
    runnerMode?: string
  }
  steps: AgentTaskStepResponse[]
  errorMessage?: string
}

interface AuthPayload {
  userId: string
  username: string
  token: string
}

interface ModelConfig {
  provider: 'deepseek' | 'openai' | 'siliconflow' | 'openrouter' | 'custom'
  baseUrl: string
  model: string
  apiKey: string
  apiKeyConfigured?: boolean
}

type OperationKey =
  | 'auth'
  | 'draft'
  | 'createNovel'
  | 'openingQuestion'
  | 'openingDraft'
  | 'firstChapter'
  | 'expand'
  | 'rescue'
  | 'agent'
  | 'deleteNovel'
  | 'saveChapter'
  | 'saveLore'
  | 'model'

interface GenerationRouteState {
  provider: string
  modelName: string
  skill: string
  runnerMode: string
  usesBackend: boolean
  usesFallback: boolean
  message: string
}

const defaultGenerationRoute: GenerationRouteState = {
  provider: '未配置',
  modelName: '未配置',
  skill: '本地规则',
  runnerMode: 'LOCAL_FALLBACK',
  usesBackend: false,
  usesFallback: true,
  message: '当前使用本地创作规则，可先体验完整工作流。',
}

class ApiRequestError extends Error {
  status?: number
  code?: number

  constructor(message: string, status?: number, code?: number) {
    super(message)
    this.status = status
    this.code = code
  }
}

const novelId = '123e4567-e89b-12d3-a456-426614174000'
const workspaceStorageKey = 'novel-ai-copilot-workspace-v1'
const authStorageKey = 'novel-ai-copilot-auth'
const localAccountsStorageKey = 'novel-ai-copilot-local-accounts'

const defaultModelConfig: ModelConfig = {
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  apiKey: '',
}

const initialStoryProfile: StoryProfile = {
  logline: '山村少年带着父母遗物踏入修仙界，发现自己被隐藏的血脉牵进一场旧案。',
  outline: '林青云离开山村后，围绕玉佩、玄天剑残片和林家血脉逐步揭开父母失踪真相。前期以紫云宗试炼为主线，中期进入宗门势力斗争，后期回收林家旧案和上古残剑伏笔。',
  protagonist: '林青云，十八岁山村少年，克制、倔强，想查清父母失踪真相，害怕牵连师父。',
  worldRules: '宗门以灵根定命，林家血脉被视为禁忌。玉佩与玄天剑残片会共鸣，暗示主角身世并不普通。',
  storyArc: '离乡遇袭 -> 紫云试炼 -> 残剑共鸣 -> 身世追索 -> 宗门暗线 -> 林家旧案。',
  currentThread: '玉佩、玄天剑残片和紫云宗试炼是当前最重要的三条追读线。',
}

const blankStoryProfile: StoryProfile = {
  logline: '',
  outline: '',
  protagonist: '',
  worldRules: '',
  storyArc: '',
  currentThread: '',
}

const initialChapters: Chapter[] = [
  {
    id: 'chapter-1',
    number: 1,
    title: '第一章：初入江湖',
    status: 'draft',
    tension: 62,
    satisfaction: 34,
    mystery: 72,
    summary: '林青云离开山村，师父交还父母遗留玉佩，暗示其身世与修仙界存在隐秘关联。',
    content: `夕阳西下，晚霞染红了天际。\n\n林青云站在山巅，望着远方连绵起伏的群山，心中涌起一股豪情。十八年了，他终于可以走出这个小山村，去追寻那传说中的修仙之路。\n\n“青云，此去路途遥远，你要多加小心。”身后传来师父苍老的声音。\n\n林青云转身，看着这位抚养自己长大的老人，眼眶微红：“师父，弟子一定不会辜负您的期望。”\n\n老人点点头，从怀中取出一枚玉佩递给他：“这是你父母留下的唯一信物，收好了。”\n\n林青云接过玉佩，只见上面刻着一个古朴的“林”字，入手温润，似乎蕴含着某种神秘的力量。`,
  },
  {
    id: 'chapter-2',
    number: 2,
    title: '第二章：夜雨客栈',
    status: 'draft',
    tension: 70,
    satisfaction: 48,
    mystery: 64,
    summary: '林青云在客栈遭遇追索玉佩的黑衣人，神秘老者出手相助，并留下紫云宗试炼消息。',
    content: '夜雨落在青石街上，客栈灯火摇晃。林青云刚把玉佩藏入贴身衣襟，楼下便传来刀鞘撞桌的声音。',
  },
  {
    id: 'chapter-3',
    number: 3,
    title: '第三章：紫云试炼',
    status: 'draft',
    tension: 58,
    satisfaction: 61,
    mystery: 53,
    summary: '林青云通过紫云宗外门试炼，发现玄天剑残片会与玉佩共鸣。',
    content: '紫云宗山门高耸入云。数百少年站在试炼台下，没人注意到林青云袖中的玉佩正在发烫。',
  },
]

const initialLore: LoreItem[] = [
  {
    id: 'lore-1',
    category: 'character',
    name: '林青云',
    tags: ['主角', '身世谜团', '剑修'],
    content: '十八岁山村少年，性格克制但骨子里倔强。随身玉佩刻有古林字，遇到玄天剑残片会共鸣。',
    imagePrompt: 'black-haired young swordsman, plain cyan robe, jade pendant, restrained expression, chinese fantasy anime style',
  },
  {
    id: 'lore-2',
    category: 'character',
    name: '苏婉儿',
    tags: ['紫云宗', '同伴', '医修'],
    content: '紫云宗外门弟子，擅长医术与阵法，表面温婉，判断力极强。',
    imagePrompt: 'gentle female cultivator, pale green robe, medicine satchel, soft but sharp eyes, chinese anime style',
  },
  {
    id: 'lore-3',
    category: 'location',
    name: '紫云宗',
    tags: ['宗门', '云海', '试炼'],
    content: '坐落在紫云山脉的修仙宗门，外门试炼严苛，山门下常年云雾缭绕。',
  },
  {
    id: 'lore-4',
    category: 'item',
    name: '玄天剑',
    tags: ['上古残剑', '伏笔'],
    content: '上古名剑，只余残片。与林家玉佩产生共鸣，可能指向林青云父母失踪真相。',
  },
]

const initialIdeas = ['雨夜客栈中玉佩发烫，窗外有人倒挂偷听', '苏婉儿发现林青云体内灵脉像被人为封住', '玄天剑残片只在月光下显出第二行铭文']

const stylePrompt = '偏传统仙侠，句式克制，动作和环境细节带出情绪，避免口号式热血。'

function createBlankChapter(title = '第一章：未命名章节'): Chapter {
  return {
    id: `chapter-${Date.now()}`,
    number: 1,
    title,
    content: '',
    status: 'draft',
    summary: '新作品草稿，等待填写第一章核心冲突。',
    tension: 50,
    satisfaction: 50,
    mystery: 50,
  }
}

const initialBlankChapter = createBlankChapter()

function createStoryProfile(title: string, answers: StarterAnswers, idea = ''): StoryProfile {
  const hook = idea.trim() || answers.hook
  return {
    logline: `${title}：${hook}`,
    outline: `${answers.genre}方向，主角因“${hook}”卷入初始危机。故事以“${answers.opening}”切入，围绕主角欲望、世界规则和长线秘密逐步升级。`,
    protagonist: answers.protagonist,
    worldRules: answers.world,
    storyArc: `开篇危机 -> 主角被迫选择 -> 进入核心场域 -> 第一次反击 -> 长线秘密露出 -> 更大势力介入。`,
    currentThread: `当前优先推进：${answers.opening}；持续埋设：${hook}`,
  }
}

function createNovelDraft(title: string, idea: string, answers: StarterAnswers): NovelDraft {
  const hook = idea.trim() || answers.hook
  return {
    title,
    sellPoint: `${title}：${hook}`,
    genre: answers.genre,
    style: answers.tone,
    globalOutline: [
      `开篇以“${answers.opening}”切入，让主角在强压处境中暴露第一个底牌。`,
      `中段围绕“${hook}”持续升级冲突，逐步揭开主角身份、世界规则和敌对势力。`,
      '长线以主角主动选择和代价升级推动，保留可连续追读的秘密、反转和关系变化。',
    ],
    mainCharacter: {
      name: '待命名主角',
      identity: answers.protagonist,
      desire: '证明自己，并夺回被规则、家族或命运剥夺的主动权。',
      weakness: '起点被压制，缺少可信任的盟友，秘密一旦暴露会引来更大危险。',
      initialSituation: answers.opening,
      growthArc: '从被动承受羞辱和危机，成长为能主动布局、承担代价并改变规则的人。',
    },
    worldRules: [
      {
        name: '核心压迫规则',
        description: answers.world,
      },
      {
        name: '追读秘密',
        description: `“${hook}”不是一次性爽点，而是会牵出身份、势力和更高层规则的长线谜团。`,
      },
    ],
    longTermArcs: [
      '主角从低谷反击，逐步获得读者爽感和角色尊重。',
      '表层冲突背后藏着更大的组织、血脉、旧案或规则漏洞。',
      '每一卷至少回收一个旧伏笔，同时抛出一个更大的新问题。',
    ],
    currentHookLine: [
      answers.opening,
      hook,
      '第一章结尾保留一个轻微反转或身份线索，让读者愿意点下一章。',
    ],
    firstChapterOpeningScene: answers.opening || `${title}的第一章核心画面`,
  }
}

function novelDraftToStoryProfile(draft: NovelDraft): StoryProfile {
  return {
    logline: draft.sellPoint,
    outline: draft.globalOutline.join('\n'),
    protagonist: [
      draft.mainCharacter.identity,
      `欲望：${draft.mainCharacter.desire}`,
      `短板：${draft.mainCharacter.weakness}`,
      `成长：${draft.mainCharacter.growthArc}`,
    ].join('\n'),
    worldRules: draft.worldRules.map((rule) => `${rule.name}：${rule.description}`).join('\n'),
    storyArc: draft.longTermArcs.join('\n'),
    currentThread: draft.currentHookLine.join('\n'),
  }
}

function createStarterLore(title: string, profile: StoryProfile): LoreItem[] {
  const now = Date.now()
  return [
    {
      id: `lore-character-${now}`,
      category: 'character',
      name: `${title}主角`,
      tags: ['主角', '成长线', '待命名'],
      content: profile.protagonist,
    },
    {
      id: `lore-world-${now}`,
      category: 'faction',
      name: `${title}世界规则`,
      tags: ['世界观', '规则', '冲突来源'],
      content: profile.worldRules,
    },
  ]
}

function stableGraphId(value: string) {
  return value.trim().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '_').slice(0, 36) || `node_${Date.now()}`
}

function withGraphLayout(graph: StoryGraphData): StoryGraphData {
  const typeOrder: StoryGraphNodeType[] = ['volume', 'chapter', 'character', 'faction', 'location', 'event', 'hook']
  const nodes = graph.nodes.map((node, index) => {
    if (typeof node.x === 'number' && typeof node.y === 'number') return node
    const typeIndex = Math.max(0, typeOrder.indexOf(node.type))
    const siblings = graph.nodes.filter((item) => item.type === node.type)
    const siblingIndex = siblings.findIndex((item) => item.id === node.id)
    const angle = (Math.PI * 2 * (siblingIndex + 1)) / Math.max(3, siblings.length + 1)
    const radius = 70 + typeIndex * 34
    return {
      ...node,
      x: Math.round(260 + Math.cos(angle) * radius + (typeIndex % 2) * 24),
      y: Math.round(230 + Math.sin(angle) * radius + index * 1.5),
    }
  })
  return { ...graph, nodes }
}

function createLocalStoryGraph(title: string, chapters: Chapter[], lore: LoreItem[], ideas: string[], profile: StoryProfile): StoryGraphData {
  const rootId = `volume_${stableGraphId(title)}`
  const nodes: StoryGraphNode[] = [
    { id: rootId, type: 'volume', label: title, metadata: { summary: profile.outline || profile.logline }, important: true },
  ]
  const edges: StoryGraphEdge[] = []

  chapters.forEach((chapter) => {
    const chapterId = `chapter_${chapter.number}`
    nodes.push({
      id: chapterId,
      type: 'chapter',
      label: chapter.title,
      metadata: { chapterNumber: chapter.number, status: chapter.status, summary: chapter.summary, wordCount: countWords(chapter.content) },
      important: chapter.content.includes(profile.currentThread.slice(0, 12)),
    })
    edges.push({ sourceId: rootId, targetId: chapterId, type: 'follows', label: '章节', metadata: { chapterNumber: chapter.number } })
  })

  lore.forEach((item) => {
    const nodeType: StoryGraphNodeType = item.category === 'character' ? 'character' : item.category === 'location' ? 'location' : item.category === 'faction' ? 'faction' : 'event'
    const nodeId = `${nodeType}_${stableGraphId(item.name)}`
    nodes.push({ id: nodeId, type: nodeType, label: item.name, metadata: { summary: item.content, tags: item.tags, category: item.category }, important: item.tags.includes('主角') || item.tags.includes('伏笔') })
    edges.push({ sourceId: nodeId, targetId: rootId, type: 'belongs_to', label: '属于作品', metadata: {} })
    chapters.filter((chapter) => chapter.content.includes(item.name)).slice(0, 4).forEach((chapter) => {
      edges.push({ sourceId: nodeId, targetId: `chapter_${chapter.number}`, type: 'appears_in', label: '出场', metadata: { chapterNumber: chapter.number } })
    })
  })

  ideas.slice(0, 6).forEach((idea, index) => {
    const hookId = `hook_${stableGraphId(idea)}`
    nodes.push({ id: hookId, type: 'hook', label: idea.slice(0, 18), metadata: { status: 'open', summary: idea, importance: index < 2 ? 5 : 3 }, important: index < 2 })
    edges.push({ sourceId: rootId, targetId: hookId, type: 'related_hook', label: '钩子', metadata: { status: 'open' } })
  })

  if (profile.currentThread) {
    const eventId = `event_${stableGraphId(profile.currentThread)}`
    nodes.push({ id: eventId, type: 'event', label: '当前追读线', metadata: { summary: profile.currentThread }, important: true })
    edges.push({ sourceId: eventId, targetId: rootId, type: 'causes', label: '驱动主线', metadata: {} })
  }

  return withGraphLayout({ nodes, edges })
}

const storyGraphTypeMeta: Record<StoryGraphNodeType, { label: string; color: string; bg: string }> = {
  volume: { label: '卷/作品', color: '#0f766e', bg: '#ccfbf1' },
  chapter: { label: '章节', color: '#2563eb', bg: '#dbeafe' },
  character: { label: '人物', color: '#be123c', bg: '#ffe4e6' },
  faction: { label: '势力', color: '#7c3aed', bg: '#ede9fe' },
  location: { label: '地点', color: '#16a34a', bg: '#dcfce7' },
  event: { label: '事件', color: '#c2410c', bg: '#ffedd5' },
  hook: { label: '伏笔', color: '#ca8a04', bg: '#fef9c3' },
}

const writingSkillPrompts: Record<WritingSkill, { label: string; prompt: string }> = {
  suspense: {
    label: '制造悬念',
    prompt: '在下一段中隐藏关键信息，只给出异常细节和人物反应，让读者想继续追问真相。',
  },
  sensory: {
    label: '感官细节',
    prompt: '扩写时补充听觉、触觉、气味和光影细节，用环境推动情绪，不要空泛抒情。',
  },
  conflict: {
    label: '冲突制造',
    prompt: '为当前场景加入明确对抗：目标冲突、立场冲突或时间压力，并让冲突改变角色处境。',
  },
  hook: {
    label: '断章钩子',
    prompt: '把这一段收束到一个强钩子：新威胁出现、身份反转、物品异变或关键人物登场。',
  },
  metaphor: {
    label: '题材修辞',
    prompt: '加入符合仙侠题材的比喻和修辞，但保持克制，避免堆砌华丽词藻。',
  },
}

const starterQuestions: StarterQuestion[] = [
  {
    field: 'genre',
    title: '题材与赛道',
    prompt: '这本新书想站在哪个赛道？',
    placeholder: '例如：东方玄幻、都市异能、悬疑无限流、古言权谋',
    chips: ['东方玄幻', '都市异能', '悬疑无限流', '古言权谋'],
  },
  {
    field: 'tone',
    title: '阅读情绪',
    prompt: '读者打开第一章时，你希望他们先感到什么？',
    placeholder: '例如：压抑后反杀、轻松爽快、诡异不安、宿命感',
    chips: ['压抑后反杀', '轻松爽快', '诡异不安', '宿命感'],
  },
  {
    field: 'hook',
    title: '核心钩子',
    prompt: '用一句话说出这本书最想让人追下去的东西。',
    placeholder: '例如：少年以为自己是废材，其实体内封着上古剑魂',
    chips: ['废材真相', '身份错位', '重生复仇', '规则怪谈'],
  },
  {
    field: 'protagonist',
    title: '主角画像',
    prompt: '主角是谁？他最想要什么，又最怕什么？',
    placeholder: '例如：山村少年林青云，想查父母失踪真相，害怕自己拖累师父',
    chips: ['倔强少年', '落魄天才', '伪装反派', '冷静女主'],
  },
  {
    field: 'world',
    title: '世界规则',
    prompt: '这个世界有什么会制造冲突的规则、势力或禁忌？',
    placeholder: '例如：宗门以灵根定命，林家血脉被列为禁忌',
    chips: ['宗门等级', '血脉禁忌', '灵气复苏', '王朝暗线'],
  },
  {
    field: 'opening',
    title: '第一幕画面',
    prompt: '第一章从哪个具体画面切入？',
    placeholder: '例如：雨夜客栈，黑衣人逼主角交出父母遗物',
    chips: ['雨夜追杀', '退婚现场', '尸案开局', '试炼翻盘'],
  },
]

const initialStarterAnswers: StarterAnswers = {
  genre: '东方玄幻',
  tone: '压抑后反杀',
  hook: '少年以为自己只是山村孤儿，其实父母遗物能唤醒上古残剑。',
  protagonist: '林青云，十八岁山村少年，想查清父母失踪真相，害怕师父因自己受牵连。',
  world: '宗门以灵根定命，林家血脉被视为禁忌，紫云宗外门试炼暗藏筛选。',
  opening: '雨夜客栈里，黑衣人逼林青云交出玉佩，玉佩突然与包袱中的玄天剑残片共鸣。',
}

function getLoreIcon(category: LoreCategory) {
  if (category === 'character') return Bot
  if (category === 'location') return MapPin
  if (category === 'item') return Zap
  return Layers3
}

function countWords(text: string) {
  return text.replace(/\s/g, '').length
}

function splitOutlineLines(outline: string) {
  const lines = outline
    .split(/\n|。|；|;/)
    .map((line) => line.replace(/^\d+[.、：:\s-]*/, '').trim())
    .filter(Boolean)
  return lines.length ? lines.slice(0, 8) : ['先补一句开篇冲突。', '再写中段升级路线。', '最后确定高潮和结局回收。']
}

function createLocalExpansion(scene: string, chapter: Chapter, entities: LoreItem[]) {
  const names = entities.map((item) => item.name).join('、') || '旧日伏笔'
  return `\n\n${scene}\n\n夜色像被墨洗过，沿着檐角一寸寸压下来。${chapter.title.replace(/^第.+?：/, '')}之后残留的余波还没有散尽，林青云握紧袖中的玉佩，指腹贴上那枚古朴的“林”字，忽然察觉它比方才更烫。\n\n他没有立刻回头。师父教过他，真正的危险来临时，先稳住呼吸，再看影子。油灯在墙上摇晃，窗纸外的影子却静得过分，像一枚钉入黑夜的针。\n\n“出来。”林青云低声道。\n\n风声一顿。下一瞬，窗棂炸开，碎木裹着雨水扑面而来。林青云侧身避开，掌心玉佩猛然一震，竟与${names}牵出一线微弱的灵光。那光不亮，却像在黑暗深处替他指出了一条路。\n\n来人蒙着面，刀锋压得极低：“把东西交出来，你还能活。”\n\n林青云看着那柄刀，忽然笑了一下。不是轻狂，也不是无惧，只是一路走到这里，他终于明白，所谓身世，所谓仙途，从来不会等他准备好才揭开。\n\n“若我不交呢？”\n\n刀光暴起。林青云向后退半步，肩头擦过冷风，手却已经按住桌上那截不起眼的木筷。玉佩中的热意涌入经脉，像有一道被封住多年的门，在这一刻松动了一条缝。` 
}

function createStarterOpening(answers: StarterAnswers) {
  return `第一章：雨夜遗物\n\n雨落得很密，像无数细针扎在客栈的窗纸上。\n\n林青云坐在二楼最角落的位置，面前的粗瓷碗早已凉透。他把手伸进怀里，指尖碰到那枚玉佩时，才发现自己掌心全是冷汗。\n\n这枚玉佩是师父今晨交给他的。师父只说，那是他父母留下的东西，可从山村到此处不过半日，已经有三拨人向他打听“林家的遗物”。\n\n楼下忽然安静下来。\n\n林青云抬眼。柜台前的掌柜还保持着擦酒坛的姿势，酒客们却像被什么东西按住了喉咙，连呼吸都轻了。一个黑衣人踏上楼梯，斗笠边沿滴着水，腰间刀鞘每碰一下木阶，整座客栈便跟着轻轻一颤。\n\n“林青云。”黑衣人停在他桌前，“把玉佩交出来。”\n\n林青云没有动：“你认错人了。”\n\n刀光倏然出鞘，贴着他的耳侧钉入墙中。碎木飞溅，割破了他的脸。\n\n“山村孤儿，十八岁，今日离家。”黑衣人声音很低，“你以为你是谁不重要，重要的是，有些血脉不该活着进紫云宗。”\n\n血脉。\n\n这两个字像一枚钉子，把林青云钉在原地。他一直以为自己只是被师父捡回来的孩子，最多不过命苦些、灵根差些。可此刻，玉佩在他怀里一点点发烫，热意穿过衣料，像有什么沉睡多年的东西正在醒来。\n\n包袱里，那截他在旧庙捡来的残剑忽然震响。\n\n黑衣人的瞳孔骤然收缩：“玄天剑残片？”\n\n林青云终于明白，对方要的不是玉佩，而是玉佩背后那段被人刻意埋掉的过去。\n\n他握住玉佩，站了起来。雨声、刀鸣、楼下众人的惊呼，在这一瞬都远了。只有残剑震动的声音越来越清晰，像一颗心脏，在黑暗中替他跳动。\n\n“我父母是谁？”林青云问。\n\n黑衣人冷笑：“死人不需要知道答案。”\n\n刀锋再次落下。林青云侧身，被刀风带得撞上木栏，胸口闷痛，却没有松手。玉佩与残剑之间亮起一道细如发丝的金线，沿着他的手臂钻入经脉。\n\n疼。\n\n像有人把封死多年的门，从体内硬生生推开。\n\n林青云咬住牙，抬起那截锈迹斑斑的残剑。它明明钝得连纸都割不开，可当黑衣人的刀劈到眼前时，残剑上忽然浮出一行古老铭文。\n\n客栈里响起一声刺耳的断裂。\n\n黑衣人的刀，碎了。\n\n满堂死寂。\n\n林青云看着自己发抖的手，又看向黑衣人骤然变白的脸，第一次意识到，师父让他离开山村，并不是让他去求一条仙路。\n\n而是让他活着，把被人夺走的真相，一寸寸夺回来。`
}

function createStarterSummary(answers: StarterAnswers) {
  return `${answers.genre}开局，主角因${answers.hook}被卷入初始危机。第一章以${answers.opening}切入，建立${answers.tone}的阅读情绪，并抛出主角身世、世界禁忌与后续宗门试炼三条追读线。`
}

function createStarterPlan(answers: StarterAnswers) {
  return [
    `第二章：追索者暴露${answers.world}背后的势力规则，主角被迫带伤赶往下一处安全点。`,
    `第三章：主角进入试炼或核心场域，${answers.protagonist}的欲望与弱点同时被放大。`,
    `第四章：围绕“${answers.hook}”给出第一次小反转，读者确认这不是普通升级线。`,
  ]
}

function detectOpeningGuideLane(source: string) {
  const text = source.toLowerCase()
  if (/退婚|羞辱|打脸/.test(source)) return '退婚流'
  if (/系统|奖励|任务|面板/.test(source)) return '系统流'
  if (/剑与魔法|学院|魔法|骑士|法师/.test(source)) return '剑与魔法'
  if (/女频|复仇|重生|嫡女|夺回|背叛/.test(source)) return '女频复仇'
  if (/无限|副本|轮回|主神/.test(source)) return '无限流'
  if (/科幻|星|机甲|文明|舰|赛博/.test(source)) return '科幻'
  if (/悬疑|凶案|尸|诡|谜|规则怪谈/.test(source)) return '悬疑'
  if (/武侠|江湖|侠客|少侠|大侠|门派|镖局|轻功|内力|刀客|剑客|退隐/.test(source)) return '武侠'
  if (/都市|异能|豪门|职场/.test(source)) return '都市'
  if (/仙侠|修真|宗门|灵根|飞升/.test(source)) return '仙侠 / 修真'
  return text.includes('xuanhuan') ? '玄幻' : '玄幻'
}

function parseIdeaSeed(input: string) {
  const source = input.trim()
  const title = source.match(/(?:^|\n)\s*(?:标题|书名)\s*[：:]\s*([^\n]+)/)?.[1]?.trim() || ''
  const genre = source.match(/(?:^|\n)\s*(?:类型|题材|赛道)\s*[：:]\s*([^\n]+)/)?.[1]?.trim() || ''
  const style = source.match(/(?:^|\n)\s*(?:风格|读感)\s*[：:]\s*([^\n]+)/)?.[1]?.trim() || ''
  const background = source.match(/(?:^|\n)\s*(?:故事背景|背景|脑洞|简介)\s*[：:]\s*([\s\S]*?)(?=\n\s*(?:标题|书名|类型|题材|赛道|风格|读感)\s*[：:]|$)/)?.[1]?.trim()
  const lane = detectOpeningGuideLane(source)
  const inferredGenre = genre || (lane === '武侠' ? '架空历史，武侠' : lane)
  const inferredStyle = style || (lane === '武侠' ? '江湖悬疑、留白、节奏紧凑' : '')

  return {
    title,
    idea: background || source,
    genre: inferredGenre,
    style: inferredStyle,
  }
}

function isDefaultDemoText(text?: string | null) {
  return Boolean(text && /林青云|玄天剑|上古残剑|玉佩|东方玄幻|紫云宗|灵根/.test(text))
}

function buildCreativeBrief(seed: { title: string; idea: string; genre: string; style: string }): CreativeBrief {
  const lane = detectOpeningGuideLane(`${seed.title} ${seed.idea} ${seed.genre} ${seed.style}`)
  if (lane === '武侠') {
    return {
      assistantMessage: `我理解这个故事最有钩子的地方，不是“少年武艺高强”，而是他为什么要在人声鼎沸的时候退出江湖。第一章应该先把旧名、旧案和“不拔刀”的规矩亮出来，让读者立刻想知道三年前发生了什么。`,
      title: seed.title || '未命名武侠长篇',
      genre: seed.genre || '架空历史，武侠',
      coreHook: '名动江湖的少年突然退隐，三年后在热闹处被旧人喊破身份。',
      openingSuggestion: '从茶楼、酒肆或说书场开场：众人正在讲他的旧事，他却以伙计或过客身份藏在人群里，直到一柄旧刀被放到桌上。',
      whyThisWorks: '这个开场同时有身份反差、公共羞辱、旧案悬念和动作爽点，比先讲江湖设定更容易抓住读者。',
      keyQuestion: '三年前他退出江湖，到底背了什么债，才让他宁愿不再拔刀？',
      actions: [
        { label: '回答关键问题', hint: '先锁定退隐真相，再继续追问第一章冲突。', action: 'CONTINUE_ASK' },
        { label: '直接生成第一章', hint: '按当前理解先写一版茶楼开场。', action: 'GENERATE_FIRST_CHAPTER' },
        { label: '交给网页 GPT 深挖', hint: '生成干净 Prompt，拿到网页 GPT 的追问或第一章。', action: 'WEB_AI' },
      ],
    }
  }

  return {
    assistantMessage: `我先把你的脑洞当成一部长篇开局来判断：最重要的是找到第一章的具体冲突，而不是先铺设定。下面这一步会先确认主角为什么不能退、第一场戏在哪里爆开。`,
    title: seed.title || '新的长篇小说',
    genre: seed.genre || lane,
    coreHook: seed.idea || '主角被卷入一个无法回避的初始危机。',
    openingSuggestion: '第一章从一个正在发生的具体场面切入：有人逼问、误会爆发、秘密暴露或规则突然失效。',
    whyThisWorks: '新手最容易写成设定说明，先抓住“此刻正在发生什么”，第一章才会有推进力。',
    keyQuestion: '第一章一开场，谁在逼主角做选择？如果他不回应，会立刻失去什么？',
    actions: [
      { label: '回答关键问题', hint: '先让工具追问 2-3 题，再生成草稿。', action: 'CONTINUE_ASK' },
      { label: '直接生成第一章', hint: '按当前脑洞先写一版可改的开篇。', action: 'GENERATE_FIRST_CHAPTER' },
      { label: '交给网页 GPT 深挖', hint: '生成干净 Prompt，拿到网页 GPT 的追问或第一章。', action: 'WEB_AI' },
    ],
  }
}

function buildOpeningGuideQuestion(
  history: OpeningGuideQuestion[],
  context: { title: string; idea: string; genre: string; style: string },
): OpeningGuideQuestion {
  const lane = detectOpeningGuideLane(`${context.title} ${context.idea} ${context.genre} ${history.map((item) => item.answer).join(' ')}`)
  const count = history.length
  const answered = history.map((item) => item.answer).join('；')
  const base = { id: `guide-${Date.now()}-${count}`, answer: '' }
  if (count === 0) {
    if (lane === '武侠') {
      return {
        ...base,
        title: '退隐原因',
        prompt: '三年前他退出江湖，真正原因更接近哪一种？',
        placeholder: '例如：替亡友背下血案；误杀旧人；败给某个人后立誓不再拔刀',
        options: ['替人背下血案', '误杀旧人封刀', '败给故人退隐', '守住秘密不拔刀'],
      }
    }
    return {
      ...base,
      title: '第一章的爆点',
      prompt: `这个「${lane}」开局，第一章最想让读者记住哪一个爆点？`,
      placeholder: '例如：退婚现场反杀、系统第一次奖励、学院入学试炼翻盘',
      options: lane === '退婚流' ? ['当众羞辱', '婚约信物异变', '主角一句反击', '隐藏血脉觉醒']
        : lane === '系统流' ? ['系统降临', '第一次奖励', '任务失败代价', '别人看不见的面板']
          : lane === '剑与魔法' ? ['入学测试', '禁咒失控', '职业觉醒', '导师选中']
            : lane === '女频复仇' ? ['重生醒来', '被夺走婚约', '亲人背叛', '夺回身份']
              : ['强冲突开场', '身份异常', '关键道具异变', '危险人物登场'],
    }
  }
  if (count === 1) {
    if (lane === '武侠') {
      return {
        ...base,
        title: '谁认出他',
        prompt: '第一章开场，谁最适合在热闹处认出这个退隐少年？',
        placeholder: '例如：茶楼说书时，仇家把旧刀放到他桌上，喊出他的旧名',
        options: ['旧日仇家', '当年死者亲人', '官府捕头', '昔日同伴'],
      }
    }
    return {
      ...base,
      title: '主角此刻最怕什么',
      prompt: '主角在开篇冲突里最怕失去什么？这会决定读者共情点。',
      placeholder: '例如：怕妹妹被牵连、怕家族最后的尊严被踩碎、怕秘密暴露',
      options: lane === '女频复仇' ? ['失去亲人', '被夺身份', '清白被毁', '仇人得势']
        : lane === '科幻' ? ['父亲线索消失', '钥匙被夺', '被军方通缉', '同伴被牵连']
          : ['亲人被牵连', '尊严被踩碎', '秘密暴露', '错过唯一机会'],
    }
  }
  if (count === 2) {
    if (lane === '武侠') {
      return {
        ...base,
        title: '不拔刀破局',
        prompt: `基于前面回答「${answered.slice(0, 48)}」，他不拔刀，要用什么方式破局？`,
        placeholder: '例如：以筷夹刀、茶水听风、旧招识人、用一句江湖规矩逼对方收手',
        options: ['以筷夹刀', '茶水听风辨位', '旧招识破来人', '一句江湖规矩反制'],
      }
    }
    return {
      ...base,
      title: '第一次反击方式',
      prompt: `基于前面回答「${answered.slice(0, 48)}」，主角第一章用什么方式反击？`,
      placeholder: '例如：不靠嘴硬，而是让信物当场发光，逼退对方半步',
      options: lane === '退婚流' ? ['当众揭短', '信物觉醒', '废材检测反转', '一句话压住全场']
        : lane === '系统流' ? ['完成隐藏任务', '领取新手奖励', '反向利用规则', '公开打脸质疑者']
          : lane === '悬疑' ? ['指出证词漏洞', '发现尸体细节', '逼嫌疑人失态', '留下更大谜团']
            : ['抓住规则漏洞', '道具突然回应', '用弱点反制', '救下关键人物'],
    }
  }
  if (count === 3) {
    if (lane === '武侠') {
      return {
        ...base,
        title: '江湖代价',
        prompt: '第一章末尾露出哪条江湖代价，让读者知道他不是想退就能退？',
        placeholder: '例如：封刀誓被破要偿命；旧案名帖重现；当年血案还有活口',
        options: ['封刀誓代价', '旧案名帖重现', '当年血案活口', '门派旧约追责'],
      }
    }
    return {
      ...base,
      title: '世界规则露出',
      prompt: '第一章末尾露出哪条世界规则，让读者知道这不是普通事件？',
      placeholder: '例如：血脉越强代价越大；星门钥匙会选择主人；副本规则不能违背',
      options: lane === '无限流' ? ['副本规则', '死亡惩罚', '隐藏评分', '队友背叛机制']
        : lane === '剑与魔法' ? ['魔力亲和', '学院阶级', '禁咒代价', '职业契约']
          : ['血脉禁忌', '宗门等级', '旧案真相', '道具认主'],
    }
  }
  if (count === 4) {
    if (lane === '武侠') {
      return {
        ...base,
        title: '章末追读钩子',
        prompt: '第一章最后一句，最好把读者钩向哪个江湖问题？',
        placeholder: '例如：说书人忽然改口：三年前死的那个人，昨夜进城了。',
        options: ['死人昨夜进城', '旧刀主人未死', '官府榜文改名', '故人留下血书'],
      }
    }
    return {
      ...base,
      title: '章末追读钩子',
      prompt: '第一章最后一句应该把读者钩向什么问题？',
      placeholder: '例如：他终于听见系统第二句话：三日后，灭门之人会回来。',
      options: ['幕后黑手出现', '更大身份反转', '三日后危机', '关键人物认出主角'],
    }
  }
  return {
    ...base,
    title: '文风校准',
    prompt: '最后校准一下开篇文风，正文要更偏哪种读感？',
    placeholder: '例如：短句强节奏，压抑后反杀，少解释多画面',
    options: ['短句强节奏', '压抑后反杀', '画面感更强', '对白冲突更足'],
  }
}

function createOpeningGuideAnswers(history: OpeningGuideQuestion[], context: { title: string; idea: string; genre: string; style: string }): StarterAnswers {
  const joined = history.map((item) => `${item.title}：${item.answer}`).join('；')
  return inferStarterAnswersFromIdea(`${context.idea}；${context.genre}；${context.style}；${joined}`, {
    ...initialStarterAnswers,
    genre: context.genre || initialStarterAnswers.genre,
    tone: context.style || initialStarterAnswers.tone,
    hook: context.idea || initialStarterAnswers.hook,
    opening: history[0]?.answer || context.idea || initialStarterAnswers.opening,
  })
}

function createFirstChapterFromGuide(title: string, draft: NovelDraft, history: OpeningGuideQuestion[]) {
  const answersText = history.map((item) => `${item.title}：${item.answer}`).join('\n')
  const lane = detectOpeningGuideLane(`${title} ${draft.title} ${draft.genre} ${draft.sellPoint} ${draft.firstChapterOpeningScene} ${answersText}`)
  if (lane === '武侠') {
    const reason = history.find((item) => /退隐|原因|旧案|债/.test(`${item.title} ${item.prompt}`))?.answer || '替人背下血案'
    const witness = history.find((item) => /谁|认出|开场|热闹/.test(`${item.title} ${item.prompt}`))?.answer || '旧日仇家'
    const counter = history.find((item) => /破局|不拔刀|反制/.test(`${item.title} ${item.prompt}`))?.answer || '以筷夹刀'
    const hook = history.find((item) => /章末|钩子|代价|旧案/.test(`${item.title} ${item.prompt}`))?.answer || '三年前死去的人昨夜进城'
    const protagonist = /烟雨|江湖/.test(`${title} ${draft.sellPoint}`) ? '沈照' : '他'
    const chapterTitle = '第一章：三年不拔刀'
    const chapterText = `${chapterTitle}

五月初七，宜嫁娶，忌动刀。

临安城的听雨楼坐满了人。雨从檐角落下来，细细密密，像一张银灰色的帘，把楼外长街隔成旧画。说书先生一拍醒木，正讲到“三年前白衣少年一夜挑翻十二寨”，满堂叫好。

靠窗的青衣伙计低头擦桌，像没听见。

他叫${protagonist}。至少这三年里，街坊都这么叫他。没人知道他从哪里来，只知道他手脚勤快，话少，雨天会把门口的伞往里挪半尺，免得客人进门时沾湿鞋面。

直到有人把一柄旧刀放在他桌上。

刀鞘很旧，皮面被雨水泡得发黑。楼里的笑声还没散，那人已经按着刀柄，笑着喊出另一个名字。

“${protagonist}，”他说，“江湖都说你死了。”

满堂声息一静。

${protagonist}的手停在茶盏边。他看了一眼那柄刀，没有碰。

三年前，${reason}。江湖人只记得他退得突然，却没人知道他退得有多狼狈。那一夜之后，他给自己立过一条规矩：不再拔刀。

可江湖从来不认一个人自己立的规矩。

来人往前压了一步，声音不高，却足够让整座茶楼听清：“有人托我带句话。你若还记得当年那桩事，今晚子时，到旧渡口。”

“我不记得。”${protagonist}说。

“那就让你想起来。”

刀光骤起。

茶楼里有人惊叫，有人撞翻长凳。那一刀来得极快，劈向的却不是${protagonist}的头颈，而是桌上那柄旧刀。对方要逼他伸手，要逼他在众目睽睽之下承认自己还是当年的那个人。

${protagonist}没有拔刀。

他只是抬起两根竹筷。

筷尖点在刀脊上，轻得像夹起一片茶叶。可那柄来势凶狠的刀偏偏在半寸外停住，刀锋震出一声细鸣，连带着满桌茶水都荡开一圈涟漪。

${counter}。

来人的笑僵在脸上。

楼上楼下的人都看见了：这个低眉顺眼的青衣伙计，武功还在。更可怕的是，他明明能杀人，却连自己的刀都没有碰一下。

“你还守着那条誓？”来人咬牙。

${protagonist}把竹筷放回桌上，声音很轻：“我守的不是誓，是人命。”

这句话落下，窗外忽然又响起醒木声。

说书先生不知何时停了原来的段子，嗓音变得干涩：“诸位，方才讲错了。”

${protagonist}终于抬眼。

因为说书人接下来的话，是${hook}。`
    return {
      chapterTitle,
      chapterText,
      summary: `${title || draft.title}的第一章从茶楼旧名被喊破切入，主角以不拔刀破局，章末牵出三年前旧案。`,
    }
  }
  const protagonist = draft.mainCharacter.name || '主角'
  const firstAnswer = history[0]?.answer || draft.firstChapterOpeningScene || draft.sellPoint
  const fear = history[1]?.answer || draft.mainCharacter.weakness || '失去最后的退路'
  const counter = history[2]?.answer || '抓住规则漏洞完成第一次反击'
  const rule = history[3]?.answer || draft.worldRules[0]?.description || '这个世界的规则从来不站在弱者一边'
  const hook = history[4]?.answer || draft.currentHookLine[0] || '真正的危机才刚刚开始'
  const chapterTitle = `第一章：${firstAnswer.replace(/[，。；、\s].*$/, '').slice(0, 12) || '开篇'}`
  const chapterText = `${chapterTitle}

雨落下来的时候，${protagonist}正站在人群中央。

四周并不安静。有人在笑，有人在低声议论，也有人故意把声音放得很大，像是生怕这场难堪传不到更远的地方。那些目光一层层压过来，带着审视、轻蔑和等着看戏的兴奋，把${protagonist}逼在原地。

今天之前，他还以为自己至少能保住最后一点体面。

可现在，${firstAnswer}。

那句话落下时，人群里爆出一阵压低的哄笑。有人摇头，有人叹气，更多的人只是把视线投向他，等他露出狼狈的表情。对他们而言，这不是一场冲突，只是一场早就写好结局的热闹。

${protagonist}垂在身侧的手慢慢收紧。

他怕的不是这些笑声。笑声再刺耳，终究会散。他真正怕的是${fear}。那是他撑到现在的理由，也是对方偏偏要踩碎的东西。

“怎么，不说话了？”站在最前面的人往前一步，衣袖上绣着细密的纹路，连语气都带着居高临下的从容，“刚才不是还很硬气？”

${protagonist}抬起眼。

那一瞬间，周围的声音像被雨幕隔开。他看见对方眼底的得意，也看见更远处有人悄悄皱眉。所有人都以为他会退，会忍，会像过去无数次一样，把这口气吞下去。

可他忽然笑了一下。

那笑意很轻，却让最前面的人脸色沉了沉。

“你笑什么？”

${protagonist}没有回答。他只是把掌心里那枚一直被攥到发烫的东西拿了出来。它原本普通得像一块旧物，边缘甚至有细小裂痕，可当雨水落上去时，裂痕深处忽然亮起一线微光。

人群的议论声骤然断了一截。

有人低低吸了一口气：“那是什么？”

那光并不耀眼，却像一根细针，刺破了所有人笃定的结局。${protagonist}能感觉到一股陌生的热意顺着掌心钻入经脉，疼得他指节发白，却也让他第一次确认，自己并不是毫无还手之力。

“原来如此。”他低声说。

最前面的人神情一变：“把东西交出来！”

这一声太急了。

急得连旁观的人都察觉到不对。方才还稳稳压在${protagonist}头顶的局面，忽然因为这句话裂开了一道口子。

${protagonist}往后退了半步，不是退让，而是让自己站到所有人都能看见的位置。

“你们怕的不是我。”他说，“你们怕的是它。”

对方眼神阴沉，抬手便要来夺。可就在那只手逼近的瞬间，旧物里的光猛然一震，像是回应了某个迟到多年的名字。空气里响起一声极轻的裂响，周围人的衣摆同时被无形的风掀起。

${counter}。

最前面的人被逼得后退一步，脸上的从容彻底碎了。

满场死寂。

${protagonist}胸口起伏，掌心疼得几乎失去知觉，可他没有松手。因为他终于明白，今日这一切不是偶然，不是羞辱，也不是谁一时兴起的刁难。

这是有人在试探他。

试探他知不知道自己的来历，试探他手里有没有那件东西，试探他会不会在众目睽睽之下，被逼到再也爬不起来。

可他们算错了一件事。

被逼到绝路的人，未必只会跪下。

也可能第一次学会抬头。

远处忽然传来一道苍老的声音：“够了。”

人群自动分开。一个披着灰色斗篷的老人站在雨里，目光没有看任何人，只落在${protagonist}掌心那道微光上。他的脸色很难看，像是看见了某个本该被埋进旧岁月里的秘密。

“这东西，”老人一字一顿地问，“是谁留给你的？”

${protagonist}没有立刻回答。

因为就在老人开口的同时，他掌心的旧物再次发烫，一行细小的纹路浮出表面。那不是装饰，而像是一句被封住多年的提醒。

${rule}。

雨声重新落回耳边。

${protagonist}看着那行纹路，忽然意识到，自己刚才赢下的并不是一场争执，而是一扇门。

门后面，藏着他一直想知道的真相。

也藏着足以吞掉他的危险。

而下一刻，老人用只有他能听见的声音说：

“孩子，${hook}。”`
  return { chapterTitle, chapterText, summary: createStarterSummary(createOpeningGuideAnswers(history, { title, idea: draft.sellPoint, genre: draft.genre, style: draft.style })) }
}

function openingGuideAnswersForApi(history: OpeningGuideQuestion[]): OpeningGuideApiAnswer[] {
  return history
    .filter((item) => item.answer.trim())
    .map((item) => ({
      question: item.prompt || item.title,
      answer: item.answer.trim(),
    }))
}

function mapOpeningGuideQuestionFromApi(
  response: OpeningGuideApiResponse,
  index: number,
  fallback: OpeningGuideQuestion,
): OpeningGuideQuestion {
  const meta = getOpeningGuideQuestionMeta(response.question || fallback.prompt, index)
  return {
    id: `guide-api-${Date.now()}-${index}`,
    title: response.helperText || fallback.title,
    prompt: response.question || fallback.prompt,
    placeholder: fallback.placeholder,
    options: response.options?.length ? response.options : fallback.options,
    answer: '',
    reason: response.helperText || meta.reason,
    impact: meta.impact,
    source: 'backend',
  }
}

function extractOpeningGuideDraftPatch(response?: OpeningGuideApiResponse | null) {
  if (!response?.draftPatch) return {}
  return Object.fromEntries(Object.entries(response.draftPatch).filter(([, value]) => value))
}

function getOpeningGuideQuestionMeta(question: string, index: number) {
  const source = `${question} ${index}`
  if (/动机|为什么|不能退|想夺回|证明/.test(source)) {
    return { impact: '主角动机', reason: '先确认主角不能退的理由，第一章才会有情绪抓力。' }
  }
  if (/江湖|退隐|封刀|旧案|旧债|不拔刀|谁认出/.test(source)) {
    return { impact: '退隐真相 / 江湖旧案', reason: '先确认旧案和封刀誓言，第一章才会有江湖回潮的张力。' }
  }
  if (/压力|冲突|承受|退婚|羞辱|危机/.test(source)) {
    return { impact: '开篇冲突', reason: '开场压力越具体，读者越快进入局面。' }
  }
  if (/底牌|异常|金手指|系统|能力|觉醒/.test(source)) {
    return { impact: '金手指/能力', reason: '第一章需要露出一个能力钩子，但不能一次解释完。' }
  }
  if (/世界|规则|不公平|等级|契约/.test(source)) {
    return { impact: '世界规则', reason: '用规则制造不公平，冲突才有持续升级空间。' }
  }
  if (/结尾|章末|钩子|爽点|追读/.test(source)) {
    return { impact: '第一章爽点', reason: '提前确定章末追读点，正文生成时会更像连载开篇。' }
  }
  return { impact: '开篇结构', reason: '这题用于收束开篇信息，避免正文只是在聊天式发散。' }
}

function withOpeningGuideMeta(question: OpeningGuideQuestion, index: number, source: 'backend' | 'local' = 'local') {
  const meta = getOpeningGuideQuestionMeta(`${question.title} ${question.prompt}`, index)
  return {
    ...question,
    reason: question.reason || meta.reason,
    impact: question.impact || meta.impact,
    source,
  }
}

function createGuideOutput(answers: StarterAnswers, chapter: Chapter, entities: LoreItem[]) {
  const plan = [
    `本章目标：围绕“${answers.hook}”继续加压，让主角从被动承受转向主动选择。`,
    `下一段冲突：用“${answers.opening}”作为切入，让外部威胁、误会或关键道具异变立刻发生。`,
    `情绪推进：保持“${answers.tone}”，先压低处境，再给一个小反击或新证据。`,
    `结尾钩子：把“${answers.world}”中的规则或禁忌露出一角，但不要一次解释完。`,
  ]
  const nextScene = answers.opening || `承接${chapter.title}最后一段，写出主角的下一步选择`
  const continuation = createLocalExpansion(nextScene, chapter, entities)

  return `创作方案（用于${chapter.title}）

${plan.map((item, index) => `${index + 1}. ${item}`).join('\n')}

---
可直接续写段落：
${continuation.trim()}`
}

function createLocalRescueSolutions(answers: StarterAnswers, chapter: Chapter, entities: LoreItem[], selectedText = ''): ChapterRescueSolution[] {
  const anchor = selectedText.trim() || chapter.content.slice(-260).trim() || answers.opening || `围绕「${chapter.title}」继续推进`
  const loreHint = entities[0]?.name || '一个尚未解释的细节'
  return [
    {
      title: '冲突升级',
      reason: '当前段落需要一个外部压力，让主角必须立刻做选择。',
      conflictHint: '让对手当场加码，把沉默变成公开对抗。',
      continuationText: `${anchor}\n\n沉默没有维持太久。\n\n对面那人忽然往前一步，声音压得不高，却刚好能让周围所有人听清。原本还在观望的人群像被这句话钉住，目光齐刷刷落到主角身上。\n\n他知道，这不是一句普通的逼问，而是在逼他承认一个结果。\n\n可越是这样，他越不能退。\n\n主角慢慢抬眼，掌心深处那点被压住的异动终于有了回应。`,
      nextPlotSuggestion: '下一段让反派给出明确代价，主角用小反击打破场面。',
    },
    {
      title: '信息反转',
      reason: '用一个新信息改变读者对当前场面的理解，适合卡在解释或对峙时。',
      conflictHint: `${loreHint}暴露出第二层含义，对方其实在害怕主角知道真相。`,
      continuationText: `${anchor}\n\n他没有急着反驳，反而把对方刚才那句话在心里重新过了一遍。\n\n不对。\n\n真正不对的不是指控，而是对方说出指控时太急了。像是只要声音足够大，就能把某个更关键的问题盖过去。\n\n主角忽然明白过来。\n\n他们不是因为掌握了证据才来逼他。\n\n他们是怕他手里真的有证据。`,
      nextPlotSuggestion: '让主角用一个问题试探，对方露出破绽，结尾抛出新证据。',
    },
    {
      title: '爽点兑现',
      reason: '如果前文已经压抑较久，这个方案能给读者一个小释放，同时保留下一章钩子。',
      conflictHint: '主角不是大获全胜，而是先打破一条看似不可动摇的规则。',
      continuationText: `${anchor}\n\n主角终于笑了一下。\n\n那笑意很淡，却让四周的议论声同时低了下去。没人知道他为什么还能笑，连站在他对面的人也在那一瞬间迟疑了半拍。\n\n下一刻，他伸手按住胸口，像是按住了某种快要冲破束缚的东西。\n\n规则没有碎。\n\n但它弯了一下。\n\n就这一下，已经足够让所有人变了脸色。`,
      nextPlotSuggestion: '后续解释规则为何会弯曲，并让更高层人物注意到主角。',
    },
  ]
}

function createIdeaBlueprint(idea: string, answers: StarterAnswers) {
  return `故事骨架

一句话卖点：${idea || answers.hook}

题材方向：${answers.genre}
阅读情绪：${answers.tone}
主角核心：${answers.protagonist}
世界冲突：${answers.world}
第一幕画面：${answers.opening}

第一章建议：
1. 前 300 字直接给出冲突或羞辱，不要先讲世界观。
2. 用一个异常物件、秘密身份或反常反应做悬念。
3. 结尾让主角做出主动选择，而不是被动等事件发生。

前 5 章推进：
1. 第一章：危机出现，主角被迫暴露第一个秘密。
2. 第二章：反派加压，主角发现规则并不公平。
3. 第三章：第一次小反击，爽点释放但留下更大代价。
4. 第四章：进入新场域，遇到关键同伴或对手。
5. 第五章：长线钩子露出一角，推动读者继续追。`
}

function inferStarterAnswersFromIdea(idea: string, current: StarterAnswers): StarterAnswers {
  const normalized = idea.trim()
  const genre = /武侠|江湖|侠客|少侠|大侠|刀客|剑客|轻功|内力|退隐/.test(normalized)
    ? '架空历史，武侠'
    : /退婚|宗门|剑|修仙|灵根|仙|玄/.test(normalized)
    ? '东方玄幻'
    : /末日|诡|规则|无限|副本/.test(normalized)
      ? '悬疑无限流'
      : /都市|异能|校花|公司/.test(normalized)
        ? '都市异能'
        : current.genre
  const tone = /武侠|江湖|退隐/.test(normalized)
    ? '江湖悬疑、留白、节奏紧凑'
    : /打脸|反杀|复仇|羞辱/.test(normalized) ? '压抑后反杀' : current.tone
  const hook = normalized || current.hook
  const protagonist = normalized
    ? /武侠|江湖|退隐/.test(normalized)
      ? `主角来自这条脑洞：${normalized}。他曾名动江湖，如今隐姓埋名，需要一个退隐原因、一个封刀誓言和一个被旧案逼回江湖的动机。`
      : `主角来自这条脑洞：${normalized}。他需要一个明确欲望、一个被压迫处境，以及一个暂时不能公开的秘密。`
    : current.protagonist
  const world = /武侠|江湖|退隐/.test(normalized)
    ? '江湖旧债不因退隐而消失，门派、旧案、官府与人情债会逼主角在不拔刀的誓言下破局。'
    : /宗门|灵根|修仙|剑/.test(normalized)
    ? '宗门、血脉、天赋等级或禁忌规则制造压迫，主角需要在不公平规则里找到破局点。'
    : current.world
  const opening = /武侠|江湖|退隐/.test(normalized)
    ? '茶楼、酒肆或热闹街市中，旧人当众喊出主角旧名，逼他在众目睽睽下破局。'
    : /退婚/.test(normalized)
    ? '退婚现场，众人围观羞辱主角，主角体内隐藏力量第一次回应。'
    : current.opening

  return { genre, tone, hook, protagonist, world, opening }
}

function getDynamicStarterChips(question: StarterQuestion, answers: StarterAnswers, chapter: Chapter) {
  const text = `${answers.genre}\n${answers.tone}\n${answers.hook}\n${answers.protagonist}\n${answers.world}\n${answers.opening}\n${chapter.title}\n${chapter.summary}\n${chapter.content}`.toLowerCase()
  const chips = new Set<string>(question.chips)

  if (question.field === 'genre') {
    if (/退婚|宗门|剑|修仙|灵根|玄/.test(text)) {
      ;['东方玄幻', '宗门修仙', '废柴逆袭'].forEach((item) => chips.add(item))
    }
    if (/公司|都市|异能|校花|富豪/.test(text)) {
      ;['都市异能', '都市逆袭', '商战爽文'].forEach((item) => chips.add(item))
    }
    if (/尸|案|诡|规则|副本|无限/.test(text)) {
      ;['悬疑无限流', '规则怪谈', '诡异复苏'].forEach((item) => chips.add(item))
    }
  }

  if (question.field === 'tone') {
    if (/羞辱|退婚|打脸|反杀/.test(text)) {
      ;['压抑后反杀', '打脸释放', '爽点爆发'].forEach((item) => chips.add(item))
    }
    if (/诡|尸|案|秘密/.test(text)) {
      ;['诡异不安', '悬疑拉扯', '真相逼近'].forEach((item) => chips.add(item))
    }
    if (/女主|情感|温柔|陪伴/.test(text)) {
      ;['暧昧拉扯', '温暖治愈', '宿命感'].forEach((item) => chips.add(item))
    }
  }

  if (question.field === 'hook') {
    if (/剑|玉佩|血脉|残片/.test(text)) {
      ;['体内封印上古力量', '父母遗物牵出身世谜', '废柴身份是假象'].forEach((item) => chips.add(item))
    }
    if (/退婚|羞辱/.test(text)) {
      ;['退婚现场当众反击', '被羞辱后觉醒底牌', '所有人看错主角'].forEach((item) => chips.add(item))
    }
    if (/当前|章节|草稿/.test(text)) {
      ;['本章抛出新问题', '结尾出现反转证据', '配角一句话改变局势'].forEach((item) => chips.add(item))
    }
  }

  if (question.field === 'protagonist') {
    ['想证明自己', '害怕拖累重要的人', '藏着不能说的秘密', '被所有人低估'].forEach((item) => chips.add(item))
    if (chapter.content.length > 200) {
      ;['延续当前章节的选择压力', '让主角主动做决定', '补一个情绪爆点'].forEach((item) => chips.add(item))
    }
  }

  if (question.field === 'world') {
    if (/宗门|修仙|灵根|剑/.test(text)) {
      ;['宗门以灵根定命', '禁忌血脉被追杀', '上古残剑牵出旧案'].forEach((item) => chips.add(item))
    }
    ['势力规则制造不公平', '秘密只能通过冲突揭开', '主角越强代价越大'].forEach((item) => chips.add(item))
  }

  if (question.field === 'opening') {
    if (chapter.content.length > 200) {
      ;['从当前章节最后一句继续', '让反派突然加压', '让关键道具异变', '让同伴误会主角'].forEach((item) => chips.add(item))
    }
    if (/退婚|羞辱/.test(text)) {
      ;['退婚现场', '众人围观羞辱', '主角底牌第一次回应'].forEach((item) => chips.add(item))
    }
  }

  return Array.from(chips).slice(0, 8)
}

async function readStream(response: Response, onChunk: (chunk: string) => void) {
  const reader = response.body?.getReader()
  if (!reader) return
  const decoder = new TextDecoder('utf-8')

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    chunk
      .split('\n')
      .map((line) => line.replace(/^data:\s?/, ''))
      .filter(Boolean)
      .forEach(onChunk)
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string | null) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    let message = `Request failed: ${response.status}`
    try {
      const result = await response.json() as Partial<ApiResult<unknown>>
      message = result.message || message
    } catch {
      // Keep the HTTP status message when the backend is unreachable or returns non-JSON.
    }
    throw new ApiRequestError(message, response.status)
  }

  const result = await response.json() as ApiResult<T>
  if (result.code !== 200) {
    throw new ApiRequestError(result.message || 'Request failed', response.status, result.code)
  }
  return result.data
}

function mapBackendChapter(chapter: BackendChapter): Chapter {
  return {
    id: chapter.id,
    number: chapter.chapterNumber,
    title: chapter.title || `第${chapter.chapterNumber}章：未命名章节`,
    content: chapter.content || '',
    status: chapter.status === 'published' ? 'published' : 'draft',
    summary: '暂无摘要。',
    tension: 50,
    satisfaction: 50,
    mystery: 50,
  }
}

function mapBackendLore(item: BackendLore): LoreItem {
  const category = item.category === 'sect' || item.category === 'world_rule'
    ? 'faction'
    : ['character', 'location', 'item', 'faction'].includes(item.category) ? item.category as LoreCategory : 'faction'
  return {
    id: item.id,
    category,
    name: item.name || '未命名设定',
    content: item.content || '',
    tags: [category],
  }
}

function toChapterPayload(chapter: Chapter, activeNovelId: string) {
  return {
    novelId: activeNovelId,
    chapterNumber: chapter.number,
    title: chapter.title,
    content: chapter.content,
    wordCount: countWords(chapter.content),
    status: chapter.status,
  }
}

function toLorePayload(item: LoreItem, activeNovelId: string) {
  return {
    novelId: activeNovelId,
    category: item.category === 'faction' ? 'sect' : item.category,
    name: item.name,
    content: item.content,
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function isLocalAuthToken(token: string | null) {
  return Boolean(token?.startsWith('local-'))
}

function readLocalAccounts() {
  if (typeof window === 'undefined') return {} as Record<string, string>
  try {
    return JSON.parse(window.localStorage.getItem(localAccountsStorageKey) || '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function createLocalAuth(username: string): AuthPayload {
  return {
    userId: `local-${username}`,
    username,
    token: `local-${username}-${Date.now()}`,
  }
}

function localNovelsStorageKey(username: string) {
  return `novel-ai-copilot-local-novels-${username}`
}

function localActiveNovelStorageKey(username: string) {
  return `novel-ai-copilot-local-active-novel-${username}`
}

function localWorkspaceStorageKey(username: string, novelId: string) {
  return `novel-ai-copilot-local-workspace-${username}-${novelId}`
}

function readLocalNovels(username: string) {
  if (typeof window === 'undefined') return [] as BackendNovel[]
  try {
    return JSON.parse(window.localStorage.getItem(localNovelsStorageKey(username)) || '[]') as BackendNovel[]
  } catch {
    return []
  }
}

function readLocalWorkspace(username: string, novelId: string) {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(window.localStorage.getItem(localWorkspaceStorageKey(username, novelId)) || 'null') as Partial<WorkspaceSnapshot> | null
  } catch {
    return null
  }
}

function formatWordCount(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 1 : 2)} 万字`
  return `${value} 字`
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return '本地草稿'
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return '本地草稿'
  const diff = Date.now() - time
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(time))
}

function inferUpdatedAt(novel: BackendNovel) {
  if (novel.updatedAt) return novel.updatedAt
  const match = novel.id.match(/(\d{12,})/)
  if (match) return new Date(Number(match[1])).toISOString()
  return null
}

function inferCreatedAtValue(novel: BackendNovel) {
  const match = novel.id.match(/(\d{12,})/)
  if (match) return Number(match[1])
  return 0
}

function statusLabel(status: NovelLibraryItem['status']) {
  return status === 'completed' ? '已完成' : status === 'serializing' ? '连载中' : '草稿'
}

function inferNovelStatus(novel: BackendNovel, chapters: Chapter[]) {
  if (novel.status) return novel.status
  if (chapters.some((chapter) => chapter.status === 'published')) return 'serializing'
  if (chapters.some((chapter) => countWords(chapter.content) > 0)) return 'serializing'
  return 'draft'
}

function hashText(value: string) {
  return value.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
}

function getNovelCoverStyle(seed: string, coverUrl?: string | null): CSSProperties {
  if (coverUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgb(15 23 42 / 0.05), rgb(15 23 42 / 0.28)), url("${coverUrl}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  const palettes = [
    ['#dff8f5', '#2c7a7b', '#f5c25b', '#0f172a'],
    ['#e8f2ff', '#3b82f6', '#94a3b8', '#1e293b'],
    ['#f0fdf4', '#15803d', '#a7f3d0', '#14532d'],
    ['#fff7ed', '#ea580c', '#fed7aa', '#431407'],
    ['#f5f3ff', '#7c3aed', '#c4b5fd', '#2e1065'],
  ]
  const [base, main, accent, ink] = palettes[hashText(seed) % palettes.length]
  return {
    background:
      `linear-gradient(145deg, ${base} 0%, ${accent} 56%, ${main} 120%)`,
    color: ink,
  }
}

function createNovelLibraryItem(
  novel: BackendNovel,
  snapshot: Partial<WorkspaceSnapshot> | null,
  fallback: { chapters: Chapter[]; storyProfile: StoryProfile },
): NovelLibraryItem {
  const itemChapters = snapshot?.chapters?.length ? snapshot.chapters : fallback.chapters
  const profile = snapshot?.storyProfile || fallback.storyProfile
  const itemLore = snapshot?.lore || []
  const itemGraph = snapshot?.storyGraph
  const wordCount = itemChapters.reduce((total, chapter) => total + countWords(chapter.content), 0)
  const status = inferNovelStatus(novel, itemChapters)
  const updatedAt = inferUpdatedAt(novel)
  const updatedAtValue = updatedAt ? new Date(updatedAt).getTime() || 0 : 0
  const lastEditedChapter = [...itemChapters].reverse().find((chapter) => countWords(chapter.content) > 0) || itemChapters[itemChapters.length - 1]
  const outlineSource = profile.outline || novel.globalOutline || ''
  const inferredTags = [
    novel.genre || '',
    ...outlineSource.match(/玄幻|科幻|都市|仙侠|悬疑|言情|热血|复仇|成长|冒险/g) || [],
  ].filter(Boolean)
  return {
    id: novel.id,
    title: novel.title || '未命名作品',
    logline: profile.logline || novel.globalOutline || '还没有简介，先用新书向导补齐一句话卖点。',
    outline: profile.outline || novel.globalOutline || '',
    protagonist: profile.protagonist || '主角设定待补充',
    worldRules: profile.worldRules || '世界规则待补充',
    status,
    statusLabel: statusLabel(status),
    wordCount,
    chapterCount: itemChapters.length,
    volumeCount: Math.max(1, Math.ceil(itemChapters.length / 20)),
    characterCount: itemLore.filter((item) => item.category === 'character').length,
    hookCount: itemGraph?.nodes.filter((node) => node.type === 'hook').length || 0,
    draftChapterCount: itemChapters.filter((chapter) => chapter.status === 'draft').length,
    publishedChapterCount: itemChapters.filter((chapter) => chapter.status === 'published').length,
    updatedAtLabel: formatUpdatedAt(updatedAt),
    updatedAtValue,
    createdAtValue: inferCreatedAtValue(novel),
    lastEditedChapter,
    genre: novel.genre || inferredTags[0] || '长篇',
    tags: Array.from(new Set([...(novel.tags || []), ...inferredTags])).slice(0, 5),
    coverUrl: novel.coverUrl || null,
    coverStyle: getNovelCoverStyle(novel.coverSeed || novel.id || novel.title, novel.coverUrl),
  }
}

function recoverLegacyLocalNovel(username: string) {
  if (typeof window === 'undefined') return { novels: [] as BackendNovel[], activeNovelId: null as string | null }
  try {
    const legacy = JSON.parse(window.localStorage.getItem(workspaceStorageKey) || 'null') as Partial<WorkspaceSnapshot> | null
    if (!legacy?.chapters?.length) {
      return { novels: [], activeNovelId: null }
    }

    const recoveredNovel: BackendNovel = {
      id: `local-recovered-${Date.now()}`,
      title: legacy.chapters[0]?.title?.replace(/^第一章[：:]\s*/, '') || '恢复的本地作品',
      globalOutline: legacy.chapters[0]?.summary || null,
      authorStylePrompt: null,
    }
    window.localStorage.setItem(localNovelsStorageKey(username), JSON.stringify([recoveredNovel]))
    window.localStorage.setItem(localActiveNovelStorageKey(username), recoveredNovel.id)
    window.localStorage.setItem(localWorkspaceStorageKey(username, recoveredNovel.id), JSON.stringify(legacy))
    return { novels: [recoveredNovel], activeNovelId: recoveredNovel.id }
  } catch {
    return { novels: [], activeNovelId: null }
  }
}

export default function Home() {
  const [chapters, setChapters] = useState<Chapter[]>(() => [initialBlankChapter])
  const [activeChapterId, setActiveChapterId] = useState(initialBlankChapter.id)
  const [lore, setLore] = useState<LoreItem[]>([])
  const [ideas, setIdeas] = useState<string[]>([])
  const [storyProfile, setStoryProfile] = useState<StoryProfile>(blankStoryProfile)
  const [storyGraph, setStoryGraph] = useState<StoryGraphData>(() => createLocalStoryGraph('未创建作品', [initialBlankChapter], [], [], blankStoryProfile))
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string | null>(null)
  const [graphFilter, setGraphFilter] = useState<StoryGraphNodeType | 'all'>('all')
  const [graphZoom, setGraphZoom] = useState(1)
  const [draggingGraphNodeId, setDraggingGraphNodeId] = useState<string | null>(null)
  const [editingLoreId, setEditingLoreId] = useState<string | null>(null)
  const [loreSearch, setLoreSearch] = useState('')
  const [leftTab, setLeftTab] = useState<LeftTab>('overview')
  const [rightTab, setRightTab] = useState<RightTab>('starter')
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [sceneInput, setSceneInput] = useState('林青云在雨夜客栈被黑衣人逼问玉佩来历，玉佩突然与玄天剑残片共鸣')
  const [generatedText, setGeneratedText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [saveState, setSaveState] = useState<'saved' | 'dirty'>('saved')
  const [selectionText, setSelectionText] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('editor')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'm1', role: 'assistant', content: '我已读取当前章节、近三章摘要和设定库。可以帮你扩写短画面、检查节奏、追伏笔，或把章节改成短剧脚本。' },
  ])
  const [factoryOutput, setFactoryOutput] = useState('')
  const [promptSnapshot, setPromptSnapshot] = useState<PromptSnapshot | null>(null)
  const [starterStep, setStarterStep] = useState(0)
  const [starterAnswers, setStarterAnswers] = useState<StarterAnswers>(initialStarterAnswers)
  const [starterOutput, setStarterOutput] = useState('')
  const [openingGuidePhase, setOpeningGuidePhase] = useState<OpeningGuidePhase>('idle')
  const [openingGuideTitle, setOpeningGuideTitle] = useState('')
  const [openingGuideIdea, setOpeningGuideIdea] = useState('')
  const [openingGuideGenre, setOpeningGuideGenre] = useState('玄幻')
  const [openingGuideStyle, setOpeningGuideStyle] = useState('热血、逆袭、节奏紧凑')
  const [openingGuideQuestions, setOpeningGuideQuestions] = useState<OpeningGuideQuestion[]>([])
  const [openingGuideDraft, setOpeningGuideDraft] = useState<NovelDraft | null>(null)
  const [openingGuideDraftPatch, setOpeningGuideDraftPatch] = useState<Record<string, string>>({})
  const [creativeBrief, setCreativeBrief] = useState<CreativeBrief | null>(null)
  const [openingGuideError, setOpeningGuideError] = useState('')
  const [isOpeningGuideLoading, setIsOpeningGuideLoading] = useState(false)
  const [showOpeningGuideHistory, setShowOpeningGuideHistory] = useState(true)
  const [rescueSolutions, setRescueSolutions] = useState<ChapterRescueSolution[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [selectedWritingSkill, setSelectedWritingSkill] = useState<WritingSkill>('suspense')
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [novels, setNovels] = useState<BackendNovel[]>([])
  const [activeNovelId, setActiveNovelId] = useState<string | null>(null)
  const [newNovelTitle, setNewNovelTitle] = useState('')
  const [newNovelIdea, setNewNovelIdea] = useState('')
  const [newNovelDraft, setNewNovelDraft] = useState<NovelDraft | null>(null)
  const [isDraftingNovel, setIsDraftingNovel] = useState(false)
  const [syncState, setSyncState] = useState<'local' | 'syncing' | 'synced' | 'error'>('local')
  const [syncMessage, setSyncMessage] = useState('本地原型模式')
  const [showIdeaStart, setShowIdeaStart] = useState(true)
  const [showLibraryPanel, setShowLibraryPanel] = useState(false)
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryStatusFilter, setLibraryStatusFilter] = useState<'all' | 'draft' | 'serializing' | 'completed'>('all')
  const [librarySort, setLibrarySort] = useState<'updatedAt_desc' | 'createdAt_desc' | 'wordCount_desc' | 'title_asc'>('updatedAt_desc')
  const [selectedLibraryNovelId, setSelectedLibraryNovelId] = useState<string | null>(null)
  const [isSwitchingNovel, setIsSwitchingNovel] = useState(false)
  const [showOverviewOutline, setShowOverviewOutline] = useState(true)
  const [rawIdea, setRawIdea] = useState('')
  const [ideaBlueprint, setIdeaBlueprint] = useState('')
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  const [showModelPanel, setShowModelPanel] = useState(false)
  const [modelConfig, setModelConfig] = useState<ModelConfig>(defaultModelConfig)
  const [modelTestResult, setModelTestResult] = useState('')
  const [generationRoute, setGenerationRoute] = useState<GenerationRouteState>(defaultGenerationRoute)
  const [aiMode, setAiMode] = useState<WebAiMode>('LOCAL')
  const [webAiProvider, setWebAiProvider] = useState<WebAiProvider>('GPT_WEB')
  const [webAiTaskType, setWebAiTaskType] = useState<WebAiTaskType>('opening_next_question')
  const [webAiPrompt, setWebAiPrompt] = useState('')
  const [webAiRawResponse, setWebAiRawResponse] = useState('')
  const [webAiMessage, setWebAiMessage] = useState('')
  const [webAiError, setWebAiError] = useState('')
  const [activeOperation, setActiveOperation] = useState<OperationKey | null>(null)
  const [operationMessage, setOperationMessage] = useState('')
  const [codexTask, setCodexTask] = useState('')
  const [codexResult, setCodexResult] = useState('')
  const [agentTitle, setAgentTitle] = useState('')
  const [agentIdea, setAgentIdea] = useState('')
  const [agentGenre, setAgentGenre] = useState('')
  const [agentStyle, setAgentStyle] = useState('')
  const [agentAutoFirstChapter, setAgentAutoFirstChapter] = useState(true)
  const [agentAutoStoryGraph, setAgentAutoStoryGraph] = useState(true)
  const [agentRunnerMode, setAgentRunnerMode] = useState<'AUTO' | 'FIXED_WORKFLOW' | 'RESPONSES_API' | 'AGENTS_SDK'>('AUTO')
  const [agentTask, setAgentTask] = useState<AgentTaskResponse | null>(null)
  const [agentLogs, setAgentLogs] = useState<AgentTaskLogResponse[]>([])
  const [agentMessage, setAgentMessage] = useState('')
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const activeChapter = chapters.find((chapter) => chapter.id === activeChapterId) || chapters[0]
  const recentMemory = useMemo(() => chapters.filter((chapter) => chapter.number < activeChapter.number).slice(-3).map((chapter) => chapter.summary), [chapters, activeChapter.number])
  const matchedLore = useMemo(() => {
    const source = `${sceneInput}\n${activeChapter.content}`
    return lore.filter((item) => source.includes(item.name) || item.tags.some((tag) => source.includes(tag))).slice(0, 5)
  }, [activeChapter.content, lore, sceneInput])
  const filteredLore = useMemo(() => {
    const keyword = loreSearch.trim().toLowerCase()
    if (!keyword) return lore
    return lore.filter((item) => {
      const haystack = `${item.name}\n${item.category}\n${item.content}\n${item.tags.join('\n')}`.toLowerCase()
      return haystack.includes(keyword)
    })
  }, [lore, loreSearch])
  const characterLore = useMemo(() => lore.filter((item) => item.category === 'character'), [lore])
  const factionLore = useMemo(() => lore.filter((item) => item.category === 'faction'), [lore])
  const currentStarterQuestion = starterQuestions[starterStep]
  const starterProgress = Math.round(((starterStep + 1) / starterQuestions.length) * 100)
  const isLocalAccount = isLocalAuthToken(authToken)
  const currentNovelId = activeNovelId || novelId
  const hasOfficialNovels = novels.length > 0
  const hasTemporaryDraft = Boolean(
    rawIdea.trim()
    || newNovelTitle.trim()
    || newNovelIdea.trim()
    || newNovelDraft
    || openingGuideTitle.trim()
    || openingGuideIdea.trim()
    || openingGuideQuestions.length
    || openingGuideDraft
  )
  const currentNovelTitle = novels.find((item) => item.id === activeNovelId)?.title || (hasTemporaryDraft ? '临时草稿' : '未创建作品')
  const novelLibraryItems = useMemo(() => novels.map((novel) => {
    const snapshot = currentUser && isLocalAccount && novel.id !== activeNovelId ? readLocalWorkspace(currentUser, novel.id) : null
    const fallback = novel.id === activeNovelId
      ? { chapters, storyProfile }
      : {
        chapters: snapshot?.chapters?.length ? snapshot.chapters : [],
        storyProfile: snapshot?.storyProfile || createStoryProfile(novel.title, initialStarterAnswers, novel.globalOutline || ''),
    }
    return createNovelLibraryItem(novel, novel.id === activeNovelId ? null : snapshot, fallback)
  }), [activeNovelId, chapters, currentUser, isLocalAccount, novels, storyProfile])
  const filteredNovelLibraryItems = useMemo(() => {
    const keyword = librarySearch.trim().toLowerCase()
    return novelLibraryItems
      .filter((item) => libraryStatusFilter === 'all' || item.status === libraryStatusFilter)
      .filter((item) => {
        if (!keyword) return true
        return `${item.title}\n${item.logline}\n${item.genre}\n${item.tags.join('\n')}`.toLowerCase().includes(keyword)
      })
      .sort((a, b) => {
        if (librarySort === 'createdAt_desc') return b.createdAtValue - a.createdAtValue
        if (librarySort === 'wordCount_desc') return b.wordCount - a.wordCount
        if (librarySort === 'title_asc') return a.title.localeCompare(b.title, 'zh-CN')
        return b.updatedAtValue - a.updatedAtValue
      })
  }, [librarySearch, librarySort, libraryStatusFilter, novelLibraryItems])
  const currentNovelCard = useMemo(() => {
    const active = novelLibraryItems.find((item) => item.id === activeNovelId)
    if (active) return active
    return createNovelLibraryItem(
      { id: currentNovelId, title: currentNovelTitle, globalOutline: storyProfile.outline },
      null,
      { chapters, storyProfile },
    )
  }, [activeNovelId, chapters, currentNovelId, currentNovelTitle, novelLibraryItems, storyProfile])
  const selectedLibraryNovel = useMemo(() => (
    novelLibraryItems.find((item) => item.id === selectedLibraryNovelId)
    || novelLibraryItems.find((item) => item.id === activeNovelId)
    || null
  ), [activeNovelId, novelLibraryItems, selectedLibraryNovelId])
  const overviewOutlineLines = useMemo(() => splitOutlineLines(storyProfile.outline), [storyProfile.outline])
  const currentOpeningGuideQuestion = openingGuideQuestions[openingGuideQuestions.length - 1]
  const openingGuideAnsweredCount = openingGuideQuestions.filter((question) => question.answer.trim()).length
  const openingGuideTotalSteps = Math.min(6, Math.max(3, openingGuideQuestions.length + (openingGuidePhase === 'draft' || openingGuidePhase === 'done' ? 0 : 1)))
  const openingGuideNextAction = openingGuidePhase === 'idle'
    ? { title: '下一步：先让工具理解你的脑洞', hint: '点击“开始动态追问”，工具会先问一个真正影响第一章的问题。' }
    : openingGuidePhase === 'questioning'
      ? openingGuideAnsweredCount >= 3
        ? { title: '下一步：可以收束成作品资料', hint: '已经有足够信息，继续追问会更细，点“继续 / 生成草稿”可进入第一章前的确认。' }
        : { title: '下一步：回答这一题', hint: '选一个最接近的答案，或写自己的回答；工具会继续追问到第一章冲突清楚为止。' }
      : openingGuidePhase === 'draft'
        ? { title: '下一步：确认并生成第一章', hint: '你可以微调卖点和大纲，也可以直接生成开篇正文。' }
        : openingGuidePhase === 'generating'
          ? { title: '下一步：正在写入第一章', hint: '生成完成后会自动写入编辑器。' }
          : { title: '下一步：进入创作', hint: '第一章已经写入编辑器，可以继续扩写、润色或保存为作品。' }
  const backendStatusLabel = authToken ? (isLocalAccount ? '后端未使用/本地账号' : syncState === 'error' ? '后端异常' : syncState === 'syncing' ? '后端连接中' : '后端已连接') : '未登录'
  const hasModelApiKey = Boolean(modelConfig.apiKeyConfigured || modelConfig.apiKey.trim())
  const configuredModelName = modelConfig.model || '未填模型'
  const modelProviderLabel = modelConfig.provider === 'deepseek' ? 'DeepSeek' : modelConfig.provider
  const modelStatusLabel = hasModelApiKey ? `${modelProviderLabel} / ${configuredModelName}` : `${modelProviderLabel} 未接入`
  const accountStatusLabel = isLocalAccount ? '本地账号' : authToken ? '真实账号' : '未登录'
  const backendBadgeLabel = authToken ? (isLocalAccount ? '后端未使用' : syncState === 'error' ? '后端异常' : syncState === 'syncing' ? '连接中' : '后端可用') : '未连接'
  const modelBadgeLabel = hasModelApiKey ? `${modelProviderLabel} 已接入` : `${modelProviderLabel} 未接入`
  const routeBadgeLabel = generationRoute.usesFallback ? 'fallback' : aiMode === 'WEB_AI' ? 'Web AI' : authToken && !isLocalAccount ? '后端 Skill' : '本地规则'
  const modelConnectionLabel = hasModelApiKey
    ? (isLocalAccount ? 'API Key 已保存，但本地账号不会真实调用后端 Skill' : syncState === 'error' ? 'API Key 已保存，后端连接异常' : 'API Key 已保存，真实账号会优先调用后端 Skill')
    : '未接入 API Key'
  const modelDetailMessage = !hasModelApiKey
    ? `${modelProviderLabel} 只是当前 Provider，尚未保存 API Key；当前生成会使用本地/后端 fallback。`
    : isLocalAccount
      ? '模型参数已保存，但本地账号不会真实调用后端 Skill。请登录真实账号并连接后端后使用 API 模式。'
      : syncState === 'error'
        ? '后端不可用，当前使用本地规则。'
        : 'API 模式：优先调用后端 Skill。'
  const aiModeLabel = aiMode === 'API' ? 'API 模式' : aiMode === 'WEB_AI' ? 'Web AI 模式' : '本地模式'
  const aiSourceLabel = aiMode === 'API'
    ? '后端 Skill'
    : aiMode === 'WEB_AI'
      ? webAiProvider === 'GPT_WEB' ? 'GPT Web' : webAiProvider === 'GEMINI_WEB' ? 'Gemini Web' : '其他 Web'
      : '本地规则'
  const currentTaskLabel = aiMode === 'WEB_AI' ? getWebAiTaskLabel(webAiTaskType) : generationRoute.skill
  const openingGuideRouteLabel = authToken && !isLocalAccount
    ? '后端 OpeningGuideSkill'
    : aiMode === 'WEB_AI'
      ? `${aiSourceLabel} Prompt 协作`
      : hasModelApiKey
        ? 'API 参数已保存，当前本地账号仍走本地 fallback'
        : '本地 fallback'
  const openingGuideRouteHint = authToken && !isLocalAccount
    ? '真实账号会优先请求后端 Skill，失败后再 fallback。'
    : aiMode === 'WEB_AI'
      ? '复制 Prompt 到网页 AI，再把 JSON 回答粘贴回来。'
      : hasModelApiKey
        ? 'DeepSeek/OpenAI 参数已保存；要让向导自动调用模型，需要使用真实账号连接后端。'
        : '未配置模型时使用本地规则追问。'
  const modelRoleRows = [
    ['创作模型', modelConfig.provider, configuredModelName, hasModelApiKey ? '已接入' : '未接入'],
    ['记忆模型', modelConfig.provider, configuredModelName, hasModelApiKey ? '沿用创作模型' : '未接入'],
    ['审稿模型', modelConfig.provider, configuredModelName, hasModelApiKey ? '沿用创作模型' : '未接入'],
    ['Agent 模型', modelConfig.provider, configuredModelName, hasModelApiKey ? `Runner ${agentRunnerMode}` : '未接入'],
  ]
  const openingGuideSummary = useMemo(() => {
    const answers = createOpeningGuideAnswers(openingGuideQuestions, {
      title: openingGuideTitle,
      idea: openingGuideIdea,
      genre: openingGuideGenre,
      style: openingGuideStyle,
    })
    return [
      ['题材', openingGuideGenre || answers.genre],
      ['主角', openingGuideDraftPatch.protagonistHint || answers.protagonist],
      ['核心冲突', openingGuideDraftPatch.mainConflict || answers.hook],
      ['金手指/能力', openingGuideQuestions.find((item) => /底牌|异常|金手指|能力|系统|觉醒/.test(`${item.title} ${item.prompt}`))?.answer || '待收束'],
      ['世界规则', openingGuideDraftPatch.worldRuleHint || answers.world],
      ['第一章爽点', openingGuideDraftPatch.openingHook || answers.opening],
    ]
  }, [openingGuideDraftPatch, openingGuideDraft, openingGuideGenre, openingGuideIdea, openingGuideQuestions, openingGuideStyle, openingGuideTitle])
  const visibleGraphNodes = useMemo(() => storyGraph.nodes.filter((node) => graphFilter === 'all' || node.type === graphFilter), [graphFilter, storyGraph.nodes])
  const visibleGraphNodeIds = useMemo(() => new Set(visibleGraphNodes.map((node) => node.id)), [visibleGraphNodes])
  const visibleGraphEdges = useMemo(() => storyGraph.edges.filter((edge) => visibleGraphNodeIds.has(edge.sourceId) && visibleGraphNodeIds.has(edge.targetId)), [storyGraph.edges, visibleGraphNodeIds])
  const selectedGraphNode = useMemo(() => storyGraph.nodes.find((node) => node.id === selectedGraphNodeId) || null, [selectedGraphNodeId, storyGraph.nodes])
  const currentStarterChips = useMemo(() => getDynamicStarterChips(currentStarterQuestion, starterAnswers, activeChapter), [activeChapter, currentStarterQuestion, starterAnswers])
  const isGuideContinuation = activeChapter.number > 1 || countWords(activeChapter.content) > 120

  const restoreWorkspaceSnapshot = (snapshot: Partial<WorkspaceSnapshot> | null) => {
    const restoredChapters = snapshot?.chapters?.length ? snapshot.chapters : [createBlankChapter()]
    const restoredActiveId = restoredChapters.some((chapter) => chapter.id === snapshot?.activeChapterId)
      ? snapshot!.activeChapterId!
      : restoredChapters[0].id

    setChapters(restoredChapters)
    setActiveChapterId(restoredActiveId)
    setLore(snapshot?.lore || [])
    setIdeas(snapshot?.ideas || [])
    const restoredProfile = snapshot?.storyProfile || createStoryProfile(currentNovelTitle, snapshot?.starterAnswers ? { ...initialStarterAnswers, ...snapshot.starterAnswers } : starterAnswers, snapshot?.sceneInput || '')
    setStoryProfile(restoredProfile)
    setStoryGraph(withGraphLayout(snapshot?.storyGraph || createLocalStoryGraph(currentNovelTitle, restoredChapters, snapshot?.lore || [], snapshot?.ideas || [], restoredProfile)))
    setSelectedGraphNodeId(null)
    setEditingLoreId(snapshot?.editingLoreId ?? null)
    setLoreSearch(snapshot?.loreSearch || '')
    if (snapshot?.leftTab) setLeftTab(snapshot.leftTab)
    if (snapshot?.rightTab) setRightTab(snapshot.rightTab)
    if (snapshot?.sceneInput !== undefined) setSceneInput(snapshot.sceneInput)
    if (typeof snapshot?.starterStep === 'number') setStarterStep(snapshot.starterStep)
    if (snapshot?.starterAnswers) setStarterAnswers({ ...initialStarterAnswers, ...snapshot.starterAnswers })
    if (snapshot?.openingGuidePhase) setOpeningGuidePhase(snapshot.openingGuidePhase)
    if (snapshot?.openingGuideTitle !== undefined) setOpeningGuideTitle(snapshot.openingGuideTitle)
    if (snapshot?.openingGuideIdea !== undefined) setOpeningGuideIdea(snapshot.openingGuideIdea)
    if (snapshot?.openingGuideGenre !== undefined) setOpeningGuideGenre(snapshot.openingGuideGenre)
    if (snapshot?.openingGuideStyle !== undefined) setOpeningGuideStyle(snapshot.openingGuideStyle)
    if (snapshot?.openingGuideQuestions) setOpeningGuideQuestions(snapshot.openingGuideQuestions)
    if (snapshot?.openingGuideDraft !== undefined) setOpeningGuideDraft(snapshot.openingGuideDraft)
    if (snapshot?.selectedWritingSkill) setSelectedWritingSkill(snapshot.selectedWritingSkill)
    if (snapshot?.modelConfig) setModelConfig({ ...defaultModelConfig, ...snapshot.modelConfig, apiKey: '' })
  }

  const setRouteSource = (patch: Partial<GenerationRouteState>) => {
    setGenerationRoute({
      provider: patch.provider || modelConfig.provider || '未配置',
      modelName: patch.modelName || modelConfig.model || '未配置',
      skill: patch.skill || generationRoute.skill,
      runnerMode: patch.runnerMode || agentRunnerMode || generationRoute.runnerMode,
      usesBackend: patch.usesBackend ?? generationRoute.usesBackend,
      usesFallback: patch.usesFallback ?? generationRoute.usesFallback,
      message: patch.message || generationRoute.message,
    })
  }

  const beginOperation = (operation: OperationKey, message: string) => {
    setActiveOperation(operation)
    setOperationMessage(message)
  }

  const finishOperation = () => {
    setActiveOperation(null)
    setOperationMessage('')
  }

  const handleRequestError = (error: unknown, fallbackMessage: string) => {
    if (error instanceof ApiRequestError && (error.status === 401 || error.code === 401)) {
      setSyncState('error')
      setSyncMessage('登录已过期，请重新登录')
      setShowSyncPanel(true)
      return '登录已过期，请重新登录'
    }
    setSyncState('error')
    setSyncMessage(fallbackMessage)
    return fallbackMessage
  }

  const createWorkspaceSnapshot = (): WorkspaceSnapshot => ({
    chapters,
    activeChapterId,
    lore,
    ideas,
    storyProfile,
    storyGraph,
    editingLoreId,
    loreSearch,
    leftTab,
    rightTab,
    sceneInput,
    starterStep,
    starterAnswers,
    openingGuidePhase,
    openingGuideTitle,
    openingGuideIdea,
    openingGuideGenre,
    openingGuideStyle,
    openingGuideQuestions,
    openingGuideDraft,
    selectedWritingSkill,
    modelConfig: { ...modelConfig, apiKey: '' },
  })

  const persistLocalWorkspace = (novelIdToSave = activeNovelId) => {
    if (!currentUser || !novelIdToSave || !isLocalAccount) return
    window.localStorage.setItem(localWorkspaceStorageKey(currentUser, novelIdToSave), JSON.stringify(createWorkspaceSnapshot()))
    window.localStorage.setItem(localActiveNovelStorageKey(currentUser), novelIdToSave)
  }

  useEffect(() => {
    try {
      const authRaw = window.localStorage.getItem(authStorageKey)
      if (authRaw) {
        const auth = JSON.parse(authRaw) as AuthPayload
        setAuthToken(auth.token)
        setCurrentUser(auth.username)
        if (isLocalAuthToken(auth.token)) {
          let localNovels = readLocalNovels(auth.username)
          let recoveredActiveNovelId: string | null = null
          if (localNovels.length === 0) {
            const recovered = recoverLegacyLocalNovel(auth.username)
            localNovels = recovered.novels
            recoveredActiveNovelId = recovered.activeNovelId
          }
          const localActiveNovelId = window.localStorage.getItem(localActiveNovelStorageKey(auth.username))
          const nextActiveNovelId = recoveredActiveNovelId || (localActiveNovelId && localNovels.some((item) => item.id === localActiveNovelId)
            ? localActiveNovelId
            : localNovels[0]?.id || null)
          setNovels(localNovels)
          setActiveNovelId(nextActiveNovelId)
          if (nextActiveNovelId) {
            restoreWorkspaceSnapshot(readLocalWorkspace(auth.username, nextActiveNovelId))
          }
          setSyncState('local')
          setSyncMessage(localNovels.length ? '已读取本地作品' : '本地账号已登录，请新建作品')
          return
        }
      }

      const raw = window.localStorage.getItem(workspaceStorageKey)
      if (raw) {
        const snapshot = JSON.parse(raw) as Partial<WorkspaceSnapshot>
        const restoredChapters = snapshot.chapters?.length ? snapshot.chapters : initialChapters
        const restoredActiveId = restoredChapters.some((chapter) => chapter.id === snapshot.activeChapterId)
          ? snapshot.activeChapterId!
          : restoredChapters[0].id

        setChapters(restoredChapters)
        setActiveChapterId(restoredActiveId)
        if (snapshot.lore?.length) setLore(snapshot.lore)
        if (snapshot.ideas?.length) setIdeas(snapshot.ideas)
        if (snapshot.storyProfile) setStoryProfile(snapshot.storyProfile)
        if (snapshot.storyGraph) setStoryGraph(withGraphLayout(snapshot.storyGraph))
        if (snapshot.editingLoreId !== undefined) setEditingLoreId(snapshot.editingLoreId)
        if (snapshot.loreSearch !== undefined) setLoreSearch(snapshot.loreSearch)
        if (snapshot.leftTab) setLeftTab(snapshot.leftTab)
        if (snapshot.rightTab) setRightTab(snapshot.rightTab)
        if (snapshot.sceneInput !== undefined) setSceneInput(snapshot.sceneInput)
        if (typeof snapshot.starterStep === 'number') setStarterStep(snapshot.starterStep)
        if (snapshot.starterAnswers) setStarterAnswers({ ...initialStarterAnswers, ...snapshot.starterAnswers })
        if (snapshot.openingGuidePhase) setOpeningGuidePhase(snapshot.openingGuidePhase)
        if (snapshot.openingGuideTitle !== undefined) setOpeningGuideTitle(snapshot.openingGuideTitle)
        if (snapshot.openingGuideIdea !== undefined) setOpeningGuideIdea(snapshot.openingGuideIdea)
        if (snapshot.openingGuideGenre !== undefined) setOpeningGuideGenre(snapshot.openingGuideGenre)
        if (snapshot.openingGuideStyle !== undefined) setOpeningGuideStyle(snapshot.openingGuideStyle)
        if (snapshot.openingGuideQuestions) setOpeningGuideQuestions(snapshot.openingGuideQuestions)
        if (snapshot.openingGuideDraft !== undefined) setOpeningGuideDraft(snapshot.openingGuideDraft)
        if (snapshot.selectedWritingSkill) setSelectedWritingSkill(snapshot.selectedWritingSkill)
        if (snapshot.modelConfig) setModelConfig({ ...defaultModelConfig, ...snapshot.modelConfig, apiKey: '' })
      }
    } catch {
      window.localStorage.removeItem(workspaceStorageKey)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!authToken || isLocalAuthToken(authToken)) return

    const loadNovels = async () => {
      setSyncState('syncing')
      setSyncMessage('正在读取后端作品')
      try {
        const loadedNovels = await apiRequest<BackendNovel[]>('/api/novel/list', {}, authToken)
        const loadedModelConfig = await apiRequest<Omit<ModelConfig, 'apiKey'>>('/api/model-config', {}, authToken)
        setModelConfig((prev) => ({ ...prev, ...loadedModelConfig, apiKey: '' }))
        setNovels(loadedNovels)
        const nextNovelId = activeNovelId && loadedNovels.some((item) => item.id === activeNovelId)
          ? activeNovelId
          : loadedNovels[0]?.id || null
        setActiveNovelId(nextNovelId)
        setSyncState('synced')
        setSyncMessage(loadedNovels.length ? '后端已连接' : '登录成功，请新建作品')
      } catch (error) {
        handleRequestError(error, '后端暂不可用，继续使用本地数据')
      }
    }

    loadNovels()
  }, [authToken])

  useEffect(() => {
    if (!authToken || !activeNovelId || isLocalAuthToken(authToken)) return

    const loadNovelWorkspace = async () => {
      setSyncState('syncing')
      setSyncMessage('正在同步章节和设定')
      try {
        const [loadedChapters, loadedLore] = await Promise.all([
          apiRequest<BackendChapter[]>(`/api/chapter/list?novelId=${activeNovelId}`, {}, authToken),
          apiRequest<BackendLore[]>(`/api/lore/list?novelId=${activeNovelId}`, {}, authToken),
        ])
        const mappedChapters = loadedChapters.length ? loadedChapters.map(mapBackendChapter) : initialChapters
        const mappedLore = loadedLore.length ? loadedLore.map(mapBackendLore) : initialLore
        setChapters(mappedChapters)
        setActiveChapterId(mappedChapters[0].id)
        setLore(mappedLore)
        setStoryGraph(createLocalStoryGraph(currentNovelTitle, mappedChapters, mappedLore, ideas, storyProfile))
        setSyncState('synced')
        setSyncMessage('章节和设定已同步')
      } catch (error) {
        handleRequestError(error, '同步失败，保留本地数据')
      }
    }

    loadNovelWorkspace()
  }, [activeNovelId, authToken])

  useEffect(() => {
    if (!isHydrated) return
    const snapshot: WorkspaceSnapshot = {
      chapters,
      activeChapterId,
      lore,
      ideas,
      storyProfile,
      editingLoreId,
      loreSearch,
      leftTab,
      rightTab,
      sceneInput,
      starterStep,
      starterAnswers,
      openingGuidePhase,
      openingGuideTitle,
      openingGuideIdea,
      openingGuideGenre,
      openingGuideStyle,
      openingGuideQuestions,
      openingGuideDraft,
      selectedWritingSkill,
      modelConfig: { ...modelConfig, apiKey: '' },
    }
    window.localStorage.setItem(workspaceStorageKey, JSON.stringify(snapshot))
    if (isLocalAccount && currentUser && activeNovelId) {
      window.localStorage.setItem(localWorkspaceStorageKey(currentUser, activeNovelId), JSON.stringify(snapshot))
      window.localStorage.setItem(localActiveNovelStorageKey(currentUser), activeNovelId)
    }
  }, [activeChapterId, activeNovelId, authToken, chapters, currentUser, editingLoreId, ideas, isHydrated, leftTab, lore, loreSearch, modelConfig, openingGuideDraft, openingGuideGenre, openingGuideIdea, openingGuidePhase, openingGuideQuestions, openingGuideStyle, openingGuideTitle, rightTab, sceneInput, selectedWritingSkill, starterAnswers, starterStep, storyGraph, storyProfile])

  useEffect(() => {
    if (!isHydrated || !isLocalAccount || !currentUser) return
    window.localStorage.setItem(localNovelsStorageKey(currentUser), JSON.stringify(novels))
  }, [authToken, currentUser, isHydrated, novels])

  useEffect(() => {
    if (!isHydrated || openingGuidePhase !== 'questioning') return
    const current = openingGuideQuestions[openingGuideQuestions.length - 1]
    if (!current || current.source !== 'local' || current.answer.trim()) return
    if (openingGuideQuestions.length !== 1) return
    const expectedLane = detectOpeningGuideLane(`${openingGuideTitle} ${openingGuideIdea} ${openingGuideGenre} ${openingGuideStyle}`)
    if (current.prompt.includes(`「${expectedLane}」`)) return
    const previousQuestions = openingGuideQuestions.slice(0, -1)
    const refreshedQuestion = buildOpeningGuideQuestion(previousQuestions, {
      title: openingGuideTitle,
      idea: openingGuideIdea,
      genre: openingGuideGenre,
      style: openingGuideStyle,
    })
    setOpeningGuideQuestions([...previousQuestions, withOpeningGuideMeta(refreshedQuestion, previousQuestions.length)])
  }, [isHydrated, openingGuideIdea, openingGuideGenre, openingGuidePhase, openingGuideQuestions, openingGuideStyle, openingGuideTitle])

  const updateActiveChapter = (patch: Partial<Chapter>) => {
    setChapters((prev) => prev.map((chapter) => (chapter.id === activeChapter.id ? { ...chapter, ...patch } : chapter)))
    setSaveState('dirty')
  }

  const updateStoryProfile = (patch: Partial<StoryProfile>) => {
    setStoryProfile((prev) => ({ ...prev, ...patch }))
    setSaveState('dirty')
  }

  const refreshLocalStoryGraph = (nextChapters = chapters, nextLore = lore, nextIdeas = ideas, nextProfile = storyProfile) => {
    setStoryGraph(createLocalStoryGraph(currentNovelTitle, nextChapters, nextLore, nextIdeas, nextProfile))
  }

  const generateStoryGraph = async () => {
    const fallback = createLocalStoryGraph(currentNovelTitle, chapters, lore, ideas, storyProfile)
    try {
      if (!authToken || isLocalAccount || !isUuid(currentNovelId)) {
        throw new Error('local graph fallback')
      }
      const result = await apiRequest<StoryGraphData>('/api/story-graph/generate', {
        method: 'POST',
        body: JSON.stringify({ novelId: currentNovelId, chapterId: isUuid(activeChapter.id) ? activeChapter.id : null, mode: 'full' }),
      }, authToken)
      setStoryGraph(withGraphLayout(result?.nodes?.length ? result : fallback))
      setSyncState('synced')
      setSyncMessage('故事图谱已刷新')
    } catch (error) {
      setStoryGraph(fallback)
      setSyncState('local')
      setSyncMessage('已用本地数据刷新故事图谱')
    }
    setLeftTab('graph')
  }

  const refreshStoryGraphAfterContentChange = async (nextChapters = chapters, nextLore = lore, nextIdeas = ideas) => {
    const fallback = createLocalStoryGraph(currentNovelTitle, nextChapters, nextLore, nextIdeas, storyProfile)
    if (!authToken || isLocalAccount || !isUuid(currentNovelId)) {
      setStoryGraph(fallback)
      return
    }
    try {
      const result = await apiRequest<StoryGraphData>('/api/story-graph/generate', {
        method: 'POST',
        body: JSON.stringify({ novelId: currentNovelId, chapterId: isUuid(activeChapter.id) ? activeChapter.id : null, mode: 'incremental' }),
      }, authToken)
      setStoryGraph(withGraphLayout(result?.nodes?.length ? result : fallback))
    } catch {
      setStoryGraph(fallback)
    }
  }

  const addGraphNode = () => {
    const id = `event_manual_${Date.now()}`
    setStoryGraph((prev) => withGraphLayout({
      ...prev,
      nodes: [...prev.nodes, { id, type: 'event', label: '新剧情节点', metadata: { summary: '补充事件、人物状态或伏笔说明。', importance: 3 }, important: true }],
    }))
    setSelectedGraphNodeId(id)
    setSaveState('dirty')
  }

  const addGraphEdge = () => {
    if (storyGraph.nodes.length < 2) return
    const source = selectedGraphNodeId || storyGraph.nodes[0].id
    const target = storyGraph.nodes.find((node) => node.id !== source)?.id || storyGraph.nodes[0].id
    setStoryGraph((prev) => ({
      ...prev,
      edges: [...prev.edges, { sourceId: source, targetId: target, type: 'relationship', label: '关联', metadata: { custom: true } }],
    }))
    setSaveState('dirty')
  }

  const updateGraphNode = (nodeId: string, patch: Partial<StoryGraphNode>) => {
    setStoryGraph((prev) => ({ ...prev, nodes: prev.nodes.map((node) => node.id === nodeId ? { ...node, ...patch } : node) }))
    setSaveState('dirty')
  }

  const startFreshWorkspace = (title: string, seedIdea = rawIdea, seedAnswers?: StarterAnswers, confirmedDraft?: NovelDraft) => {
    const idea = seedIdea.trim() || rawIdea
    const answers = seedAnswers || inferStarterAnswersFromIdea(idea, starterAnswers)
    const firstChapter = createBlankChapter('第一章：开篇')
    const profile = confirmedDraft ? novelDraftToStoryProfile(confirmedDraft) : createStoryProfile(title, answers, idea)
    const starterLore = createStarterLore(title, profile)
    const freshGraph = createLocalStoryGraph(title, [firstChapter], starterLore, idea ? [idea] : [], profile)
    const freshSnapshot: WorkspaceSnapshot = {
      chapters: [firstChapter],
      activeChapterId: firstChapter.id,
      lore: starterLore,
      ideas: idea ? [idea] : [],
      storyProfile: profile,
      storyGraph: freshGraph,
      editingLoreId: null,
      loreSearch: '',
      leftTab: 'overview',
      rightTab: 'starter',
      sceneInput: confirmedDraft?.firstChapterOpeningScene || answers.opening || `${title}的第一章核心画面`,
      starterStep,
      starterAnswers: answers,
      selectedWritingSkill,
      modelConfig: { ...modelConfig, apiKey: '' },
    }
    restoreWorkspaceSnapshot(freshSnapshot)
    setGeneratedText('')
    setSelectionText('')
    setFactoryOutput('')
    setPromptSnapshot(null)
    setStarterOutput('')
    setRescueSolutions([])
    setStarterAnswers(answers)
    if (idea) setRawIdea(idea)
    setStoryProfile(profile)
    setLeftTab('overview')
    setRightTab('starter')
    setShowIdeaStart(false)
    setSaveState('dirty')
    return freshSnapshot
  }

  const switchLocalNovel = (novelIdToOpen: string | null) => {
    if (!currentUser || !novelIdToOpen) {
      setActiveNovelId(null)
      return
    }

    persistLocalWorkspace()
    setActiveNovelId(novelIdToOpen)
    window.localStorage.setItem(localActiveNovelStorageKey(currentUser), novelIdToOpen)
    restoreWorkspaceSnapshot(readLocalWorkspace(currentUser, novelIdToOpen))
    setSyncState('local')
    setSyncMessage('已切换本地作品')
  }

  const switchNovel = (novelIdToOpen: string | null) => {
    setIsSwitchingNovel(true)
    if (isLocalAccount) {
      switchLocalNovel(novelIdToOpen)
    } else {
      setActiveNovelId(novelIdToOpen)
    }
    setShowIdeaStart(false)
    setShowLibraryPanel(false)
    window.setTimeout(() => setIsSwitchingNovel(false), 420)
  }

  const updateNovelMeta = (novelIdToUpdate: string, patch: Partial<BackendNovel>) => {
    setNovels((prev) => prev.map((item) => item.id === novelIdToUpdate ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item))
    setSaveState('dirty')
  }

  const uploadNovelCover = (novelIdToUpdate: string, file?: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      updateNovelMeta(novelIdToUpdate, { coverUrl: String(reader.result || ''), coverSeed: `${novelIdToUpdate}-${Date.now()}` })
      setSyncMessage('本地封面已更新')
    }
    reader.readAsDataURL(file)
  }

  const regenerateNovelCoverPlaceholder = (novelIdToUpdate: string) => {
    updateNovelMeta(novelIdToUpdate, { coverUrl: null, coverSeed: `${novelIdToUpdate}-ai-placeholder-${Date.now()}` })
    setSyncMessage('已生成封面占位')
  }

  const enterEmptyWorkspace = () => {
    const blank = createBlankChapter()
    const blankProfile = blankStoryProfile
    setChapters([blank])
    setActiveChapterId(blank.id)
    setLore([])
    setIdeas([])
    setStoryProfile(blankProfile)
    setStoryGraph(createLocalStoryGraph('未创建作品', [blank], [], [], blankProfile))
    setSelectedGraphNodeId(null)
    setEditingLoreId(null)
    setLoreSearch('')
    setSceneInput('')
    setGeneratedText('')
    setSelectionText('')
    setChatInput('')
    setFactoryOutput('')
    setPromptSnapshot(null)
    setStarterStep(0)
    setStarterAnswers(initialStarterAnswers)
    setStarterOutput('')
    setRescueSolutions([])
    setOpeningGuidePhase('idle')
    setOpeningGuideTitle('')
    setOpeningGuideIdea('')
    setOpeningGuideGenre('玄幻')
    setOpeningGuideStyle('热血、逆袭、节奏紧凑')
    setOpeningGuideQuestions([])
    setOpeningGuideDraft(null)
    setOpeningGuideDraftPatch({})
    setCreativeBrief(null)
    setOpeningGuideError('')
    setNewNovelTitle('')
    setNewNovelIdea('')
    setNewNovelDraft(null)
    setRawIdea('')
    setIdeaBlueprint('')
    setCodexTask('')
    setCodexResult('')
    setWebAiPrompt('')
    setWebAiRawResponse('')
    setWebAiMessage('')
    setWebAiError('')
    setAgentTitle('')
    setAgentIdea('')
    setAgentGenre('')
    setAgentStyle('')
    setAgentTask(null)
    setAgentLogs([])
    setAgentMessage('')
    setShowIdeaStart(true)
    setLeftTab('overview')
    setRightTab('starter')
    setSaveState('saved')
  }

  const deleteNovel = async (novelIdToDelete: string) => {
    if (!novelIdToDelete || activeOperation === 'deleteNovel') return
    const target = novelLibraryItems.find((item) => item.id === novelIdToDelete)
    const targetTitle = target?.title || '当前作品'
    const confirmed = window.confirm(`确认删除《${targetTitle}》吗？\n\n这会删除：\n- 作品资料\n- 章节\n- 设定\n- 灵感\n- 本地图谱数据\n\n此操作不可撤销。`)
    if (!confirmed) return

    beginOperation('deleteNovel', '删除作品中...')
    setSyncState('syncing')
    setSyncMessage('正在删除作品')
    try {
      if (authToken && !isLocalAccount && isUuid(novelIdToDelete)) {
        await apiRequest<void>(`/api/novel/${novelIdToDelete}`, { method: 'DELETE' }, authToken)
      }

      const nextNovels = novels.filter((item) => item.id !== novelIdToDelete)
      setNovels(nextNovels)
      if (currentUser && isLocalAccount) {
        window.localStorage.removeItem(localWorkspaceStorageKey(currentUser, novelIdToDelete))
        window.localStorage.setItem(localNovelsStorageKey(currentUser), JSON.stringify(nextNovels))
      }

      if (activeNovelId === novelIdToDelete || selectedLibraryNovelId === novelIdToDelete) {
        const nextActive = nextNovels
          .slice()
          .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0]
        if (nextActive) {
          setActiveNovelId(nextActive.id)
          setSelectedLibraryNovelId(nextActive.id)
          if (currentUser && isLocalAccount) {
            window.localStorage.setItem(localActiveNovelStorageKey(currentUser), nextActive.id)
            restoreWorkspaceSnapshot(readLocalWorkspace(currentUser, nextActive.id))
          }
        } else {
          setActiveNovelId(null)
          setSelectedLibraryNovelId(null)
          if (currentUser && isLocalAccount) window.localStorage.removeItem(localActiveNovelStorageKey(currentUser))
          enterEmptyWorkspace()
        }
      }

      setSyncState(isLocalAccount ? 'local' : 'synced')
      setSyncMessage(`《${targetTitle}》已删除`)
    } catch (error) {
      handleRequestError(error, `删除《${targetTitle}》失败`)
    } finally {
      finishOperation()
    }
  }

  const generateNovelDraft = async () => {
    const title = newNovelTitle.trim()
    if (!title || isDraftingNovel) return
    const seedIdea = newNovelIdea.trim() || rawIdea.trim()
    const seedAnswers = inferStarterAnswersFromIdea(seedIdea, starterAnswers)
    const fallbackDraft = createNovelDraft(title, seedIdea, seedAnswers)

    setIsDraftingNovel(true)
    beginOperation('draft', '生成作品资料草稿中...')
    setSyncState('syncing')
    setSyncMessage('正在生成作品资料草稿')

    try {
      if (!isLocalAccount && authToken) {
        setRouteSource({ skill: 'NovelDraftService', runnerMode: 'DIRECT_SKILL', usesBackend: true, usesFallback: false, message: '作品资料草稿由后端 NovelDraftService 生成。' })
        const draft = await apiRequest<NovelDraft>('/api/novels/draft', {
          method: 'POST',
          body: JSON.stringify({
            title,
            idea: seedIdea,
            genre: seedAnswers.genre,
            style: seedAnswers.tone,
          }),
        }, authToken)
        setNewNovelDraft(draft || fallbackDraft)
        setSyncState('synced')
        setSyncMessage('作品资料草稿已生成')
      } else {
        setNewNovelDraft(fallbackDraft)
        setSyncState('local')
        setSyncMessage('已生成本地作品资料草稿')
        setRouteSource({ skill: '本地开书规则', runnerMode: 'LOCAL_FALLBACK', usesBackend: false, usesFallback: true, message: '作品资料草稿由本地规则生成。' })
      }
      setStarterAnswers(seedAnswers)
    } catch (error) {
      setNewNovelDraft(fallbackDraft)
      setSyncState('local')
      setSyncMessage('后端生成失败，已使用本地规则继续')
      setRouteSource({ skill: '本地开书规则', runnerMode: 'LOCAL_FALLBACK', usesBackend: false, usesFallback: true, message: '后端草稿生成失败，已使用本地规则继续。' })
    } finally {
      setIsDraftingNovel(false)
      finishOperation()
    }
  }

  const updateNovelDraft = (patch: Partial<NovelDraft>) => {
    setNewNovelDraft((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const updateNovelDraftList = (field: 'globalOutline' | 'longTermArcs' | 'currentHookLine', value: string) => {
    setNewNovelDraft((prev) => (prev ? { ...prev, [field]: value.split('\n').map((item) => item.trim()).filter(Boolean) } : prev))
  }

  const updateNovelDraftMainCharacter = (field: keyof NovelDraft['mainCharacter'], value: string) => {
    setNewNovelDraft((prev) => (prev ? { ...prev, mainCharacter: { ...prev.mainCharacter, [field]: value } } : prev))
  }

  const updateNovelDraftWorldRules = (value: string) => {
    const rules = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, ...description] = line.split('：')
        return {
          name: name?.trim() || '世界规则',
          description: description.join('：').trim() || line,
        }
      })
    setNewNovelDraft((prev) => (prev ? { ...prev, worldRules: rules } : prev))
  }

  const handleAuth = async (mode: 'login' | 'register') => {
    if (activeOperation === 'auth') return
    if (!username.trim() || !password.trim()) {
      setSyncState('error')
      setSyncMessage('请输入用户名和密码')
      return
    }

    const cleanUsername = username.trim()
    beginOperation('auth', mode === 'login' ? '登录中...' : '注册中...')
    setSyncState('syncing')
    setSyncMessage(mode === 'login' ? '登录中...' : '注册中...')
    try {
      const auth = await apiRequest<AuthPayload>(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ username: cleanUsername, password }),
      })
      setAuthToken(auth.token)
      setCurrentUser(auth.username)
      window.localStorage.setItem(authStorageKey, JSON.stringify(auth))
      setSyncState('synced')
      setSyncMessage(mode === 'login' ? '登录成功，已连接真实账号' : '注册成功，已连接真实账号')
      setRouteSource({ usesBackend: true, usesFallback: false, message: '真实账号已连接，生成会优先调用后端 Skill。' })
      setPassword('')
      setShowSyncPanel(false)
    } catch (error) {
      const accounts = readLocalAccounts()
      if (error instanceof ApiRequestError && (error.status === 401 || error.code === 401)) {
        setSyncState('error')
        setSyncMessage(mode === 'login' ? '登录失败：账号或密码不正确' : '注册失败：请检查账号信息')
        return
      }
      if (mode === 'register') {
        accounts[cleanUsername] = password
        window.localStorage.setItem(localAccountsStorageKey, JSON.stringify(accounts))
        const localAuth = createLocalAuth(cleanUsername)
        let localNovels = readLocalNovels(cleanUsername)
        let recoveredActiveNovelId: string | null = null
        if (localNovels.length === 0) {
          const recovered = recoverLegacyLocalNovel(cleanUsername)
          localNovels = recovered.novels
          recoveredActiveNovelId = recovered.activeNovelId
        }
        const localActiveNovelId = window.localStorage.getItem(localActiveNovelStorageKey(cleanUsername))
        const nextActiveNovelId = recoveredActiveNovelId || (localActiveNovelId && localNovels.some((item) => item.id === localActiveNovelId)
          ? localActiveNovelId
          : localNovels[0]?.id || null)
        setAuthToken(localAuth.token)
        setCurrentUser(localAuth.username)
        setNovels(localNovels)
        setActiveNovelId(nextActiveNovelId)
        if (nextActiveNovelId) restoreWorkspaceSnapshot(readLocalWorkspace(cleanUsername, nextActiveNovelId))
        window.localStorage.setItem(authStorageKey, JSON.stringify(localAuth))
        setSyncState('local')
        setSyncMessage(localNovels.length ? '后端不可用，已切换本地账号模式并读取本地作品' : '后端不可用，已切换本地账号模式')
        setRouteSource({ usesBackend: false, usesFallback: true, skill: '本地规则', runnerMode: 'LOCAL_FALLBACK', message: '后端不可用，已切换本地账号模式。' })
        setPassword('')
        setShowSyncPanel(false)
        return
      }

      if (!accounts[cleanUsername]) {
        accounts[cleanUsername] = password
        window.localStorage.setItem(localAccountsStorageKey, JSON.stringify(accounts))
      }

      if (accounts[cleanUsername] && accounts[cleanUsername] === password) {
        const localAuth = createLocalAuth(cleanUsername)
        let localNovels = readLocalNovels(cleanUsername)
        let recoveredActiveNovelId: string | null = null
        if (localNovels.length === 0) {
          const recovered = recoverLegacyLocalNovel(cleanUsername)
          localNovels = recovered.novels
          recoveredActiveNovelId = recovered.activeNovelId
        }
        const localActiveNovelId = window.localStorage.getItem(localActiveNovelStorageKey(cleanUsername))
        const nextActiveNovelId = recoveredActiveNovelId || (localActiveNovelId && localNovels.some((item) => item.id === localActiveNovelId)
          ? localActiveNovelId
          : localNovels[0]?.id || null)
        setAuthToken(localAuth.token)
        setCurrentUser(localAuth.username)
        setNovels(localNovels)
        setActiveNovelId(nextActiveNovelId)
        if (nextActiveNovelId) restoreWorkspaceSnapshot(readLocalWorkspace(cleanUsername, nextActiveNovelId))
        window.localStorage.setItem(authStorageKey, JSON.stringify(localAuth))
        setSyncState('local')
        setSyncMessage(localNovels.length ? '后端不可用，已切换本地账号模式并读取本地作品' : '后端不可用，已切换本地账号模式')
        setRouteSource({ usesBackend: false, usesFallback: true, skill: '本地规则', runnerMode: 'LOCAL_FALLBACK', message: '当前使用本地账号，生成与保存优先写入浏览器。' })
        setPassword('')
        setShowSyncPanel(false)
        return
      }

      setSyncState('error')
      setSyncMessage(mode === 'login' ? '登录失败：后端不可用或账号密码不正确' : '注册失败，请稍后重试')
    } finally {
      finishOperation()
    }
  }

  const logout = () => {
    window.localStorage.removeItem(authStorageKey)
    window.localStorage.removeItem(workspaceStorageKey)
    setAuthToken(null)
    setCurrentUser(null)
    setNovels([])
    setActiveNovelId(null)
    setSelectedLibraryNovelId(null)
    setShowLibraryPanel(false)
    enterEmptyWorkspace()
    setSyncState('local')
    setSyncMessage('已退出登录，当前工作区已清空')
    setRouteSource(defaultGenerationRoute)
  }

  const createNovel = async () => {
    if (!authToken || !newNovelTitle.trim() || activeOperation === 'createNovel') return
    beginOperation('createNovel', '确认创建作品中...')
    const title = newNovelTitle.trim()
    const seedIdea = newNovelIdea.trim() || rawIdea.trim()
    const seedAnswers = inferStarterAnswersFromIdea(seedIdea, starterAnswers)
    const confirmedDraft = newNovelDraft || createNovelDraft(title, seedIdea, seedAnswers)
    if (isLocalAccount) {
      persistLocalWorkspace()
      const localNovel: BackendNovel = {
        id: `local-novel-${Date.now()}`,
        title: confirmedDraft.title || title,
        globalOutline: confirmedDraft.globalOutline.join('\n'),
        authorStylePrompt: confirmedDraft.style || stylePrompt,
        status: 'draft',
        updatedAt: new Date().toISOString(),
        coverSeed: `${confirmedDraft.genre}-${confirmedDraft.title || title}`,
      }
      const nextNovels = [...novels, localNovel]
      setNovels(nextNovels)
      setActiveNovelId(localNovel.id)
      const freshSnapshot = startFreshWorkspace(localNovel.title, seedIdea, seedAnswers, confirmedDraft)
      if (currentUser) {
        window.localStorage.setItem(localNovelsStorageKey(currentUser), JSON.stringify(nextNovels))
        window.localStorage.setItem(localActiveNovelStorageKey(currentUser), localNovel.id)
        window.localStorage.setItem(localWorkspaceStorageKey(currentUser, localNovel.id), JSON.stringify(freshSnapshot))
      }
      setSyncState('local')
      setSyncMessage('本地作品已创建')
      setNewNovelIdea('')
      setNewNovelDraft(null)
      finishOperation()
      return
    }

    setSyncState('syncing')
    setSyncMessage('正在新建作品')
    try {
      const created = await apiRequest<BackendNovel>('/api/novels/confirm', {
        method: 'POST',
        body: JSON.stringify(confirmedDraft),
      }, authToken)
      setNovels((prev) => [created, ...prev.filter((item) => item.id !== created.id)])
      setActiveNovelId(created.id)
      startFreshWorkspace(created.title, seedIdea, seedAnswers, confirmedDraft)
      setSyncState('synced')
      setSyncMessage('作品已创建')
      setNewNovelIdea('')
      setNewNovelDraft(null)
    } catch (error) {
      handleRequestError(error, '新建失败，请检查后端和数据库')
    } finally {
      finishOperation()
    }
  }

  const organizeIdea = () => {
    if (!rawIdea.trim()) {
      setSyncMessage('请先输入一句脑洞，再整理成故事')
      return
    }
    const nextAnswers = inferStarterAnswersFromIdea(rawIdea, starterAnswers)
    setStarterAnswers(nextAnswers)
    setStoryProfile(createStoryProfile(currentNovelTitle, nextAnswers, rawIdea))
    setIdeaBlueprint(createIdeaBlueprint(rawIdea, nextAnswers))
    setStarterOutput(createIdeaBlueprint(rawIdea, nextAnswers))
    setSceneInput(nextAnswers.opening)
    setRightTab('starter')
    setShowIdeaStart(false)
  }

  const generateChapterFromIdea = () => {
    if (!rawIdea.trim()) {
      setSyncMessage('请先输入一句脑洞，再生成第一章草稿')
      return
    }
    const nextAnswers = inferStarterAnswersFromIdea(rawIdea, starterAnswers)
    setStarterAnswers(nextAnswers)
    setStarterOutput(`${createStarterOpening(nextAnswers)}\n\n---\n故事骨架：\n${createIdeaBlueprint(rawIdea, nextAnswers)}`)
    setRightTab('starter')
    setShowIdeaStart(false)
  }

  const createCodexTask = (taskType: 'blueprint' | 'chapter' | 'rescue' = 'blueprint') => {
    const taskLabels = {
      blueprint: '把脑洞整理成网文故事骨架',
      chapter: '根据脑洞生成第一章草稿',
      rescue: '帮当前章节卡文急救',
    }
    const task = `请你作为网文创作教练，完成任务：${taskLabels[taskType]}。

用户脑洞：
${rawIdea || '暂无'}

当前题材/情绪：
- 题材：${starterAnswers.genre}
- 情绪：${starterAnswers.tone}
- 核心钩子：${starterAnswers.hook}

主角与世界：
- 主角：${starterAnswers.protagonist}
- 世界规则：${starterAnswers.world}
- 第一幕：${starterAnswers.opening}

当前章节：
- 标题：${activeChapter.title}
- 摘要：${activeChapter.summary}
- 正文片段：
${activeChapter.content.slice(0, 1200)}

请输出：
1. 一句话卖点
2. 主角欲望、恐惧、秘密
3. 第一章冲突设计
4. 前 5 章推进
5. 可直接插入的正文草稿或下一段

要求：偏网文节奏，冲突明确，有画面感，避免设定说明书和 AI 腔。`
    setCodexTask(task)
    return task
  }

  const copyCodexTask = async (taskType: 'blueprint' | 'chapter' | 'rescue' = 'blueprint') => {
    const task = createCodexTask(taskType)
    try {
      await navigator.clipboard.writeText(task)
      setSyncMessage('Codex 任务包已复制')
    } catch {
      setSyncMessage('任务包已生成，可手动复制')
    }
  }

  const applyCodexResult = () => {
    if (!codexResult.trim()) return
    const updatedChapter = { ...activeChapter, content: `${activeChapter.content.trim()}\n\n${codexResult.trim()}`.trim() }
    updateActiveChapter({ content: updatedChapter.content })
    refreshLocalStoryGraph(chapters.map((chapter) => chapter.id === activeChapter.id ? updatedChapter : chapter))
    setCodexResult('')
    setShowIdeaStart(false)
  }

  const buildCurrentWebAiPrompt = (taskType = webAiTaskType) => {
    const seed = parseIdeaSeed(openingGuideIdea || rawIdea || newNovelIdea)
    const hasTemporarySeed = Boolean((openingGuideIdea || rawIdea || newNovelIdea).trim())
    const promptTitle = openingGuideTitle || seed.title || currentNovelTitle || newNovelTitle
    const promptIdea = openingGuideIdea || seed.idea || newNovelIdea || rawIdea || sceneInput
    const promptGenre = seed.genre && seed.genre !== '玄幻' ? seed.genre : openingGuideGenre || starterAnswers.genre
    const promptStyle = seed.style || openingGuideStyle || starterAnswers.tone || stylePrompt
    const cleanDraft = hasTemporarySeed
      ? openingGuideDraft || newNovelDraft || {
          title: promptTitle,
          genre: promptGenre,
          style: promptStyle,
          sellPoint: promptIdea,
          globalOutline: [],
          mainCharacter: {},
          worldRules: [],
          openingChapterGoal: '',
          firstChapterTitle: '',
        }
      : openingGuideDraft || newNovelDraft || storyProfile
    const cleanChapterSummary = hasTemporarySeed && isDefaultDemoText(activeChapter.summary) ? '' : activeChapter.summary
    const cleanChapterExcerpt = hasTemporarySeed && isDefaultDemoText(activeChapter.content) ? '' : activeChapter.content.slice(-1600)
    const cleanProtagonist = hasTemporarySeed
      ? openingGuideDraftPatch.protagonistHint || ''
      : storyProfile.protagonist || starterAnswers.protagonist
    const cleanWorldRules = hasTemporarySeed
      ? openingGuideDraftPatch.worldRuleHint || ''
      : storyProfile.worldRules || starterAnswers.world

    return buildWebAiPrompt(taskType, {
      novelTitle: promptTitle,
      idea: promptIdea,
      genre: promptGenre,
      style: promptStyle,
      chapterTitle: activeChapter.title,
      chapterSummary: cleanChapterSummary,
      chapterExcerpt: cleanChapterExcerpt,
      openingHistory: openingGuideQuestions
        .filter((question) => question.answer.trim())
        .map((question) => ({
          question: question.prompt || question.title,
          answer: question.answer,
          reason: question.reason,
          impact: question.impact,
        })),
      draft: cleanDraft,
      protagonist: cleanProtagonist,
      worldRules: cleanWorldRules,
      userInput: taskType === 'chapter_expand' ? sceneInput : taskType === 'chapter_rescue' ? cleanChapterExcerpt.slice(-1200) : promptIdea,
    })
  }

  const prepareWebAiPrompt = async (taskType = webAiTaskType) => {
    const prompt = buildCurrentWebAiPrompt(taskType)
    setWebAiTaskType(taskType)
    setWebAiPrompt(prompt)
    setAiMode('WEB_AI')
    setRightTab('webai')
    setRouteSource({
      skill: `Web AI：${getWebAiTaskLabel(taskType)}`,
      runnerMode: 'WEB_AI',
      usesBackend: false,
      usesFallback: false,
      message: '当前通过网页 GPT/Gemini 协作：复制 Prompt，粘贴 JSON 后由工具解析应用。',
    })
    try {
      await navigator.clipboard.writeText(prompt)
      setWebAiMessage('Prompt 已复制，可以粘贴到网页 GPT / Gemini。')
      setSyncMessage('Web AI Prompt 已复制')
    } catch {
      setWebAiMessage('Prompt 已生成，请手动复制。')
      setSyncMessage('Web AI Prompt 已生成')
    }
  }

  const applyWebAiResponse = async () => {
    setWebAiError('')
    setWebAiMessage('')
    try {
      const parsed = extractFirstJsonObject(webAiRawResponse) as Record<string, any>
      if (!parsed || typeof parsed !== 'object') throw new Error('解析结果不是 JSON 对象')
      const providerLabel = webAiProvider === 'GPT_WEB' ? 'GPT Web' : webAiProvider === 'GEMINI_WEB' ? 'Gemini Web' : '其他 Web'
      setAiMode('WEB_AI')
      setRouteSource({
        skill: `${providerLabel}：${getWebAiTaskLabel(webAiTaskType)}`,
        runnerMode: 'WEB_AI',
        usesBackend: false,
        usesFallback: false,
        message: `结果来源：${providerLabel}，已由 Web AI 协作面板解析应用。`,
      })

      if (webAiTaskType === 'opening_next_question') {
        const question: OpeningGuideQuestion = {
          id: `web-question-${Date.now()}`,
          title: 'Web AI 追问',
          prompt: String(parsed.question || parsed.helperText || '请补充下一步开篇信息。'),
          placeholder: '填写你的回答，或选择网页 AI 给出的选项。',
          options: Array.isArray(parsed.options) ? parsed.options.map(String).slice(0, 5) : [],
          answer: '',
          reason: String(parsed.reason || parsed.helperText || '网页 AI 根据当前题材生成追问。'),
          impact: String(parsed.impact || '开篇结构'),
          source: 'web',
        }
        setOpeningGuidePhase('questioning')
        setOpeningGuideQuestions((prev) => [...prev, question])
        if (parsed.draftPatch && typeof parsed.draftPatch === 'object') {
          setOpeningGuideDraftPatch((prev) => ({ ...prev, ...parsed.draftPatch }))
        }
      }

      if (webAiTaskType === 'novel_draft') {
        const base = createNovelDraft(openingGuideTitle || currentNovelTitle, openingGuideIdea || rawIdea, starterAnswers)
        const draft: NovelDraft = {
          ...base,
          ...parsed,
          globalOutline: Array.isArray(parsed.globalOutline) ? parsed.globalOutline.map(String) : base.globalOutline,
          worldRules: Array.isArray(parsed.worldRules) ? parsed.worldRules : base.worldRules,
          mainCharacter: { ...base.mainCharacter, ...(parsed.mainCharacter || {}) },
        }
        setOpeningGuideDraft(draft)
        setNewNovelDraft(draft)
        setStoryProfile(novelDraftToStoryProfile(draft))
        setOpeningGuidePhase('draft')
      }

      if (webAiTaskType === 'first_chapter') {
        const chapterTitle = String(parsed.chapterTitle || activeChapter.title || '第一章')
        const chapterText = String(parsed.chapterText || '')
        if (!chapterText.trim()) throw new Error('first_chapter 缺少 chapterText')
        const updatedChapter = {
          ...activeChapter,
          title: chapterTitle,
          content: chapterText.startsWith(chapterTitle) ? chapterText : `${chapterTitle}\n\n${chapterText}`,
          summary: String(parsed.chapterSummary || activeChapter.summary),
        }
        updateActiveChapter({ title: updatedChapter.title, content: updatedChapter.content, summary: updatedChapter.summary })
        refreshLocalStoryGraph(chapters.map((chapter) => chapter.id === activeChapter.id ? updatedChapter : chapter))
        setOpeningGuidePhase('done')
      }

      if (webAiTaskType === 'chapter_expand') {
        const chapterText = String(parsed.chapterText || '')
        if (!chapterText.trim()) throw new Error('chapter_expand 缺少 chapterText')
        setGeneratedText(chapterText)
        setFactoryOutput([
          parsed.chapterSummary ? `章节摘要：${parsed.chapterSummary}` : '',
          Array.isArray(parsed.newWorldFacts) && parsed.newWorldFacts.length ? `新增世界事实：${parsed.newWorldFacts.join('；')}` : '',
          Array.isArray(parsed.newForeshadowing) && parsed.newForeshadowing.length ? `新增伏笔：${parsed.newForeshadowing.map((item: any) => item.title || item).join('、')}` : '',
        ].filter(Boolean).join('\n'))
      }

      if (webAiTaskType === 'chapter_rescue') {
        const solutions = Array.isArray(parsed.solutions) ? parsed.solutions : []
        if (!solutions.length) throw new Error('chapter_rescue 缺少 solutions')
        setRescueSolutions(solutions.map((item: any, index: number) => ({
          title: String(item.title || `方案 ${index + 1}`),
          reason: String(item.reason || '网页 AI 生成的卡文处理方案。'),
          conflictHint: String(item.conflictHint || '补充冲突压力。'),
          continuationText: String(item.continuationText || ''),
          nextPlotSuggestion: String(item.nextPlotSuggestion || '继续推进下一场。'),
        })))
        setStarterOutput('Web AI 已生成卡文急救方案，请选择方案插入正文。')
        setRightTab('starter')
      }

      setWebAiMessage(`${providerLabel} 返回已解析并应用到当前工作区。`)
      setSyncState('synced')
      setSyncMessage(`Web AI 结果已应用：${getWebAiTaskLabel(webAiTaskType)}`)
    } catch (error) {
      setWebAiError(error instanceof Error ? error.message : '解析失败，请检查 JSON 格式')
      setSyncState('error')
      setSyncMessage('Web AI 解析失败，请编辑后重试')
    }
  }

  const applyQuickAction = (action: 'continue' | 'visual' | 'conflict' | 'twist' | 'webnovel' | 'diagnose') => {
    const instructions = {
      continue: `围绕「${activeChapter.title}」续写下一段，保持本章目标清晰，不要突然跳场。`,
      visual: `把当前段落写得更有画面感，增加动作、环境、触觉和细节，不要空泛抒情。`,
      conflict: `给当前场景加入一个明确冲突：目标对立、时间压力或身份暴露，并让局面变糟。`,
      twist: `为当前场景加入一个小反转，结尾留下下一章钩子。`,
      webnovel: `把这段改成更顺滑的网文风：短句推进、冲突明确、情绪递进，避免说明书式设定。`,
      diagnose: `请检查当前章节哪里无聊、哪里像流水账，并给出三条可直接修改的建议。`,
    }
    setSceneInput(instructions[action])
    setRightTab('copilot')
  }

  const updateModelConfig = (patch: Partial<ModelConfig>) => {
    setModelConfig((prev) => ({ ...prev, ...patch }))
  }

  const saveModelConfig = async () => {
    if (activeOperation === 'model') return
    beginOperation('model', '保存模型配置中...')
    if (isLocalAccount) {
      setModelConfig((prev) => ({ ...prev, apiKeyConfigured: Boolean(prev.apiKey.trim()) || prev.apiKeyConfigured, apiKey: '' }))
      setRouteSource({ provider: modelConfig.provider, modelName: modelConfig.model || '未填模型', usesBackend: false, usesFallback: true, message: `${modelConfig.provider} 参数已保存到本地账号；当前不会真实调用后端 Skill。` })
      setSyncState('local')
      setSyncMessage(`${modelConfig.provider} 模型参数已保存到本地账号；后端/真实账号连接后才会真实调用 API`)
      finishOperation()
      return
    }

    if (!authToken) {
      setSyncState('error')
      setSyncMessage('请先开启云同步，再保存模型配置')
      setShowSyncPanel(true)
      finishOperation()
      return
    }

    setSyncState('syncing')
    setSyncMessage('正在保存模型配置')
    try {
      const saved = await apiRequest<Omit<ModelConfig, 'apiKey'>>('/api/model-config', {
        method: 'PUT',
        body: JSON.stringify(modelConfig),
      }, authToken)
      setModelConfig((prev) => ({ ...prev, ...saved, apiKey: '' }))
      setAiMode('API')
      setRouteSource({ provider: saved.provider, modelName: saved.model || '未填模型', usesBackend: true, usesFallback: false, message: `${saved.provider} / ${saved.model || '未填模型'} 已保存，后端 Skill 会优先使用该模型。` })
      setSyncState('synced')
      setSyncMessage(`${saved.provider} / ${saved.model || '未填模型'} 模型配置已保存`)
    } catch (error) {
      handleRequestError(error, '模型配置保存失败')
    } finally {
      finishOperation()
    }
  }

  const testModelConfig = async () => {
    if (activeOperation === 'model') return
    if (!modelConfig.apiKey.trim() && !modelConfig.apiKeyConfigured) {
      setSyncState('error')
      setModelTestResult('请先输入 API Key，再测试连接')
      setSyncMessage('缺少模型 API Key')
      return
    }

    setModelTestResult('测试中...')
    beginOperation('model', '测试模型连接中...')
    setSyncState('syncing')
    setSyncMessage('正在测试模型连接')
    try {
      const result = await apiRequest<string>('/api/model-config/test', {
        method: 'POST',
        body: JSON.stringify(modelConfig),
      }, authToken)
      const isFailed = result?.startsWith('测试失败')
      setModelTestResult(result || '模型连接成功')
      setSyncState(isFailed ? 'error' : 'synced')
      if (!isFailed && !isLocalAccount) setAiMode('API')
      setRouteSource({ provider: modelConfig.provider, modelName: modelConfig.model || '未填模型', usesBackend: !isLocalAccount && !isFailed, usesFallback: isLocalAccount || isFailed, message: isFailed ? '模型测试失败，生成会继续使用 fallback 或返回错误提示。' : `${modelConfig.provider} / ${modelConfig.model || '未填模型'} 模型连接成功。` })
      setSyncMessage(isFailed ? '模型测试失败' : `${modelConfig.provider} / ${modelConfig.model || '未填模型'} 模型连接成功`)
    } catch (error) {
      setModelTestResult('测试失败：请确认后端已启动，并检查 Base URL、模型名和 API Key')
      handleRequestError(error, '模型测试失败')
    } finally {
      finishOperation()
    }
  }

  const refreshAgentTask = async (taskId = agentTask?.taskId) => {
    if (!taskId || !authToken || isLocalAccount) return
    try {
      const [task, logs] = await Promise.all([
        apiRequest<AgentTaskResponse>(`/api/agent-tasks/${taskId}`, {}, authToken),
        apiRequest<AgentTaskLogResponse[]>(`/api/agent-tasks/${taskId}/logs`, {}, authToken),
      ])
      setAgentTask(task)
      setAgentLogs(logs)
      setAgentMessage(task.message || `任务状态：${task.status}`)
    } catch (error) {
      setAgentMessage('任务状态刷新失败，请确认后端仍在运行')
    }
  }

  const startAgentNovelCreation = async () => {
    if (isAgentRunning) return
    if (!authToken || isLocalAccount) {
      setAgentMessage('AI 自动开书需要真实后端账号。本地账号不受影响，可继续使用动态开篇问答。')
      setShowSyncPanel(true)
      return
    }
    if (!agentTitle.trim()) {
      setAgentMessage('请先填写作品标题')
      return
    }

    setIsAgentRunning(true)
    beginOperation('agent', 'Agent 自动开书中...')
    setAgentMessage('正在创建授权并启动代理任务...')
    setRouteSource({ skill: 'NovelCreationAgentWorkflow', runnerMode: agentRunnerMode, usesBackend: true, usesFallback: agentRunnerMode === 'FIXED_WORKFLOW', message: `Agent 将以 ${agentRunnerMode} 模式执行。` })
    setAgentTask(null)
    setAgentLogs([])
    try {
      const scopes = [
        'novel:create',
        'chapter:create',
        'chapter:update',
        ...(agentAutoStoryGraph ? ['storyGraph:generate'] : []),
      ]
      const authorization = await apiRequest<{ authorizationId: string }>('/api/agent-authorizations', {
        method: 'POST',
        body: JSON.stringify({
          agentType: 'NOVEL_CREATION',
          scopes,
          expiresInHours: 24,
        }),
      }, authToken)

      const task = await apiRequest<AgentTaskResponse>('/api/agent-tasks/novel-creation', {
        method: 'POST',
        body: JSON.stringify({
          authorizationId: authorization.authorizationId,
          title: agentTitle,
          idea: agentIdea,
          genre: agentGenre,
          style: agentStyle,
          autoGenerateFirstChapter: agentAutoFirstChapter,
          autoGenerateStoryGraph: agentAutoStoryGraph,
          runnerMode: agentRunnerMode,
        }),
      }, authToken)

      setAgentTask(task)
      setAgentMessage(task.message || '小说创建代理任务已返回结果')
      setRouteSource({
        skill: 'NovelCreationAgentWorkflow',
        runnerMode: String(task.result?.runnerMode || agentRunnerMode),
        usesBackend: true,
        usesFallback: String(task.result?.runnerMode || agentRunnerMode).includes('FIXED') || agentRunnerMode === 'AUTO',
        message: task.message || 'Agent 自动开书已返回结果。',
      })
      if (task.result?.novelId) {
        const createdNovel: BackendNovel = {
          id: task.result.novelId,
          title: task.result.novelTitle || agentTitle,
          globalOutline: '',
          authorStylePrompt: agentStyle,
          genre: agentGenre,
          status: 'draft',
          updatedAt: new Date().toISOString(),
        }
        setNovels((prev) => [createdNovel, ...prev.filter((item) => item.id !== createdNovel.id)])
        setActiveNovelId(createdNovel.id)
        setSelectedLibraryNovelId(createdNovel.id)
      }
      await refreshAgentTask(task.taskId)
      setSyncState(task.status === 'SUCCEEDED' ? 'synced' : task.status === 'FAILED' ? 'error' : 'syncing')
      setSyncMessage(task.status === 'SUCCEEDED' ? '代理开书完成' : `代理任务：${task.status}`)
    } catch (error) {
      setAgentMessage('代理任务启动失败：请确认后端、数据库、登录状态和授权接口可用')
      setRouteSource({ skill: 'NovelCreationAgentWorkflow', runnerMode: agentRunnerMode, usesBackend: false, usesFallback: true, message: 'Agent 启动失败，当前仍可使用本地开篇向导。' })
      handleRequestError(error, '代理开书失败')
    } finally {
      setIsAgentRunning(false)
      finishOperation()
    }
  }

  const cancelAgentTask = async () => {
    if (!agentTask?.taskId || !authToken || isLocalAccount) return
    try {
      const task = await apiRequest<AgentTaskResponse>(`/api/agent-tasks/${agentTask.taskId}/cancel`, {
        method: 'POST',
      }, authToken)
      setAgentTask(task)
      setAgentMessage(task.message || '任务已请求取消')
      await refreshAgentTask(task.taskId)
    } catch (error) {
      setAgentMessage('取消任务失败，可能任务已经结束')
    }
  }

  const handleGenerate = async () => {
    if (isGenerating) return
    const sourceScene = sceneInput.trim()
      || selectionText.trim()
      || activeChapter.content.trim().slice(-260)
      || `${activeChapter.title}继续扩写下一段`
    if (!sourceScene.trim()) {
      setSyncState('error')
      setSyncMessage('请先输入短画面、选择正文片段，或写一点章节内容')
      return
    }
    if (!sceneInput.trim()) {
      setSceneInput(sourceScene)
      setSyncMessage(selectionText.trim() ? '已用选中文本作为扩写输入' : '已用章节末尾作为扩写输入')
    }
    setGeneratedText('')
    setIsGenerating(true)
    beginOperation('expand', '短画面扩写生成中...')
    setPromptSnapshot({ style: stylePrompt, memory: recentMemory, entities: matchedLore, scene: sourceScene })

    const controller = new AbortController()
    abortRef.current = controller

    try {
      if (!authToken || isLocalAccount || !isUuid(currentNovelId) || !isUuid(activeChapter.id)) {
        throw new Error('local workspace uses fallback')
      }

      setRouteSource({ skill: 'ChapterExpansionSkill', runnerMode: 'DIRECT_SKILL', usesBackend: true, usesFallback: false, message: '短画面扩写由后端 ChapterExpansionSkill 生成。' })
      const result = await apiRequest<ChapterExpansionResult>('/api/chapters/expand', {
        method: 'POST',
        body: JSON.stringify({
          novelId: currentNovelId,
          chapterId: activeChapter.id,
          sceneText: sourceScene,
          chapterGoal: storyProfile.currentThread || activeChapter.summary,
          style: modelConfig.model ? `${stylePrompt}\n当前模型：${modelConfig.model}` : stylePrompt,
        }),
        signal: controller.signal,
      }, authToken)

      if (!result?.chapterText) throw new Error('empty expansion result')
      setGeneratedText(result.chapterText)
      setFactoryOutput([
        `章节摘要：${result.chapterSummary || '暂无摘要'}`,
        result.characterUpdates?.length ? `人物变化：${result.characterUpdates.map((item) => `${item.characterName}：${item.stateChange}`).join('；')}` : '',
        result.newForeshadowing?.length ? `新增伏笔：${result.newForeshadowing.map((item) => item.title).join('、')}` : '',
        result.newWorldFacts?.length ? `新增世界事实：${result.newWorldFacts.join('；')}` : '',
      ].filter(Boolean).join('\n'))
    } catch (error) {
      if (controller.signal.aborted) return
      const fallback = createLocalExpansion(sourceScene, activeChapter, matchedLore)
      setRouteSource({ skill: '本地短画面扩写规则', runnerMode: 'LOCAL_FALLBACK', usesBackend: false, usesFallback: true, message: '后端生成失败，已使用本地规则继续。' })
      setSyncState('local')
      setSyncMessage('后端生成失败，已使用本地规则继续')
      for (let index = 0; index < fallback.length; index += 14) {
        if (controller.signal.aborted) break
        await new Promise((resolve) => setTimeout(resolve, 18))
        setGeneratedText((prev) => prev + fallback.slice(index, index + 14))
      }
    } finally {
      setIsGenerating(false)
      abortRef.current = null
      finishOperation()
    }
  }

  const stopGenerate = () => abortRef.current?.abort()

  const insertGenerated = () => {
    if (!generatedText.trim()) return
    const updatedChapter = { ...activeChapter, content: `${activeChapter.content.trim()}\n${generatedText}`.trim() }
    updateActiveChapter({ content: updatedChapter.content })
    refreshLocalStoryGraph(chapters.map((chapter) => chapter.id === activeChapter.id ? updatedChapter : chapter))
    setGeneratedText('')
  }

  const handleSave = async () => {
    if (activeOperation === 'saveChapter') return
    beginOperation('saveChapter', '保存章节中...')
    if (!authToken || !activeNovelId) {
      setSaveState('saved')
      setSyncState('local')
      setSyncMessage('已保存到浏览器本地')
      await refreshStoryGraphAfterContentChange()
      finishOperation()
      return
    }

    setSyncState('syncing')
    setSyncMessage('正在保存当前章节')
    try {
      if (isUuid(activeChapter.id)) {
        await apiRequest<void>(`/api/chapter/${activeChapter.id}`, {
          method: 'PUT',
          body: JSON.stringify(toChapterPayload(activeChapter, activeNovelId)),
        }, authToken)
      } else {
        const created = await apiRequest<BackendChapter>('/api/chapter', {
          method: 'POST',
          body: JSON.stringify(toChapterPayload(activeChapter, activeNovelId)),
        }, authToken)
        const mapped = mapBackendChapter(created)
        setChapters((prev) => prev.map((chapter) => (chapter.id === activeChapter.id ? mapped : chapter)))
        setActiveChapterId(mapped.id)
      }
      setSaveState('saved')
      setSyncState('synced')
      setSyncMessage('当前章节已保存到后端')
      await refreshStoryGraphAfterContentChange()
    } catch (error) {
      handleRequestError(error, '保存失败，已保留本地草稿')
    } finally {
      finishOperation()
    }
  }

  const publishActiveChapter = async () => {
    if (!authToken || !activeNovelId || !isUuid(activeChapter.id)) {
      updateActiveChapter({ status: 'published' })
      setSyncMessage('本地章节已标记发布')
      return
    }

    setSyncState('syncing')
    setSyncMessage('正在发布章节')
    try {
      await apiRequest<void>(`/api/chapter/${activeChapter.id}/publish`, { method: 'POST' }, authToken)
      updateActiveChapter({ status: 'published' })
      setSaveState('saved')
      setSyncState('synced')
      setSyncMessage('章节已发布，后端会生成摘要事件')
    } catch (error) {
      setSyncState('error')
      setSyncMessage('发布失败，已保留当前草稿')
    }
  }

  const resetWorkspace = () => {
    window.localStorage.removeItem(workspaceStorageKey)
    const blank = createBlankChapter()
    setChapters([blank])
    setActiveChapterId(blank.id)
    setLore([])
    setIdeas([])
    setStoryProfile(blankStoryProfile)
    setStoryGraph(createLocalStoryGraph('未创建作品', [blank], [], [], blankStoryProfile))
    setEditingLoreId(null)
    setLoreSearch('')
    setLeftTab('overview')
    setRightTab('starter')
    setSceneInput('')
    setGeneratedText('')
    setSelectionText('')
    setFactoryOutput('')
    setPromptSnapshot(null)
    setStarterStep(0)
    setStarterAnswers(initialStarterAnswers)
    setStarterOutput('')
    setRescueSolutions([])
    setSelectedWritingSkill('suspense')
    setSaveState('saved')
  }

  const addChapter = async () => {
    const nextNumber = Math.max(...chapters.map((chapter) => chapter.number)) + 1
    const newChapter: Chapter = {
      id: `chapter-${Date.now()}`,
      number: nextNumber,
      title: `第${nextNumber}章：未命名章节`,
      content: '',
      status: 'draft',
      summary: '暂无摘要。',
      tension: 50,
      satisfaction: 50,
      mystery: 50,
    }

    if (authToken && activeNovelId) {
      setSyncState('syncing')
      setSyncMessage('正在新建章节')
      try {
        const created = await apiRequest<BackendChapter>('/api/chapter', {
          method: 'POST',
          body: JSON.stringify(toChapterPayload(newChapter, activeNovelId)),
        }, authToken)
        const mapped = mapBackendChapter(created)
        setChapters((prev) => [...prev, mapped])
        setActiveChapterId(mapped.id)
        setSaveState('saved')
        setSyncState('synced')
        setSyncMessage('章节已创建')
        return
      } catch (error) {
        setSyncState('error')
        setSyncMessage('后端新建失败，已创建本地章节')
      }
    }

    setChapters((prev) => [...prev, newChapter])
    setActiveChapterId(newChapter.id)
  }

  const removeChapter = async (chapterId: string) => {
    if (chapters.length <= 1) return
    if (authToken && activeNovelId && isUuid(chapterId)) {
      try {
        await apiRequest<void>(`/api/chapter/${chapterId}`, { method: 'DELETE' }, authToken)
        setSyncMessage('章节已从后端删除')
      } catch (error) {
        setSyncState('error')
        setSyncMessage('后端删除失败，仅更新本地列表')
      }
    }

    const nextChapters = chapters
      .filter((chapter) => chapter.id !== chapterId)
      .map((chapter, index) => ({ ...chapter, number: index + 1 }))

    setChapters(nextChapters)
    if (activeChapterId === chapterId) {
      setActiveChapterId(nextChapters[0].id)
    }
    setSaveState('dirty')
  }

  const addLore = async () => {
    const next: LoreItem = {
      id: `lore-${Date.now()}`,
      category: 'character',
      name: '新角色',
      tags: ['待完善'],
      content: '补充角色身份、欲望、恐惧、与主线的关系。',
    }
    if (authToken && activeNovelId) {
      setSyncState('syncing')
      setSyncMessage('正在新建设定')
      try {
        const created = await apiRequest<BackendLore>('/api/lore', {
          method: 'POST',
          body: JSON.stringify(toLorePayload(next, activeNovelId)),
        }, authToken)
        const mapped = mapBackendLore(created)
        setLore((prev) => [mapped, ...prev])
        setEditingLoreId(mapped.id)
        setLeftTab('lore')
        setSyncState('synced')
        setSyncMessage('设定已创建')
        return
      } catch (error) {
        setSyncState('error')
        setSyncMessage('后端新建失败，已创建本地设定')
      }
    }
    setLore((prev) => [next, ...prev])
    setEditingLoreId(next.id)
    setLeftTab('lore')
  }

  const updateLore = (loreId: string, patch: Partial<LoreItem>) => {
    setLore((prev) => prev.map((item) => (item.id === loreId ? { ...item, ...patch } : item)))
  }

  const updateLoreTags = (loreId: string, value: string) => {
    updateLore(loreId, { tags: value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) })
  }

  const saveLore = async (item: LoreItem) => {
    if (activeOperation === 'saveLore') return
    beginOperation('saveLore', '保存设定中...')
    if (!authToken || !activeNovelId || !isUuid(item.id) || isLocalAccount) {
      setSyncState('local')
      setSyncMessage('设定已保存到本地')
      finishOperation()
      return
    }
    setSyncState('syncing')
    setSyncMessage('正在保存设定')
    try {
      await apiRequest<void>(`/api/lore/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(toLorePayload(item, activeNovelId)),
      }, authToken)
      setSyncState('synced')
      setSyncMessage('设定已保存')
    } catch (error) {
      handleRequestError(error, '设定保存失败，已保留本地编辑')
    } finally {
      finishOperation()
    }
  }

  const removeLore = async (loreId: string) => {
    if (authToken && activeNovelId && isUuid(loreId)) {
      try {
        await apiRequest<void>(`/api/lore/${loreId}`, { method: 'DELETE' }, authToken)
        setSyncMessage('设定已从后端删除')
      } catch (error) {
        setSyncState('error')
        setSyncMessage('后端删除失败，仅更新本地列表')
      }
    }
    setLore((prev) => prev.filter((item) => item.id !== loreId))
    if (editingLoreId === loreId) {
      setEditingLoreId(null)
    }
  }

  const addIdea = () => {
    const idea = sceneInput.trim() || '新的点状灵感'
    setIdeas((prev) => [idea, ...prev])
    setLeftTab('ideas')
    setSyncState('local')
    setSyncMessage('灵感已保存，点击灵感可送入短画面扩写')
  }

  const removeIdea = (targetIndex: number) => {
    setIdeas((prev) => prev.filter((_, index) => index !== targetIndex))
  }

  const applySelectionTool = (tool: 'polish' | 'expand' | 'rewrite') => {
    if (!selectionText.trim()) return
    const labels = { polish: '润色', expand: '扩写细节', rewrite: '重写' }
    setSceneInput(`${labels[tool]}这段文字：${selectionText}`)
    setGeneratedText('')
    setRightTab('copilot')
    setSyncState('local')
    setSyncMessage(`已把选中文本送入「${labels[tool]}」，点击生成即可看到结果`)
  }

  const sendChat = () => {
    if (!chatInput.trim()) return
    const question = chatInput
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: question }])
    setChatInput('')

    const modeText = assistantMode === 'editor' ? '责编视角' : assistantMode === 'planner' ? '军师视角' : '搭子视角'
    const answer = `${modeText}：我会围绕「${activeChapter.title}」处理这个问题。当前章节张力 ${activeChapter.tension}/100，悬念 ${activeChapter.mystery}/100；相关设定包括 ${matchedLore.map((item) => item.name).join('、') || '暂无强召回词条'}。建议先明确本场冲突的输赢结果，再决定是否插入伏笔或爽点。`
    setTimeout(() => setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: answer }]), 350)
  }

  const generateFactory = (type: 'screenplay' | 'summary' | 'review') => {
    if (type === 'screenplay') {
      setFactoryOutput(`前3秒钩子：玉佩在雨夜自行发光，黑衣人的刀停在林青云喉前。\n\n[内景-客栈房间-夜]\n林青云：按住玉佩，压低声音：“你们到底是谁？”\n黑衣人：逼近，刀锋映出冷光：“林家的东西，不该留在你手里。”\n[特写]\n玉佩裂开一道金线，玄天剑残片在包袱中震响。\n[反转]\n窗外第二名刺客被无形剑气钉在檐下，苏婉儿的声音从雨里传来：“别动，他现在不能死。”`)
      return
    }
    if (type === 'summary') {
      const summary = `${activeChapter.title}中，林青云围绕玉佩身世遭遇外部威胁，玄天剑相关伏笔被强化，主角从被动离乡转向主动面对追索者。`
      updateActiveChapter({ summary })
      setFactoryOutput(summary)
      return
    }
    setFactoryOutput(`责编审稿：本章开局悬念足，玉佩与玄天剑的关联能形成持续追读动力。风险是反派目的需要更具体，否则“抢玉佩”会显得模板化。建议补一句黑衣人识别林家血脉的细节，并在结尾给林青云一个主动选择。`)
  }

  const applyWritingSkill = () => {
    const skill = writingSkillPrompts[selectedWritingSkill]
    const baseInstruction = sceneInput.trim() || `围绕「${activeChapter.title}」续写下一段`
    setSceneInput(`${baseInstruction}\n\n写作技巧：${skill.label}。${skill.prompt}`)
    setFactoryOutput(`已注入「${skill.label}」技巧。回到中栏点击生成，AI 会按该技巧扩写当前场景。`)
  }

  const updateStarterAnswer = (field: StarterField, value: string) => {
    setStarterAnswers((prev) => ({ ...prev, [field]: value }))
  }

  const updateOpeningGuideAnswer = (value: string) => {
    setOpeningGuideQuestions((prev) => prev.map((question, index) => (
      index === prev.length - 1 ? { ...question, answer: value } : question
    )))
    setOpeningGuideError('')
  }

  const refreshCurrentLocalOpeningQuestion = (patch: Partial<{ title: string; idea: string; genre: string; style: string }>) => {
    setOpeningGuideQuestions((prev) => {
      if (openingGuidePhase !== 'questioning' || prev.length !== 1) return prev
      const current = prev[0]
      if (!current || current.source !== 'local' || current.answer.trim()) return prev
      const context = {
        title: patch.title ?? openingGuideTitle,
        idea: patch.idea ?? openingGuideIdea,
        genre: patch.genre ?? openingGuideGenre,
        style: patch.style ?? openingGuideStyle,
      }
      return [withOpeningGuideMeta(buildOpeningGuideQuestion([], context), 0)]
    })
  }

  const updateOpeningGuideTitleInput = (value: string) => {
    setOpeningGuideTitle(value)
    refreshCurrentLocalOpeningQuestion({ title: value })
  }

  const updateOpeningGuideIdeaInput = (value: string) => {
    setOpeningGuideIdea(value)
    refreshCurrentLocalOpeningQuestion({ idea: value })
  }

  const updateOpeningGuideGenreInput = (value: string) => {
    setOpeningGuideGenre(value)
    setStarterAnswers((prev) => ({ ...prev, genre: value || prev.genre }))
    refreshCurrentLocalOpeningQuestion({ genre: value })
  }

  const updateOpeningGuideStyleInput = (value: string) => {
    setOpeningGuideStyle(value)
    refreshCurrentLocalOpeningQuestion({ style: value })
  }

  const requestOpeningGuideFirstQuestion = async (seed: { title: string; idea: string; genre: string; style: string }) => {
    const fallbackQuestion = buildOpeningGuideQuestion([], seed)
    setOpeningGuideTitle(seed.title)
    setOpeningGuideIdea(seed.idea)
    setOpeningGuideGenre(seed.genre)
    setOpeningGuideStyle(seed.style)
    setOpeningGuideDraft(null)
    setOpeningGuideDraftPatch({})
    setOpeningGuidePhase('questioning')
    setOpeningGuideError('')
    setStarterOutput('')
    setRescueSolutions([])
    setIsOpeningGuideLoading(true)
    beginOperation('openingQuestion', '正在理解脑洞并生成第一个追问...')
    try {
      if (authToken && !isLocalAccount) {
        setRouteSource({ skill: 'OpeningGuideSkill', runnerMode: 'DIRECT_SKILL', usesBackend: true, usesFallback: false, message: '开篇追问由后端 OpeningGuideSkill 生成。' })
        const response = await apiRequest<OpeningGuideApiResponse>('/api/novels/opening-guide/next-question', {
          method: 'POST',
          body: JSON.stringify({
            title: seed.title,
            idea: seed.idea,
            genre: seed.genre,
            style: seed.style,
            answers: [],
            currentStep: 0,
            maxSteps: 5,
          }),
        }, authToken)
        setOpeningGuideDraftPatch(extractOpeningGuideDraftPatch(response) as Record<string, string>)
        setOpeningGuideQuestions([mapOpeningGuideQuestionFromApi(response, 0, fallbackQuestion)])
      } else {
        setOpeningGuideQuestions([withOpeningGuideMeta(fallbackQuestion, 0)])
        setRouteSource({ skill: '本地开篇追问规则', runnerMode: 'LOCAL_FALLBACK', usesBackend: false, usesFallback: true, message: '当前使用本地开篇追问规则。' })
      }
      setSyncMessage('已生成第一个开书追问')
    } catch {
      setOpeningGuideQuestions([withOpeningGuideMeta(fallbackQuestion, 0)])
      setOpeningGuideError('后端生成失败，已使用本地规则继续。')
      setSyncMessage('后端生成失败，已使用本地规则继续')
      setRouteSource({ skill: '本地开篇追问规则', runnerMode: 'LOCAL_FALLBACK', usesBackend: false, usesFallback: true, message: '后端生成失败，已使用本地规则继续。' })
    } finally {
      setIsOpeningGuideLoading(false)
      finishOperation()
    }
  }

  const enterOpeningGuideFromIdea = async () => {
    const source = (rawIdea || newNovelIdea || openingGuideIdea).trim()
    if (!source) {
      setSyncState('error')
      setSyncMessage('请先输入一个脑洞，再进入问答向导')
      return
    }

    const seed = parseIdeaSeed(source)
    const title = seed.title || newNovelTitle.trim() || openingGuideTitle.trim() || '新的长篇小说'
    const genre = seed.genre || openingGuideGenre || '待判断'
    const style = seed.style || openingGuideStyle || '节奏紧凑、有画面感'
    const normalizedSeed = { title, idea: seed.idea, genre, style }
    const nextStarterAnswers = inferStarterAnswersFromIdea(`${title}\n${seed.idea}\n${genre}\n${style}`, {
      ...initialStarterAnswers,
      genre,
      tone: style,
      hook: seed.idea,
      opening: seed.idea,
    })

    setNewNovelTitle(title)
    setNewNovelIdea(seed.idea)
    setOpeningGuideTitle(title)
    setOpeningGuideIdea(seed.idea)
    setOpeningGuideGenre(genre)
    setOpeningGuideStyle(style)
    setOpeningGuideQuestions([])
    setOpeningGuideDraft(null)
    setOpeningGuideDraftPatch({})
    setCreativeBrief(buildCreativeBrief(normalizedSeed))
    setOpeningGuidePhase('questioning')
    setOpeningGuideError('')
    setStarterAnswers(nextStarterAnswers)
    setStoryProfile({
      logline: seed.idea,
      outline: `${genre}方向，围绕“${seed.idea}”建立第一章冲突、主角动机和长线追读钩子。`,
      protagonist: nextStarterAnswers.protagonist,
      worldRules: nextStarterAnswers.world,
      storyArc: '旧事回潮 -> 当众破局 -> 退隐原因露出 -> 旧案追索 -> 更大势力登场。',
      currentThread: nextStarterAnswers.opening,
    })
    setSyncState(isLocalAccount ? 'local' : authToken ? 'synced' : 'local')
    setSyncMessage('已把脑洞带入问答向导')
    setRouteSource({
      skill: isLocalAccount || !authToken ? '本地开篇追问规则' : 'OpeningGuideSkill',
      runnerMode: isLocalAccount || !authToken ? 'LOCAL_FALLBACK' : 'DIRECT_SKILL',
      usesBackend: Boolean(authToken && !isLocalAccount),
      usesFallback: !authToken || isLocalAccount,
      message: authToken && !isLocalAccount ? '问答向导会优先调用后端 OpeningGuideSkill。' : '当前使用本地开篇追问规则。',
    })
    setRightTab('starter')
    setShowIdeaStart(false)
    await requestOpeningGuideFirstQuestion(normalizedSeed)
  }

  const startOpeningGuide = async () => {
    const title = (openingGuideTitle || newNovelTitle || currentNovelTitle || '新的长篇小说').trim()
    const idea = (openingGuideIdea || newNovelIdea || rawIdea || '').trim()
    if (!title || !idea) {
      setOpeningGuideError('请先填写标题和脑洞。')
      return
    }
    await requestOpeningGuideFirstQuestion({ title, idea, genre: openingGuideGenre, style: openingGuideStyle })
  }

  const previousOpeningGuideQuestion = () => {
    setOpeningGuideQuestions((prev) => prev.length > 1 ? prev.slice(0, -1) : prev)
    setOpeningGuideError('')
  }

  const skipOpeningGuideQuestion = () => {
    const current = openingGuideQuestions[openingGuideQuestions.length - 1]
    if (!current || isOpeningGuideLoading) return
    updateOpeningGuideAnswer('跳过，按当前信息继续')
    setOpeningGuideError('')
  }

  const nextOpeningGuideStep = async () => {
    const current = openingGuideQuestions[openingGuideQuestions.length - 1]
    if (!current?.answer.trim()) {
      setOpeningGuideError('请先回答当前问题，或选择一个选项。')
      return
    }
    const context = { title: openingGuideTitle, idea: openingGuideIdea, genre: openingGuideGenre, style: openingGuideStyle }
    const answeredCount = openingGuideQuestions.filter((question) => question.answer.trim()).length
    if (answeredCount >= 3 && answeredCount >= 5) {
      await generateOpeningGuideDraft()
      return
    }
    if (answeredCount >= 3 && /最后|文风|钩子|章末/.test(current.title)) {
      await generateOpeningGuideDraft()
      return
    }
    if (openingGuideQuestions.length >= 6) {
      await generateOpeningGuideDraft()
      return
    }
    setIsOpeningGuideLoading(true)
    beginOperation('openingQuestion', '生成开篇追问中...')
    try {
      const fallbackQuestion = buildOpeningGuideQuestion(openingGuideQuestions, context)
      if (authToken && !isLocalAccount) {
        setRouteSource({ skill: 'OpeningGuideSkill', runnerMode: 'DIRECT_SKILL', usesBackend: true, usesFallback: false, message: '开篇追问由后端 OpeningGuideSkill 生成。' })
        const response = await apiRequest<OpeningGuideApiResponse>('/api/novels/opening-guide/next-question', {
          method: 'POST',
          body: JSON.stringify({
            ...context,
            answers: openingGuideAnswersForApi(openingGuideQuestions),
            currentStep: answeredCount,
            maxSteps: 5,
            draftPatch: openingGuideDraftPatch,
          }),
        }, authToken)
        const mergedPatch = { ...openingGuideDraftPatch, ...(extractOpeningGuideDraftPatch(response) as Record<string, string>) }
        setOpeningGuideDraftPatch(mergedPatch)
        if (response.finished) {
          await generateOpeningGuideDraft(mergedPatch)
          return
        }
        setOpeningGuideQuestions((prev) => [...prev, mapOpeningGuideQuestionFromApi(response, prev.length, fallbackQuestion)])
      } else {
        setOpeningGuideQuestions((prev) => [...prev, withOpeningGuideMeta(fallbackQuestion, prev.length)])
        setRouteSource({ skill: '本地开篇追问规则', runnerMode: 'LOCAL_FALLBACK', usesBackend: false, usesFallback: true, message: '当前使用本地开篇追问规则。' })
      }
    } catch {
      const nextQuestion = buildOpeningGuideQuestion(openingGuideQuestions, context)
      setOpeningGuideQuestions((prev) => [...prev, withOpeningGuideMeta(nextQuestion, prev.length)])
      setOpeningGuideError('后端生成失败，已使用本地规则继续。')
      setRouteSource({ skill: '本地开篇追问规则', runnerMode: 'LOCAL_FALLBACK', usesBackend: false, usesFallback: true, message: '后端生成失败，已使用本地规则继续。' })
    } finally {
      setIsOpeningGuideLoading(false)
      finishOperation()
    }
  }

  const generateOpeningGuideDraft = async (draftPatchOverride: Record<string, string> = openingGuideDraftPatch) => {
    const context = { title: openingGuideTitle, idea: openingGuideIdea, genre: openingGuideGenre, style: openingGuideStyle }
    const answers = createOpeningGuideAnswers(openingGuideQuestions, context)
    const fallbackDraft = createNovelDraft(openingGuideTitle, openingGuideIdea, answers)
    setIsOpeningGuideLoading(true)
    setOpeningGuideError('')
    beginOperation('openingDraft', '生成作品资料草稿中...')
    try {
      if (authToken && !isLocalAccount) {
        setRouteSource({ skill: 'NovelDraftService', runnerMode: 'DIRECT_SKILL', usesBackend: true, usesFallback: false, message: '作品资料草稿由后端 NovelDraftService 生成。' })
        const draft = await apiRequest<NovelDraft>('/api/novels/draft', {
          method: 'POST',
          body: JSON.stringify({
            title: openingGuideTitle,
            idea: openingGuideIdea,
            genre: openingGuideGenre,
            style: openingGuideStyle,
            answers: openingGuideAnswersForApi(openingGuideQuestions),
            draftPatch: draftPatchOverride,
          }),
        }, authToken)
        const nextDraft = draft || fallbackDraft
        setOpeningGuideDraft(nextDraft)
        setStoryProfile(novelDraftToStoryProfile(nextDraft))
      } else {
        setOpeningGuideDraft(fallbackDraft)
        setStoryProfile(novelDraftToStoryProfile(fallbackDraft))
        setRouteSource({ skill: '本地开书草稿规则', runnerMode: 'LOCAL_FALLBACK', usesBackend: false, usesFallback: true, message: '作品资料草稿由本地规则生成。' })
      }
      setStarterAnswers(answers)
      setOpeningGuidePhase('draft')
      setSyncMessage('开篇资料草稿已生成')
    } catch {
      setOpeningGuideDraft(fallbackDraft)
      setStarterAnswers(answers)
      setStoryProfile(novelDraftToStoryProfile(fallbackDraft))
      setOpeningGuidePhase('draft')
      setSyncMessage('后端生成失败，已使用本地规则继续')
      setOpeningGuideError('后端生成失败，已使用本地规则继续。')
      setRouteSource({ skill: '本地开书草稿规则', runnerMode: 'LOCAL_FALLBACK', usesBackend: false, usesFallback: true, message: '后端生成失败，已使用本地规则继续。' })
    } finally {
      setIsOpeningGuideLoading(false)
      finishOperation()
    }
  }

  const confirmOpeningGuideAndGenerateChapter = async () => {
    const draft = openingGuideDraft || createNovelDraft(openingGuideTitle, openingGuideIdea, createOpeningGuideAnswers(openingGuideQuestions, {
      title: openingGuideTitle,
      idea: openingGuideIdea,
      genre: openingGuideGenre,
      style: openingGuideStyle,
    }))
    setOpeningGuidePhase('generating')
    setIsOpeningGuideLoading(true)
    beginOperation('firstChapter', '生成第一章中...')
    setOpeningGuideError('')
    const localChapter = createFirstChapterFromGuide(openingGuideTitle, draft, openingGuideQuestions)
    let chapterText = localChapter.chapterText
    let chapterTitle = localChapter.chapterTitle
    try {
      if (authToken && !isLocalAccount) {
        setRouteSource({ skill: 'FirstChapterGenerationSkill', runnerMode: 'DIRECT_SKILL', usesBackend: true, usesFallback: false, message: '第一章由后端 FirstChapterGenerationSkill 生成。' })
        const result = await apiRequest<FirstChapterGenerationResult>('/api/novels/opening-guide/generate-first-chapter', {
          method: 'POST',
          body: JSON.stringify({
            novelId: activeNovelId && isUuid(activeNovelId) ? activeNovelId : null,
            title: openingGuideTitle || currentNovelTitle,
            idea: openingGuideIdea,
            genre: openingGuideGenre,
            style: draft.style || openingGuideStyle,
            answers: openingGuideAnswersForApi(openingGuideQuestions),
            draft,
          }),
        }, authToken)
        if (result?.chapterText) {
          chapterTitle = result.chapterTitle || chapterTitle
          chapterText = result.chapterText.startsWith(chapterTitle) ? result.chapterText : `${chapterTitle}\n\n${result.chapterText}`
        }
      } else {
        setRouteSource({ skill: '本地第一章生成规则', runnerMode: 'LOCAL_FALLBACK', usesBackend: false, usesFallback: true, message: '第一章由本地规则生成。' })
      }
    } catch {
      setSyncMessage('后端生成失败，已使用本地规则继续')
      setOpeningGuideError('后端生成失败，已使用本地规则继续。')
      setRouteSource({ skill: '本地第一章生成规则', runnerMode: 'LOCAL_FALLBACK', usesBackend: false, usesFallback: true, message: '后端生成失败，已使用本地规则继续。' })
    }

    const firstChapter: Chapter = {
      ...activeChapter,
      title: chapterTitle,
      content: chapterText,
      status: 'draft',
      summary: localChapter.summary,
      tension: 78,
      satisfaction: 62,
      mystery: 72,
    }
    const nextLore = createStarterLore(openingGuideTitle || currentNovelTitle, novelDraftToStoryProfile(draft))
    const nextIdeas = [
      draft.sellPoint,
      draft.firstChapterOpeningScene,
      ...draft.globalOutline,
      ...ideas,
    ].filter(Boolean)
    const nextProfile = novelDraftToStoryProfile(draft)
    const nextChapters = chapters.map((chapter) => chapter.id === activeChapter.id ? firstChapter : chapter)
    setChapters(nextChapters)
    setActiveChapterId(firstChapter.id)
    setLore((prev) => [...nextLore, ...prev.filter((item) => !item.tags.includes('开局向导'))])
    setIdeas(nextIdeas)
    setStoryProfile(nextProfile)
    setSceneInput(draft.firstChapterOpeningScene)
    setStoryGraph(createLocalStoryGraph(openingGuideTitle || currentNovelTitle, nextChapters, nextLore, nextIdeas, nextProfile))
    setStarterOutput(chapterText)
    setLeftTab('overview')
    setRightTab('starter')
    setShowIdeaStart(false)
    setSaveState('dirty')
    setOpeningGuidePhase('done')
    setIsOpeningGuideLoading(false)
    setSyncMessage('第一章已写入编辑器')
    finishOperation()
  }

  const handleCreativeBriefAction = async (action: CreativeBrief['actions'][number]['action']) => {
    if (action === 'CONTINUE_ASK') {
      setOpeningGuidePhase('questioning')
      setRightTab('starter')
      setSyncMessage('继续回答关键问题，工具会据此推进第一章')
      return
    }
    if (action === 'WEB_AI') {
      await prepareWebAiPrompt('opening_next_question')
      return
    }
    await confirmOpeningGuideAndGenerateChapter()
  }

  const generateStarter = async () => {
    if (isGuideContinuation) {
      const fallbackSolutions = createLocalRescueSolutions(starterAnswers, activeChapter, matchedLore, selectionText)
      const fallbackOutput = createGuideOutput(starterAnswers, activeChapter, matchedLore)

      beginOperation('rescue', '卡文急救生成中...')
      try {
        if (!authToken || isLocalAccount || !isUuid(currentNovelId) || !isUuid(activeChapter.id)) {
          throw new Error('local workspace uses rescue fallback')
        }

        setRouteSource({ skill: 'ChapterRescueSkill', runnerMode: 'DIRECT_SKILL', usesBackend: true, usesFallback: false, message: '卡文急救由后端 ChapterRescueSkill 生成。' })
        const result = await apiRequest<ChapterRescueResult>('/api/chapters/rescue', {
          method: 'POST',
          body: JSON.stringify({
            novelId: currentNovelId,
            chapterId: activeChapter.id,
            selectedText: selectionText,
            userDirection: starterAnswers.opening || starterAnswers.hook,
            rescueMode: starterAnswers.tone,
          }),
        }, authToken)
        const solutions = result?.solutions?.length ? result.solutions : fallbackSolutions
        setRescueSolutions(solutions)
        setStarterOutput([
          `卡文急救方案（用于${activeChapter.title}）`,
          ...solutions.map((item, index) => `${index + 1}. ${item.title}：${item.reason}`),
        ].join('\n'))
        setSyncState('synced')
        setSyncMessage('卡文急救方案已生成')
      } catch (error) {
        setRescueSolutions(fallbackSolutions)
        setStarterOutput(fallbackOutput)
        setSyncState('local')
        setSyncMessage('后端生成失败，已使用本地规则继续')
        setRouteSource({ skill: '本地卡文急救规则', runnerMode: 'LOCAL_FALLBACK', usesBackend: false, usesFallback: true, message: '后端生成失败，已使用本地规则继续。' })
      } finally {
        finishOperation()
      }
      return
    }

    beginOperation('firstChapter', '生成本地第一章方案中...')
    setRescueSolutions([])
    const opening = createStarterOpening(starterAnswers)
    const plan = createStarterPlan(starterAnswers)
    setStarterOutput(`${opening}\n\n---\n后三章推进：\n${plan.map((item, index) => `${index + 1}. ${item}`).join('\n')}`)
    setRouteSource({ skill: '本地开篇生成规则', runnerMode: 'LOCAL_FALLBACK', usesBackend: false, usesFallback: true, message: '当前创作向导使用本地开篇生成规则。' })
    finishOperation()
  }

  const insertRescueSolution = (solution: ChapterRescueSolution) => {
    if (!solution.continuationText.trim()) return
    const updatedChapter = {
      ...activeChapter,
      content: `${activeChapter.content.trim()}\n\n${solution.continuationText.trim()}`.trim(),
      summary: `${activeChapter.summary} 卡文急救：${solution.title}`,
      tension: Math.min(100, activeChapter.tension + 7),
      mystery: Math.min(100, activeChapter.mystery + 4),
    }
    updateActiveChapter({
      content: updatedChapter.content,
      summary: updatedChapter.summary,
      tension: updatedChapter.tension,
      mystery: updatedChapter.mystery,
    })
    const nextIdeas = [solution.conflictHint, solution.nextPlotSuggestion, ...ideas]
    setIdeas(nextIdeas)
    refreshLocalStoryGraph(chapters.map((chapter) => chapter.id === activeChapter.id ? updatedChapter : chapter), lore, nextIdeas)
    setLeftTab('chapters')
    setSaveState('dirty')
  }

  const applyStarter = () => {
    if (isGuideContinuation) {
      if (rescueSolutions.length) {
        insertRescueSolution(rescueSolutions[0])
        return
      }

      const fallback = createGuideOutput(starterAnswers, activeChapter, matchedLore)
      const output = (starterOutput || fallback).trim()
      const continuation = output.split('---\n可直接续写段落：')[1]?.trim() || output

      updateActiveChapter({
        content: `${activeChapter.content.trim()}\n\n${continuation}`.trim(),
        summary: `${activeChapter.summary} 创作向导补充：${starterAnswers.hook}`,
        tension: Math.min(100, activeChapter.tension + 8),
        mystery: Math.min(100, activeChapter.mystery + 6),
      })
      setIdeas((prev) => [starterAnswers.opening, starterAnswers.hook, ...prev])
      setSceneInput(starterAnswers.opening)
      setLeftTab('chapters')
      setSaveState('dirty')
      return
    }

    const opening = starterOutput.split('\n\n---\n')[0] || createStarterOpening(starterAnswers)
    const summary = createStarterSummary(starterAnswers)
    const plan = createStarterPlan(starterAnswers)

    setChapters((prev) => prev.map((chapter) => (
      chapter.id === activeChapter.id
        ? {
            ...chapter,
            title: '第一章：雨夜遗物',
            content: opening,
            summary,
            tension: 76,
            satisfaction: 58,
            mystery: 84,
          }
        : chapter
    )))
    setLore((prev) => [
      {
        id: `lore-starter-protagonist-${Date.now()}`,
        category: 'character',
        name: '开局主角',
        tags: ['开局向导', starterAnswers.genre],
        content: starterAnswers.protagonist,
      },
      {
        id: `lore-starter-world-${Date.now()}`,
        category: 'faction',
        name: '开局世界规则',
        tags: ['世界观', '冲突规则'],
        content: starterAnswers.world,
      },
      ...prev,
    ])
    setStoryProfile(createStoryProfile(currentNovelTitle, starterAnswers, starterAnswers.hook))
    setIdeas((prev) => [starterAnswers.hook, starterAnswers.opening, ...plan, ...prev])
    setSceneInput(starterAnswers.opening)
    setLeftTab('chapters')
    setSaveState('dirty')
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="border-b border-border/80 bg-card/95 shadow-sm backdrop-blur">
        <div className="flex min-h-[58px] flex-wrap items-center gap-3 px-5 py-2">
          <div className="flex min-w-[210px] items-center gap-2 pr-2">
            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">NovelAI Copilot</div>
              <div className="text-[11px] text-muted-foreground">脑洞到章节的创作工作台</div>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="whitespace-nowrap rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{aiModeLabel}</span>
            <button onClick={() => setShowModelPanel((value) => !value)} className="whitespace-nowrap rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary" title={modelDetailMessage}>
              {modelBadgeLabel}
            </button>
            <button onClick={() => setShowSyncPanel((value) => !value)} className={cn('whitespace-nowrap rounded-md border px-2 py-1 text-xs', isLocalAccount ? 'border-amber-200 bg-amber-50 text-amber-700' : authToken ? 'border-primary/20 bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground')}>
              {accountStatusLabel}
            </button>
            <span className={cn('whitespace-nowrap rounded-md px-2 py-1 text-xs', backendBadgeLabel.includes('不可用') || backendBadgeLabel.includes('异常') ? 'bg-destructive/10 text-destructive' : backendBadgeLabel.includes('可用') ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground')}>
              {backendBadgeLabel}
            </span>
            <span className={cn('whitespace-nowrap rounded-md px-2 py-1 text-xs', generationRoute.usesFallback ? 'bg-amber-50 text-amber-700' : 'bg-secondary text-secondary-foreground')} title={generationRoute.message}>
              {routeBadgeLabel}
            </span>
            <span className={cn('max-w-[360px] truncate rounded-md px-2 py-1 text-xs', syncState === 'error' ? 'bg-destructive/10 text-destructive' : syncState === 'synced' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground')}>
              {activeOperation ? operationMessage : syncState === 'syncing' ? '同步中...' : syncMessage}
            </span>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button onClick={() => { setSelectedLibraryNovelId(activeNovelId); setShowLibraryPanel(true) }} className="flex whitespace-nowrap rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary">
              作品库
            </button>
            <button onClick={() => setShowModelPanel((value) => !value)} className="flex whitespace-nowrap rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary">
              模型设置
            </button>
            <button onClick={() => setShowSyncPanel((value) => !value)} className="flex whitespace-nowrap rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary">
              账号
            </button>
            {authToken && <button onClick={logout} className="whitespace-nowrap rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">退出</button>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-background/70 px-5 py-2">
          <select
            value={activeNovelId || ''}
            onChange={(event) => switchNovel(event.target.value || null)}
            className={cn('min-w-[180px] max-w-[260px] rounded-md border border-input bg-card px-2 py-1.5 text-sm outline-none transition', isSwitchingNovel && 'border-primary bg-primary/5 text-primary')}
          >
            {novels.length === 0 && <option value="">暂无作品</option>}
            {novelLibraryItems.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.statusLabel}</option>)}
          </select>
          <select
            value={activeChapterId || ''}
            onChange={(event) => setActiveChapterId(event.target.value)}
            className="min-w-[160px] max-w-[240px] rounded-md border border-input bg-card px-2 py-1.5 text-sm outline-none"
          >
            {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
          </select>
          <input
            value={newNovelTitle}
            onChange={(event) => {
              setNewNovelTitle(event.target.value)
              setNewNovelDraft(null)
            }}
            className="min-w-[160px] flex-1 rounded-md border border-input bg-card px-2 py-1.5 text-sm outline-none lg:max-w-[220px]"
            placeholder="新作品标题"
          />
          <input
            value={newNovelIdea}
            onChange={(event) => {
              setNewNovelIdea(event.target.value)
              setNewNovelDraft(null)
            }}
            className="min-w-[220px] flex-[2] rounded-md border border-input bg-card px-2 py-1.5 text-sm outline-none"
            placeholder="一句脑洞，例如：一个青春校园故事，主角在毕业前发现好友隐藏的秘密。"
          />
          <button onClick={generateNovelDraft} className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50" disabled={isDraftingNovel || activeOperation === 'draft'}>
            {isDraftingNovel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 生成草稿
          </button>
          <button onClick={createNovel} className="shrink-0 whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={!newNovelDraft || activeOperation === 'createNovel'}>{activeOperation === 'createNovel' ? '创建中...' : '确认创建'}</button>
          {!showIdeaStart && (
            <button onClick={() => setShowIdeaStart(true)} className="shrink-0 whitespace-nowrap rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              从脑洞开书
            </button>
          )}
        </div>
      </div>
      {newNovelDraft && (
        <div className="border-b border-border bg-secondary/60 px-4 py-3">
          <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[1.05fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> 新作品资料草稿</div>
              <input
                value={newNovelDraft.title}
                onChange={(event) => updateNovelDraft({ title: event.target.value })}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none"
                placeholder="作品标题"
              />
              <textarea
                value={newNovelDraft.sellPoint}
                onChange={(event) => updateNovelDraft({ sellPoint: event.target.value })}
                className="h-16 w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm leading-5 outline-none"
                placeholder="一句话卖点"
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">全局大纲</div>
              <textarea
                value={newNovelDraft.globalOutline.join('\n')}
                onChange={(event) => updateNovelDraftList('globalOutline', event.target.value)}
                className="h-[118px] w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm leading-5 outline-none"
              />
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={newNovelDraft.genre}
                  onChange={(event) => updateNovelDraft({ genre: event.target.value })}
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none"
                  placeholder="题材"
                />
                <input
                  value={newNovelDraft.style}
                  onChange={(event) => updateNovelDraft({ style: event.target.value })}
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none"
                  placeholder="风格"
                />
              </div>
              <textarea
                value={newNovelDraft.mainCharacter.identity}
                onChange={(event) => updateNovelDraftMainCharacter('identity', event.target.value)}
                className="h-12 w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm leading-5 outline-none"
                placeholder="主角设定"
              />
              <textarea
                value={newNovelDraft.worldRules.map((rule) => `${rule.name}：${rule.description}`).join('\n')}
                onChange={(event) => updateNovelDraftWorldRules(event.target.value)}
                className="h-12 w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm leading-5 outline-none"
                placeholder="世界规则"
              />
            </div>
            <div className="flex min-w-[112px] flex-col justify-between gap-2">
              <button disabled={activeOperation === 'createNovel'} onClick={createNovel} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {activeOperation === 'createNovel' ? '创建中...' : '确认创建'}
              </button>
              <button onClick={() => setNewNovelDraft(null)} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                重新输入
              </button>
              <div className="text-[11px] leading-5 text-muted-foreground">确认后会创建作品、第一章、主角 Lore 和世界规则 Lore。</div>
            </div>
          </div>
        </div>
      )}
      {showLibraryPanel && (
        <div className="fixed inset-0 z-50 bg-slate-950/20 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-h-[860px] w-full max-w-7xl flex-col overflow-hidden rounded-md border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <Layers3 className="h-5 w-5 text-primary" />
                  作品库
                </div>
                <p className="mt-1 text-xs text-muted-foreground">快速区分作品、查看进度，并切换到要继续创作的长篇。</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowLibraryPanel(false); setShowIdeaStart(true) }} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                  新建作品
                </button>
                <button onClick={() => setShowLibraryPanel(false)} className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                  关闭
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="soft-grid min-h-0 overflow-y-auto p-5">
                <div className="mb-4 grid gap-2 lg:grid-cols-[minmax(0,1fr)_140px_150px]">
                  <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                    <Search className="h-4 w-4" />
                    <input
                      value={librarySearch}
                      onChange={(event) => setLibrarySearch(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent outline-none"
                      placeholder="搜索作品名、简介、题材或标签"
                    />
                  </div>
                  <select
                    value={libraryStatusFilter}
                    onChange={(event) => setLibraryStatusFilter(event.target.value as typeof libraryStatusFilter)}
                    className="rounded-md border border-input bg-card px-3 py-2 text-sm outline-none"
                  >
                    <option value="all">全部状态</option>
                    <option value="draft">草稿</option>
                    <option value="serializing">连载中</option>
                    <option value="completed">已完成</option>
                  </select>
                  <select
                    value={librarySort}
                    onChange={(event) => setLibrarySort(event.target.value as typeof librarySort)}
                    className="rounded-md border border-input bg-card px-3 py-2 text-sm outline-none"
                  >
                    <option value="updatedAt_desc">最近编辑</option>
                    <option value="createdAt_desc">最近创建</option>
                    <option value="wordCount_desc">字数最多</option>
                    <option value="title_asc">标题 A-Z</option>
                  </select>
                </div>

                {novelLibraryItems.length ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredNovelLibraryItems.map((item) => {
                      const isActive = item.id === activeNovelId
                      const isSelected = item.id === selectedLibraryNovel?.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedLibraryNovelId(item.id)}
                          title={`${item.logline}\n上次编辑：${item.lastEditedChapter?.title || '暂无章节'} · ${item.updatedAtLabel}`}
                          className={cn('group overflow-hidden rounded-md border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md', isSelected ? 'border-primary ring-2 ring-primary/15' : isActive ? 'border-primary/50' : 'border-border')}
                        >
                          <div className="relative h-40 overflow-hidden" style={item.coverStyle}>
                            <div className="absolute inset-x-5 bottom-4 h-12 rounded-t-full border-t border-current/25" />
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/20 to-transparent" />
                            <div className="absolute left-3 top-3 flex flex-wrap gap-1">
                              <span className="rounded-md bg-white/75 px-2 py-1 text-[11px] font-medium text-slate-700 backdrop-blur">{item.statusLabel}</span>
                              <span className="rounded-md bg-white/65 px-2 py-1 text-[11px] text-slate-700 backdrop-blur">{item.genre}</span>
                            </div>
                            <div className="absolute bottom-4 left-4 right-4">
                              <div className="line-clamp-2 text-lg font-semibold leading-6 text-white drop-shadow">{item.title}</div>
                            </div>
                          </div>
                          <div className="space-y-3 p-3">
                            <p className="line-clamp-2 min-h-[40px] text-xs leading-5 text-muted-foreground">{item.logline}</p>
                            <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                              <div>
                                <div className="font-medium text-foreground">{formatWordCount(item.wordCount)}</div>
                                <div>字数</div>
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{item.chapterCount}</div>
                                <div>章节</div>
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{item.updatedAtLabel}</div>
                                <div>更新</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-border pt-2">
                              <span className={cn('rounded-md px-2 py-1 text-[11px]', item.status === 'draft' ? 'bg-secondary text-secondary-foreground' : item.status === 'completed' ? 'bg-blue-50 text-blue-700' : 'bg-primary/10 text-primary')}>
                                {item.statusLabel}
                              </span>
                              <span className="text-xs text-primary opacity-0 transition group-hover:opacity-100">{isActive ? '当前作品' : '查看详情'}</span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[420px] items-center justify-center">
                    <div className="max-w-sm rounded-md border border-dashed border-border bg-card p-6 text-center">
                      <Image className="mx-auto h-8 w-8 text-primary" />
                      <div className="mt-3 text-sm font-medium">暂无作品</div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">你还没有创建任何作品。可以从一个脑洞开始创建第一部长篇。</p>
                      {hasTemporaryDraft && (
                        <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">当前是临时草稿，尚未保存为作品。</div>
                      )}
                      <div className="mt-4 flex justify-center gap-2">
                        <button onClick={() => { setShowLibraryPanel(false); setShowIdeaStart(true) }} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">新建作品</button>
                        <button onClick={() => { setShowLibraryPanel(false); setShowIdeaStart(true); setRightTab('starter') }} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:text-foreground">从脑洞开书</button>
                      </div>
                    </div>
                  </div>
                )}
                {novelLibraryItems.length > 0 && filteredNovelLibraryItems.length === 0 && (
                  <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">没有匹配的作品，换个关键词或筛选条件试试。</div>
                )}
              </div>

              <aside className="min-h-0 overflow-y-auto border-l border-border bg-card p-4">
                {selectedLibraryNovel ? (
                  <>
                <div className="overflow-hidden rounded-md border border-border">
                  <div className="h-48" style={selectedLibraryNovel.coverStyle}>
                    <div className="flex h-full items-end p-4">
                      <div className="text-xl font-semibold leading-7 text-white drop-shadow">{selectedLibraryNovel.title}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-center text-xs text-muted-foreground hover:border-primary hover:text-primary">
                    上传封面
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadNovelCover(selectedLibraryNovel.id, event.target.files?.[0])} />
                  </label>
                  <button onClick={() => regenerateNovelCoverPlaceholder(selectedLibraryNovel.id)} className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary">
                    AI 封面占位
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className={cn('rounded-md px-2 py-1 text-xs', selectedLibraryNovel.status === 'draft' ? 'bg-secondary text-secondary-foreground' : selectedLibraryNovel.status === 'completed' ? 'bg-blue-50 text-blue-700' : 'bg-primary/10 text-primary')}>
                    {selectedLibraryNovel.statusLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">最近更新：{selectedLibraryNovel.updatedAtLabel}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedLibraryNovel.logline}</p>
                <button onClick={() => switchNovel(selectedLibraryNovel.id)} className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                  {selectedLibraryNovel.id === activeNovelId ? '回到当前作品' : '进入创作'}
                </button>
                <button
                  onClick={() => deleteNovel(selectedLibraryNovel.id)}
                  disabled={activeOperation === 'deleteNovel'}
                  className="mt-2 w-full rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  {activeOperation === 'deleteNovel' ? '删除中...' : '删除作品'}
                </button>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">删除会清理作品资料、章节、设定、灵感和本地图谱数据，操作前会再次确认。</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="text-sm font-semibold">{formatWordCount(selectedLibraryNovel.wordCount)}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">总字数</div>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="text-sm font-semibold">{selectedLibraryNovel.chapterCount}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">章节</div>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="text-sm font-semibold">{selectedLibraryNovel.characterCount}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">人物</div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="text-sm font-semibold">{selectedLibraryNovel.volumeCount}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">卷数</div>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="text-sm font-semibold">{selectedLibraryNovel.hookCount}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">伏笔</div>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="text-sm font-semibold">{formatWordCount(selectedLibraryNovel.lastEditedChapter ? countWords(selectedLibraryNovel.lastEditedChapter.content) : 0)}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">上次章节</div>
                  </div>
                </div>
                <div className="mt-4 rounded-md border border-border bg-background p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>章节状态</span>
                    <span>草稿 {selectedLibraryNovel.draftChapterCount} / 已发布 {selectedLibraryNovel.publishedChapterCount}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${selectedLibraryNovel.chapterCount ? (selectedLibraryNovel.publishedChapterCount / selectedLibraryNovel.chapterCount) * 100 : 0}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">上次编辑：{selectedLibraryNovel.lastEditedChapter?.title || '暂无章节'}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {selectedLibraryNovel.tags.length ? selectedLibraryNovel.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-secondary px-2 py-1 text-[11px] text-secondary-foreground">{tag}</span>
                  )) : <span className="text-xs text-muted-foreground">暂无标签</span>}
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">全局大纲</div>
                    <p className="mt-1 line-clamp-5 text-sm leading-6">{selectedLibraryNovel.outline || '暂无大纲。'}</p>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">主角</div>
                    <p className="mt-1 line-clamp-4 text-sm leading-6">{selectedLibraryNovel.protagonist}</p>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">世界规则</div>
                    <p className="mt-1 line-clamp-4 text-sm leading-6">{selectedLibraryNovel.worldRules}</p>
                  </div>
                </div>
                  </>
                ) : (
                  <div className="flex h-full min-h-[420px] items-center justify-center">
                    <div className="rounded-md border border-dashed border-border bg-background p-6 text-center">
                      <Layers3 className="mx-auto h-8 w-8 text-primary" />
                      <div className="mt-3 text-sm font-medium">{novelLibraryItems.length ? '请选择一个作品' : '暂无作品'}</div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {novelLibraryItems.length ? '从左侧列表选择作品后，这里会展示真实作品详情。' : '作品库为空时不会展示默认作品或示例玄幻内容。'}
                      </p>
                      {hasTemporaryDraft && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">当前是临时草稿，确认创建后才会进入作品库。</p>}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
      {(showSyncPanel || showModelPanel) && (
        <div className="grid gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:grid-cols-2">
          {showSyncPanel && (
            <div className="rounded-md border border-border bg-card p-3">
              <div className="mb-2 text-sm font-medium">账号与同步</div>
              {authToken ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <span className="font-medium">{currentUser}</span>
                  <span className={cn('rounded px-2 py-1 text-xs', isLocalAccount ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary')}>
                    {isLocalAccount ? '本地账号' : '真实账号'}
                  </span>
                  <span className="text-xs text-muted-foreground">{backendStatusLabel}</span>
                  <button onClick={logout} className="ml-auto rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">退出登录</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-[150px] rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none" placeholder="用户名" />
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="w-[150px] rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none" placeholder="密码" />
                  <button disabled={activeOperation === 'auth'} onClick={() => handleAuth('login')} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{activeOperation === 'auth' ? '登录中...' : '登录'}</button>
                  <button disabled={activeOperation === 'auth'} onClick={() => handleAuth('register')} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50">{activeOperation === 'auth' ? '处理中...' : '注册'}</button>
                </div>
              )}
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{authToken ? '账号已切换到当前状态；需要换号时请先退出。' : '后端未连接时会自动使用浏览器本地账号，方便先体验创作流程；后端启动后会优先连接真实账号。'}</p>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-md border border-border bg-background px-3 py-2">账号：{isLocalAccount ? '本地账号' : authToken ? '真实账号' : '未登录'}</div>
                <div className="rounded-md border border-border bg-background px-3 py-2">后端：{backendStatusLabel}</div>
                <div className="rounded-md border border-border bg-background px-3 py-2">模型：{modelStatusLabel}</div>
                <div className="rounded-md border border-border bg-background px-3 py-2">保存：{syncState === 'syncing' ? '进行中' : syncState === 'error' ? '有错误' : '可用'}</div>
              </div>
            </div>
          )}
          {showModelPanel && (
            <div className="rounded-md border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium"><KeyRound className="h-4 w-4 text-primary" />模型/API 设置</div>
              <div className="grid gap-2 sm:grid-cols-4">
                <select value={modelConfig.provider} onChange={(event) => updateModelConfig({ provider: event.target.value as ModelConfig['provider'] })} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none">
                  <option value="deepseek">DeepSeek</option>
                  <option value="openai">OpenAI</option>
                  <option value="siliconflow">硅基流动</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="custom">自定义</option>
                </select>
                <input value={modelConfig.baseUrl} onChange={(event) => updateModelConfig({ baseUrl: event.target.value })} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none sm:col-span-2" placeholder="Base URL" />
                <input value={modelConfig.model} onChange={(event) => updateModelConfig({ model: event.target.value })} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none" placeholder="模型名" />
                <input value={modelConfig.apiKey} onChange={(event) => updateModelConfig({ apiKey: event.target.value })} type="password" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none sm:col-span-4" placeholder="API Key，本地临时使用，后续应加密保存到后端" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {modelTestResult || (isLocalAccount ? '本地账号仅保存模型参数，不保存明文 Key。' : modelConfig.apiKeyConfigured ? '已保存 Key。留空不会覆盖原 Key。' : '未保存 Key。保存后后端会加密存储。')}
                </span>
                <div className="flex gap-2">
                  <button disabled={activeOperation === 'model'} onClick={testModelConfig} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50">{activeOperation === 'model' ? '测试中...' : '测试连接'}</button>
                  <button disabled={activeOperation === 'model'} onClick={saveModelConfig} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{activeOperation === 'model' ? '保存中...' : '保存模型配置'}</button>
                </div>
              </div>
              <div className="mt-3 rounded-md border border-border bg-background p-3 text-xs leading-5">
                <div className="mb-2 font-medium text-foreground">当前生成链路</div>
                <div className={cn('mb-3 rounded-md px-3 py-2', hasModelApiKey ? 'bg-primary/5 text-primary' : 'bg-muted text-muted-foreground')}>
                  {modelDetailMessage}
                </div>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {(['LOCAL', 'WEB_AI', 'API'] as WebAiMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setAiMode(mode)
                        setRouteSource({
                          skill: mode === 'API' ? '后端 Skill' : mode === 'WEB_AI' ? `Web AI：${getWebAiTaskLabel(webAiTaskType)}` : '本地规则',
                          runnerMode: mode,
                          usesBackend: mode === 'API',
                          usesFallback: mode === 'LOCAL',
                          message: mode === 'API' ? 'API 模式会优先调用后端 Skill。' : mode === 'WEB_AI' ? 'Web AI 模式需要复制 Prompt 到网页 GPT/Gemini，再粘贴 JSON 回来解析。' : '本地模式使用浏览器内置规则和模板。',
                        })
                      }}
                      className={cn('rounded-md border px-2 py-1.5 text-xs', aiMode === mode ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground')}
                    >
                      {mode === 'LOCAL' ? '本地模式' : mode === 'WEB_AI' ? 'Web AI' : 'API 模式'}
                    </button>
                  ))}
                </div>
                <div className="grid gap-1 sm:grid-cols-2">
                  <div>当前模式：{aiModeLabel}</div>
                  <div>AI 来源：{aiSourceLabel}</div>
                  <div>当前任务：{currentTaskLabel}</div>
                  <div>Provider：{modelConfig.provider}</div>
                  <div>Model Name：{configuredModelName}</div>
                  <div className="sm:col-span-2">Base URL：{modelConfig.baseUrl || '未配置'}</div>
                  <div>账号类型：{accountStatusLabel}</div>
                  <div>后端状态：{backendBadgeLabel}</div>
                  <div className="sm:col-span-2">真实调用后端 Skill：{authToken && !isLocalAccount && syncState !== 'error' ? '是' : '否'}</div>
                  <div>Skill：{generationRoute.skill}</div>
                  <div>Runner：{generationRoute.runnerMode}</div>
                  <div>后端：{generationRoute.usesBackend ? '使用后端' : '未使用后端'}</div>
                  <div>Fallback：{generationRoute.usesFallback ? '是' : '否'}</div>
                  <div className="sm:col-span-2">fallback 原因：{generationRoute.usesFallback ? modelDetailMessage : '当前链路未标记 fallback。'}</div>
                </div>
                <div className="mt-3 rounded-md border border-border bg-card">
                  {modelRoleRows.map(([role, provider, model, status]) => (
                    <div key={role} className="grid grid-cols-[80px_1fr_1fr_92px] gap-2 border-b border-border px-2 py-1.5 last:border-b-0">
                      <span className="font-medium text-foreground">{role}</span>
                      <span>{provider}</span>
                      <span className="truncate">{model}</span>
                      <span className={cn('rounded px-1.5 text-center', status === '未配置' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {showIdeaStart ? (
        <main className="soft-grid min-h-0 flex-1 overflow-y-auto px-6 py-10">
          <section className="mx-auto w-full max-w-5xl">
            <div className="ink-pattern mb-6 overflow-hidden rounded-md border border-border px-6 py-6 shadow-sm">
              <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                给有脑洞但不知道怎么写的人
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-foreground">一句脑洞，先帮你开成第一章。</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                你只要把故事想法说出来，工具会先追问关键问题，再整理作品资料，最后生成可继续写的黄金第一章。
              </p>
            </div>

            <div className="paper-panel rounded-md border border-border bg-card p-4 shadow-sm">
              <textarea
                value={rawIdea}
                onChange={(event) => setRawIdea(event.target.value)}
                className="min-h-[160px] w-full resize-none border-0 bg-transparent text-[17px] leading-8 outline-none"
                placeholder={'例：标题：烟雨江湖\n故事背景：三年前，江湖出现了一名少年，凭高超武艺快意恩仇，却在人声鼎沸时突然退出江湖。\n类型：架空历史，武侠。'}
              />
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <button
                  onClick={enterOpeningGuideFromIdea}
                  disabled={activeOperation === 'openingQuestion' || isOpeningGuideLoading}
                  className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {activeOperation === 'openingQuestion' || isOpeningGuideLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {activeOperation === 'openingQuestion' || isOpeningGuideLoading ? '正在理解脑洞...' : '帮我开书'}
                </button>
                <button onClick={organizeIdea} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary">只整理资料</button>
                <button onClick={generateChapterFromIdea} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary">直接出第一章</button>
                <button onClick={() => setShowIdeaStart(false)} className="ml-auto rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">继续上次创作</button>
              </div>
              <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground sm:grid-cols-3">
                <div className="rounded-md bg-background px-3 py-2">1. 先判断题材和第一章核心冲突</div>
                <div className="rounded-md bg-background px-3 py-2">2. 追问 2-3 个真正影响开篇的问题</div>
                <div className="rounded-md bg-background px-3 py-2">3. 确认后写入作品、章节和设定</div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard icon={Brain} title="脑洞拆解" text="把一句模糊灵感整理成卖点、主角欲望、初始冲突和世界规则。" />
              <FeatureCard icon={PenLine} title="黄金第一章" text="围绕前 300 字冲突、爽点释放和结尾钩子，生成可继续写的开篇。" />
              <FeatureCard icon={Sparkles} title="短画面扩写" text="输入几句画面，结合章节记忆和设定库扩写成正文段落。" />
              <FeatureCard icon={Wand2} title="卡文急救" text="一键续写、加冲突、加反转、补画面感，把空想接成下一段。" />
              <FeatureCard icon={Layers3} title="长篇记忆" text="用章节摘要、Lore 和近期上下文，降低长篇创作遗忘前文的问题。" />
              <FeatureCard icon={AlertTriangle} title="伏笔 / OOC 检查" text="提醒伏笔是否遗忘、角色行为是否偏离设定，减少写崩风险。" />
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {['退婚流开局', '打脸爽点', '悬念埋设', '对白冲突', '去 AI 味润色', '短剧改编'].map((item) => (
                <span key={item} className="rounded-md border border-border px-2.5 py-1">{item}</span>
              ))}
            </div>

            <div className="rounded-md border border-border bg-card/95 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">暂时没有模型 API？用 Codex 协作</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">先让页面生成任务包，发给 Codex 后把结果粘回来。以后接模型 API 时，这里会换成自动调用。</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copyCodexTask('blueprint')} className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary hover:text-primary">复制故事任务</button>
                  <button onClick={() => copyCodexTask('chapter')} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">复制第一章任务</button>
                </div>
              </div>
              {codexTask && (
                <textarea
                  value={codexTask}
                  onChange={(event) => setCodexTask(event.target.value)}
                  className="mb-3 min-h-[120px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs leading-5 outline-none"
                />
              )}
              <textarea
                value={codexResult}
                onChange={(event) => setCodexResult(event.target.value)}
                className="min-h-[96px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none"
                placeholder="把 Codex 返回的故事骨架、第一章或下一段粘到这里..."
              />
              <div className="mt-3 flex justify-end">
                <button onClick={applyCodexResult} disabled={!codexResult.trim()} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">写入当前章节</button>
              </div>
            </div>

            {ideaBlueprint && (
              <div className="mt-4 rounded-md border border-border bg-card p-4 text-sm leading-7 whitespace-pre-wrap">
                {ideaBlueprint}
              </div>
            )}
          </section>
        </main>
      ) : (
      <div className="soft-grid flex min-h-0 flex-1 min-w-0">
        <aside className={cn('h-full border-r border-border bg-card/95 shadow-sm backdrop-blur transition-all duration-200', leftOpen ? 'w-[280px]' : 'w-14')}>
          <div className="flex h-14 items-center justify-between border-b border-border px-3">
            {leftOpen && (
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4 text-primary" /> {currentNovelTitle}</div>
                <div className="text-xs text-muted-foreground">长篇连载创作工作台</div>
              </div>
            )}
            <button className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => setLeftOpen((value) => !value)} title={leftOpen ? '收起左栏' : '展开左栏'}>
              {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
          </div>

          {leftOpen && (
            <>
              <div className="grid grid-cols-5 border-b border-border text-sm">
                {[
                  ['overview', BookOpen, '总览'],
                  ['chapters', ListTree, '章节'],
                  ['lore', Brain, '设定'],
                  ['ideas', Flame, '灵感'],
                  ['graph', MapPin, '图谱'],
                ].map(([tab, Icon, label]) => {
                  const TypedIcon = Icon as typeof ListTree
                  return (
                    <button key={tab as string} onClick={() => setLeftTab(tab as LeftTab)} className={cn('flex items-center justify-center gap-1.5 py-2.5 text-muted-foreground hover:text-foreground', leftTab === tab && 'border-b-2 border-primary text-primary')}>
                      <TypedIcon className="h-4 w-4" /> {label as string}
                    </button>
                  )
                })}
              </div>

              <div className="h-[calc(100%-7rem)] overflow-y-auto p-3">
                {leftTab === 'overview' && (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-md border border-border bg-background/95">
                      <div className="h-32" style={currentNovelCard.coverStyle}>
                        <div className="flex h-full items-end justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-white drop-shadow">{currentNovelCard.title}</div>
                            <div className="mt-1 inline-flex rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700 backdrop-blur">{currentNovelCard.statusLabel}</div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-1">
                            <button onClick={() => { setSelectedLibraryNovelId(activeNovelId); setShowLibraryPanel(true) }} className="rounded-md bg-white/80 px-2 py-1 text-[11px] font-medium text-slate-700 backdrop-blur hover:bg-white">作品库</button>
                            {activeNovelId && (
                              <button disabled={activeOperation === 'deleteNovel'} onClick={() => deleteNovel(activeNovelId)} className="rounded-md bg-white/80 px-2 py-1 text-[11px] font-medium text-red-700 backdrop-blur hover:bg-white disabled:opacity-50">{activeOperation === 'deleteNovel' ? '删除中' : '删除'}</button>
                            )}
                            {activeNovelId && (
                              <label className="cursor-pointer rounded-md bg-white/80 px-2 py-1 text-center text-[11px] font-medium text-slate-700 backdrop-blur hover:bg-white">
                                换封面
                                <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadNovelCover(activeNovelId, event.target.files?.[0])} />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 border-t border-border bg-card text-center">
                        <div className="border-r border-border px-2 py-2">
                          <div className="text-xs font-semibold">{formatWordCount(currentNovelCard.wordCount)}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">字数</div>
                        </div>
                        <div className="border-r border-border px-2 py-2">
                          <div className="text-xs font-semibold">{currentNovelCard.chapterCount}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">章节</div>
                        </div>
                        <div className="px-2 py-2">
                          <div className="truncate text-xs font-semibold">{currentNovelCard.updatedAtLabel}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">更新</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 border-t border-border bg-background text-center">
                        <div className="border-r border-border px-2 py-2">
                          <div className="text-xs font-semibold">{currentNovelCard.volumeCount}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">卷</div>
                        </div>
                        <div className="border-r border-border px-2 py-2">
                          <div className="text-xs font-semibold">{currentNovelCard.characterCount}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">人物</div>
                        </div>
                        <div className="border-r border-border px-2 py-2">
                          <div className="text-xs font-semibold">{currentNovelCard.hookCount}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">伏笔</div>
                        </div>
                        <div className="px-2 py-2">
                          <div className="text-xs font-semibold">{currentNovelCard.publishedChapterCount}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">发布</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-background/90 p-3">
                      <button onClick={() => setShowOverviewOutline((value) => !value)} className="flex w-full items-center justify-between gap-2 text-left">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FileText className="h-4 w-4 text-primary" />
                          全局大纲
                        </div>
                        <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', showOverviewOutline && 'rotate-90')} />
                      </button>
                      {showOverviewOutline && (
                        <div className="mt-3 space-y-2">
                          {overviewOutlineLines.map((line, index) => (
                            <div key={`${line}-${index}`} className="flex gap-2 rounded-md bg-card px-2 py-2 text-xs leading-5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">{index + 1}</span>
                              <span className="min-w-0 flex-1">{line}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-md border border-border bg-background/90 p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <BookOpen className="h-4 w-4 text-primary" />
                        作品资料
                      </div>
                      <label className="text-[11px] text-muted-foreground">一句话卖点</label>
                      <textarea
                        value={storyProfile.logline}
                        onChange={(event) => updateStoryProfile({ logline: event.target.value })}
                        className="mt-1 min-h-[64px] w-full resize-none rounded-md border border-input bg-card px-2 py-1.5 text-xs leading-5 outline-none"
                      />
                      <label className="mt-3 block text-[11px] text-muted-foreground">全局大纲</label>
                      <textarea
                        value={storyProfile.outline}
                        onChange={(event) => updateStoryProfile({ outline: event.target.value })}
                        className="mt-1 min-h-[110px] w-full resize-none rounded-md border border-input bg-card px-2 py-1.5 text-xs leading-5 outline-none"
                      />
                    </div>

                    <div className="rounded-md border border-border bg-background/90 p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Bot className="h-4 w-4 text-primary" />
                        主角与世界
                      </div>
                      <label className="text-[11px] text-muted-foreground">主角</label>
                      <textarea
                        value={storyProfile.protagonist}
                        onChange={(event) => updateStoryProfile({ protagonist: event.target.value })}
                        className="mt-1 min-h-[72px] w-full resize-none rounded-md border border-input bg-card px-2 py-1.5 text-xs leading-5 outline-none"
                      />
                      <label className="mt-3 block text-[11px] text-muted-foreground">世界规则</label>
                      <textarea
                        value={storyProfile.worldRules}
                        onChange={(event) => updateStoryProfile({ worldRules: event.target.value })}
                        className="mt-1 min-h-[72px] w-full resize-none rounded-md border border-input bg-card px-2 py-1.5 text-xs leading-5 outline-none"
                      />
                    </div>

                    <div className="rounded-md border border-border bg-background/90 p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <ListTree className="h-4 w-4 text-primary" />
                        剧情线
                      </div>
                      <label className="text-[11px] text-muted-foreground">长期剧情弧</label>
                      <textarea
                        value={storyProfile.storyArc}
                        onChange={(event) => updateStoryProfile({ storyArc: event.target.value })}
                        className="mt-1 min-h-[70px] w-full resize-none rounded-md border border-input bg-card px-2 py-1.5 text-xs leading-5 outline-none"
                      />
                      <label className="mt-3 block text-[11px] text-muted-foreground">当前追读线</label>
                      <textarea
                        value={storyProfile.currentThread}
                        onChange={(event) => updateStoryProfile({ currentThread: event.target.value })}
                        className="mt-1 min-h-[64px] w-full resize-none rounded-md border border-input bg-card px-2 py-1.5 text-xs leading-5 outline-none"
                      />
                    </div>

                    <div className="rounded-md border border-border bg-background/90 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Brain className="h-4 w-4 text-primary" />
                          人物角色
                        </div>
                        <button onClick={() => { setLeftTab('lore'); addLore() }} className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary">添加</button>
                      </div>
                      <div className="space-y-2">
                        {characterLore.length ? characterLore.map((item) => (
                          <button key={item.id} onClick={() => { setLeftTab('lore'); setEditingLoreId(item.id) }} className="w-full rounded-md border border-border bg-card p-2 text-left hover:border-primary/40">
                            <div className="truncate text-xs font-medium">{item.name}</div>
                            <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{item.content}</div>
                          </button>
                        )) : (
                          <div className="rounded-md border border-dashed border-border p-3 text-xs leading-5 text-muted-foreground">还没有人物卡。可以先添加主角、重要配角和反派。</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-background/90 p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Layers3 className="h-4 w-4 text-primary" />
                        章节概览
                      </div>
                      <div className="space-y-2">
                        {chapters.map((chapter) => (
                          <button key={chapter.id} onClick={() => { setLeftTab('chapters'); setActiveChapterId(chapter.id) }} className="w-full rounded-md border border-border bg-card p-2 text-left hover:border-primary/40">
                            <div className="flex items-center justify-between gap-2 text-xs font-medium">
                              <span className="truncate">{chapter.title}</span>
                              <span className="shrink-0 text-[11px] text-muted-foreground">{countWords(chapter.content)} 字</span>
                            </div>
                            <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{chapter.summary}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {leftTab === 'graph' && (
                  <div className="space-y-3">
                    <div className="rounded-md border border-border bg-background/90 p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <MapPin className="h-4 w-4 text-primary" />
                          世界观图谱
                        </div>
                        <button onClick={generateStoryGraph} className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground">刷新</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={graphFilter}
                          onChange={(event) => setGraphFilter(event.target.value as StoryGraphNodeType | 'all')}
                          className="rounded-md border border-input bg-card px-2 py-1.5 text-xs outline-none"
                        >
                          <option value="all">全部类型</option>
                          {Object.entries(storyGraphTypeMeta).map(([type, meta]) => <option key={type} value={type}>{meta.label}</option>)}
                        </select>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setGraphZoom((value) => Math.max(0.65, value - 0.15))} className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs">缩小</button>
                          <button onClick={() => setGraphZoom((value) => Math.min(1.7, value + 0.15))} className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs">放大</button>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button onClick={addGraphNode} className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">新增节点</button>
                        <button onClick={addGraphEdge} className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">新增关系</button>
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-background p-2">
                      <svg
                        viewBox="0 0 560 460"
                        className="h-[360px] w-full rounded bg-card"
                        onMouseMove={(event) => {
                          if (!draggingGraphNodeId) return
                          const rect = event.currentTarget.getBoundingClientRect()
                          const x = ((event.clientX - rect.left) / rect.width) * 560 / graphZoom
                          const y = ((event.clientY - rect.top) / rect.height) * 460 / graphZoom
                          setStoryGraph((prev) => ({
                            ...prev,
                            nodes: prev.nodes.map((node) => node.id === draggingGraphNodeId ? { ...node, x, y } : node),
                          }))
                        }}
                        onMouseUp={() => {
                          if (draggingGraphNodeId) setSaveState('dirty')
                          setDraggingGraphNodeId(null)
                        }}
                        onMouseLeave={() => setDraggingGraphNodeId(null)}
                      >
                        <g transform={`scale(${graphZoom})`}>
                          {visibleGraphEdges.map((edge, index) => {
                            const source = storyGraph.nodes.find((node) => node.id === edge.sourceId)
                            const target = storyGraph.nodes.find((node) => node.id === edge.targetId)
                            if (!source || !target) return null
                            return (
                              <g key={`${edge.sourceId}-${edge.targetId}-${index}`}>
                                <line x1={source.x || 0} y1={source.y || 0} x2={target.x || 0} y2={target.y || 0} stroke="#cbd5e1" strokeWidth="1.5" />
                                <text x={((source.x || 0) + (target.x || 0)) / 2} y={((source.y || 0) + (target.y || 0)) / 2} fontSize="9" fill="#64748b">{edge.label}</text>
                              </g>
                            )
                          })}
                          {visibleGraphNodes.map((node) => {
                            const meta = storyGraphTypeMeta[node.type]
                            const isSelected = selectedGraphNodeId === node.id
                            return (
                              <g
                                key={node.id}
                                transform={`translate(${node.x || 0}, ${node.y || 0})`}
                                className="cursor-pointer"
                                onMouseDown={() => setDraggingGraphNodeId(node.id)}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setSelectedGraphNodeId(node.id)
                                }}
                              >
                                <circle r={node.important ? 22 : 18} fill={meta.bg} stroke={isSelected ? '#0f766e' : meta.color} strokeWidth={isSelected ? 3 : 1.8} />
                                <text y="4" textAnchor="middle" fontSize="9" fill={meta.color}>{node.label.slice(0, 7)}</text>
                              </g>
                            )
                          })}
                        </g>
                      </svg>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(storyGraphTypeMeta).map(([type, meta]) => (
                          <span key={type} className="rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
                        ))}
                      </div>
                    </div>

                    {selectedGraphNode ? (
                      <div className="rounded-md border border-border bg-background p-3">
                        <div className="mb-2 text-sm font-medium">节点详情</div>
                        <input
                          value={selectedGraphNode.label}
                          onChange={(event) => updateGraphNode(selectedGraphNode.id, { label: event.target.value })}
                          className="w-full rounded-md border border-input bg-card px-2 py-1.5 text-xs outline-none"
                        />
                        <select
                          value={selectedGraphNode.type}
                          onChange={(event) => updateGraphNode(selectedGraphNode.id, { type: event.target.value as StoryGraphNodeType })}
                          className="mt-2 w-full rounded-md border border-input bg-card px-2 py-1.5 text-xs outline-none"
                        >
                          {Object.entries(storyGraphTypeMeta).map(([type, meta]) => <option key={type} value={type}>{meta.label}</option>)}
                        </select>
                        <textarea
                          value={String(selectedGraphNode.metadata.summary || selectedGraphNode.metadata.status || '')}
                          onChange={(event) => updateGraphNode(selectedGraphNode.id, { metadata: { ...selectedGraphNode.metadata, summary: event.target.value } })}
                          className="mt-2 min-h-[76px] w-full resize-none rounded-md border border-input bg-card px-2 py-1.5 text-xs leading-5 outline-none"
                          placeholder="节点说明、人物状态、势力归属、事件标签或伏笔状态"
                        />
                        <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <input type="checkbox" checked={Boolean(selectedGraphNode.important)} onChange={(event) => updateGraphNode(selectedGraphNode.id, { important: event.target.checked })} />
                          标记重要，高亮显示
                        </label>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-border p-3 text-xs leading-5 text-muted-foreground">点击图谱节点查看详情；拖拽节点可以手动调整布局。</div>
                    )}
                  </div>
                )}

                {leftTab === 'chapters' && (
                  <div className="space-y-2">
                    {chapters.map((chapter) => (
                      <div key={chapter.id} className={cn('group flex items-start gap-2 rounded-md border border-transparent px-3 py-2 text-sm hover:bg-accent', activeChapter.id === chapter.id && 'border-primary/30 bg-primary/5')}>
                        <button onClick={() => setActiveChapterId(chapter.id)} className="min-w-0 flex-1 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{chapter.title}</span>
                            <span className="text-xs text-muted-foreground">{countWords(chapter.content)}</span>
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{chapter.summary}</div>
                        </button>
                        <button
                          disabled={chapters.length <= 1}
                          onClick={() => removeChapter(chapter.id)}
                          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-destructive disabled:cursor-not-allowed disabled:opacity-20 group-hover:opacity-100"
                          title="删除章节"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={addChapter} className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"><Plus className="h-4 w-4" /> 新建章节</button>
                  </div>
                )}

                {leftTab === 'lore' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-muted-foreground">
                      <Search className="h-4 w-4" />
                      <input
                        value={loreSearch}
                        onChange={(event) => setLoreSearch(event.target.value)}
                        className="min-w-0 flex-1 bg-transparent outline-none"
                        placeholder="搜索设定与角色"
                      />
                    </div>
                    {filteredLore.map((item) => {
                      const Icon = getLoreIcon(item.category)
                      const isEditing = editingLoreId === item.id
                      return (
                        <div key={item.id} className="rounded-md border border-border bg-background p-3">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Icon className="h-4 w-4 text-primary" />
                            {isEditing ? (
                              <input
                                value={item.name}
                                onChange={(event) => updateLore(item.id, { name: event.target.value })}
                                className="min-w-0 flex-1 rounded border border-input bg-card px-2 py-1 text-sm outline-none"
                              />
                            ) : (
                              <span className="min-w-0 flex-1 truncate">{item.name}</span>
                            )}
                            <button onClick={() => setEditingLoreId(isEditing ? null : item.id)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title={isEditing ? '完成编辑' : '编辑设定'}>
                              {isEditing ? <Check className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
                            </button>
                            <button onClick={() => removeLore(item.id)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-destructive" title="删除设定">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {isEditing ? (
                            <div className="mt-3 space-y-2">
                              <select
                                value={item.category}
                                onChange={(event) => updateLore(item.id, { category: event.target.value as LoreCategory })}
                                className="w-full rounded-md border border-input bg-card px-2 py-1.5 text-xs outline-none"
                              >
                                <option value="character">人物</option>
                                <option value="location">地点</option>
                                <option value="item">物品</option>
                                <option value="faction">势力</option>
                              </select>
                              <textarea
                                value={item.content}
                                onChange={(event) => updateLore(item.id, { content: event.target.value })}
                                className="min-h-[88px] w-full resize-none rounded-md border border-input bg-card px-2 py-1.5 text-xs leading-5 outline-none"
                              />
                              <input
                                value={item.tags.join('，')}
                                onChange={(event) => updateLoreTags(item.id, event.target.value)}
                                className="w-full rounded-md border border-input bg-card px-2 py-1.5 text-xs outline-none"
                                placeholder="标签，用逗号分隔"
                              />
                              <textarea
                                value={item.imagePrompt || ''}
                                onChange={(event) => updateLore(item.id, { imagePrompt: event.target.value })}
                                className="min-h-[60px] w-full resize-none rounded-md border border-input bg-card px-2 py-1.5 text-xs leading-5 outline-none"
                                placeholder="角色立绘 Prompt，可选"
                              />
                              <button
                                disabled={activeOperation === 'saveLore'}
                                onClick={() => saveLore(item)}
                                className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                              >
                                {activeOperation === 'saveLore' ? '保存中...' : '保存设定'}
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.content}</p>
                              <div className="mt-2 flex flex-wrap gap-1">{item.tags.map((tag) => <span key={tag} className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">{tag}</span>)}</div>
                            </>
                          )}
                        </div>
                      )
                    })}
                    {filteredLore.length === 0 && (
                      <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">没有匹配的设定</div>
                    )}
                    <button onClick={addLore} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" /> 添加设定</button>
                  </div>
                )}

                {leftTab === 'ideas' && (
                  <div className="space-y-2">
                    {ideas.map((idea, index) => (
                      <div key={`${idea}-${index}`} className="group flex items-start gap-2 rounded-md border border-border bg-background p-3 hover:border-primary/50">
                        <button onClick={() => {
                          setSceneInput(idea)
                          setLeftTab('chapters')
                          setShowIdeaStart(false)
                          setSyncState('local')
                          setSyncMessage('已把灵感送入短画面扩写，点击中栏“生成”即可扩写')
                        }} className="min-w-0 flex-1 text-left text-sm leading-5">
                          {idea}
                        </button>
                        <button
                          onClick={() => removeIdea(index)}
                          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-destructive group-hover:opacity-100"
                          title="删除灵感"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={addIdea} className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"><Plus className="h-4 w-4" /> 当前指令存为灵感</button>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-transparent">
          <header className="flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur">
            <div className="min-w-0 flex-1">
              <input value={activeChapter.title} onChange={(event) => updateActiveChapter({ title: event.target.value })} className="w-full bg-transparent text-sm font-semibold outline-none" />
              <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground"><span>{countWords(activeChapter.content)} 字</span><span>{activeChapter.status === 'published' ? '已发布' : '草稿'}</span><span>{saveState === 'saved' ? '已保存' : '有改动'}</span></div>
            </div>
            <div className="flex items-center gap-1">
              <button disabled={isGenerating} onClick={handleGenerate} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-primary disabled:opacity-50" title={isGenerating ? '生成中' : 'AI 扩写当前短画面/选中文本'}>{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}</button>
              <button disabled={activeOperation === 'saveChapter'} onClick={handleSave} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" title={activeOperation === 'saveChapter' ? '保存中' : '保存'}><Save className="h-4 w-4" /></button>
              <button onClick={resetWorkspace} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" title="重置示例项目"><RefreshCcw className="h-4 w-4" /></button>
              <button onClick={publishActiveChapter} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" title="发布"><Check className="h-4 w-4" /></button>
            </div>
          </header>

          <section className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl px-6 py-6">
              {selectionText && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                  <span className="max-w-[360px] truncate text-muted-foreground">已选：{selectionText}</span>
                  <button onClick={() => applySelectionTool('polish')} className="rounded-md bg-background px-2 py-1 hover:text-primary"><Wand2 className="mr-1 inline h-3.5 w-3.5" />润色</button>
                  <button onClick={() => applySelectionTool('expand')} className="rounded-md bg-background px-2 py-1 hover:text-primary"><Scissors className="mr-1 inline h-3.5 w-3.5" />扩写</button>
                  <button onClick={() => applySelectionTool('rewrite')} className="rounded-md bg-background px-2 py-1 hover:text-primary"><RefreshCcw className="mr-1 inline h-3.5 w-3.5" />重写</button>
                </div>
              )}

              <textarea value={activeChapter.content} onChange={(event) => updateActiveChapter({ content: event.target.value })} onMouseUp={() => setSelectionText(window.getSelection()?.toString() || '')} onKeyUp={(event) => {
                const target = event.currentTarget
                setSelectionText(target.value.slice(target.selectionStart, target.selectionEnd))
                if (target.value.endsWith('/ai')) setSceneInput('')
              }} className="paper-panel min-h-[52vh] w-full resize-none rounded-md border border-border px-5 py-4 text-[16px] leading-8 shadow-sm outline-none focus:ring-2 focus:ring-primary/15" placeholder="从一个短画面开始，或输入 /ai 唤醒扩写..." />

              <div className="mt-5 rounded-md border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> Scene-to-Chapter 短画面扩写</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><span>召回 {matchedLore.length} 个设定</span><span>近 {recentMemory.length} 章记忆</span></div>
                </div>
                <div className="flex gap-2">
                  <input value={sceneInput} onChange={(event) => setSceneInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleGenerate()} className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="输入短画面，例如：主角在雨夜客栈被追杀，玉佩突然发光..." />
                  <button disabled={activeOperation === 'saveChapter'} onClick={isGenerating ? stopGenerate : handleGenerate} className={cn('flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50', isGenerating ? 'bg-destructive' : 'bg-primary hover:bg-primary/90')}>
                    {isGenerating ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}{isGenerating ? '中止' : '生成'}
                  </button>
                </div>
                <button onClick={() => prepareWebAiPrompt('chapter_expand')} className="mt-2 w-full rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
                  用 Web AI 生成扩写 Prompt
                </button>
                {generatedText && (
                  <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium text-primary">{isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}AI 正文草稿</span>
                      <span className={cn('rounded px-2 py-1 text-[11px]', generationRoute.usesFallback ? 'bg-amber-50 text-amber-700' : 'bg-primary/10 text-primary')}>{generationRoute.usesFallback ? '本地 fallback' : generationRoute.skill}</span>
                      <button disabled={isGenerating} onClick={insertGenerated} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">插入正文</button>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7">{generatedText}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>

        <aside className={cn('h-full border-l border-border bg-card/95 shadow-sm backdrop-blur transition-all duration-200', rightOpen ? 'w-[340px]' : 'w-14')}>
          <div className="flex h-14 items-center justify-between border-b border-border px-3">
            {rightOpen && <div className="font-semibold">AI 副驾</div>}
            <button className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => setRightOpen((value) => !value)} title={rightOpen ? '收起右栏' : '展开右栏'}>
              {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
          </div>

          {rightOpen && (
            <div className="flex h-[calc(100%-3.5rem)] flex-col">
              <div className="grid grid-cols-6 border-b border-border text-sm">
                {[
                  ['starter', PenLine, '向导'],
                  ['agent', Bot, '代理'],
                  ['webai', Copy, 'Web'],
                  ['copilot', MessageSquare, '伴写'],
                  ['factory', Clapperboard, '衍生'],
                  ['inspector', FileText, 'Prompt'],
                ].map(([tab, Icon, label]) => {
                  const TypedIcon = Icon as typeof MessageSquare
                  return <button key={tab as string} onClick={() => setRightTab(tab as RightTab)} className={cn('flex items-center justify-center gap-1.5 py-2.5 text-muted-foreground hover:text-foreground', rightTab === tab && 'border-b-2 border-primary text-primary')}><TypedIcon className="h-4 w-4" />{label as string}</button>
                })}
              </div>

              {rightTab === 'webai' && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="border-b border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Web AI 协作</div>
                        <div className="mt-0.5 text-xs leading-5 text-muted-foreground">没有 API Key 时，用网页 GPT / Gemini 参与创作：复制 Prompt，粘贴 JSON，工具负责解析和应用。</div>
                      </div>
                      <Copy className="h-5 w-5 text-primary" />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1 text-xs">
                      {(['LOCAL', 'WEB_AI', 'API'] as WebAiMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setAiMode(mode)}
                          className={cn('rounded-md border px-2 py-1.5', aiMode === mode ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground')}
                        >
                          {mode === 'LOCAL' ? '本地' : mode === 'WEB_AI' ? 'Web AI' : 'API'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 gap-2">
                      <select value={webAiProvider} onChange={(event) => setWebAiProvider(event.target.value as WebAiProvider)} className="rounded-md border border-input bg-background px-2 py-2 text-sm outline-none">
                        <option value="GPT_WEB">GPT Web</option>
                        <option value="GEMINI_WEB">Gemini Web</option>
                        <option value="OTHER_WEB">其他 Web</option>
                      </select>
                      <select value={webAiTaskType} onChange={(event) => setWebAiTaskType(event.target.value as WebAiTaskType)} className="rounded-md border border-input bg-background px-2 py-2 text-sm outline-none">
                        <option value="opening_next_question">开篇问答下一题</option>
                        <option value="novel_draft">整理作品资料</option>
                        <option value="first_chapter">生成第一章</option>
                        <option value="chapter_expand">短画面扩写</option>
                        <option value="chapter_rescue">卡文急救</option>
                      </select>
                    </div>

                    <div className="rounded-md border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
                      <div>当前模式：<span className="font-medium text-foreground">{aiModeLabel}</span></div>
                      <div>当前来源：<span className="font-medium text-foreground">{aiSourceLabel}</span></div>
                      <div>操作：复制 Prompt 到网页 AI，对方只返回 JSON，再粘贴到下方解析。</div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Prompt 预览</span>
                        <button onClick={() => setWebAiPrompt(buildCurrentWebAiPrompt())} className="rounded border border-border px-2 py-1 hover:text-primary">刷新</button>
                      </div>
                      <textarea
                        value={webAiPrompt || buildCurrentWebAiPrompt()}
                        onChange={(event) => setWebAiPrompt(event.target.value)}
                        className="min-h-[170px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs leading-5 outline-none"
                      />
                      <button onClick={() => prepareWebAiPrompt(webAiTaskType)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                        <Copy className="h-4 w-4" /> 复制 Prompt 到 GPT / Gemini
                      </button>
                    </div>

                    <div>
                      <div className="mb-1 text-xs text-muted-foreground">粘贴网页 AI 返回的 JSON</div>
                      <textarea
                        value={webAiRawResponse}
                        onChange={(event) => setWebAiRawResponse(event.target.value)}
                        className="min-h-[150px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs leading-5 outline-none"
                        placeholder='可以直接粘贴 JSON，也可以粘贴包含 ```json 代码块的回答。'
                      />
                      <button onClick={applyWebAiResponse} className="mt-2 w-full rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
                        解析并应用到当前工作区
                      </button>
                    </div>

                    {webAiMessage && <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-5 text-primary">{webAiMessage}</div>}
                    {webAiError && <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">解析失败：{webAiError}</div>}
                  </div>
                </div>
              )}

              {rightTab === 'agent' && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="border-b border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">AI 自动开书</div>
                        <div className="mt-0.5 text-xs leading-5 text-muted-foreground">创建授权后由后端 Agent Workflow 自动生成作品、第一章和可选图谱。</div>
                      </div>
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                      <input
                        value={agentTitle}
                        onChange={(event) => setAgentTitle(event.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                        placeholder="作品标题"
                      />
                      <textarea
                        value={agentIdea}
                        onChange={(event) => setAgentIdea(event.target.value)}
                        className="min-h-[88px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none"
                        placeholder="一句脑洞"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={agentGenre}
                          onChange={(event) => setAgentGenre(event.target.value)}
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                          placeholder="类型"
                        />
                        <input
                          value={agentStyle}
                          onChange={(event) => setAgentStyle(event.target.value)}
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                          placeholder="风格"
                        />
                      </div>
                      <select
                        value={agentRunnerMode}
                        onChange={(event) => setAgentRunnerMode(event.target.value as typeof agentRunnerMode)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                      >
                        <option value="AUTO">自动选择 Runner</option>
                        <option value="FIXED_WORKFLOW">固定 Workflow fallback</option>
                        <option value="RESPONSES_API">OpenAI Responses API 工具调用</option>
                        <option value="AGENTS_SDK">OpenAI Agents SDK 兼容模式</option>
                      </select>
                      <div className="rounded-md border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
                        当前链路：{modelConfig.provider} / {modelConfig.model || '未配置模型'} / Runner {agentRunnerMode}
                        <span className="ml-2 rounded bg-secondary px-1.5 py-0.5">{authToken && !isLocalAccount ? '后端 Agent' : '需要真实账号'}</span>
                      </div>
                      <label className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
                        <span>自动生成第一章</span>
                        <input type="checkbox" checked={agentAutoFirstChapter} onChange={(event) => setAgentAutoFirstChapter(event.target.checked)} className="h-4 w-4 accent-primary" />
                      </label>
                      <label className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
                        <span>自动生成世界观图谱</span>
                        <input type="checkbox" checked={agentAutoStoryGraph} onChange={(event) => setAgentAutoStoryGraph(event.target.checked)} className="h-4 w-4 accent-primary" />
                      </label>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={startAgentNovelCreation}
                        disabled={isAgentRunning}
                        className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        {isAgentRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        {isAgentRunning ? '开书中...' : '授权并开始'}
                      </button>
                      <button
                        onClick={() => refreshAgentTask()}
                        disabled={!agentTask || isAgentRunning}
                        className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
                      >
                        刷新状态
                      </button>
                    </div>

                    {agentTask && (
                      <button
                        onClick={cancelAgentTask}
                        disabled={['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(agentTask.status)}
                        className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-40"
                      >
                        取消任务
                      </button>
                    )}

                    {agentMessage && (
                      <div className={cn('mt-3 rounded-md border px-3 py-2 text-xs leading-5', agentTask?.status === 'FAILED' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-primary/20 bg-primary/5 text-primary')}>
                        {agentMessage}
                      </div>
                    )}

                    {agentTask && (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-md border border-border bg-background p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold">任务状态</div>
                            <span className={cn('rounded-md px-2 py-1 text-xs', agentTask.status === 'SUCCEEDED' ? 'bg-primary/10 text-primary' : agentTask.status === 'FAILED' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground')}>
                              {agentTask.status}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                            <div>Task ID：{agentTask.taskId}</div>
                            {agentTask.result?.novelId && <div>作品：{agentTask.result.novelTitle || agentTask.result.novelId}</div>}
                            {agentTask.result?.chapterTitle && <div>第一章：{agentTask.result.chapterTitle}</div>}
                            {agentTask.result?.storyGraphGenerated !== undefined && <div>图谱：{agentTask.result.storyGraphGenerated ? `${agentTask.result.storyGraphNodeCount || 0} 节点 / ${agentTask.result.storyGraphEdgeCount || 0} 关系` : '未生成'}</div>}
                            {agentTask.result?.runnerMode && <div>Runner：{agentTask.result.runnerMode}</div>}
                          </div>
                          {agentTask.result?.novelId && (
                            <button onClick={() => { setActiveNovelId(agentTask.result.novelId!); setLeftTab('overview') }} className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                              进入创作
                            </button>
                          )}
                        </div>

                        <div className="rounded-md border border-border bg-background p-3">
                          <div className="mb-2 text-sm font-semibold">执行步骤</div>
                          <div className="space-y-2">
                            {agentTask.steps.map((step) => (
                              <div key={step.stepId} className="rounded-md border border-border bg-card px-3 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-medium">{step.stepName}</span>
                                  <span className={cn('rounded px-1.5 py-0.5 text-[11px]', step.status === 'SUCCEEDED' ? 'bg-primary/10 text-primary' : step.status === 'FAILED' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground')}>{step.status}</span>
                                </div>
                                {step.errorMessage && <div className="mt-1 text-[11px] leading-5 text-destructive">{step.errorMessage}</div>}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-md border border-border bg-background p-3">
                          <div className="mb-2 text-sm font-semibold">任务日志</div>
                          <div className="max-h-48 space-y-2 overflow-y-auto">
                            {agentLogs.length ? agentLogs.map((log) => (
                              <div key={log.logId} className="rounded-md bg-card px-3 py-2 text-xs leading-5">
                                <span className={cn('mr-2 font-medium', log.level === 'ERROR' ? 'text-destructive' : log.level === 'WARN' ? 'text-amber-600' : 'text-primary')}>{log.level}</span>
                                <span>{log.message}</span>
                              </div>
                            )) : <div className="text-xs text-muted-foreground">暂无日志，任务返回后会显示。</div>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {rightTab === 'starter' && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="border-b border-border p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">创作向导</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{isGuideContinuation ? '当前章节卡文时，生成下一步方案' : '新书开局时，先搭第一章骨架'}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{starterStep + 1}/{starterQuestions.length}</div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${starterProgress}%` }} />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="mb-4 rounded-md border border-primary/20 bg-primary/5 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-primary">引导式开篇问答</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">动态追问 3-6 题，确认后生成第一章并写入编辑器。</div>
                        </div>
                        <div className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
                          第 {Math.max(1, openingGuideAnsweredCount + (openingGuidePhase === 'questioning' ? 1 : 0))} / {openingGuideTotalSteps} 步
                        </div>
                      </div>
                      <div className={cn('mb-3 rounded-md border px-3 py-2 text-xs leading-5', authToken && !isLocalAccount ? 'border-primary/20 bg-primary/5 text-primary' : hasModelApiKey ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-border bg-background text-muted-foreground')}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">当前链路：{openingGuideRouteLabel}</span>
                          <span className="rounded bg-background/80 px-2 py-0.5">{modelConfig.provider}</span>
                          <span className="rounded bg-background/80 px-2 py-0.5">{configuredModelName}</span>
                        </div>
                        <div className="mt-1">{openingGuideRouteHint}</div>
                      </div>
                      <div className="mb-3 rounded-md border border-primary/20 bg-background px-3 py-2 text-xs leading-5">
                        <div className="font-medium text-foreground">{openingGuideNextAction.title}</div>
                        <div className="mt-1 text-muted-foreground">{openingGuideNextAction.hint}</div>
                      </div>

                      {creativeBrief && (
                        <div className="mb-3 rounded-md border border-primary/20 bg-card p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-foreground">我先这样理解你的故事</div>
                            <span className="rounded bg-primary/10 px-2 py-1 text-[11px] text-primary">创作编排</span>
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">{creativeBrief.assistantMessage}</p>
                          <div className="mt-3 grid gap-2 text-[11px] leading-5 text-muted-foreground">
                            <div className="rounded-md bg-background px-2 py-1"><span className="font-medium text-foreground">标题</span>：{creativeBrief.title}</div>
                            <div className="rounded-md bg-background px-2 py-1"><span className="font-medium text-foreground">题材</span>：{creativeBrief.genre}</div>
                            <div className="rounded-md bg-background px-2 py-1"><span className="font-medium text-foreground">核心钩子</span>：{creativeBrief.coreHook}</div>
                            <div className="rounded-md bg-background px-2 py-1"><span className="font-medium text-foreground">建议开场</span>：{creativeBrief.openingSuggestion}</div>
                            <div className="rounded-md bg-background px-2 py-1"><span className="font-medium text-foreground">为什么这样写</span>：{creativeBrief.whyThisWorks}</div>
                            <div className="rounded-md bg-primary/5 px-2 py-1 text-primary"><span className="font-medium">关键追问</span>：{creativeBrief.keyQuestion}</div>
                          </div>
                          <div className="mt-3 grid gap-2">
                            {creativeBrief.actions.map((item) => (
                              <button
                                key={item.action}
                                disabled={isOpeningGuideLoading || openingGuidePhase === 'generating'}
                                onClick={() => handleCreativeBriefAction(item.action)}
                                className={cn(
                                  'rounded-md border px-3 py-2 text-left text-xs leading-5 disabled:opacity-50',
                                  item.action === 'CONTINUE_ASK'
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-background hover:border-primary hover:text-primary',
                                )}
                              >
                                <span className="block font-medium">{item.label}</span>
                                <span className={cn('block text-[11px]', item.action === 'CONTINUE_ASK' ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{item.hint}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid gap-2">
                        <input
                          value={openingGuideTitle}
                          onChange={(event) => updateOpeningGuideTitleInput(event.target.value)}
                          className="rounded-md border border-input bg-card px-3 py-2 text-sm outline-none"
                          placeholder="作品标题，例如：被退婚少年体内封着上古剑魂"
                        />
                        <textarea
                          value={openingGuideIdea}
                          onChange={(event) => updateOpeningGuideIdeaInput(event.target.value)}
                          className="min-h-[70px] resize-none rounded-md border border-input bg-card px-3 py-2 text-sm leading-6 outline-none"
                          placeholder="一句脑洞，例如：退婚现场众人羞辱主角，主角体内隐藏力量第一次回应。"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={openingGuideGenre}
                            onChange={(event) => updateOpeningGuideGenreInput(event.target.value)}
                            className="rounded-md border border-input bg-card px-3 py-2 text-sm outline-none"
                            placeholder="类型：武侠 / 玄幻 / 系统流 / 女频复仇"
                          />
                          <input
                            value={openingGuideStyle}
                            onChange={(event) => updateOpeningGuideStyleInput(event.target.value)}
                            className="rounded-md border border-input bg-card px-3 py-2 text-sm outline-none"
                            placeholder="风格：热血、逆袭、节奏紧凑"
                          />
                        </div>
                      </div>

                      {openingGuidePhase === 'idle' && (
                        <div className="mt-3 grid gap-2">
                          <button disabled={isOpeningGuideLoading || activeOperation === 'openingQuestion'} onClick={startOpeningGuide} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                            {isOpeningGuideLoading ? '生成中...' : '开始动态追问'}
                          </button>
                          <button onClick={() => prepareWebAiPrompt('opening_next_question')} className="w-full rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
                            用 Web AI 生成追问 Prompt
                          </button>
                        </div>
                      )}

                      {openingGuidePhase === 'questioning' && currentOpeningGuideQuestion && (
                        <div className="mt-3 rounded-md border border-border bg-background p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground">{currentOpeningGuideQuestion.title}</div>
                            <span className={cn('rounded px-2 py-1 text-[11px]', currentOpeningGuideQuestion.source === 'backend' || currentOpeningGuideQuestion.source === 'web' ? 'bg-primary/10 text-primary' : 'bg-amber-50 text-amber-700')}>
                              {currentOpeningGuideQuestion.source === 'backend' ? 'OpeningGuideSkill' : currentOpeningGuideQuestion.source === 'web' ? aiSourceLabel : '本地 fallback'}
                            </span>
                          </div>
                          <div className="mt-2 grid gap-2 text-[11px] leading-5 text-muted-foreground">
                            <div className="rounded-md bg-card px-2 py-1">为什么问：{currentOpeningGuideQuestion.reason || '用于收束开篇信息。'}</div>
                            <div className="rounded-md bg-card px-2 py-1">影响：{currentOpeningGuideQuestion.impact || '开篇结构'}</div>
                          </div>
                          <div className="mt-1 text-sm font-semibold leading-6">{currentOpeningGuideQuestion.prompt}</div>
                          <textarea
                            value={currentOpeningGuideQuestion.answer}
                            onChange={(event) => updateOpeningGuideAnswer(event.target.value)}
                            className="mt-3 min-h-[82px] w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-sm leading-6 outline-none"
                            placeholder={currentOpeningGuideQuestion.placeholder}
                          />
                          <div className="mt-3 grid gap-2">
                            {currentOpeningGuideQuestion.options.map((option) => (
                              <button
                                key={option}
                                onClick={() => updateOpeningGuideAnswer(option)}
                                className={cn('rounded-md border px-3 py-2 text-left text-xs leading-5 hover:border-primary hover:text-primary', currentOpeningGuideQuestion.answer === option ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card')}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button disabled={openingGuideQuestions.length <= 1 || isOpeningGuideLoading} onClick={previousOpeningGuideQuestion} className="flex-1 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40">上一步</button>
                            <button disabled={isOpeningGuideLoading} onClick={skipOpeningGuideQuestion} className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">跳过</button>
                            <button disabled={isOpeningGuideLoading} onClick={nextOpeningGuideStep} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                              {isOpeningGuideLoading ? '生成中...' : openingGuideAnsweredCount >= 3 ? '继续 / 生成草稿' : '下一题'}
                            </button>
                          </div>
                        </div>
                      )}

                      {(openingGuideQuestions.some((question) => question.answer.trim()) || openingGuideDraft) && (
                        <div className="mt-3 rounded-md border border-border bg-background p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="text-xs font-medium text-muted-foreground">已收集信息摘要</div>
                            <span className={cn('rounded px-2 py-1 text-[11px]', generationRoute.usesFallback ? 'bg-amber-50 text-amber-700' : 'bg-primary/10 text-primary')}>
                              {generationRoute.usesFallback ? 'fallback 可继续' : generationRoute.skill}
                            </span>
                          </div>
                          <div className="grid gap-1 text-[11px] leading-5 text-muted-foreground">
                            {openingGuideSummary.map(([label, value]) => (
                              <div key={label} className="flex gap-2 rounded-md bg-card px-2 py-1">
                                <span className="shrink-0 font-medium text-foreground">{label}</span>
                                <span className="line-clamp-2">{value || '待补充'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {openingGuideDraft && (openingGuidePhase === 'draft' || openingGuidePhase === 'generating' || openingGuidePhase === 'done') && (
                        <div className="mt-3 rounded-md border border-border bg-background p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold">作品资料草稿确认</div>
                            <span className={cn('rounded px-2 py-1 text-[11px]', generationRoute.usesFallback ? 'bg-amber-50 text-amber-700' : 'bg-primary/10 text-primary')}>
                              {generationRoute.usesFallback ? '本地规则' : generationRoute.skill}
                            </span>
                          </div>
                          <label className="text-[11px] text-muted-foreground">一句话卖点</label>
                          <textarea
                            value={openingGuideDraft.sellPoint}
                            onChange={(event) => setOpeningGuideDraft((prev) => prev ? { ...prev, sellPoint: event.target.value } : prev)}
                            className="mt-1 min-h-[58px] w-full resize-none rounded-md border border-input bg-card px-2 py-1.5 text-xs leading-5 outline-none"
                          />
                          <label className="mt-2 block text-[11px] text-muted-foreground">全局大纲</label>
                          <textarea
                            value={openingGuideDraft.globalOutline.join('\n')}
                            onChange={(event) => setOpeningGuideDraft((prev) => prev ? { ...prev, globalOutline: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) } : prev)}
                            className="mt-1 min-h-[80px] w-full resize-none rounded-md border border-input bg-card px-2 py-1.5 text-xs leading-5 outline-none"
                          />
                          <button disabled={isOpeningGuideLoading || openingGuidePhase === 'done'} onClick={confirmOpeningGuideAndGenerateChapter} className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                            {openingGuidePhase === 'generating' ? '正在生成第一章...' : openingGuidePhase === 'done' ? '第一章已写入编辑器' : '确认并生成开篇正文'}
                          </button>
                          <button onClick={() => prepareWebAiPrompt('first_chapter')} className="mt-2 w-full rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
                            用 Web AI 生成第一章 Prompt
                          </button>
                          {openingGuidePhase === 'done' && (
                            <div className="mt-2 rounded-md bg-card px-2 py-1 text-[11px] text-muted-foreground">第一章来源：{generationRoute.usesFallback ? '本地第一章生成规则' : generationRoute.skill}</div>
                          )}
                        </div>
                      )}

                      {openingGuideQuestions.length > 0 && (
                        <div className="mt-3 rounded-md border border-border bg-card p-2">
                          <button onClick={() => setShowOpeningGuideHistory((value) => !value)} className="flex w-full items-center justify-between text-[11px] font-medium text-muted-foreground">
                            <span>问答历史（{openingGuideAnsweredCount} 条）</span>
                            <span>{showOpeningGuideHistory ? '收起' : '展开'}</span>
                          </button>
                          {showOpeningGuideHistory && (
                            <div className="mt-2 space-y-1">
                              {openingGuideQuestions.filter((question) => question.answer.trim()).map((question, index) => (
                                <div key={question.id} className="rounded-md bg-background px-2 py-1 text-[11px] leading-5 text-muted-foreground">
                                  {index + 1}. {question.title} / {question.impact || '开篇结构'}：{question.answer}
                                </div>
                              ))}
                              {openingGuideAnsweredCount === 0 && <div className="text-[11px] text-muted-foreground">还没有回答，选择选项或填写自定义回答后会记录在这里。</div>}
                            </div>
                          )}
                        </div>
                      )}

                      {openingGuideError && (
                        <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{openingGuideError}</div>
                      )}
                    </div>

                    <div className="rounded-md border border-border bg-background/90 p-4">
                      <div className="mb-1 text-xs text-muted-foreground">{currentStarterQuestion.title}</div>
                      <h3 className="text-sm font-semibold leading-6">{currentStarterQuestion.prompt}</h3>
                      <textarea
                        value={starterAnswers[currentStarterQuestion.field]}
                        onChange={(event) => updateStarterAnswer(currentStarterQuestion.field, event.target.value)}
                        className="mt-3 min-h-[92px] w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder={currentStarterQuestion.placeholder}
                      />
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {currentStarterChips.map((chip) => (
                          <button
                            key={chip}
                            onClick={() => updateStarterAnswer(currentStarterQuestion.field, chip)}
                            className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        disabled={starterStep === 0}
                        onClick={() => setStarterStep((step) => Math.max(0, step - 1))}
                        className="flex items-center justify-center gap-1 rounded-md border border-border py-2 text-sm disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" /> 上一步
                      </button>
                      <button
                        onClick={() => setStarterStep((step) => Math.min(starterQuestions.length - 1, step + 1))}
                        className="flex items-center justify-center gap-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground"
                      >
                        下一步 <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 rounded-md border border-border bg-background/90 p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> {isGuideContinuation ? '续写蓝图' : '开局蓝图'}</div>
                      <div className="space-y-2 text-xs leading-5 text-muted-foreground">
                        <p>题材：{starterAnswers.genre}</p>
                        <p>情绪：{starterAnswers.tone}</p>
                        <p>钩子：{starterAnswers.hook}</p>
                        <p>开篇：{starterAnswers.opening}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button disabled={activeOperation === 'rescue' || activeOperation === 'firstChapter'} onClick={generateStarter} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                        {activeOperation === 'rescue' ? '生成中...' : activeOperation === 'firstChapter' ? '生成中...' : isGuideContinuation ? '生成方案' : '生成第一章'}
                      </button>
                      <button onClick={applyStarter} disabled={!starterOutput} className="flex-1 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40">{isGuideContinuation ? '追加到章节' : '写入项目'}</button>
                    </div>
                    <button onClick={() => prepareWebAiPrompt(isGuideContinuation ? 'chapter_rescue' : 'first_chapter')} className="mt-2 w-full rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
                      用 Web AI 生成{isGuideContinuation ? '卡文急救' : '第一章'} Prompt
                    </button>

                    {starterOutput && (
                      <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="text-xs font-medium text-primary">生成结果</div>
                          <span className={cn('rounded px-2 py-1 text-[11px]', generationRoute.usesFallback ? 'bg-amber-50 text-amber-700' : 'bg-primary/10 text-primary')}>
                            {generationRoute.usesFallback ? '本地 fallback' : generationRoute.skill}
                          </span>
                        </div>
                        {isGuideContinuation && rescueSolutions.length > 0 && (
                          <div className="mb-3 space-y-2">
                            {rescueSolutions.map((solution, index) => (
                              <div key={`${solution.title}-${index}`} className="rounded-md border border-border bg-background p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="text-sm font-medium">{index + 1}. {solution.title}</div>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{solution.reason}</p>
                                  </div>
                                  <button
                                    onClick={() => insertRescueSolution(solution)}
                                    className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                                  >
                                    插入
                                  </button>
                                </div>
                                <div className="mt-2 rounded bg-secondary/70 px-2 py-1.5 text-xs leading-5 text-secondary-foreground">{solution.conflictHint}</div>
                                <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-6">{solution.continuationText}</p>
                                <div className="mt-2 text-[11px] leading-5 text-muted-foreground">后续建议：{solution.nextPlotSuggestion}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="max-h-[320px] overflow-y-auto whitespace-pre-wrap text-xs leading-6">{starterOutput}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {rightTab === 'copilot' && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex gap-1 border-b border-border p-2">
                    {(['editor', 'partner', 'planner'] as AssistantMode[]).map((mode) => <button key={mode} onClick={() => setAssistantMode(mode)} className={cn('flex-1 rounded-md px-2 py-1.5 text-xs', assistantMode === mode ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>{mode === 'editor' ? '责编' : mode === 'planner' ? '军师' : '搭子'}</button>)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-border p-3">
                    <QuickActionButton label="续写下一段" onClick={() => applyQuickAction('continue')} />
                    <QuickActionButton label="更有画面感" onClick={() => applyQuickAction('visual')} />
                    <QuickActionButton label="加冲突" onClick={() => applyQuickAction('conflict')} />
                    <QuickActionButton label="加反转" onClick={() => applyQuickAction('twist')} />
                    <QuickActionButton label="网文风润色" onClick={() => applyQuickAction('webnovel')} />
                    <QuickActionButton label="检查哪里无聊" onClick={() => applyQuickAction('diagnose')} />
                  </div>
                  <div className="border-b border-border p-3">
                    <button onClick={() => copyCodexTask('rescue')} className="w-full rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10">
                      复制给 Codex 做卡文急救
                    </button>
                    <textarea
                      value={codexResult}
                      onChange={(event) => setCodexResult(event.target.value)}
                      className="mt-2 min-h-[72px] w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-xs leading-5 outline-none"
                      placeholder="把 Codex 返回的下一段粘回来..."
                    />
                    <button onClick={applyCodexResult} disabled={!codexResult.trim()} className="mt-2 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40">
                      写入当前章节
                    </button>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto p-3">
                    {messages.map((message) => <div key={message.id} className={cn('rounded-md p-3 text-sm leading-6', message.role === 'user' ? 'ml-8 bg-primary text-primary-foreground' : 'mr-8 bg-accent')}>{message.content}</div>)}
                  </div>
                  <div className="border-t border-border p-3">
                    <div className="flex gap-2"><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendChat()} className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none" placeholder="问剧情、设定、节奏..." /><button onClick={sendChat} className="rounded-md bg-primary p-2 text-primary-foreground"><Send className="h-4 w-4" /></button></div>
                  </div>
                </div>
              )}

              {rightTab === 'factory' && (
                <div className="space-y-3 overflow-y-auto p-4">
                  <ToolButton icon={Clapperboard} title="一键转短剧" text="竖屏脚本、前 3 秒钩子、分镜动作台词" onClick={() => generateFactory('screenplay')} />
                  <ToolButton icon={RefreshCcw} title="生成记忆摘要" text="写入本章 200 字中期记忆" onClick={() => generateFactory('summary')} />
                  <ToolButton icon={AlertTriangle} title="责编审稿" text="检查节奏、OOC、伏笔遗忘和爽点密度" onClick={() => generateFactory('review')} />
                  <ToolButton icon={Image} title="角色立绘 Prompt" text="根据 Lore 锁定外貌、服饰、气质" onClick={() => setFactoryOutput(lore.filter((item) => item.imagePrompt).map((item) => `${item.name}: ${item.imagePrompt}`).join('\n'))} />
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Wand2 className="h-4 w-4 text-primary" />
                      写作技巧 Agent
                    </div>
                    <select
                      value={selectedWritingSkill}
                      onChange={(event) => setSelectedWritingSkill(event.target.value as WritingSkill)}
                      className="w-full rounded-md border border-input bg-card px-2 py-2 text-sm outline-none"
                    >
                      {Object.entries(writingSkillPrompts).map(([value, skill]) => (
                        <option key={value} value={value}>{skill.label}</option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{writingSkillPrompts[selectedWritingSkill].prompt}</p>
                    <button onClick={applyWritingSkill} className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">注入到 AI 指令</button>
                  </div>
                  {factoryOutput && <div className="rounded-md border border-border bg-background p-3 text-sm leading-6 whitespace-pre-wrap"><div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>输出结果</span><span className={cn('rounded px-2 py-1', generationRoute.usesFallback ? 'bg-amber-50 text-amber-700' : 'bg-primary/10 text-primary')}>{generationRoute.usesFallback ? 'fallback' : generationRoute.skill}</span><Copy className="h-3.5 w-3.5" /></div>{factoryOutput}</div>}
                </div>
              )}

              {rightTab === 'inspector' && (
                <div className="space-y-4 overflow-y-auto p-4 text-sm">
                  <InspectorBlock title="文风层" content={stylePrompt} />
                  <InspectorBlock title="近期记忆" content={recentMemory.join('\n') || '当前章节暂无上一章记忆。'} />
                  <InspectorBlock title="实体召回" content={(promptSnapshot?.entities || matchedLore).map((item) => `${item.name}: ${item.content}`).join('\n') || '暂无匹配设定。'} />
                  <InspectorBlock title="当前指令" content={promptSnapshot?.scene || sceneInput || '等待输入短画面。'} />
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
      )}
    </div>
  )
}

function ToolButton({ icon: Icon, title, text, onClick }: { icon: typeof Sparkles; title: string; text: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full rounded-md border border-border bg-background/90 p-3 text-left transition hover:border-primary/40 hover:bg-accent"><div className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-primary" />{title}<ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" /></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></button>
}

function QuickActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-md border border-border bg-background/90 px-2 py-2 text-xs transition hover:border-primary hover:bg-primary/5 hover:text-primary">{label}</button>
}

function FeatureCard({ icon: Icon, title, text }: { icon: typeof Sparkles; title: string; text: string }) {
  return (
    <div className="rounded-md border border-border bg-card/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/15">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  )
}

function InspectorBlock({ title, content }: { title: string; content: string }) {
  return <section><h3 className="mb-2 text-xs font-medium text-muted-foreground">{title}</h3><div className="rounded-md border border-border bg-background/90 p-3 text-xs leading-5 whitespace-pre-wrap">{content}</div></section>
}
