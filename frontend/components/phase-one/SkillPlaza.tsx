'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  Clipboard,
  Eye,
  FileText,
  Filter,
  Globe2,
  Heart,
  Layers,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Wand2,
  X,
} from 'lucide-react'
import type { ParsedWorkResult, SkillCategory, SkillTemplate } from './types'
import { cn } from '@/lib/utils'

const categoryLabels: Record<SkillCategory | 'all', string> = {
  all: '全部',
  opening: '开书',
  outline: '大纲',
  chapter: '章节',
  character: '人物',
  world: '世界观',
  check: '检查',
  polish: '润色',
}

const categoryIcons: Record<SkillCategory, typeof BookOpen> = {
  opening: BookOpen,
  outline: Layers,
  chapter: FileText,
  character: UserRound,
  world: Globe2,
  check: ShieldCheck,
  polish: PenLine,
}

const skillTemplates: SkillTemplate[] = [
  {
    id: 'golden-first-chapter',
    title: '黄金第一章',
    category: 'opening',
    summary: '一键生成引人入胜、信息完整的小说第一章，快速抓住读者眼球。',
    description: '根据作品资料、主角设定、当前脑洞与章节目标，生成结构完整、开篇吸引、伏笔埋设合理的第一章草稿。',
    inputRequirements: ['作品名称、题材与基调', '主角姓名、身份、目标', '当前脑洞或开篇钩子', '本章想达成的章节目标'],
    outputContent: ['作品标题', '题材与核心卖点', '人物设定摘要', '第一章正文', '本章摘要', '下一章建议'],
    tags: ['开书', '第一章', '强钩子'],
    models: ['ChatGPT', 'DeepSeek', 'Gemini', '通用'],
    promptLength: 1326,
    usageCount: '128.7w',
    favoriteCount: '8.2w',
    featured: true,
    prompt: `你是中文长篇小说开书编辑。请根据作品资料、主角设定、当前脑洞与章节目标，生成一章信息完整、开篇吸引、伏笔合理的第一章。

【输入资料】
- 作品资料：请填入作品名、题材、背景设定、世界观简介
- 主角设定：请填入主角姓名、身份、性格、目标、当前困境
- 当前脑洞：请填入核心创意、开篇钩子、冲突或转折点
- 章节目标：请填入本章要达成的剧情节点

【输出格式】
作品标题：
题材：
核心卖点：
主角设定：
第一章标题：
第一章正文：
本章摘要：
新增伏笔：
下一章建议：`,
    sampleResult: '作品标题：星海尽头的回声\n题材：科幻 / 成长\n核心卖点：少年在竞赛夜发现旧日信号，卷入被隐藏的星舰计划。\n主角设定：林澈，17 岁，冷静但不服输。\n第一章标题：第一章：夜校里的旧信号\n第一章正文：夜色压在教学楼顶，林澈听见耳机里传来一段不属于这个时代的电流声...\n本章摘要：主角在竞赛前夜发现异常信号，并与旧识重逢。\n新增伏笔：耳机里的编号、旧实验室门牌。\n下一章建议：让主角追查信号来源，并第一次触碰隐藏计划。',
  },
  {
    id: 'outline-builder',
    title: '黄金大纲生成器',
    category: 'outline',
    summary: '3 步生成完整卷大纲，适合开书前快速定主线。',
    description: '把一句脑洞扩展为主线、阶段目标、关键反转和章节推进节奏。',
    inputRequirements: ['一句脑洞', '主角目标', '题材类型', '预期篇幅'],
    outputContent: ['故事主线', '分卷结构', '关键冲突', '章节推进表'],
    tags: ['大纲', '结构', '开书'],
    models: ['ChatGPT', 'DeepSeek', '通用'],
    promptLength: 1180,
    usageCount: '96.3w',
    favoriteCount: '6.5w',
    prompt: '请把以下一句脑洞扩展为长篇小说大纲，输出主线、分卷、关键反转、章节推进表和下一步写作建议。',
    sampleResult: '作品标题：逆光之城\n题材：都市奇幻\n核心卖点：普通少年发现城市夜晚会重置，只有他保留记忆。\n主角设定：许明，外卖员，记忆力异常。\n第一章标题：第一章：第十三次零点\n第一章正文：零点的钟声响起时，整座城的灯同时熄灭...\n本章摘要：主角发现城市重置规则，并第一次救下陌生女孩。\n新增伏笔：不会重置的旧硬币。\n下一章建议：揭示另一个记得重置的人。',
  },
  {
    id: 'chapter-rescue',
    title: '卡文急救',
    category: 'chapter',
    summary: '当剧情卡壳时，提供多种续写方向、冲突推进与转折建议。',
    description: '分析当前章节停滞点，给出继续推进的几种写法，避免无效对话和剧情原地踏步。',
    inputRequirements: ['当前章节正文', '章节目标', '人物当前状态'],
    outputContent: ['卡点判断', '三种续写方案', '推荐方案', '示例段落'],
    tags: ['章节', '卡文', '续写'],
    models: ['ChatGPT', 'DeepSeek', 'Gemini'],
    promptLength: 768,
    usageCount: '85.6w',
    favoriteCount: '5.2w',
    prompt: '请分析当前章节为什么卡住，并给出三种不同的续写方向，每种包含冲突、转折、代价和示例段落。',
    sampleResult: '作品标题：雨夜候车室\n题材：悬疑 / 成长\n核心卖点：主角在一晚内发现父亲失踪真相。\n主角设定：江野，表面冷静，实际害怕被抛弃。\n第一章标题：第一章：迟到的末班车\n第一章正文：候车室的灯闪了三次，广播却念出了一个早已停运的站名...\n本章摘要：主角收到异常广播，决定追查父亲留下的票根。\n新增伏笔：票根背面的红色编号。\n下一章建议：让陌生乘客认出主角父亲。',
  },
  {
    id: 'character-ooc',
    title: '人物 OOC 检查',
    category: 'check',
    summary: '检查人物行为是否符合设定，降低 OOC 风险。',
    description: '对照人物设定、过往记忆与当前正文，找出语言、行为、动机不一致处。',
    inputRequirements: ['人物设定', '当前章节正文', '最近章节摘要'],
    outputContent: ['风险列表', '原文位置', '问题说明', '修改建议'],
    tags: ['检查', '人物', '一致性'],
    models: ['ChatGPT', 'DeepSeek', '通用'],
    promptLength: 976,
    usageCount: '68.9w',
    favoriteCount: '4.1w',
    prompt: '请检查当前章节中人物是否 OOC。输出每条问题的风险等级、原文位置、问题说明和修改建议。',
    sampleResult: '作品标题：风停之前\n题材：青春 / 校园\n核心卖点：两个互相误解的人在竞赛中重新认识彼此。\n主角设定：林澈，克制、不轻易示弱。\n第一章标题：第一章：名单上的名字\n第一章正文：林澈看到名单时没有说话，只把纸角按得发白...\n本章摘要：主角与旧识重逢，矛盾被竞赛名单引爆。\n新增伏笔：名单上的手写备注。\n下一章建议：用一次共同任务暴露两人的旧伤。',
  },
  {
    id: 'world-builder',
    title: '世界观整理',
    category: 'world',
    summary: '结构化整理世界观设定，生成清晰设定表。',
    description: '将零散世界观整理为规则、势力、地理、禁忌与剧情钩子。',
    inputRequirements: ['世界观脑洞', '主要势力', '故事发生地点'],
    outputContent: ['规则表', '势力关系', '地点设定', '冲突来源'],
    tags: ['世界观', '设定', '架构'],
    models: ['ChatGPT', 'Gemini', '通用'],
    promptLength: 1102,
    usageCount: '72.4w',
    favoriteCount: '4.3w',
    prompt: '请把以下世界观脑洞整理为清晰设定库，包含规则、势力、地点、禁忌、冲突来源和可埋伏笔。',
    sampleResult: '作品标题：雾海灯塔\n题材：奇幻 / 冒险\n核心卖点：灯塔能听见海底城市的求救声。\n主角设定：艾琳，灯塔守夜人，害怕深海。\n第一章标题：第一章：第七次潮声\n第一章正文：潮水退去后，灯塔下露出一扇刻着古文字的铁门...\n本章摘要：主角发现灯塔与海底城有关。\n新增伏笔：铁门上的家族徽记。\n下一章建议：让主角进入退潮后的地下甬道。',
  },
  {
    id: 'style-polish',
    title: '文风润色大师',
    category: 'polish',
    summary: '提升语言表现力、画面感与节奏，保持原意同时优化表达。',
    description: '在不改变剧情事实的前提下，提升文字质感、动作节奏与情绪递进。',
    inputRequirements: ['原始段落', '目标文风', '不可改动信息'],
    outputContent: ['润色后正文', '修改说明', '可选增强版本'],
    tags: ['润色', '文风', '表达'],
    models: ['ChatGPT', 'DeepSeek', 'Gemini'],
    promptLength: 654,
    usageCount: '45.7w',
    favoriteCount: '2.8w',
    prompt: '请在不改变剧情事实的前提下润色以下段落，增强画面感、动作节奏和情绪推进，并列出修改说明。',
    sampleResult: '作品标题：玻璃温室\n题材：都市 / 治愈\n核心卖点：失去嗅觉的调香师重新找回情感记忆。\n主角设定：沈眠，冷淡、害怕亲密关系。\n第一章标题：第一章：没有香气的玫瑰\n第一章正文：清晨的温室里，玫瑰开得很安静。沈眠站在玻璃门前，听见雨点敲出细碎的节拍...\n本章摘要：主角在失去嗅觉后回到旧温室。\n新增伏笔：不会枯萎的白玫瑰。\n下一章建议：让旧友带来一瓶未完成的香水。',
  },
]

