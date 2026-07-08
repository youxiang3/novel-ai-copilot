'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Edit3,
  GitBranch,
  Globe2,
  Link2,
  MapPin,
  MoreHorizontal,
  Network,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  UserRound,
  Wand2,
} from 'lucide-react'
import type { SavedWork, StorylineChapterNode, StorylineCharacter, StorylineData, StorylineEvent, StorylineHook, StorylineLocation, StorylinePrediction } from './types'
import { cn } from '@/lib/utils'

type StoryView = 'chapters' | 'characters' | 'events' | 'hooks' | 'world'

const viewLabels: Record<StoryView, string> = {
  chapters: '章节线',
  characters: '人物线',
  events: '事件线',
  hooks: '钩子线',
  world: '世界线',
}

const storagePrefix = 'yixie-storyline-data-v1'

export function StoryGraphCenter({
  works,
  activeWork,
  isGuest,
  onOpenWorks,
}: {
  works: SavedWork[]
  activeWork: SavedWork | null
  isGuest: boolean
  onOpenWorks: () => void
}) {
  const [selectedWorkId, setSelectedWorkId] = useState(activeWork?.id ?? works[0]?.id ?? '')
  const selectedWork = works.find((work) => work.id === selectedWorkId) ?? activeWork ?? works[0] ?? null
  const [data, setData] = useState<StorylineData | null>(null)
  const [view, setView] = useState<StoryView>('chapters')
  const [query, setQuery] = useState('')
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null)
  const [predictionTarget, setPredictionTarget] = useState('推演下一个重要事件')
  const [predictionCount, setPredictionCount] = useState(3)
  const [webPrompt, setWebPrompt] = useState('')

  useEffect(() => {
    if (activeWork?.id) setSelectedWorkId(activeWork.id)
  }, [activeWork?.id])

  useEffect(() => {
    if (!selectedWork) {
      setData(null)
      return
    }
    setData(readStorylineData(selectedWork))
    setSelectedCharacterId(null)
    setExpandedChapterId(null)
  }, [selectedWork?.id])

  useEffect(() => {
    if (!selectedWork || !data) return
    localStorage.setItem(getStorageKey(selectedWork.id), JSON.stringify(data))
  }, [data, selectedWork])

  const filteredChapters = useMemo(() => {
    if (!data) return []
    const normalizedQuery = query.trim().toLowerCase()
    return data.chapters.filter((chapter) => {
      const characterHit = !selectedCharacterId || chapter.mainCharacterIds.includes(selectedCharacterId)
      const text = [
        chapter.chapterTitle,
        chapter.summary,
        ...chapter.emotionTags,
        ...chapter.conflictTags,
        ...chapter.mainCharacterIds.map((id) => characterName(data, id)),
        ...chapter.eventIds.map((id) => eventTitle(data, id)),
        ...chapter.locationIds.map((id) => locationName(data, id)),
        ...chapter.hookIds.map((id) => hookTitle(data, id)),
      ].join(' ')
      return characterHit && (!normalizedQuery || text.toLowerCase().includes(normalizedQuery))
    })
  }, [data, query, selectedCharacterId])

  const knownStats = data ? [
    { label: '已知人物', value: `${data.characters.length} 人`, action: '查看' },
    { label: '已知事件', value: `${data.events.length} 条`, action: '查看' },
    { label: '已知地点', value: `${data.locations.length} 个`, action: '查看' },
    { label: '当前钩子', value: `${data.hooks.filter((hook) => hook.status === 'open' || hook.status === 'risk').length} 条`, action: '查看' },
  ] : []

  function updateData(patch: Partial<StorylineData>) {
    setData((current) => current ? { ...current, ...patch } : current)
  }

  function refreshAiSummary() {
    if (!data) return
    const firstEvent = data.events[0]?.title || '当前核心事件尚未整理'
    const characterText = data.characters.slice(0, 4).map((character) => character.name).join('、') || '暂无人物'
    const worldText = data.locations.slice(0, 3).map((location) => location.name).join('、') || '暂无地点'
    const hookText = data.hooks.filter((hook) => hook.status !== 'resolved').map((hook) => hook.title).join('、') || '暂无未回收伏笔'
    updateData({
      overview: {
        ...data.overview,
        aiSummary: {
          coreConflict: `围绕「${firstEvent}」推进，后续冲突需要与主线目标保持一致。`,
          mainCharacters: characterText,
          worldSetting: worldText,
          unresolvedHooks: hookText,
        },
      },
    })
  }

  function addCharacter() {
    if (!data) return
    const next: StorylineCharacter = {
      id: `character-${Date.now()}`,
      name: `新角色 ${data.characters.length + 1}`,
      roleType: '待设定',
      faction: '未分组',
      tags: ['待整理'],
      description: '补充人物背景、动机与关系。',
      statusSummary: '待整理当前状态',
    }
    updateData({ characters: [...data.characters, next] })
    setSelectedCharacterId(next.id)
  }

  function addChapterNode() {
    if (!data) return
    const nextIndex = data.chapters.length + 1
    const next: StorylineChapterNode = {
      id: `chapter-${Date.now()}`,
      chapterIndex: nextIndex,
      chapterTitle: `第 ${nextIndex} 章`,
      summary: '补充章节正文摘要与事件说明。',
      mainCharacterIds: data.characters[0] ? [data.characters[0].id] : [],
      eventIds: [],
      locationIds: data.locations[0] ? [data.locations[0].id] : [],
      hookIds: [],
      emotionTags: ['待定'],
      conflictTags: ['待定'],
      status: 'planned',
    }
    updateData({ chapters: [...data.chapters, next] })
    setExpandedChapterId(next.id)
  }

  function editChapterNode(chapter: StorylineChapterNode) {
    if (!data) return
    const nextTitle = window.prompt('章节名', chapter.chapterTitle)
    if (nextTitle === null) return
    const nextSummary = window.prompt('核心事件 / 摘要', chapter.summary)
    updateData({
      chapters: data.chapters.map((item) => item.id === chapter.id ? { ...item, chapterTitle: nextTitle.trim() || item.chapterTitle, summary: nextSummary?.trim() || item.summary, status: 'structured' } : item),
    })
  }

  function deleteChapterNode(chapterId: string) {
    if (!data) return
    updateData({ chapters: data.chapters.filter((chapter) => chapter.id !== chapterId) })
    if (expandedChapterId === chapterId) setExpandedChapterId(null)
  }

  function organizeChapter(chapter: StorylineChapterNode) {
    if (!data) return
    updateData({
      chapters: data.chapters.map((item) => item.id === chapter.id ? { ...item, status: 'structured', emotionTags: normalizeTags(item.emotionTags, '推进'), conflictTags: normalizeTags(item.conflictTags, '冲突') } : item),
    })
  }

  function generatePrediction() {
    if (!data || !selectedWork) return
    const source = buildContextDigest(data)
    const prediction: StorylinePrediction = {
      id: `prediction-${Date.now()}`,
      targetType: predictionTarget,
      predictedChapterCount: predictionCount,
      summary: `基于《${selectedWork.title}》当前 ${data.chapters.length} 个章节节点、${data.characters.length} 位人物、${data.hooks.length} 条钩子，建议下一阶段围绕「${source.event}」推进，并优先处理「${source.hook}」。`,
      suggestions: [
        `让 ${source.character} 在后续 ${predictionCount} 章内做出一次明确选择。`,
        `把地点「${source.location}」作为冲突升级或伏笔回收场景。`,
        `避免新增过多无关事件，先回收已记录的开放钩子。`,
      ],
      confidence: Math.min(92, 62 + data.chapters.length * 5 + data.characters.length * 3),
      createdAt: '刚刚',
    }
    updateData({ predictions: [prediction, ...data.predictions].slice(0, 6) })
  }

  function generateWebPrompt() {
    if (!data || !selectedWork) return
    setWebPrompt(`请基于以下结构化故事线数据，为《${selectedWork.title}》做剧情推演：\n\n作品概况：${JSON.stringify(data.overview, null, 2)}\n人物：${JSON.stringify(data.characters, null, 2)}\n章节节点：${JSON.stringify(data.chapters, null, 2)}\n事件：${JSON.stringify(data.events, null, 2)}\n钩子/伏笔：${JSON.stringify(data.hooks, null, 2)}\n地点/世界：${JSON.stringify(data.locations, null, 2)}\n\n请输出：1. 后续发展方向；2. 风险提示；3. 可执行章节建议；4. 可回收伏笔。`)
  }

  if (!selectedWork || !data) {
    return (
      <div className="yixie-editorial flex min-h-full items-center justify-center bg-[#edf1ee] p-8">
        <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Network className="mx-auto h-10 w-10 text-violet-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">先选择一部作品</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">故事线图是按作品独立保存的数据。进入作品库选择或创建作品后即可整理章节、人物、事件和伏笔。</p>
          <button onClick={onOpenWorks} className="mt-5 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500">进入作品库</button>
        </section>
      </div>
    )
  }

  return (
    <div className="yixie-editorial min-h-full bg-[#edf1ee]">
      <div className="grid min-h-full grid-cols-[minmax(0,1fr)_340px] gap-5 p-5">
        <main className="min-w-0">
          {isGuest && <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">游客模式下故事线图数据保存到本地，不会显示为云端同步。</div>}

          <section className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <select value={selectedWork.id} onChange={(event) => setSelectedWorkId(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none">
                  {works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}
                </select>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{selectedWork.projectStatus === 'completed' ? '已完结' : selectedWork.projectStatus === 'draft' ? '草稿' : '连载中'}</span>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{selectedWork.type || '未设置题材'}</span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{selectedWork.syncState === 'local-only' ? '仅本地' : '已同步'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Download className="h-3.5 w-3.5" />导出图谱</button>
                <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Share2 className="h-3.5 w-3.5" />分享</button>
                <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Settings className="h-3.5 w-3.5" />设置</button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="mr-auto text-2xl font-semibold text-slate-950">{selectedWork.title} · 故事线图 / 章节事件管理</h1>
              <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none">
                <option>第 1 章 - 第 {Math.max(1, data.chapters.length)} 章</option>
              </select>
              <div className="relative w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:ring-4 focus:ring-violet-100" placeholder="搜索章节、人物、事件、地点、钩子..." />
              </div>
            </div>
          </section>

          <section className="mt-4 grid grid-cols-2 gap-4">
            <SummaryPanel title="作品概况（AI 总结）" badge="AI" onRefresh={refreshAiSummary} items={[
              ['核心冲突', data.overview.aiSummary.coreConflict],
              ['主要人物', data.overview.aiSummary.mainCharacters],
              ['世界设定', data.overview.aiSummary.worldSetting],
              ['当前未解钩子', data.overview.aiSummary.unresolvedHooks],
            ]} />
            <ManualSummaryPanel data={data} onChange={(manualSummary) => updateData({ overview: { ...data.overview, manualSummary } })} />
          </section>

          <section className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-md border border-slate-200 bg-white p-1">
              {(Object.keys(viewLabels) as StoryView[]).map((item) => (
                <button key={item} onClick={() => setView(item)} className={cn('rounded px-4 py-2 text-sm font-medium', view === item ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50')}>{viewLabels[item]}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={refreshAiSummary} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-violet-700 hover:bg-violet-50"><Sparkles className="h-4 w-4" />智能整理全部章节</button>
              <button onClick={addChapterNode} className="inline-flex h-10 items-center gap-2 rounded-md bg-violet-600 px-3 text-sm font-semibold text-white hover:bg-violet-500"><Plus className="h-4 w-4" />新增章节节点</button>
            </div>
          </section>

          <CharacterStrip characters={data.characters} selectedId={selectedCharacterId} onSelect={(id) => setSelectedCharacterId(id === selectedCharacterId ? null : id)} onAdd={addCharacter} />

          {view === 'chapters' && <ChapterTable data={data} chapters={filteredChapters} expandedId={expandedChapterId} onToggle={setExpandedChapterId} onEdit={editChapterNode} onDelete={deleteChapterNode} onOrganize={organizeChapter} />}
          {view === 'characters' && <NodeCards title="人物线" icon={UserRound} items={data.characters.map((character) => ({ id: character.id, title: character.name, meta: `${character.roleType} / ${character.faction}`, text: `${character.statusSummary} ${character.description}`, tags: character.tags }))} />}
          {view === 'events' && <NodeCards title="事件线" icon={Link2} items={data.events.map((event) => ({ id: event.id, title: event.title, meta: `关联章节 ${event.chapterIds.length} 个`, text: event.description, tags: [event.impact] }))} />}
          {view === 'hooks' && <NodeCards title="钩子线" icon={GitBranch} items={data.hooks.map((hook) => ({ id: hook.id, title: hook.title, meta: `埋下于第 ${hook.plantedAtChapter} 章`, text: hook.description, tags: [hookStatusText(hook.status), `强化 ${hook.strengthenedAtChapters.length} 次`] }))} />}
          {view === 'world' && <NodeCards title="世界线" icon={Globe2} items={data.locations.map((location) => ({ id: location.id, title: location.name, meta: location.type, text: location.description, tags: [`关联事件 ${location.relatedEventIds.length}`] }))} />}
        </main>

        <aside className="space-y-4">
          <section className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-slate-950"><Bot className="h-4 w-4 text-violet-600" />AI 推演 · 剧情推演</h2>
              <button className="text-slate-400">«</button>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">已知信息</h3>
            <div className="mt-2 space-y-2">
              {knownStats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
                  <span className="text-slate-600">{stat.label}</span>
                  <span className="font-semibold text-slate-900">{stat.value}</span>
                  <button className="text-xs font-semibold text-violet-700">{stat.action}</button>
                </div>
              ))}
            </div>

            <h3 className="mt-5 text-sm font-semibold text-slate-900">推演目标</h3>
            <select value={predictionTarget} onChange={(event) => setPredictionTarget(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none">
              <option>推演下一个重要事件</option>
              <option>推演人物关系变化</option>
              <option>推演未来 1 章</option>
              <option>推演未来 3 章</option>
              <option>推演未来 5 章</option>
              <option>自定义</option>
            </select>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[1, 3, 5].map((count) => <button key={count} onClick={() => setPredictionCount(count)} className={cn('rounded-md border px-3 py-2 text-sm', predictionCount === count ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600')}>{count} 章</button>)}
              <button onClick={() => setPredictionCount(8)} className={cn('rounded-md border px-3 py-2 text-sm', predictionCount === 8 ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600')}>自定义</button>
            </div>
            <button onClick={generatePrediction} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-violet-600 text-sm font-semibold text-white hover:bg-violet-500"><Wand2 className="h-4 w-4" />生成后续剧情推演</button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={generatePrediction} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">补全伏笔</button>
              <button onClick={generatePrediction} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">预测人物变化</button>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-950">AI 推演结果</h2>
              <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">基于当前数据</span>
            </div>
            {data.predictions.length === 0 ? (
              <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-500">暂无推演结果。生成时会读取当前作品概况、章节节点、人物、伏笔与地点数据。</p>
            ) : (
              <div className="mt-3 space-y-3">
                {data.predictions.slice(0, 2).map((prediction) => (
                  <PredictionCard key={prediction.id} prediction={prediction} />
                ))}
              </div>
            )}
            <button className="mt-3 w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500">查看详细推演报告</button>
            <button className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">将推演结果加入故事线</button>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-950">Web AI Prompt</h2>
              <button onClick={generateWebPrompt} className="text-xs font-semibold text-violet-700">生成</button>
            </div>
            <textarea value={webPrompt} onChange={(event) => setWebPrompt(event.target.value)} className="mt-3 h-28 w-full resize-none rounded-md border border-slate-200 p-3 text-xs leading-5 outline-none" placeholder="无 API 时可生成故事线整理 / 剧情推演 Prompt。" />
            <button onClick={() => webPrompt && navigator.clipboard?.writeText(webPrompt)} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Copy className="h-4 w-4" />复制 Prompt</button>
          </section>
        </aside>
      </div>
    </div>
  )
}

function SummaryPanel({ title, badge, items, onRefresh }: { title: string; badge: string; items: Array<[string, string]>; onRefresh: () => void }) {
  const empty = items.every(([, value]) => !value)
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-950">{title} <span className="text-xs text-slate-400">{badge}</span></h2>
        <button onClick={onRefresh} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-violet-700"><RefreshCw className="h-3.5 w-3.5" />刷新总结</button>
      </div>
      {empty ? <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-500">可先整理章节、人物、事件，或通过 AI 自动生成概况。</p> : (
        <div className="mt-3 space-y-3">
          {items.map(([label, value]) => (
            <div key={label} className="flex gap-3 text-sm leading-6">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-violet-600" />
              <div><span className="font-semibold text-slate-900">{label}：</span><span className="text-slate-600">{value || '待整理'}</span></div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ManualSummaryPanel({ data, onChange }: { data: StorylineData; onChange: (summary: StorylineData['overview']['manualSummary']) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.overview.manualSummary)

  useEffect(() => setDraft(data.overview.manualSummary), [data.overview.manualSummary])

  function save() {
    onChange(draft)
    setEditing(false)
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-950">作者概况（手动）</h2>
        <button onClick={() => editing ? save() : setEditing(true)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-violet-700"><Edit3 className="h-3.5 w-3.5" />{editing ? '保存' : '编辑'}</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {([
          ['mainGoal', '主线目标'],
          ['emotionLine', '感情线'],
          ['foreshadowFocus', '伏笔重点'],
          ['stylePace', '风格基调'],
        ] as const).map(([key, label]) => (
          <label key={key} className="text-sm">
            <span className="font-semibold text-slate-900">{label}</span>
            {editing ? <textarea value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} className="mt-1 h-16 w-full resize-none rounded-md border border-slate-200 p-2 text-sm outline-none" /> : <p className="mt-1 text-slate-600">{draft[key] || '待补充'}</p>}
          </label>
        ))}
      </div>
    </section>
  )
}

function CharacterStrip({ characters, selectedId, onSelect, onAdd }: { characters: StorylineCharacter[]; selectedId: string | null; onSelect: (id: string) => void; onAdd: () => void }) {
  return (
    <section className="mt-4 rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">主要人物 <Settings className="h-3.5 w-3.5 text-slate-400" /></div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {characters.map((character) => (
          <button key={character.id} onClick={() => onSelect(character.id)} title={character.description} className={cn('flex min-w-[170px] items-center gap-3 rounded-md border p-2 text-left hover:bg-violet-50', selectedId === character.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200')}>
            <Avatar character={character} />
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-950">{character.name}</div>
              <div className="truncate text-xs text-slate-500">{character.roleType} · {character.faction}</div>
              <span className="mt-1 inline-flex rounded bg-violet-50 px-1.5 py-0.5 text-[11px] text-violet-700">{character.tags[0] || '角色'}</span>
            </div>
          </button>
        ))}
        <button onClick={onAdd} className="flex min-w-[110px] flex-col items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500 hover:border-violet-400 hover:text-violet-700">
          <Plus className="h-5 w-5" />
          添加角色
        </button>
      </div>
    </section>
  )
}

function ChapterTable({ data, chapters, expandedId, onToggle, onEdit, onDelete, onOrganize }: { data: StorylineData; chapters: StorylineChapterNode[]; expandedId: string | null; onToggle: (id: string | null) => void; onEdit: (chapter: StorylineChapterNode) => void; onDelete: (id: string) => void; onOrganize: (chapter: StorylineChapterNode) => void }) {
  return (
    <section className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
          <tr>
            <th className="w-[9%] px-4 py-3">章节</th>
            <th className="w-[15%] px-4 py-3">主要人物</th>
            <th className="w-[22%] px-4 py-3">核心事件</th>
            <th className="w-[12%] px-4 py-3">地点</th>
            <th className="w-[15%] px-4 py-3">钩子 / 伏笔</th>
            <th className="w-[14%] px-4 py-3">冲突 / 情绪</th>
            <th className="px-4 py-3">状态</th>
            <th className="px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {chapters.map((chapter) => (
            <>
              <tr key={chapter.id} className="hover:bg-violet-50/60">
                <td className="px-4 py-3">
                  <button onClick={() => onToggle(expandedId === chapter.id ? null : chapter.id)} className="flex items-center gap-2 font-semibold text-slate-900">
                    <ChevronDown className={cn('h-4 w-4 transition', expandedId === chapter.id && 'rotate-180')} />
                    {String(chapter.chapterIndex).padStart(2, '0')}
                  </button>
                  <div className="mt-1 text-xs text-slate-500">{chapter.chapterTitle}</div>
                </td>
                <td className="px-4 py-3"><AvatarStack characters={chapter.mainCharacterIds.map((id) => data.characters.find((item) => item.id === id)).filter(Boolean) as StorylineCharacter[]} /></td>
                <td className="px-4 py-3 text-slate-700">{chapter.eventIds.map((id) => eventTitle(data, id)).join('、') || chapter.summary}</td>
                <td className="px-4 py-3 text-slate-600">{chapter.locationIds.map((id) => locationName(data, id)).join('、') || '待补充'}</td>
                <td className="px-4 py-3 text-slate-600">{chapter.hookIds.map((id) => hookTitle(data, id)).join('、') || '待补充'}</td>
                <td className="px-4 py-3"><TagList tags={[...chapter.conflictTags, ...chapter.emotionTags]} /></td>
                <td className="px-4 py-3"><span className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{chapterStatusText(chapter.status)}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => onOrganize(chapter)} className="rounded-md border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50">AI整理</button>
                    <button onClick={() => onEdit(chapter)} className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><Edit3 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => onDelete(chapter.id)} className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><Trash2 className="h-3.5 w-3.5" /></button>
                    <button className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
              {expandedId === chapter.id && (
                <tr>
                  <td colSpan={8} className="bg-slate-50 px-6 py-4">
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <DetailBox label="章节正文摘要" value={chapter.summary} />
                      <DetailBox label="人物关系变化" value={chapter.mainCharacterIds.map((id) => characterName(data, id)).join('、') || '待补充'} />
                      <DetailBox label="关联伏笔" value={chapter.hookIds.map((id) => hookTitle(data, id)).join('、') || '待补充'} />
                      <DetailBox label="关联世界事件" value={chapter.locationIds.map((id) => locationName(data, id)).join('、') || '待补充'} />
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function NodeCards({ title, icon: Icon, items }: { title: string; icon: typeof Network; items: Array<{ id: string; title: string; meta: string; text: string; tags: string[] }> }) {
  return (
    <section className="mt-4 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="flex items-center gap-2 font-semibold text-slate-950"><Icon className="h-4 w-4 text-violet-600" />{title}</h2>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-md border border-slate-200 p-4">
            <div className="font-semibold text-slate-950">{item.title}</div>
            <div className="mt-1 text-xs text-slate-500">{item.meta}</div>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.text}</p>
            <TagList tags={item.tags} />
          </article>
        ))}
      </div>
    </section>
  )
}

function PredictionCard({ prediction }: { prediction: StorylinePrediction }) {
  return (
    <article className="rounded-md border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-950">{prediction.targetType}</span>
        <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">可信度 {prediction.confidence}%</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{prediction.summary}</p>
      <ol className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
        {prediction.suggestions.map((item, index) => <li key={item}>{index + 1}. {item}</li>)}
      </ol>
    </article>
  )
}

function Avatar({ character }: { character: StorylineCharacter }) {
  if (character.avatar) return <img src={character.avatar} alt={character.name} className="h-12 w-12 rounded-md object-cover" />
  return <span className="flex h-12 w-12 items-center justify-center rounded-md bg-violet-100 font-semibold text-violet-700">{character.name.slice(0, 1)}</span>
}

function AvatarStack({ characters }: { characters: StorylineCharacter[] }) {
  if (characters.length === 0) return <span className="text-xs text-slate-400">待补充</span>
  return (
    <div className="flex -space-x-2">
      {characters.slice(0, 3).map((character) => <Avatar key={character.id} character={character} />)}
      {characters.length > 3 && <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">+{characters.length - 3}</span>}
    </div>
  )
}

function TagList({ tags }: { tags: string[] }) {
  return <div className="mt-2 flex flex-wrap gap-1.5">{tags.filter(Boolean).slice(0, 4).map((tag) => <span key={tag} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">{tag}</span>)}</div>
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-white p-3"><div className="text-xs font-semibold text-slate-500">{label}</div><p className="mt-1 leading-6 text-slate-700">{value}</p></div>
}

function readStorylineData(work: SavedWork): StorylineData {
  try {
    const saved = localStorage.getItem(getStorageKey(work.id))
    if (saved) return JSON.parse(saved) as StorylineData
  } catch {
    localStorage.removeItem(getStorageKey(work.id))
  }
  return createInitialStorylineData(work)
}

function createInitialStorylineData(work: SavedWork): StorylineData {
  const characterNames = work.materials.characters.length ? work.materials.characters : ['主角']
  const characters: StorylineCharacter[] = characterNames.map((name, index) => ({
    id: `character-${index + 1}`,
    name,
    roleType: index === 0 ? '主角' : '重要角色',
    faction: '未分组',
    tags: [index === 0 ? '主角' : '重要'],
    description: `${name} 的人物设定来自当前作品资料，可继续补充头像、动机、立场与关系。`,
    statusSummary: '待整理人物当前状态',
  }))
  const location: StorylineLocation = { id: 'location-1', name: '当前主要场景', type: '地点', description: '从现有章节中提炼的主要发生地，可继续编辑。', relatedEventIds: ['event-1'] }
  const event: StorylineEvent = {
    id: 'event-1',
    title: work.materials.nextStep || work.chapterTitle || '当前章节事件',
    description: work.materials.summary || work.summary || '根据当前章节整理核心事件。',
    chapterIds: ['chapter-1'],
    characterIds: characters.map((character) => character.id),
    locationId: location.id,
    impact: '推动主线',
  }
  const hook: StorylineHook = {
    id: 'hook-1',
    title: work.materials.sellingPoint || '核心悬念',
    description: work.materials.nextStep || '补充钩子 / 伏笔说明。',
    plantedAtChapter: 1,
    strengthenedAtChapters: [],
    relatedCharacterIds: characters.slice(0, 2).map((character) => character.id),
    relatedEventIds: [event.id],
    status: 'open',
  }
  return {
    overview: {
      workId: work.id,
      aiSummary: {
        coreConflict: work.materials.sellingPoint || work.summary || '',
        mainCharacters: characters.map((character) => character.name).join('、'),
        worldSetting: work.materials.genre || work.type || '',
        unresolvedHooks: hook.title,
      },
      manualSummary: {
        mainGoal: work.materials.nextStep || '继续推进主线目标。',
        emotionLine: '待补充感情线 / 情绪线。',
        foreshadowFocus: hook.title,
        stylePace: '待补充风格基调与节奏规划。',
      },
      currentStage: work.projectStatus || work.status,
      genres: [work.type].filter(Boolean),
      status: work.syncState,
    },
    characters,
    chapters: [{
      id: 'chapter-1',
      chapterIndex: 1,
      chapterTitle: work.chapterTitle || '第一章',
      summary: work.chapterText ? summarizeText(work.chapterText) : work.summary,
      mainCharacterIds: characters.map((character) => character.id),
      eventIds: [event.id],
      locationIds: [location.id],
      hookIds: [hook.id],
      emotionTags: ['待整理'],
      conflictTags: ['待整理'],
      status: 'structured',
    }],
    events: [event],
    hooks: [hook],
    locations: [location],
    predictions: [],
  }
}

function getStorageKey(workId: string) {
  return `${storagePrefix}-${workId}`
}

function summarizeText(text: string) {
  return text.replace(/\s+/g, '').slice(0, 90) || '待补充章节摘要'
}

function normalizeTags(tags: string[], fallback: string) {
  return tags.length && !tags.includes('待定') && !tags.includes('待整理') ? tags : [fallback]
}

function buildContextDigest(data: StorylineData) {
  return {
    event: data.events[0]?.title || data.chapters[0]?.chapterTitle || '当前主线',
    hook: data.hooks.find((hook) => hook.status === 'open' || hook.status === 'risk')?.title || '核心悬念',
    character: data.characters[0]?.name || '主角',
    location: data.locations[0]?.name || '主要地点',
  }
}

function characterName(data: StorylineData, id: string) {
  return data.characters.find((character) => character.id === id)?.name || id
}

function eventTitle(data: StorylineData, id: string) {
  return data.events.find((event) => event.id === id)?.title || id
}

function locationName(data: StorylineData, id: string) {
  return data.locations.find((location) => location.id === id)?.name || id
}

function hookTitle(data: StorylineData, id: string) {
  return data.hooks.find((hook) => hook.id === id)?.title || id
}

function chapterStatusText(status: StorylineChapterNode['status']) {
  return { planned: '已计划', draft: '草稿', structured: '已整理', developing: '发展中', resolved: '已回收' }[status]
}

function hookStatusText(status: StorylineHook['status']) {
  return { open: '待回收', resolved: '已回收', abandoned: '已废弃', risk: '风险' }[status]
}
