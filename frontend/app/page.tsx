'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

type ChapterStatus = 'draft' | 'published'
type LoreCategory = 'character' | 'location' | 'item' | 'faction'
type RightTab = 'starter' | 'copilot' | 'factory' | 'inspector'
type LeftTab = 'overview' | 'chapters' | 'lore' | 'ideas'
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

interface StarterQuestion {
  field: StarterField
  title: string
  prompt: string
  placeholder: string
  chips: string[]
}

type StarterAnswers = Record<StarterField, string>

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
  selectedWritingSkill: WritingSkill
  modelConfig?: ModelConfig
  storyProfile?: StoryProfile
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
  const genre = /退婚|宗门|剑|修仙|灵根|仙|玄/.test(normalized)
    ? '东方玄幻'
    : /末日|诡|规则|无限|副本/.test(normalized)
      ? '悬疑无限流'
      : /都市|异能|校花|公司/.test(normalized)
        ? '都市异能'
        : current.genre
  const tone = /打脸|反杀|复仇|羞辱/.test(normalized) ? '压抑后反杀' : current.tone
  const hook = normalized || current.hook
  const protagonist = normalized
    ? `主角来自这条脑洞：${normalized}。他需要一个明确欲望、一个被压迫处境，以及一个暂时不能公开的秘密。`
    : current.protagonist
  const world = /宗门|灵根|修仙|剑/.test(normalized)
    ? '宗门、血脉、天赋等级或禁忌规则制造压迫，主角需要在不公平规则里找到破局点。'
    : current.world
  const opening = /退婚/.test(normalized)
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
    throw new Error(`Request failed: ${response.status}`)
  }

  const result = await response.json() as ApiResult<T>
  if (result.code !== 200) {
    throw new Error(result.message || 'Request failed')
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
  const [chapters, setChapters] = useState(initialChapters)
  const [activeChapterId, setActiveChapterId] = useState(initialChapters[0].id)
  const [lore, setLore] = useState(initialLore)
  const [ideas, setIdeas] = useState(initialIdeas)
  const [storyProfile, setStoryProfile] = useState<StoryProfile>(initialStoryProfile)
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
  const [isHydrated, setIsHydrated] = useState(false)
  const [selectedWritingSkill, setSelectedWritingSkill] = useState<WritingSkill>('suspense')
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [novels, setNovels] = useState<BackendNovel[]>([])
  const [activeNovelId, setActiveNovelId] = useState<string | null>(null)
  const [newNovelTitle, setNewNovelTitle] = useState('新的长篇小说')
  const [newNovelIdea, setNewNovelIdea] = useState('')
  const [syncState, setSyncState] = useState<'local' | 'syncing' | 'synced' | 'error'>('local')
  const [syncMessage, setSyncMessage] = useState('本地原型模式')
  const [showIdeaStart, setShowIdeaStart] = useState(true)
  const [rawIdea, setRawIdea] = useState('被退婚少年体内封着上古剑魂，第一章想打脸未婚妻家族')
  const [ideaBlueprint, setIdeaBlueprint] = useState('')
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  const [showModelPanel, setShowModelPanel] = useState(false)
  const [modelConfig, setModelConfig] = useState<ModelConfig>(defaultModelConfig)
  const [modelTestResult, setModelTestResult] = useState('')
  const [codexTask, setCodexTask] = useState('')
  const [codexResult, setCodexResult] = useState('')
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
  const currentNovelId = activeNovelId || novelId
  const currentNovelTitle = novels.find((item) => item.id === activeNovelId)?.title || '未命名作品'
  const currentStarterChips = useMemo(() => getDynamicStarterChips(currentStarterQuestion, starterAnswers, activeChapter), [activeChapter, currentStarterQuestion, starterAnswers])
  const isGuideContinuation = activeChapter.number > 1 || countWords(activeChapter.content) > 120
  const isLocalAccount = isLocalAuthToken(authToken)

  const restoreWorkspaceSnapshot = (snapshot: Partial<WorkspaceSnapshot> | null) => {
    const restoredChapters = snapshot?.chapters?.length ? snapshot.chapters : [createBlankChapter()]
    const restoredActiveId = restoredChapters.some((chapter) => chapter.id === snapshot?.activeChapterId)
      ? snapshot!.activeChapterId!
      : restoredChapters[0].id

    setChapters(restoredChapters)
    setActiveChapterId(restoredActiveId)
    setLore(snapshot?.lore || [])
    setIdeas(snapshot?.ideas || [])
    setStoryProfile(snapshot?.storyProfile || createStoryProfile(currentNovelTitle, snapshot?.starterAnswers ? { ...initialStarterAnswers, ...snapshot.starterAnswers } : starterAnswers, snapshot?.sceneInput || ''))
    setEditingLoreId(snapshot?.editingLoreId ?? null)
    setLoreSearch(snapshot?.loreSearch || '')
    if (snapshot?.leftTab) setLeftTab(snapshot.leftTab)
    if (snapshot?.rightTab) setRightTab(snapshot.rightTab)
    if (snapshot?.sceneInput !== undefined) setSceneInput(snapshot.sceneInput)
    if (typeof snapshot?.starterStep === 'number') setStarterStep(snapshot.starterStep)
    if (snapshot?.starterAnswers) setStarterAnswers({ ...initialStarterAnswers, ...snapshot.starterAnswers })
    if (snapshot?.selectedWritingSkill) setSelectedWritingSkill(snapshot.selectedWritingSkill)
    if (snapshot?.modelConfig) setModelConfig({ ...defaultModelConfig, ...snapshot.modelConfig, apiKey: '' })
  }

  const createWorkspaceSnapshot = (): WorkspaceSnapshot => ({
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
        if (snapshot.editingLoreId !== undefined) setEditingLoreId(snapshot.editingLoreId)
        if (snapshot.loreSearch !== undefined) setLoreSearch(snapshot.loreSearch)
        if (snapshot.leftTab) setLeftTab(snapshot.leftTab)
        if (snapshot.rightTab) setRightTab(snapshot.rightTab)
        if (snapshot.sceneInput !== undefined) setSceneInput(snapshot.sceneInput)
        if (typeof snapshot.starterStep === 'number') setStarterStep(snapshot.starterStep)
        if (snapshot.starterAnswers) setStarterAnswers({ ...initialStarterAnswers, ...snapshot.starterAnswers })
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
        setSyncState(loadedNovels.length ? 'synced' : 'local')
        setSyncMessage(loadedNovels.length ? '后端已连接' : '登录成功，请新建作品')
      } catch (error) {
        setSyncState('error')
        setSyncMessage('后端暂不可用，继续使用本地数据')
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
        setSyncState('synced')
        setSyncMessage('章节和设定已同步')
      } catch (error) {
        setSyncState('error')
        setSyncMessage('同步失败，保留本地数据')
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
      selectedWritingSkill,
      modelConfig: { ...modelConfig, apiKey: '' },
    }
    window.localStorage.setItem(workspaceStorageKey, JSON.stringify(snapshot))
    if (isLocalAccount && currentUser && activeNovelId) {
      window.localStorage.setItem(localWorkspaceStorageKey(currentUser, activeNovelId), JSON.stringify(snapshot))
      window.localStorage.setItem(localActiveNovelStorageKey(currentUser), activeNovelId)
    }
  }, [activeChapterId, activeNovelId, authToken, chapters, currentUser, editingLoreId, ideas, isHydrated, leftTab, lore, loreSearch, modelConfig, rightTab, sceneInput, selectedWritingSkill, starterAnswers, starterStep, storyProfile])

  useEffect(() => {
    if (!isHydrated || !isLocalAccount || !currentUser) return
    window.localStorage.setItem(localNovelsStorageKey(currentUser), JSON.stringify(novels))
  }, [authToken, currentUser, isHydrated, novels])

  const updateActiveChapter = (patch: Partial<Chapter>) => {
    setChapters((prev) => prev.map((chapter) => (chapter.id === activeChapter.id ? { ...chapter, ...patch } : chapter)))
    setSaveState('dirty')
  }

  const updateStoryProfile = (patch: Partial<StoryProfile>) => {
    setStoryProfile((prev) => ({ ...prev, ...patch }))
    setSaveState('dirty')
  }

  const startFreshWorkspace = (title: string, seedIdea = rawIdea, seedAnswers?: StarterAnswers) => {
    const idea = seedIdea.trim() || rawIdea
    const answers = seedAnswers || inferStarterAnswersFromIdea(idea, starterAnswers)
    const firstChapter = createBlankChapter('第一章：开篇')
    const profile = createStoryProfile(title, answers, idea)
    const starterLore = createStarterLore(title, profile)
    const freshSnapshot: WorkspaceSnapshot = {
      chapters: [firstChapter],
      activeChapterId: firstChapter.id,
      lore: starterLore,
      ideas: idea ? [idea] : [],
      storyProfile: profile,
      editingLoreId: null,
      loreSearch: '',
      leftTab: 'overview',
      rightTab: 'starter',
      sceneInput: answers.opening || `${title}的第一章核心画面`,
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

  const handleAuth = async (mode: 'login' | 'register') => {
    if (!username.trim() || !password.trim()) {
      setSyncState('error')
      setSyncMessage('请输入用户名和密码')
      return
    }

    const cleanUsername = username.trim()
    setSyncState('syncing')
    setSyncMessage(mode === 'login' ? '正在登录' : '正在注册')
    try {
      const auth = await apiRequest<AuthPayload>(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ username: cleanUsername, password }),
      })
      setAuthToken(auth.token)
      setCurrentUser(auth.username)
      window.localStorage.setItem(authStorageKey, JSON.stringify(auth))
      setSyncState('synced')
      setSyncMessage('账号已连接')
    } catch (error) {
      const accounts = readLocalAccounts()
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
        setSyncMessage(localNovels.length ? '后端未连接，已读取本地作品' : '后端未连接，已创建本地账号')
        return
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
        setSyncMessage(localNovels.length ? '已读取本地作品' : '已登录本地账号，请新建作品')
        return
      }

      setSyncState('error')
      setSyncMessage('认证失败；后端未连接，本地账号也不存在')
    }
  }

  const logout = () => {
    window.localStorage.removeItem(authStorageKey)
    setAuthToken(null)
    setCurrentUser(null)
    setNovels([])
    setActiveNovelId(null)
    setSyncState('local')
    setSyncMessage('已切回本地原型模式')
  }

  const createNovel = async () => {
    if (!authToken || !newNovelTitle.trim()) return
    const title = newNovelTitle.trim()
    const seedIdea = newNovelIdea.trim() || rawIdea.trim()
    const seedAnswers = inferStarterAnswersFromIdea(seedIdea, starterAnswers)
    if (isLocalAccount) {
      persistLocalWorkspace()
      const localNovel: BackendNovel = {
        id: `local-novel-${Date.now()}`,
        title,
        globalOutline: createStarterSummary(seedAnswers),
        authorStylePrompt: stylePrompt,
      }
      const nextNovels = [...novels, localNovel]
      setNovels(nextNovels)
      setActiveNovelId(localNovel.id)
      const freshSnapshot = startFreshWorkspace(localNovel.title, seedIdea, seedAnswers)
      if (currentUser) {
        window.localStorage.setItem(localNovelsStorageKey(currentUser), JSON.stringify(nextNovels))
        window.localStorage.setItem(localActiveNovelStorageKey(currentUser), localNovel.id)
        window.localStorage.setItem(localWorkspaceStorageKey(currentUser, localNovel.id), JSON.stringify(freshSnapshot))
      }
      setSyncState('local')
      setSyncMessage('本地作品已创建')
      setNewNovelIdea('')
      return
    }

    setSyncState('syncing')
    setSyncMessage('正在新建作品')
    try {
      const created = await apiRequest<BackendNovel>('/api/novel', {
        method: 'POST',
        body: JSON.stringify({
          title,
          globalOutline: createStarterSummary(seedAnswers),
          authorStylePrompt: stylePrompt,
        }),
      }, authToken)
      setNovels((prev) => [created, ...prev.filter((item) => item.id !== created.id)])
      setActiveNovelId(created.id)
      startFreshWorkspace(created.title, seedIdea, seedAnswers)
      setSyncState('synced')
      setSyncMessage('作品已创建')
      setNewNovelIdea('')
    } catch (error) {
      setSyncState('error')
      setSyncMessage('新建失败，请检查后端和数据库')
    }
  }

  const organizeIdea = () => {
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
    updateActiveChapter({ content: `${activeChapter.content.trim()}\n\n${codexResult.trim()}`.trim() })
    setCodexResult('')
    setShowIdeaStart(false)
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
    if (isLocalAccount) {
      setModelConfig((prev) => ({ ...prev, apiKeyConfigured: Boolean(prev.apiKey.trim()) || prev.apiKeyConfigured, apiKey: '' }))
      setSyncState('local')
      setSyncMessage('模型配置已保存到本地账号')
      return
    }

    if (!authToken) {
      setSyncState('error')
      setSyncMessage('请先开启云同步，再保存模型配置')
      setShowSyncPanel(true)
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
      setSyncState('synced')
      setSyncMessage('模型配置已保存')
    } catch (error) {
      setSyncState('error')
      setSyncMessage('模型配置保存失败')
    }
  }

  const testModelConfig = async () => {
    if (!modelConfig.apiKey.trim() && !modelConfig.apiKeyConfigured) {
      setSyncState('error')
      setModelTestResult('请先输入 API Key，再测试连接')
      setSyncMessage('缺少模型 API Key')
      return
    }

    setModelTestResult('测试中...')
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
      setSyncMessage(isFailed ? '模型测试失败' : '模型连接成功')
    } catch (error) {
      setModelTestResult('测试失败：请确认后端已启动，并检查 Base URL、模型名和 API Key')
      setSyncState('error')
      setSyncMessage('模型测试失败')
    }
  }

  const handleGenerate = async () => {
    if (!sceneInput.trim() || isGenerating) return
    setGeneratedText('')
    setIsGenerating(true)
    setPromptSnapshot({ style: stylePrompt, memory: recentMemory, entities: matchedLore, scene: sceneInput })

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/novel/expand-scene', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken || ''}`,
        },
        body: JSON.stringify({ novelId: currentNovelId, targetChapterNumber: activeChapter.number + 1, sceneDescription: sceneInput }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error('backend unavailable')
      await readStream(response, (chunk) => setGeneratedText((prev) => prev + chunk))
    } catch (error) {
      if (controller.signal.aborted) return
      const fallback = createLocalExpansion(sceneInput, activeChapter, matchedLore)
      for (let index = 0; index < fallback.length; index += 14) {
        if (controller.signal.aborted) break
        await new Promise((resolve) => setTimeout(resolve, 18))
        setGeneratedText((prev) => prev + fallback.slice(index, index + 14))
      }
    } finally {
      setIsGenerating(false)
      abortRef.current = null
    }
  }

  const stopGenerate = () => abortRef.current?.abort()

  const insertGenerated = () => {
    if (!generatedText.trim()) return
    updateActiveChapter({ content: `${activeChapter.content.trim()}\n${generatedText}`.trim() })
    setGeneratedText('')
  }

  const handleSave = async () => {
    if (!authToken || !activeNovelId) {
      setSaveState('saved')
      setSyncState('local')
      setSyncMessage('已保存到浏览器本地')
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
    } catch (error) {
      setSyncState('error')
      setSyncMessage('保存失败，已保留本地草稿')
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
    setChapters(initialChapters)
    setActiveChapterId(initialChapters[0].id)
    setLore(initialLore)
    setIdeas(initialIdeas)
    setStoryProfile(initialStoryProfile)
    setEditingLoreId(null)
    setLoreSearch('')
    setLeftTab('overview')
    setRightTab('starter')
    setSceneInput('林青云在雨夜客栈被黑衣人逼问玉佩来历，玉佩突然与玄天剑残片共鸣')
    setGeneratedText('')
    setSelectionText('')
    setFactoryOutput('')
    setPromptSnapshot(null)
    setStarterStep(0)
    setStarterAnswers(initialStarterAnswers)
    setStarterOutput('')
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
    if (!authToken || !activeNovelId || !isUuid(item.id)) return
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
      setSyncState('error')
      setSyncMessage('设定保存失败，已保留本地编辑')
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
  }

  const removeIdea = (targetIndex: number) => {
    setIdeas((prev) => prev.filter((_, index) => index !== targetIndex))
  }

  const applySelectionTool = (tool: 'polish' | 'expand' | 'rewrite') => {
    if (!selectionText.trim()) return
    const labels = { polish: '润色', expand: '扩写细节', rewrite: '重写' }
    setSceneInput(`${labels[tool]}这段文字：${selectionText}`)
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

  const generateStarter = () => {
    if (isGuideContinuation) {
      setStarterOutput(createGuideOutput(starterAnswers, activeChapter, matchedLore))
      return
    }

    const opening = createStarterOpening(starterAnswers)
    const plan = createStarterPlan(starterAnswers)
    setStarterOutput(`${opening}\n\n---\n后三章推进：\n${plan.map((item, index) => `${index + 1}. ${item}`).join('\n')}`)
  }

  const applyStarter = () => {
    if (isGuideContinuation) {
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
      <div className="flex min-h-[56px] items-center gap-3 border-b border-border/80 bg-card/95 px-5 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2 pr-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">NovelAI Copilot</div>
            <div className="text-[11px] text-muted-foreground">脑洞到章节的网文创作教练</div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {!showIdeaStart && (
            <button onClick={() => setShowIdeaStart(true)} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
              新脑洞
            </button>
          )}
          <button onClick={() => setShowModelPanel((value) => !value)} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
            <Settings2 className="h-4 w-4" /> 模型
          </button>
          <button onClick={() => setShowSyncPanel((value) => !value)} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
            {isLocalAccount ? '本地账号' : authToken ? '已同步' : '同步'}
          </button>
          {authToken && (
            <>
              <span className="shrink-0 text-xs text-muted-foreground">{isLocalAccount ? '本地账号' : '账号'}：{currentUser}</span>
              <select
                value={activeNovelId || ''}
                onChange={(event) => {
                  const nextId = event.target.value || null
                  if (isLocalAccount) {
                    switchLocalNovel(nextId)
                    return
                  }
                  setActiveNovelId(nextId)
                }}
                className="min-w-[180px] rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none"
              >
                {novels.length === 0 && <option value="">暂无作品</option>}
                {novels.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <input
                value={newNovelTitle}
                onChange={(event) => setNewNovelTitle(event.target.value)}
                className="w-[150px] rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none"
                placeholder="新作品标题"
              />
              <input
                value={newNovelIdea}
                onChange={(event) => setNewNovelIdea(event.target.value)}
                className="w-[240px] rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none"
                placeholder="一句脑洞，可留空沿用首页灵感"
              />
              <button onClick={createNovel} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">新建作品</button>
              <button onClick={logout} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">退出</button>
            </>
          )}
        </div>
        <div className={cn('rounded-md px-2 py-1 text-xs', syncState === 'error' ? 'bg-destructive/10 text-destructive' : syncState === 'synced' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground')}>
          {syncState === 'syncing' ? '同步中...' : syncMessage}
        </div>
      </div>
      {(showSyncPanel || showModelPanel) && (
        <div className="grid gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:grid-cols-2">
          {showSyncPanel && (
            <div className="rounded-md border border-border bg-card p-3">
              <div className="mb-2 text-sm font-medium">账号与同步</div>
              <div className="flex flex-wrap gap-2">
                <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-[150px] rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none" placeholder="用户名" />
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="w-[150px] rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none" placeholder="密码" />
                <button onClick={() => handleAuth('login')} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">登录</button>
                <button onClick={() => handleAuth('register')} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">注册</button>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">后端未连接时会自动使用浏览器本地账号，方便先体验创作流程；后端启动后会优先连接真实账号。</p>
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
                  <button onClick={testModelConfig} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">测试连接</button>
                  <button onClick={saveModelConfig} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">保存模型配置</button>
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
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-foreground">有脑洞，不会写？先把脑子里的画面说出来。</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                从一句灵感开始，拆出故事骨架、黄金第一章、后续推进，再进入工作台续写、润色、救卡文。
              </p>
            </div>

            <div className="paper-panel rounded-md border border-border bg-card p-4 shadow-sm">
              <textarea
                value={rawIdea}
                onChange={(event) => setRawIdea(event.target.value)}
                className="min-h-[160px] w-full resize-none border-0 bg-transparent text-[17px] leading-8 outline-none"
                placeholder="例：被退婚少年体内封着上古剑魂，第一章想打脸未婚妻家族。"
              />
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <button onClick={organizeIdea} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">整理成故事</button>
                <button onClick={generateChapterFromIdea} className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary">生成第一章草稿</button>
                <button onClick={() => { setRightTab('starter'); setShowIdeaStart(false) }} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">进入问答向导</button>
                <button onClick={() => setShowIdeaStart(false)} className="ml-auto rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">继续上次创作</button>
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
              <div className="grid grid-cols-4 border-b border-border text-sm">
                {[
                  ['overview', BookOpen, '总览'],
                  ['chapters', ListTree, '章节'],
                  ['lore', Brain, '设定'],
                  ['ideas', Flame, '灵感'],
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
                                onClick={() => saveLore(item)}
                                className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                              >
                                保存设定
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
                        <button onClick={() => setSceneInput(idea)} className="min-w-0 flex-1 text-left text-sm leading-5">
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
              <button onClick={handleGenerate} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-primary" title="AI 扩写"><Sparkles className="h-4 w-4" /></button>
              <button onClick={handleSave} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" title="保存"><Save className="h-4 w-4" /></button>
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
                  <button onClick={isGenerating ? stopGenerate : handleGenerate} className={cn('flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-primary-foreground', isGenerating ? 'bg-destructive' : 'bg-primary hover:bg-primary/90')}>
                    {isGenerating ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}{isGenerating ? '中止' : '生成'}
                  </button>
                </div>
                {generatedText && (
                  <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4">
                    <div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-medium text-primary">{isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}AI 正文草稿</span><button disabled={isGenerating} onClick={insertGenerated} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">插入正文</button></div>
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
              <div className="grid grid-cols-4 border-b border-border text-sm">
                {[
                  ['starter', PenLine, '向导'],
                  ['copilot', MessageSquare, '伴写'],
                  ['factory', Clapperboard, '衍生'],
                  ['inspector', FileText, 'Prompt'],
                ].map(([tab, Icon, label]) => {
                  const TypedIcon = Icon as typeof MessageSquare
                  return <button key={tab as string} onClick={() => setRightTab(tab as RightTab)} className={cn('flex items-center justify-center gap-1.5 py-2.5 text-muted-foreground hover:text-foreground', rightTab === tab && 'border-b-2 border-primary text-primary')}><TypedIcon className="h-4 w-4" />{label as string}</button>
                })}
              </div>

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
                      <button onClick={generateStarter} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">{isGuideContinuation ? '生成方案' : '生成第一章'}</button>
                      <button onClick={applyStarter} disabled={!starterOutput} className="flex-1 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40">{isGuideContinuation ? '追加到章节' : '写入项目'}</button>
                    </div>

                    {starterOutput && (
                      <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3">
                        <div className="mb-2 text-xs font-medium text-primary">生成结果</div>
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
                  {factoryOutput && <div className="rounded-md border border-border bg-background p-3 text-sm leading-6 whitespace-pre-wrap"><div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>输出结果</span><Copy className="h-3.5 w-3.5" /></div>{factoryOutput}</div>}
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