export function SkillPlaza({
  isGuest,
  onRequireLogin,
  onUseSkillResult,
}: {
  isGuest: boolean
  onRequireLogin: () => void
  onUseSkillResult: (result: ParsedWorkResult) => void
}) {
  const [category, setCategory] = useState<SkillCategory | 'all'>('all')
  const [keyword, setKeyword] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<SkillTemplate | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState('')
  const [modeFilter, setModeFilter] = useState('全部')
  const [rawWebResult, setRawWebResult] = useState('')

  const filteredSkills = useMemo(() => {
    const lower = keyword.trim().toLowerCase()
    return skillTemplates.filter((skill) => {
      const hitCategory = category === 'all' || skill.category === category
      const hitKeyword = !lower || `${skill.title} ${skill.summary} ${skill.tags.join(' ')}`.toLowerCase().includes(lower)
      const hitMode = modeFilter === '全部' || skill.models.includes(modeFilter)
      return hitCategory && hitKeyword && hitMode
    })
  }, [category, keyword, modeFilter])

  function copyPrompt(skill: SkillTemplate) {
    navigator.clipboard?.writeText(buildSkillPrompt(skill))
    setCopiedId(skill.id)
    window.setTimeout(() => setCopiedId(''), 1400)
  }

  function toggleFavorite(skill: SkillTemplate) {
    if (isGuest) {
      onRequireLogin()
      return
    }
    setFavoriteIds((current) => current.includes(skill.id) ? current.filter((id) => id !== skill.id) : [...current, skill.id])
  }

  function useSkill(skill: SkillTemplate) {
    onUseSkillResult(parseSkillResult(skill.sampleResult, skill))
  }

  function parseRawWebResult() {
    if (!selectedSkill || !rawWebResult.trim()) return
    onUseSkillResult(parseSkillResult(rawWebResult, selectedSkill))
    setRawWebResult('')
    setSelectedSkill(null)
  }

  return (
    <div className="yixie-editorial grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_300px] gap-6 bg-[#edf1ee] p-8">
      <section className="min-w-0">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold">技能广场</h1>
            <p className="mt-2 text-slate-600">把常用写作能力变成可复用技能，适配 Web AI Prompt 工作流。</p>
          </div>
          <div className="rounded-md border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-700">
            <Sparkles className="mr-2 inline h-4 w-4" />
            本地 mock 技能数据，后端市场接口已预留。
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {(Object.keys(categoryLabels) as Array<SkillCategory | 'all'>).map((item) => (
            <button key={item} onClick={() => setCategory(item)} className={cn('rounded-md px-4 py-2 text-sm font-medium', category === item ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
              {categoryLabels[item]}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="relative w-[360px]">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="h-11 w-full rounded-md border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none ring-blue-500/15 focus:ring-4" placeholder="搜索技能名称、描述或标签..." />
          </label>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="h-4 w-4" />
            兼容模型：
          </div>
          {['全部', 'ChatGPT', 'DeepSeek', 'Gemini', '通用'].map((model) => (
            <button key={model} onClick={() => setModeFilter(model)} className={cn('rounded-md border px-3 py-2 text-sm', modeFilter === model ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white hover:bg-slate-50')}>
              {model}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-5">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              copied={copiedId === skill.id}
              favorited={favoriteIds.includes(skill.id)}
              onOpen={() => setSelectedSkill(skill)}
              onCopy={() => copyPrompt(skill)}
              onUse={() => useSkill(skill)}
              onFavorite={() => toggleFavorite(skill)}
            />
          ))}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">发现 / 推荐</h2>
          <div className="mt-4 space-y-3">
            {skillTemplates.slice(0, 3).map((skill) => (
              <button key={skill.id} onClick={() => setSelectedSkill(skill)} className="flex w-full gap-3 rounded-md p-2 text-left hover:bg-slate-50">
                <SkillIcon category={skill.category} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{skill.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">{skill.summary}</span>
                </span>
                <span className="text-xs text-orange-500">{skill.usageCount}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">使用说明</h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <Step number={1} title="选择技能" text="在技能广场中挑选适合当前写作场景的技能。" />
            <Step number={2} title="复制到网页 AI" text="游客或 Web AI 模式下复制 Prompt 到 ChatGPT / DeepSeek / Gemini。" />
            <Step number={3} title="结果确认" text="AI 返回后进入结果确认页，确认后再写入作品。" />
          </div>
        </section>
        <section className="rounded-lg border border-violet-100 bg-violet-50 p-5">
          <h2 className="font-semibold text-violet-900">创建自定义 Prompt</h2>
          <p className="mt-2 text-sm leading-6 text-violet-700">本轮暂不开放公开上传，后续可接个人模板和审核流程。</p>
        </section>
      </aside>

      <SkillDetailModal
        skill={selectedSkill}
        copied={!!selectedSkill && copiedId === selectedSkill.id}
        favorited={!!selectedSkill && favoriteIds.includes(selectedSkill.id)}
        rawWebResult={rawWebResult}
        onRawWebResultChange={setRawWebResult}
        onClose={() => setSelectedSkill(null)}
        onCopy={copyPrompt}
        onUse={useSkill}
        onFavorite={toggleFavorite}
        onParseWebResult={parseRawWebResult}
      />
    </div>
  )
}

function SkillCard({ skill, copied, favorited, onOpen, onCopy, onUse, onFavorite }: { skill: SkillTemplate; copied: boolean; favorited: boolean; onOpen: () => void; onCopy: () => void; onUse: () => void; onFavorite: () => void }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        <SkillIcon category={skill.category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{skill.title}</h3>
            {skill.featured && <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">官方</span>}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{skill.summary}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {skill.tags.map((tag) => <span key={tag} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">{tag}</span>)}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span><Star className="mr-1 inline h-3.5 w-3.5 text-orange-400" />{skill.usageCount}</span>
        <span><Heart className="mr-1 inline h-3.5 w-3.5 text-rose-400" />{skill.favoriteCount}</span>
        <span>Prompt {skill.promptLength} 字</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={onUse} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">立即使用</button>
        <button onClick={onOpen} className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">详情</button>
        <button onClick={onFavorite} className={cn('rounded-md border px-3 py-2 text-sm', favorited ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 hover:bg-slate-50')}>
          收藏
        </button>
      </div>
      <button onClick={onCopy} className="mt-2 w-full rounded-md border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">
        {copied ? '已复制 Prompt' : '复制 Prompt'}
      </button>
    </article>
  )
}

function SkillDetailModal({ skill, copied, favorited, rawWebResult, onRawWebResultChange, onClose, onCopy, onUse, onFavorite, onParseWebResult }: { skill: SkillTemplate | null; copied: boolean; favorited: boolean; rawWebResult: string; onRawWebResultChange: (value: string) => void; onClose: () => void; onCopy: (skill: SkillTemplate) => void; onUse: (skill: SkillTemplate) => void; onFavorite: (skill: SkillTemplate) => void; onParseWebResult: () => void }) {
  const [tab, setTab] = useState<'desc' | 'input' | 'output' | 'webai'>('desc')
  useEffect(() => {
    if (skill) setTab('desc')
  }, [skill?.id])

  if (!skill) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-sm">
      <section className="w-full max-w-6xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start gap-5 border-b border-slate-200 px-7 py-6">
          <SkillIcon category={skill.category} large />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">{skill.title}</h2>
              <span className="rounded bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700">{categoryLabels[skill.category]}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{skill.summary}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-slate-200 px-7">
          {[
            ['desc', '说明'],
            ['input', '输入要求'],
            ['output', '输出内容'],
            ['webai', 'Web AI 模式'],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as typeof tab)} className={cn('mr-8 border-b-2 px-1 py-4 text-sm font-semibold', tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500')}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_330px] gap-6 px-7 py-6">
          <div>
            {tab === 'desc' && (
              <div className="space-y-5">
                <InfoBlock icon={Sparkles} title="技能描述" text={skill.description} />
                <InfoBlock icon={Star} title="适用场景" text={skill.tags.join(' / ')} />
                <InfoBlock icon={FileText} title="预计输出" text={`约 ${skill.promptLength} 字 Prompt，可按作品资料自动注入。`} />
              </div>
            )}
            {tab === 'input' && <BulletList title="所需输入" items={skill.inputRequirements} />}
            {tab === 'output' && <BulletList title="输出内容" items={skill.outputContent} />}
            {tab === 'webai' && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">复制到网页 AI 使用</h3>
                  <button onClick={() => onCopy(skill)} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white">{copied ? '已复制' : '复制 Prompt'}</button>
                </div>
                <pre className="h-56 overflow-y-auto whitespace-pre-wrap rounded-md border border-violet-200 bg-violet-50/70 p-4 text-sm leading-6">{buildSkillPrompt(skill)}</pre>
                <textarea value={rawWebResult} onChange={(event) => onRawWebResultChange(event.target.value)} className="mt-4 h-32 w-full resize-none rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none" placeholder="粘贴 ChatGPT / DeepSeek / Gemini 返回结果..." />
                <button onClick={onParseWebResult} disabled={!rawWebResult.trim()} className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">粘贴并进入结果确认</button>
              </div>
            )}
          </div>

          <aside className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold">技能信息</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <InfoRow label="适用分类" value={categoryLabels[skill.category]} />
              <InfoRow label="使用次数" value={skill.usageCount} />
              <InfoRow label="收藏数" value={skill.favoriteCount} />
              <InfoRow label="兼容模型" value={skill.models.join(' / ')} />
            </div>
            <div className="mt-6 space-y-3">
              <button onClick={() => onUse(skill)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500">
                <Wand2 className="h-4 w-4" />
                立即使用
              </button>
              <button onClick={() => onCopy(skill)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-blue-200 bg-white text-sm font-semibold text-blue-600 hover:bg-blue-50">
                <Clipboard className="h-4 w-4" />
                {copied ? '已复制 Prompt' : '复制 Prompt'}
              </button>
              <button onClick={() => onFavorite(skill)} className={cn('inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border text-sm font-semibold', favorited ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white hover:bg-slate-50')}>
                <Heart className="h-4 w-4" />
                {favorited ? '已收藏' : '收藏技能'}
              </button>
              <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50">
                <Eye className="h-4 w-4" />
                查看示例结果
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

function SkillIcon({ category, large = false }: { category: SkillCategory; large?: boolean }) {
  const Icon = categoryIcons[category]
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-white', large ? 'h-20 w-20' : 'h-12 w-12')}>
      <Icon className={large ? 'h-9 w-9' : 'h-6 w-6'} />
    </span>
  )
}

function Step({ number, title, text }: { number: number; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">{number}</span>
      <span>
        <span className="block font-semibold text-slate-900">{title}</span>
        <span className="mt-1 block text-slate-500">{text}</span>
      </span>
    </div>
  )
}

function InfoBlock({ icon: Icon, title, text }: { icon: typeof Sparkles; title: string; text: string }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-blue-600" />{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
    </section>
  )
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {item}
          </div>
        ))}
      </div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
      <span>{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  )
}

function buildSkillPrompt(skill: SkillTemplate) {
  return `${skill.prompt}

【当前易写技能】
${skill.title}

【输入要求】
${skill.inputRequirements.map((item) => `- ${item}`).join('\n')}

【期望输出】
${skill.outputContent.map((item) => `- ${item}`).join('\n')}

请严格按照“作品标题、题材、核心卖点、主角设定、第一章标题、第一章正文、本章摘要、新增伏笔、下一章建议”的格式返回，方便易写解析。`
}

function parseSkillResult(raw: string, skill: SkillTemplate): ParsedWorkResult {
  return {
    title: matchValue(raw, '作品标题') || `${skill.title}结果`,
    genre: matchValue(raw, '题材') || categoryLabels[skill.category],
    sellingPoint: matchValue(raw, '核心卖点') || skill.summary,
    characters: splitList(matchValue(raw, '主角设定') || '主角：待补充'),
    chapterTitle: matchValue(raw, '第一章标题') || '第一章：技能生成草稿',
    chapterText: matchValue(raw, '第一章正文') || raw,
    summary: matchValue(raw, '本章摘要') || '技能生成结果已解析，等待确认后写入作品。',
    foreshadowing: splitList(matchValue(raw, '新增伏笔') || '待确认伏笔'),
    nextStep: matchValue(raw, '下一章建议') || '继续确认技能输出并选择保存方式。',
    rawText: raw,
  }
}

function matchValue(source: string, label: string) {
  const pattern = new RegExp(`${label}[：:]\\s*([\\s\\S]*?)(?=\\n(?:作品标题|题材|核心卖点|主角设定|第一章标题|第一章正文|本章摘要|新增伏笔|下一章建议)[：:]|$)`)
  return source.match(pattern)?.[1]?.trim() ?? ''
}

function splitList(value: string) {
  return value.split(/[，,；;\n]/).map((item) => item.trim()).filter(Boolean)
}
