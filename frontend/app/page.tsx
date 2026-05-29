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
  Sparkles,
  Square,
  Wand2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ChapterStatus = 'draft' | 'published'
type LoreCategory = 'character' | 'location' | 'item' | 'faction'
type RightTab = 'starter' | 'copilot' | 'factory' | 'inspector'
type LeftTab = 'chapters' | 'lore' | 'ideas'
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
}

const novelId = '123e4567-e89b-12d3-a456-426614174000'
const workspaceStorageKey = 'novel-ai-copilot-workspace-v1'

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

export default function Home() {
  const [chapters, setChapters] = useState(initialChapters)
  const [activeChapterId, setActiveChapterId] = useState(initialChapters[0].id)
  const [lore, setLore] = useState(initialLore)
  const [ideas, setIdeas] = useState(initialIdeas)
  const [editingLoreId, setEditingLoreId] = useState<string | null>(null)
  const [loreSearch, setLoreSearch] = useState('')
  const [leftTab, setLeftTab] = useState<LeftTab>('chapters')
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
  const currentStarterQuestion = starterQuestions[starterStep]
  const starterProgress = Math.round(((starterStep + 1) / starterQuestions.length) * 100)

  useEffect(() => {
    try {
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
        if (snapshot.editingLoreId !== undefined) setEditingLoreId(snapshot.editingLoreId)
        if (snapshot.loreSearch !== undefined) setLoreSearch(snapshot.loreSearch)
        if (snapshot.leftTab) setLeftTab(snapshot.leftTab)
        if (snapshot.rightTab) setRightTab(snapshot.rightTab)
        if (snapshot.sceneInput !== undefined) setSceneInput(snapshot.sceneInput)
        if (typeof snapshot.starterStep === 'number') setStarterStep(snapshot.starterStep)
        if (snapshot.starterAnswers) setStarterAnswers({ ...initialStarterAnswers, ...snapshot.starterAnswers })
        if (snapshot.selectedWritingSkill) setSelectedWritingSkill(snapshot.selectedWritingSkill)
      }
    } catch {
      window.localStorage.removeItem(workspaceStorageKey)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    const snapshot: WorkspaceSnapshot = {
      chapters,
      activeChapterId,
      lore,
      ideas,
      editingLoreId,
      loreSearch,
      leftTab,
      rightTab,
      sceneInput,
      starterStep,
      starterAnswers,
      selectedWritingSkill,
    }
    window.localStorage.setItem(workspaceStorageKey, JSON.stringify(snapshot))
  }, [activeChapterId, chapters, editingLoreId, ideas, isHydrated, leftTab, lore, loreSearch, rightTab, sceneInput, selectedWritingSkill, starterAnswers, starterStep])

  const updateActiveChapter = (patch: Partial<Chapter>) => {
    setChapters((prev) => prev.map((chapter) => (chapter.id === activeChapter.id ? { ...chapter, ...patch } : chapter)))
    setSaveState('dirty')
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
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ novelId, targetChapterNumber: activeChapter.number + 1, sceneDescription: sceneInput }),
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

  const handleSave = () => setSaveState('saved')

  const resetWorkspace = () => {
    window.localStorage.removeItem(workspaceStorageKey)
    setChapters(initialChapters)
    setActiveChapterId(initialChapters[0].id)
    setLore(initialLore)
    setIdeas(initialIdeas)
    setEditingLoreId(null)
    setLoreSearch('')
    setLeftTab('chapters')
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

  const addChapter = () => {
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
    setChapters((prev) => [...prev, newChapter])
    setActiveChapterId(newChapter.id)
  }

  const removeChapter = (chapterId: string) => {
    if (chapters.length <= 1) return
    const nextChapters = chapters
      .filter((chapter) => chapter.id !== chapterId)
      .map((chapter, index) => ({ ...chapter, number: index + 1 }))

    setChapters(nextChapters)
    if (activeChapterId === chapterId) {
      setActiveChapterId(nextChapters[0].id)
    }
    setSaveState('dirty')
  }

  const addLore = () => {
    const next: LoreItem = {
      id: `lore-${Date.now()}`,
      category: 'character',
      name: '新角色',
      tags: ['待完善'],
      content: '补充角色身份、欲望、恐惧、与主线的关系。',
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

  const removeLore = (loreId: string) => {
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
    const opening = createStarterOpening(starterAnswers)
    const plan = createStarterPlan(starterAnswers)
    setStarterOutput(`${opening}\n\n---\n后三章推进：\n${plan.map((item, index) => `${index + 1}. ${item}`).join('\n')}`)
  }

  const applyStarter = () => {
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
    setIdeas((prev) => [starterAnswers.hook, starterAnswers.opening, ...plan, ...prev])
    setSceneInput(starterAnswers.opening)
    setLeftTab('chapters')
    setSaveState('dirty')
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="flex h-full min-w-0">
        <aside className={cn('h-full border-r border-border bg-card transition-all duration-200', leftOpen ? 'w-[280px]' : 'w-14')}>
          <div className="flex h-14 items-center justify-between border-b border-border px-3">
            {leftOpen && (
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4 text-primary" /> 仙途漫漫</div>
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

        <main className="flex min-w-0 flex-1 flex-col bg-background">
          <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
            <div className="min-w-0 flex-1">
              <input value={activeChapter.title} onChange={(event) => updateActiveChapter({ title: event.target.value })} className="w-full bg-transparent text-sm font-semibold outline-none" />
              <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground"><span>{countWords(activeChapter.content)} 字</span><span>{activeChapter.status === 'published' ? '已发布' : '草稿'}</span><span>{saveState === 'saved' ? '已保存' : '有改动'}</span></div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleGenerate} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-primary" title="AI 扩写"><Sparkles className="h-4 w-4" /></button>
              <button onClick={handleSave} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" title="保存"><Save className="h-4 w-4" /></button>
              <button onClick={resetWorkspace} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" title="重置示例项目"><RefreshCcw className="h-4 w-4" /></button>
              <button onClick={() => updateActiveChapter({ status: 'published' })} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" title="发布"><Check className="h-4 w-4" /></button>
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
              }} className="min-h-[52vh] w-full resize-none rounded-none border-0 bg-transparent text-[16px] leading-8 outline-none" placeholder="从一个短画面开始，或输入 /ai 唤醒扩写..." />

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

        <aside className={cn('h-full border-l border-border bg-card transition-all duration-200', rightOpen ? 'w-[340px]' : 'w-14')}>
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
                  ['starter', PenLine, '开局'],
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
                      <div className="text-sm font-semibold">新书开局向导</div>
                      <div className="text-xs text-muted-foreground">{starterStep + 1}/{starterQuestions.length}</div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${starterProgress}%` }} />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="rounded-md border border-border bg-background p-4">
                      <div className="mb-1 text-xs text-muted-foreground">{currentStarterQuestion.title}</div>
                      <h3 className="text-sm font-semibold leading-6">{currentStarterQuestion.prompt}</h3>
                      <textarea
                        value={starterAnswers[currentStarterQuestion.field]}
                        onChange={(event) => updateStarterAnswer(currentStarterQuestion.field, event.target.value)}
                        className="mt-3 min-h-[92px] w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder={currentStarterQuestion.placeholder}
                      />
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {currentStarterQuestion.chips.map((chip) => (
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

                    <div className="mt-4 rounded-md border border-border bg-background p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> 开局蓝图</div>
                      <div className="space-y-2 text-xs leading-5 text-muted-foreground">
                        <p>题材：{starterAnswers.genre}</p>
                        <p>情绪：{starterAnswers.tone}</p>
                        <p>钩子：{starterAnswers.hook}</p>
                        <p>开篇：{starterAnswers.opening}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button onClick={generateStarter} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">生成第一章</button>
                      <button onClick={applyStarter} disabled={!starterOutput} className="flex-1 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40">写入项目</button>
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
    </div>
  )
}

function ToolButton({ icon: Icon, title, text, onClick }: { icon: typeof Sparkles; title: string; text: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full rounded-md border border-border bg-background p-3 text-left hover:border-primary/40 hover:bg-accent"><div className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-primary" />{title}<ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" /></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></button>
}

function InspectorBlock({ title, content }: { title: string; content: string }) {
  return <section><h3 className="mb-2 text-xs font-medium text-muted-foreground">{title}</h3><div className="rounded-md border border-border bg-background p-3 text-xs leading-5 whitespace-pre-wrap">{content}</div></section>
}
