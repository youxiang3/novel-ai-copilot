'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cloud,
  Copy,
  Download,
  Eye,
  FileText,
  GitBranch,
  Grid2X2,
  List,
  MoreVertical,
  Network,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Target,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
import type { ProjectStatus, ProjectSyncState, ToolState, WorkItem } from './types'
import { cn } from '@/lib/utils'

type ViewMode = 'card' | 'list'
type SortMode = 'recent' | 'words' | 'completion' | 'chapters' | 'created'
type ProgressFilter = 'all' | 'under-30' | '30-70' | 'over-70' | 'completed'
type WordRangeFilter = 'all' | 'under-100k' | '100k-500k' | 'over-500k'
type StatFilter = 'all' | 'official' | 'local' | 'monthly' | 'sync'
type ManageFocus = 'general' | 'title' | 'targetWords' | 'publishPlatform' | 'publishStatus'
type ExportFormat = 'markdown' | 'json'

const viewStorageKey = 'yixie-works-library-view-v1'

const genreAll = '全部题材'
const platformAll = '全部平台'
const publishPlatforms = ['番茄小说', '起点中文网', '晋江文学城', '微信读书', '自定义平台', '未设置平台']

const officialTools: Array<{ id: string; title: string; description: string; icon: typeof Sparkles; check?: boolean }> = [
  { id: 'golden-opening', title: '黄金第一章', description: '生成引人入胜的开篇，抓住读者眼球', icon: Sparkles },
  { id: 'relationship-map', title: '人物关系图', description: '可视化人物关系，梳理最新设定', icon: Network },
  { id: 'hook-foreshadow', title: '钩子 / 伏笔线性图', description: '规划故事钩子与伏笔，增强吸引力', icon: GitBranch },
  { id: 'long-memory', title: '长篇记忆', description: '跨章节记忆管理，保持设定一致', icon: FileText },
  { id: 'ooc-check', title: 'OOC 检查', description: '识别角色行为偏差，维护人设', icon: AlertCircle, check: true },
  { id: 'stuck-rescue', title: '卡文急救', description: '提供情节灵感，突破创作瓶颈', icon: Wand2 },
  { id: 'publish-ready', title: '发布准备', description: '一键检查并准备发布所需内容', icon: Boxes },
]

const projectStatusText: Record<ProjectStatus, string> = {
  'local-draft': '临时草稿',
  draft: '草稿',
  serializing: '连载中',
  completed: '已完结',
  published: '已发布',
  archived: '已归档',
}

const syncText: Record<ProjectSyncState, string> = {
  'local-only': '仅本地',
  pending: '待同步',
  syncing: '同步中',
  synced: '已同步',
  failed: '同步失败',
}

const toolStateText: Record<ToolState, string> = {
  disabled: '未启用',
  enabled: '已启用',
  running: '进行中',
  passed: '上次通过',
  risk: '存在风险',
}

export function WorksHome({
  works,
  isGuest,
  onNewWork,
  onOpenWebAi,
  onOpenWork,
  onUpdateWork,
  onCreateWork,
  onDeleteWork,
  mode = 'home',
}: {
  works: WorkItem[]
  isGuest: boolean
  onNewWork: () => void
  onOpenWebAi: () => void
  onOpenWork: (work: WorkItem) => void
  onUpdateWork?: (work: WorkItem) => void
  onCreateWork?: (work: WorkItem) => void
  onDeleteWork?: (workId: string) => void
  onOpenStoryGraph?: () => void
  mode?: 'home' | 'library'
}) {
  if (mode !== 'library') {
    return <HomeWorksEntry works={works} isGuest={isGuest} onNewWork={onNewWork} onOpenWebAi={onOpenWebAi} onOpenWork={onOpenWork} />
  }

  return <ProjectDashboard works={works} isGuest={isGuest} onNewWork={onNewWork} onOpenWork={onOpenWork} onUpdateWork={onUpdateWork} onCreateWork={onCreateWork} onDeleteWork={onDeleteWork} />
}

function ProjectDashboard({
  works,
  isGuest,
  onNewWork,
  onOpenWork,
  onUpdateWork,
  onCreateWork,
  onDeleteWork,
}: {
  works: WorkItem[]
  isGuest: boolean
  onNewWork: () => void
  onOpenWork: (work: WorkItem) => void
  onUpdateWork?: (work: WorkItem) => void
  onCreateWork?: (work: WorkItem) => void
  onDeleteWork?: (workId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState(genreAll)
  const [platform, setPlatform] = useState(platformAll)
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all')
  const [wordRange, setWordRange] = useState<WordRangeFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [statFilter, setStatFilter] = useState<StatFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(works[0]?.id ?? null)
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [toolOverrides, setToolOverrides] = useState<Record<string, Record<string, ToolState>>>({})
  const [manageTarget, setManageTarget] = useState<{ work: WorkItem; focus: ManageFocus } | null>(null)
  const [exportTarget, setExportTarget] = useState<WorkItem | null>(null)
  const [notice, setNotice] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(viewStorageKey)
    if (saved === 'card' || saved === 'list') setViewMode(saved)
  }, [])

  const enrichedWorks = useMemo(() => works.map(normalizeWork), [works])
  const selectedWork = enrichedWorks.find((work) => work.id === selectedId) ?? enrichedWorks[0] ?? null
  const currentToolStates = selectedWork ? { ...(selectedWork.toolStates ?? {}), ...(toolOverrides[selectedWork.id] ?? {}) } : {}
  const genres = useMemo(() => [genreAll, ...Array.from(new Set(enrichedWorks.map((work) => work.type).filter(Boolean)))], [enrichedWorks])

  useEffect(() => {
    if (!selectedId && enrichedWorks[0]) setSelectedId(enrichedWorks[0].id)
    if (selectedId && enrichedWorks.length > 0 && !enrichedWorks.some((work) => work.id === selectedId)) setSelectedId(enrichedWorks[0].id)
  }, [enrichedWorks, selectedId])

  const stats = useMemo(() => {
    const official = enrichedWorks.filter((work) => work.status === 'official')
    const localDrafts = enrichedWorks.filter((work) => work.status === 'local-draft')
    const totalWords = enrichedWorks.reduce((sum, work) => sum + work.words, 0)
    const monthlyChapters = enrichedWorks.reduce((sum, work) => sum + (work.monthlyUpdatedChapters ?? 0), 0)
    const syncIssues = enrichedWorks.filter((work) => ['pending', 'syncing', 'failed'].includes(work.syncState)).length
    return { official: official.length, localDrafts: localDrafts.length, totalWords, monthlyChapters, syncIssues }
  }, [enrichedWorks])

  const filteredWorks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return enrichedWorks
      .filter((work) => {
        const completion = getCompletion(work)
        const searchHit = !normalizedQuery || [work.title, work.authorName, work.type, work.summary, ...(work.tags ?? [])].some((item) => item?.toLowerCase().includes(normalizedQuery))
        const genreHit = genre === genreAll || work.type === genre
        const platformHit = platform === platformAll || work.publishPlatform === platform
        const progressHit =
          progressFilter === 'all' ||
          (progressFilter === 'under-30' && completion < 30) ||
          (progressFilter === '30-70' && completion >= 30 && completion <= 70) ||
          (progressFilter === 'over-70' && completion > 70 && completion < 100) ||
          (progressFilter === 'completed' && completion >= 100)
        const wordsHit =
          wordRange === 'all' ||
          (wordRange === 'under-100k' && work.words < 100000) ||
          (wordRange === '100k-500k' && work.words >= 100000 && work.words <= 500000) ||
          (wordRange === 'over-500k' && work.words > 500000)
        const statHit =
          statFilter === 'all' ||
          (statFilter === 'official' && work.status === 'official') ||
          (statFilter === 'local' && work.status === 'local-draft') ||
          (statFilter === 'monthly' && (work.monthlyUpdatedChapters ?? 0) > 0) ||
          (statFilter === 'sync' && ['pending', 'syncing', 'failed'].includes(work.syncState))
        return searchHit && genreHit && platformHit && progressHit && wordsHit && statHit
      })
      .sort((a, b) => {
        if (sortMode === 'words') return b.words - a.words
        if (sortMode === 'completion') return getCompletion(b) - getCompletion(a)
        if (sortMode === 'chapters') return (b.chapterCount ?? 0) - (a.chapterCount ?? 0)
        if (sortMode === 'created') return getTimeValue(b.createdAt) - getTimeValue(a.createdAt)
        return getTimeValue(b.updatedAt) - getTimeValue(a.updatedAt)
      })
  }, [enrichedWorks, genre, platform, progressFilter, query, sortMode, statFilter, wordRange])

  function resetFilters() {
    setQuery('')
    setGenre(genreAll)
    setPlatform(platformAll)
    setProgressFilter('all')
    setWordRange('all')
    setSortMode('recent')
    setStatFilter('all')
  }

  function changeView(next: ViewMode) {
    setViewMode(next)
    localStorage.setItem(viewStorageKey, next)
  }

  function openManagement(work: WorkItem, focus: ManageFocus = 'general') {
    setSelectedId(work.id)
    setManageTarget({ work: normalizeWork(work), focus })
  }

  function saveManagedWork(updated: WorkItem) {
    const normalized = normalizeWork({ ...updated, updatedAt: '刚刚' })
    onUpdateWork?.(normalized)
    setSelectedId(normalized.id)
    setManageTarget(null)
    setNotice('作品信息已保存。卡片、列表、右侧详情和统计数据已同步刷新。')
  }

  function openExport(work: WorkItem) {
    setSelectedId(work.id)
    setExportTarget(normalizeWork(work))
  }

  function exportWork(format: ExportFormat) {
    if (!exportTarget) return
    const normalized = normalizeWork(exportTarget)
    downloadWorkExport(normalized, format)
    setNotice(format === 'markdown'
      ? 'Markdown 已导出。当前导出内容来自本地保存数据，不会删除或修改当前作品。'
      : 'JSON 备份已导出。当前版本暂不支持导入恢复，也不是云端备份。')
    setExportTarget(null)
  }

  function duplicateWork(work: WorkItem) {
    if (!window.confirm(`复制《${work.title || '未命名作品'}》为本地副本？副本会标记为“仅本地保存”。`)) return
    const duplicated = cloneWorkForLocalCopy(work)
    onCreateWork?.(duplicated)
    setSelectedId(duplicated.id)
    setNotice(`已复制为《${duplicated.title}》。副本仅保存在当前浏览器。`)
  }

  function archiveWork(work: WorkItem) {
    if (!window.confirm(`确认归档《${work.title || '未命名作品'}》？归档不会删除作品，可继续在作品库中查看。`)) return
    const archived = normalizeWork({ ...work, projectStatus: 'archived', updatedAt: '刚刚' })
    onUpdateWork?.(archived)
    setSelectedId(archived.id)
    setNotice(`《${archived.title}》已归档。`)
  }

  function deleteWork(work: WorkItem) {
    if (!window.confirm(`确认删除《${work.title || '未命名作品'}》？此操作只删除当前浏览器中的本地作品数据。`)) return
    if (!window.confirm('删除后当前版本不提供恢复功能。确定继续删除吗？')) return
    onDeleteWork?.(work.id)
    setSelectedId(null)
    setNotice(`《${work.title || '未命名作品'}》已从本地作品库删除。`)
  }

  function importWorkBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.json')) {
      setNotice('请选择 NovelAI Copilot 导出的 JSON 备份文件。')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'))
        const imported = createWorkFromBackup(parsed)
        onCreateWork?.(imported)
        setSelectedId(imported.id)
        setNotice(`已导入《${imported.title}》。导入会创建新的本地作品，不会覆盖原作品。`)
      } catch {
        setNotice('导入失败：文件格式无法识别，当前只支持本产品导出的 JSON 备份。')
      }
    }
    reader.onerror = () => setNotice('导入失败：读取文件时出现错误。')
    reader.readAsText(file)
  }

  function enableTool(toolTitle: string) {
    if (!selectedWork) return
    setToolOverrides((current) => ({
      ...current,
      [selectedWork.id]: {
        ...current[selectedWork.id],
        [toolTitle]: 'enabled',
      },
    }))
  }

  return (
    <div className="min-h-full bg-[#f7f9fc]">
      <div className="grid min-h-full grid-cols-[minmax(0,1fr)_360px] gap-5 p-6">
        <main className="min-w-0">
          {isGuest && (
            <div className="mb-5 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span>游客模式可以创建临时草稿和本地保存；临时草稿会明确标记为“仅本地保存”。</span>
              <span className="font-semibold">不会混入云端正式作品</span>
            </div>
          )}
          {notice && (
            <div className="mb-5 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span>{notice}</span>
              <button onClick={() => setNotice('')} className="rounded p-1 hover:bg-emerald-100" aria-label="关闭提示"><X className="h-4 w-4" /></button>
            </div>
          )}

          <section className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">作品库</h1>
              <p className="mt-1 text-sm text-slate-500">管理你的创作项目，开启精彩故事之旅</p>
            </div>
            <div className="flex items-center gap-2">
              <input ref={importInputRef} type="file" accept=".json,application/json" className="hidden" onChange={importWorkBackup} />
              <button onClick={() => importInputRef.current?.click()} className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                <Download className="h-4 w-4" />
                导入备份
              </button>
              <button onClick={onNewWork} className="inline-flex h-11 items-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-violet-500">
                <Plus className="h-4 w-4" />
                新建作品
              </button>
            </div>
          </section>

          <section className="mt-5 grid grid-cols-5 gap-3">
            <StatCard active={statFilter === 'official'} icon={BookOpen} label="正式作品" value={stats.official.toString()} subText="点击筛选正式作品" onClick={() => setStatFilter(statFilter === 'official' ? 'all' : 'official')} />
            <StatCard active={statFilter === 'local'} icon={FileText} label="临时草稿" value={stats.localDrafts.toString()} subText="仅本地保存" onClick={() => setStatFilter(statFilter === 'local' ? 'all' : 'local')} />
            <StatCard icon={PenLine} label="总字数" value={formatWan(stats.totalWords)} subText="累计创作" onClick={() => setSortMode('words')} />
            <StatCard active={statFilter === 'monthly'} icon={BarChart3} label="本月更新" value={`${stats.monthlyChapters} 章`} subText="点击筛选本月更新" onClick={() => setStatFilter(statFilter === 'monthly' ? 'all' : 'monthly')} />
            <StatCard active={statFilter === 'sync'} icon={Cloud} label="云端同步" value={stats.syncIssues > 0 ? `${stats.syncIssues} 个异常` : '全部正常'} subText="查看同步状态" onClick={() => setStatFilter(statFilter === 'sync' ? 'all' : 'sync')} />
          </section>

          <section className="mt-5 rounded-md border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:ring-4 focus:ring-violet-100" placeholder="搜索作品标题 / 笔名 / 标签" />
              </div>
              <FilterSelect value={genre} onChange={setGenre} options={genres} />
              <FilterSelect value={platform} onChange={setPlatform} options={[platformAll, ...publishPlatforms]} />
              <FilterSelect value={progressFilter} onChange={(value) => setProgressFilter(value as ProgressFilter)} options={['all', 'under-30', '30-70', 'over-70', 'completed']} labels={{ all: '全部进度', 'under-30': '30% 以下', '30-70': '30%-70%', 'over-70': '70% 以上', completed: '已完成' }} />
              <FilterSelect value={wordRange} onChange={(value) => setWordRange(value as WordRangeFilter)} options={['all', 'under-100k', '100k-500k', 'over-500k']} labels={{ all: '全部字数', 'under-100k': '10万以下', '100k-500k': '10-50万', 'over-500k': '50万以上' }} />
              <FilterSelect value={sortMode} onChange={(value) => setSortMode(value as SortMode)} options={['recent', 'words', 'completion', 'chapters', 'created']} labels={{ recent: '最近更新', words: '字数最多', completion: '完成度最高', chapters: '章节最多', created: '创建时间' }} />
              <button onClick={resetFilters} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50">
                <RotateCcw className="h-4 w-4" />
                重置
              </button>
            </div>
          </section>

          <section className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              共 <span className="font-semibold text-slate-900">{filteredWorks.length}</span> 部作品
            </div>
            <div className="flex rounded-md border border-slate-200 bg-white p-1">
              <ViewButton active={viewMode === 'card'} icon={Grid2X2} label="卡片视图" onClick={() => changeView('card')} />
              <ViewButton active={viewMode === 'list'} icon={List} label="列表视图" onClick={() => changeView('list')} />
            </div>
          </section>

          {filteredWorks.length === 0 ? (
            <EmptyLibrary onNewWork={onNewWork} />
          ) : viewMode === 'card' ? (
            <section className="mt-4 grid grid-cols-3 gap-4">
              {filteredWorks.map((work) => (
                <ProjectCard
                  key={work.id}
                  work={work}
                  selected={selectedWork?.id === work.id}
                  onSelect={() => setSelectedId(work.id)}
                  onOpen={() => onOpenWork(work)}
                  onManage={(focus) => openManagement(work, focus)}
                  onExport={() => openExport(work)}
                  onDuplicate={() => duplicateWork(work)}
                  onArchive={() => archiveWork(work)}
                  onDelete={() => deleteWork(work)}
                />
              ))}
            </section>
          ) : (
            <ProjectTable works={filteredWorks} selectedId={selectedWork?.id ?? null} onSelect={(work) => setSelectedId(work.id)} onOpen={onOpenWork} onManage={openManagement} />
          )}
        </main>

        <aside className="space-y-4">
          <OfficialToolsPanel selectedWork={selectedWork} toolStates={currentToolStates} onEnableTool={enableTool} />
          <CurrentWorkDetail
            work={selectedWork}
            toolStates={currentToolStates}
            onOpenWork={onOpenWork}
            onManage={(focus) => selectedWork && openManagement(selectedWork, focus)}
            onShowSync={() => selectedWork && setNotice(selectedWork.status === 'local-draft' ? '当前为本地临时草稿，仅本地保存。' : `当前同步状态：${syncText[selectedWork.syncState]}。云端同步详情将在后续接入。`)}
          />
        </aside>
      </div>

      {manageTarget && <WorkManagementModal work={manageTarget.work} initialFocus={manageTarget.focus} onClose={() => setManageTarget(null)} onSave={saveManagedWork} />}
      {exportTarget && <WorkExportModal work={exportTarget} onClose={() => setExportTarget(null)} onExport={exportWork} />}
    </div>
  )
}

function HomeWorksEntry({ works, isGuest, onNewWork, onOpenWebAi, onOpenWork }: { works: WorkItem[]; isGuest: boolean; onNewWork: () => void; onOpenWebAi: () => void; onOpenWork: (work: WorkItem) => void }) {
  const enrichedWorks = works.map(normalizeWork)
  const localDrafts = enrichedWorks.filter((work) => work.status === 'local-draft')
  const officialWorks = enrichedWorks.filter((work) => work.status === 'official')

  return (
    <div className="p-8">
      {isGuest && (
        <div className="mb-6 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          <span>当前为游客体验模式。临时草稿仅本地保存、不会同步到云端。</span>
          <span className="font-semibold">仅本地保存</span>
        </div>
      )}
      <section className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold">你好，创作者</h1>
          <p className="mt-2 text-slate-600">从新建作品开始，或继续你的本地临时草稿。</p>
        </div>
        <button onClick={onNewWork} className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500">
          <Plus className="h-4 w-4" />
          新建作品
        </button>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">新建作品</h2>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <button onClick={onNewWork} className="flex min-h-[210px] flex-col items-center justify-center rounded-md border border-dashed border-violet-300 bg-white text-center transition hover:border-violet-500 hover:bg-violet-50">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Plus className="h-7 w-7" />
            </span>
            <span className="mt-4 font-semibold">新建作品</span>
            <span className="mt-1 text-sm text-slate-500">选择开书方式进入向导</span>
          </button>
          <ToolCard icon={Sparkles} title="Web AI Prompt" text="复制到网页 AI，生成后粘贴回填" onClick={onOpenWebAi} />
          <ToolCard icon={Wand2} title="本地 fallback" text="未配置 API 时也可以先创建临时草稿" onClick={onNewWork} />
        </div>
      </section>

      <HomeWorkSection title="临时草稿" note="仅本地保存" works={localDrafts} emptyText="暂无临时草稿。游客创建的内容会先放在这里。" onOpenWork={onOpenWork} />
      <HomeWorkSection title="正式作品" note={isGuest ? '登录后可云端保存正式作品' : '正式作品可显示同步状态'} works={officialWorks} emptyText={isGuest ? '暂无正式作品。保存为正式作品需要登录。' : '暂无正式作品。'} onOpenWork={onOpenWork} />
    </div>
  )
}

function ProjectCard({
  work,
  selected,
  onSelect,
  onOpen,
  onManage,
  onExport,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  work: WorkItem
  selected: boolean
  onSelect: () => void
  onOpen: () => void
  onManage: (focus?: ManageFocus) => void
  onExport?: () => void
  onDuplicate?: () => void
  onArchive?: () => void
  onDelete?: () => void
}) {
  const completion = getCompletion(work)
  const isLocal = work.status === 'local-draft'

  return (
    <article onClick={onSelect} className={cn('overflow-hidden rounded-md border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md', selected ? 'border-violet-500 ring-2 ring-violet-100' : 'border-slate-200')}>
      <div className={cn('relative h-24 bg-gradient-to-br', work.cover)}>
        <span className={cn('absolute left-3 top-3 rounded px-2 py-1 text-xs font-semibold text-white', isLocal ? 'bg-amber-500' : statusBadgeClass(work.projectStatus))}>{projectStatusText[work.projectStatus!]}</span>
        <MoreMenu onAction={(focus) => onManage(focus)} onExport={onExport} onDuplicate={onDuplicate} onArchive={onArchive} onDelete={onDelete} />
      </div>
      <div className="p-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-slate-950">{work.title}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{work.type}</span>
            {(work.tags ?? []).slice(0, 2).map((tag) => <span key={tag} className="rounded bg-violet-50 px-2 py-0.5 text-xs text-violet-700">{tag}</span>)}
          </div>
        </div>
        <p className="mt-3 line-clamp-2 min-h-[48px] text-sm leading-6 text-slate-600">{work.summary}</p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-900">{formatWan(work.words)} / {formatWan(work.targetWords ?? 0)}字</span>
          <span className="text-slate-500">{completion}%</span>
        </div>
        <ProgressBar value={completion} />
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
          <InfoPill icon={BookOpen} text={`${work.chapterCount ?? 0} 章`} />
          <InfoPill icon={Cloud} text={syncText[work.syncState]} tone={work.syncState === 'local-only' || work.syncState === 'failed' ? 'warn' : 'ok'} />
          <InfoPill icon={Boxes} text={work.publishPlatform ?? '未设置平台'} />
          <InfoPill icon={Clock3} text={work.updatedAt} />
        </div>
        {isLocal && <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">游客草稿 / 临时草稿仅本地保存</div>}
        <ToolChips tools={work.enabledTools ?? []} toolStates={work.toolStates ?? {}} />
        <div className="mt-4 grid grid-cols-[1fr_1fr_40px] gap-2">
          <button onClick={(event) => { event.stopPropagation(); onOpen() }} className="rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500">{primaryActionText(work)}</button>
          <button onClick={(event) => { event.stopPropagation(); onManage('general') }} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">作品管理</button>
          <button onClick={(event) => { event.stopPropagation(); onManage('general') }} className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="更多操作">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  )
}

function ProjectTable({ works, selectedId, onSelect, onOpen, onManage }: { works: WorkItem[]; selectedId: string | null; onSelect: (work: WorkItem) => void; onOpen: (work: WorkItem) => void; onManage: (work: WorkItem, focus?: ManageFocus) => void }) {
  return (
    <section className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
          <tr>
            <th className="w-[24%] px-4 py-3">作品</th>
            <th className="px-4 py-3">状态</th>
            <th className="px-4 py-3">字数进度</th>
            <th className="px-4 py-3">章节</th>
            <th className="px-4 py-3">平台</th>
            <th className="px-4 py-3">同步</th>
            <th className="w-[150px] px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {works.map((work) => (
            <tr key={work.id} onClick={() => onSelect(work)} className={cn('cursor-pointer hover:bg-violet-50/60', selectedId === work.id && 'bg-violet-50')}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={cn('h-11 w-14 rounded bg-gradient-to-br', work.cover)} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-950">{work.title}</div>
                    <div className="truncate text-xs text-slate-500">{work.authorName} / {work.type}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">{projectStatusText[work.projectStatus!]}</td>
              <td className="px-4 py-3">{formatWan(work.words)} / {formatWan(work.targetWords ?? 0)}字 · {getCompletion(work)}%</td>
              <td className="px-4 py-3">{work.chapterCount ?? 0} / {work.plannedChapters ?? 0}</td>
              <td className="px-4 py-3">{work.publishPlatform}</td>
              <td className="px-4 py-3">{syncText[work.syncState]}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button onClick={(event) => { event.stopPropagation(); onOpen(work) }} className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500">{primaryActionText(work)}</button>
                  <button onClick={(event) => { event.stopPropagation(); onManage(work, 'general') }} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">管理</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function OfficialToolsPanel({ selectedWork, toolStates, onEnableTool }: { selectedWork: WorkItem | null; toolStates: Record<string, ToolState>; onEnableTool: (toolTitle: string) => void }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-950">官方工具</h2>
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700">进入技能广场 <ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
      <div className="mt-4 space-y-2">
        {officialTools.map((tool) => {
          const state = selectedWork ? toolStates[tool.title] ?? 'disabled' : 'disabled'
          const Icon = tool.icon
          return (
            <div key={tool.id} className="flex items-center gap-3 rounded-md border border-slate-100 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-50 text-violet-700">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{tool.title}</span>
                  {selectedWork && tool.check && <span className={cn('rounded px-1.5 py-0.5 text-[11px]', state === 'risk' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700')}>{toolStateText[state]}</span>}
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{tool.description}</p>
              </div>
              <button disabled={!selectedWork} onClick={() => onEnableTool(tool.title)} className={cn('h-8 rounded-md border px-3 text-xs font-semibold', selectedWork ? 'border-violet-200 text-violet-700 hover:bg-violet-50' : 'border-slate-200 text-slate-400')}>
                {!selectedWork ? '选择作品后启用' : state === 'disabled' ? '启用' : state === 'running' ? '进行中' : state === 'passed' || state === 'risk' ? '查看' : '管理'}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function CurrentWorkDetail({
  work,
  toolStates,
  onOpenWork,
  onManage,
  onShowSync,
}: {
  work: WorkItem | null
  toolStates: Record<string, ToolState>
  onOpenWork: (work: WorkItem) => void
  onManage: (focus?: ManageFocus) => void
  onShowSync: () => void
}) {
  if (!work) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
        <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3">选择作品后查看当前作品详情</p>
      </section>
    )
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="font-semibold text-slate-950">当前作品详情</h2>
      <div className="mt-4 flex gap-3">
        <div className={cn('h-20 w-24 shrink-0 rounded-md bg-gradient-to-br', work.cover)} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-slate-950">{work.title}</h3>
          <p className="mt-1 text-xs text-slate-500">{work.type} / {projectStatusText[work.projectStatus!]}</p>
          <span className={cn('mt-2 inline-flex rounded px-2 py-1 text-xs font-semibold', work.status === 'local-draft' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>{work.status === 'local-draft' ? '仅本地保存' : syncText[work.syncState]}</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <DetailMetric label="目标字数" value={`${formatWan(work.targetWords ?? 0)}字`} />
        <DetailMetric label="当前字数" value={`${formatWan(work.words)}字`} />
        <DetailMetric label="章节进度" value={`${work.chapterCount ?? 0} / ${work.plannedChapters ?? 0}`} />
        <DetailMetric label="发布平台" value={work.publishPlatform ?? '未设置平台'} />
        <DetailMetric label="本周目标" value={`${work.weeklyUpdateGoal ?? 0} 章`} />
        <DetailMetric label="发布状态" value={work.currentPublishStatus ?? '未发布'} />
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">完成进度</span>
          <span className="font-semibold">{getCompletion(work)}%</span>
        </div>
        <ProgressBar value={getCompletion(work)} />
      </div>
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-slate-900">最近任务</h4>
        <div className="mt-2 space-y-2">
          {(work.recentTasks ?? ['继续推进当前章节']).slice(0, 3).map((task) => <div key={task} className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">{task}</div>)}
        </div>
      </div>
      <ToolChips tools={Object.keys(toolStates).filter((title) => toolStates[title] !== 'disabled')} toolStates={toolStates} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => onOpenWork(work)} className="rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500">进入写作</button>
        <button onClick={() => onManage('general')} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">作品管理</button>
        <button className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-400" title="下一阶段开放">管理工具</button>
        <button onClick={() => onManage('publishStatus')} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">发布设置</button>
        <button onClick={onShowSync} className="col-span-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">查看同步状态</button>
      </div>
    </section>
  )
}

function WorkManagementModal({ work, initialFocus, onClose, onSave }: { work: WorkItem; initialFocus: ManageFocus; onClose: () => void; onSave: (work: WorkItem) => void }) {
  const [draft, setDraft] = useState(() => normalizeWork(work))
  const initialTags = useMemo(() => normalizeTags(work.tags ?? []), [work.tags])
  const initialPlatform = work.publishPlatform && !publishPlatforms.includes(work.publishPlatform) ? '自定义平台' : (work.publishPlatform ?? '未设置平台')
  const [tags, setTags] = useState(initialTags)
  const [tagText, setTagText] = useState('')
  const [platformMode, setPlatformMode] = useState<string>(initialPlatform)
  const [customPlatform, setCustomPlatform] = useState(initialPlatform === '自定义平台' ? (work.publishPlatform ?? '') : '')
  const [error, setError] = useState('')
  const savedSnapshot = useMemo(() => JSON.stringify({
    title: normalizeWork(work).title,
    authorName: normalizeWork(work).authorName ?? '',
    projectStatus: normalizeWork(work).projectStatus,
    currentPublishStatus: normalizeWork(work).currentPublishStatus ?? '',
    targetWords: normalizeWork(work).targetWords ?? 0,
    plannedChapters: normalizeWork(work).plannedChapters ?? 0,
    weeklyUpdateGoal: normalizeWork(work).weeklyUpdateGoal ?? 0,
    publishPlatform: work.publishPlatform ?? '未设置平台',
    summary: normalizeWork(work).summary,
    tags: initialTags,
  }), [work, initialTags])
  const currentSnapshot = JSON.stringify({
    title: draft.title,
    authorName: draft.authorName ?? '',
    projectStatus: draft.projectStatus,
    currentPublishStatus: draft.currentPublishStatus ?? '',
    targetWords: draft.targetWords ?? 0,
    plannedChapters: draft.plannedChapters ?? 0,
    weeklyUpdateGoal: draft.weeklyUpdateGoal ?? 0,
    publishPlatform: getPublishPlatform(),
    summary: draft.summary,
    tags,
  })
  const isDirty = savedSnapshot !== currentSnapshot

  function updateNumber(field: 'targetWords' | 'plannedChapters' | 'weeklyUpdateGoal', value: string) {
    setDraft((current) => ({ ...current, [field]: value === '' ? 0 : Number(value) }))
  }

  function getPublishPlatform() {
    if (platformMode === '自定义平台') return customPlatform.trim() || '自定义平台'
    return platformMode || '未设置平台'
  }

  function requestClose() {
    if (!isDirty || window.confirm('作品管理有未保存修改，确定要关闭吗？')) {
      onClose()
    }
  }

  function addTag() {
    const nextTag = tagText.trim()
    if (!nextTag) return
    setTags((current) => normalizeTags([...current, nextTag]))
    setTagText('')
    setError('')
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    addTag()
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((item) => item !== tag))
  }

  function save() {
    const title = draft.title.trim()
    if (!title) {
      setError('作品名不能为空。')
      return
    }
    if (!isNonNegativeInteger(draft.targetWords) || !isNonNegativeInteger(draft.plannedChapters) || !isNonNegativeInteger(draft.weeklyUpdateGoal)) {
      setError('目标字数、计划章节数、本周更新目标必须填写为 0 或正整数。')
      return
    }
    if (platformMode === '自定义平台' && !customPlatform.trim()) {
      setError('选择自定义平台时，请填写平台名称。')
      return
    }
    onSave({
      ...draft,
      title,
      authorName: draft.authorName?.trim() || '创作者',
      currentPublishStatus: draft.currentPublishStatus?.trim() || '未发布',
      publishPlatform: getPublishPlatform() as WorkItem['publishPlatform'],
      summary: draft.summary.trim(),
      tags,
    })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/30 p-6 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-lg border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">作品管理</h2>
            <p className="mt-1 text-sm text-slate-500">编辑项目基础字段。保存后会同步刷新卡片、列表和右侧详情。</p>
          </div>
          <button onClick={requestClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 px-6 py-5">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {isDirty && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">有未保存修改，关闭弹窗前会提示确认。</div>}

          <section className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">基础信息</h3>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Field label="作品名">
                <input autoFocus={initialFocus === 'title' || initialFocus === 'general'} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="field-input" />
              </Field>
              <Field label="笔名">
                <input value={draft.authorName ?? ''} onChange={(event) => setDraft({ ...draft, authorName: event.target.value })} className="field-input" />
              </Field>
              <Field label="项目状态">
                <select value={draft.projectStatus} onChange={(event) => setDraft({ ...draft, projectStatus: event.target.value as ProjectStatus })} className="field-input">
                  {(Object.keys(projectStatusText) as ProjectStatus[]).filter((status) => draft.status === 'local-draft' || status !== 'local-draft').map((status) => <option key={status} value={status}>{projectStatusText[status]}</option>)}
                </select>
              </Field>
              <Field label="当前发布状态">
                <input autoFocus={initialFocus === 'publishStatus'} value={draft.currentPublishStatus ?? ''} onChange={(event) => setDraft({ ...draft, currentPublishStatus: event.target.value })} className="field-input" placeholder="例如：未发布 / 准备连载 / 已上架" />
              </Field>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">状态规划</h3>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Field label="目标字数">
                <input autoFocus={initialFocus === 'targetWords'} type="number" min={0} step={1} value={draft.targetWords ?? 0} onChange={(event) => updateNumber('targetWords', event.target.value)} className="field-input" />
              </Field>
              <Field label="计划章节数">
                <input type="number" min={0} step={1} value={draft.plannedChapters ?? 0} onChange={(event) => updateNumber('plannedChapters', event.target.value)} className="field-input" />
              </Field>
              <Field label="本周更新目标">
                <input type="number" min={0} step={1} value={draft.weeklyUpdateGoal ?? 0} onChange={(event) => updateNumber('weeklyUpdateGoal', event.target.value)} className="field-input" />
              </Field>
              <Field label="发布平台">
                <select autoFocus={initialFocus === 'publishPlatform'} value={platformMode} onChange={(event) => setPlatformMode(event.target.value)} className="field-input">
                  {publishPlatforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                </select>
              </Field>
              {platformMode === '自定义平台' && (
                <Field label="自定义平台名称">
                  <input value={customPlatform} onChange={(event) => setCustomPlatform(event.target.value)} className="field-input" placeholder="例如：豆瓣阅读 / 小红书专栏" />
                </Field>
              )}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">内容资料</h3>
            <div className="mt-3 grid gap-4">
              <Field label="简介 / 一句话卖点">
                <textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} className="field-input h-24 resize-none leading-6" />
              </Field>
              <Field label="标签">
                <div className="rounded-md border border-slate-200 px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="text-slate-400 hover:text-slate-700" aria-label={`删除标签 ${tag}`}>×</button>
                      </span>
                    ))}
                    {!tags.length && <span className="text-xs text-slate-400">暂无标签</span>}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input value={tagText} onChange={(event) => setTagText(event.target.value)} onKeyDown={handleTagKeyDown} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="输入标签后按回车添加" />
                    <button type="button" onClick={addTag} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">添加</button>
                  </div>
                </div>
              </Field>
            </div>
          </section>

          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
            复制、导出、归档、删除、真实发布和云端同步将在下一阶段接入。本弹窗只保存项目字段。
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={requestClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">取消</button>
          <button onClick={save} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">保存</button>
        </footer>
      </section>
    </div>
  )
}

function WorkExportModal({ work, onClose, onExport }: { work: WorkItem; onClose: () => void; onExport: (format: ExportFormat) => void }) {
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/30 p-6 backdrop-blur-sm">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">导出作品</h2>
            <p className="mt-1 text-sm text-slate-500">{work.title || '未命名作品'}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            当前导出内容来自本地保存数据。导出不会删除或修改当前作品。JSON 仅用于备份，当前版本暂不支持导入恢复。
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onExport('markdown')} className="rounded-md border border-slate-200 p-4 text-left hover:border-slate-400 hover:bg-slate-50">
              <FileText className="h-5 w-5 text-slate-700" />
              <div className="mt-3 font-semibold text-slate-950">Markdown</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">适合阅读、备份和手动整理正文。</p>
            </button>
            <button onClick={() => onExport('json')} className="rounded-md border border-slate-200 p-4 text-left hover:border-slate-400 hover:bg-slate-50">
              <Download className="h-5 w-5 text-slate-700" />
              <div className="mt-3 font-semibold text-slate-950">JSON 备份</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">包含作品数据、章节数据和可读取的故事线数据。</p>
            </button>
          </div>
        </div>

        <footer className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">取消</button>
        </footer>
      </section>
    </div>
  )
}

function MoreMenu({
  onAction,
  onExport,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  onAction: (focus: ManageFocus) => void
  onExport?: () => void
  onDuplicate?: () => void
  onArchive?: () => void
  onDelete?: () => void
}) {
  return (
    <details onClick={(event) => event.stopPropagation()} className="absolute right-3 top-3">
      <summary className="list-none rounded-md bg-white/85 p-1.5 text-slate-600 shadow-sm hover:bg-white">
        <MoreVertical className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-40 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
        <MenuButton icon={PenLine} label="重命名" onClick={() => onAction('title')} />
        <MenuButton icon={Target} label="设置目标字数" onClick={() => onAction('targetWords')} />
        <MenuButton icon={Settings} label="设置发布平台" onClick={() => onAction('publishPlatform')} />
        <MenuButton icon={Copy} label="复制作品" onClick={onDuplicate} disabled={!onDuplicate} />
        <MenuButton icon={Download} label="导出作品" onClick={onExport} disabled={!onExport} />
        <MenuButton icon={Eye} label="归档" onClick={onArchive} disabled={!onArchive} />
        <MenuButton icon={Trash2} label="删除" onClick={onDelete} disabled={!onDelete} danger />
      </div>
    </details>
  )
}

function MenuButton({ icon: Icon, label, onClick, disabled, danger }: { icon: typeof PenLine; label: string; onClick?: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} title={disabled ? '下一阶段开放' : undefined} className={cn('flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300', danger ? 'text-red-500' : 'text-slate-600')}>
      <Icon className="h-3.5 w-3.5" />
      {label}
      {disabled && <span className="ml-auto text-[10px]">待开放</span>}
    </button>
  )
}

function StatCard({ icon: Icon, label, value, subText, active, onClick }: { icon: typeof BookOpen; label: string; value: string; subText: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('rounded-md border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md', active ? 'border-violet-500 ring-2 ring-violet-100' : 'border-slate-200')}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-violet-50 text-violet-700"><Icon className="h-5 w-5" /></span>
        <div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-500">{subText}</div>
    </button>
  )
}

function FilterSelect({ value, onChange, options, labels }: { value: string; onChange: (value: string) => void; options: readonly string[]; labels?: Record<string, string> }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-violet-100">
      {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}
    </select>
  )
}

function ViewButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Grid2X2; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('inline-flex h-8 items-center gap-1.5 rounded px-3 text-sm', active ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50')} title={label}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function HomeWorkSection({ title, note, works, emptyText, onOpenWork }: { title: string; note: string; works: WorkItem[]; emptyText: string; onOpenWork: (work: WorkItem) => void }) {
  return (
    <section className="mt-9">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-sm text-slate-500">{note}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {works.length === 0 ? <EmptyBlock text={emptyText} /> : works.map((work) => <ProjectCard key={work.id} work={work} selected={false} onSelect={() => undefined} onOpen={() => onOpenWork(work)} onManage={() => undefined} />)}
      </div>
    </section>
  )
}

function ToolCard({ icon: Icon, title, text, onClick }: { icon: typeof Sparkles; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-[210px] flex-col justify-center rounded-md border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-violet-300 hover:bg-violet-50">
      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-violet-100 text-violet-700">
        <Icon className="h-6 w-6" />
      </span>
      <span className="mt-4 font-semibold">{title}</span>
      <span className="mt-2 text-sm leading-6 text-slate-500">{text}</span>
    </button>
  )
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="col-span-3 flex min-h-[150px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-white text-sm text-slate-500">
      <BookOpen className="mr-2 h-5 w-5 text-slate-400" />
      {text}
    </div>
  )
}

function EmptyLibrary({ onNewWork }: { onNewWork: () => void }) {
  return (
    <section className="mt-4 flex min-h-[300px] flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-white text-center">
      <BookOpen className="h-10 w-10 text-slate-300" />
      <h2 className="mt-3 font-semibold text-slate-950">暂无匹配作品</h2>
      <p className="mt-2 text-sm text-slate-500">可以重置筛选，或新建一个临时草稿开始。</p>
      <button onClick={onNewWork} className="mt-4 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500">新建作品</button>
    </section>
  )
}

function ToolChips({ tools, toolStates }: { tools: string[]; toolStates: Record<string, ToolState> }) {
  if (tools.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {tools.slice(0, 5).map((tool) => (
        <span key={tool} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {tool} <span className="text-emerald-600">{toolStateText[toolStates[tool] ?? 'enabled']}</span>
        </span>
      ))}
    </div>
  )
}

function InfoPill({ icon: Icon, text, tone }: { icon: typeof BookOpen; text: string; tone?: 'ok' | 'warn' }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 rounded bg-slate-50 px-2 py-1', tone === 'ok' && 'text-emerald-600', tone === 'warn' && 'text-amber-600')}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{text}</span>
    </span>
  )
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 truncate font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-2 rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

function normalizeWork(work: WorkItem): WorkItem {
  const isLocal = work.status === 'local-draft'
  const targetWords = asNonNegativeInteger(work.targetWords, isLocal ? 300000 : 600000)
  const plannedChapters = asNonNegativeInteger(work.plannedChapters, isLocal ? 60 : 120)
  const chapterCount = asNonNegativeInteger(work.chapterCount, Math.max(1, Math.ceil((work.words || 0) / 4500)))
  const defaultToolStates: Record<string, ToolState> = isLocal ? { '黄金第一章': 'enabled' } : { '黄金第一章': 'enabled', '长篇记忆': 'enabled', 'OOC 检查': 'passed' }
  return {
    ...work,
    title: work.title || '未命名作品',
    type: work.type || '待整理题材',
    projectStatus: work.projectStatus ?? (isLocal ? 'local-draft' : 'serializing'),
    syncState: work.syncState ?? (isLocal ? 'local-only' : 'synced'),
    words: asNonNegativeInteger(work.words, 0),
    targetWords,
    plannedChapters,
    chapterCount,
    currentPublishStatus: work.currentPublishStatus ?? (isLocal ? '未发布' : '准备连载'),
    weeklyUpdateGoal: asNonNegativeInteger(work.weeklyUpdateGoal, isLocal ? 1 : 3),
    authorName: work.authorName ?? '创作者',
    publishPlatform: work.publishPlatform ?? '未设置平台',
    updatedAt: work.updatedAt || '刚刚',
    createdAt: work.createdAt ?? work.updatedAt ?? '刚刚',
    monthlyUpdatedChapters: asNonNegativeInteger(work.monthlyUpdatedChapters, work.updatedAt?.includes('刚刚') ? 1 : 0),
    tags: Array.isArray(work.tags) ? work.tags : [],
    summary: work.summary || '待补充作品简介。',
    sellingPoint: work.sellingPoint ?? '',
    description: work.description ?? work.summary ?? '',
    globalOutline: Array.isArray(work.globalOutline) ? work.globalOutline : [],
    protagonists: Array.isArray(work.protagonists) ? work.protagonists : [],
    mainCharacters: Array.isArray(work.mainCharacters) ? work.mainCharacters : [],
    worldRules: Array.isArray(work.worldRules) ? work.worldRules : [],
    coreConflict: work.coreConflict ?? '',
    cover: work.cover || 'from-blue-700 via-violet-500 to-fuchsia-300',
    enabledTools: work.enabledTools ?? Object.keys(defaultToolStates),
    toolStates: work.toolStates ?? defaultToolStates,
    recentTasks: work.recentTasks ?? ['继续写作当前章节', '检查设定一致性'],
  }
}

function asNonNegativeInteger(value: unknown, fallback: number) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue < 0) return fallback
  return Math.floor(numberValue)
}

function isNonNegativeInteger(value: unknown) {
  const numberValue = Number(value)
  return Number.isInteger(numberValue) && numberValue >= 0
}

function normalizeTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)))
}

function cloneWorkForLocalCopy(work: WorkItem): WorkItem {
  const source = work as WorkItem & Record<string, unknown>
  const nowId = Date.now()
  const title = safeText(work.title, '未命名作品')
  return {
    ...source,
    id: `work-copy-${nowId}`,
    title: `${title} 副本`,
    status: 'local-draft',
    projectStatus: 'local-draft',
    syncState: 'local-only',
    currentPublishStatus: '未发布',
    updatedAt: '刚刚',
    createdAt: '刚刚',
    tags: normalizeTags([...(work.tags ?? []), '副本', '仅本地保存']),
    enabledTools: [],
    toolStates: {},
    recentTasks: ['检查副本内容并继续写作'],
  } as WorkItem
}

function createWorkFromBackup(backup: unknown): WorkItem {
  const source = typeof backup === 'object' && backup ? backup as Record<string, unknown> : {}
  const rawWork = typeof source.work === 'object' && source.work ? source.work as Record<string, unknown> : null
  if (!rawWork) throw new Error('missing work')

  const chapters = Array.isArray(source.chapters) ? source.chapters.map((chapter, index) => normalizeExportChapter(chapter, index, new Date())) : []
  const firstChapter = chapters[0]
  const baseTitle = safeText(rawWork.title, '导入作品')
  const imported = normalizeWork({
    ...(rawWork as unknown as WorkItem),
    id: `work-import-${Date.now()}`,
    title: `${baseTitle}（导入）`,
    status: 'local-draft',
    projectStatus: 'local-draft',
    syncState: 'local-only',
    currentPublishStatus: safeText(rawWork.currentPublishStatus, '未发布'),
    updatedAt: '刚刚',
    createdAt: '刚刚',
    tags: normalizeTags([...(Array.isArray(rawWork.tags) ? rawWork.tags.map(String) : []), '导入备份', '仅本地保存']),
    words: chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
    chapterCount: chapters.length,
    enabledTools: [],
    toolStates: {},
    recentTasks: ['检查导入内容并继续写作'],
    chapterTitle: firstChapter?.title ?? '未命名章节',
    chapterText: firstChapter?.content ?? '',
    chapters,
    importedStorylineData: source.storylineData ?? {},
  } as WorkItem)

  return imported
}

function downloadWorkExport(work: WorkItem, format: ExportFormat) {
  const exportedAt = new Date()
  const chapters = getExportChapters(work, exportedAt)
  const filename = buildExportFilename(work.title, format, exportedAt)
  const content = format === 'markdown'
    ? buildMarkdownExport(work, chapters, exportedAt)
    : JSON.stringify(buildJsonExport(work, chapters, exportedAt), null, 2)
  const type = format === 'markdown' ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8'
  downloadTextFile(filename, content, type)
}

function buildMarkdownExport(work: WorkItem, chapters: ExportChapter[], exportedAt: Date) {
  const outline = listMarkdown(work.globalOutline)
  const protagonists = listMarkdown(work.protagonists)
  const mainCharacters = listMarkdown(work.mainCharacters)
  const worldRules = listMarkdown(work.worldRules)
  const tags = (work.tags ?? []).length ? (work.tags ?? []).join('、') : '暂无'
  const chapterSections = chapters.length
    ? chapters.map((chapter, index) => {
      const title = safeText(chapter.title, `第 ${index + 1} 章`)
      const content = safeText(chapter.content, '暂无正文。')
      return `## ${title}\n\n${content}`
    }).join('\n\n')
    : '暂无章节正文。'

  return [
    `# ${safeText(work.title, '未命名作品')}`,
    '',
    '## 作品基础信息',
    '',
    `- 作品名：${safeText(work.title)}`,
    `- 笔名 / 作者名：${safeText(work.authorName)}`,
    `- 题材：${safeText(work.type)}`,
    `- 标签：${tags}`,
    `- 项目状态：${safeText(work.projectStatus ? projectStatusText[work.projectStatus] : '')}`,
    `- 当前发布状态：${safeText(work.currentPublishStatus)}`,
    `- 发布平台：${safeText(work.publishPlatform)}`,
    `- 当前字数：${safeInteger(work.words)}`,
    `- 目标字数：${safeInteger(work.targetWords)}`,
    `- 当前章节数：${safeInteger(work.chapterCount)}`,
    `- 计划章节数：${safeInteger(work.plannedChapters)}`,
    `- 导出时间：${formatExportDateTime(exportedAt)}`,
    '',
    '## 作品核心信息',
    '',
    `- 一句话卖点：${safeText(work.sellingPoint)}`,
    `- 简介：${safeText(work.description || work.summary)}`,
    `- 核心冲突：${safeText(work.coreConflict)}`,
    '',
    '### 全局大纲',
    '',
    outline,
    '',
    '### 主角',
    '',
    protagonists,
    '',
    '### 主要人物',
    '',
    mainCharacters,
    '',
    '### 世界规则',
    '',
    worldRules,
    '',
    '## 正文内容',
    '',
    chapterSections,
    '',
  ].join('\n')
}

function buildJsonExport(work: WorkItem, chapters: ExportChapter[], exportedAt: Date) {
  return sanitizeForExport({
    exportVersion: 1,
    exportedAt: exportedAt.toISOString(),
    source: 'novel-ai-copilot-local',
    work: sanitizeWorkForExport(work),
    chapters,
    storylineData: readStorylineData(work.id),
  })
}

type ExportChapter = {
  id: string
  title: string
  content: string
  status: string
  wordCount: number
  createdAt: string
  updatedAt: string
}

function getExportChapters(work: WorkItem, exportedAt: Date): ExportChapter[] {
  const rawChapters = (work as WorkItem & { chapters?: unknown[] }).chapters
  if (Array.isArray(rawChapters) && rawChapters.length > 0) {
    return rawChapters.map((chapter, index) => normalizeExportChapter(chapter, index, exportedAt))
  }

  const single = work as WorkItem & { chapterTitle?: string; chapterText?: string; chapterStatus?: string }
  return [normalizeExportChapter({
    id: 'chapter-1',
    title: single.chapterTitle || '未命名章节',
    content: single.chapterText || '',
    status: single.chapterStatus || 'draft',
    createdAt: work.createdAt || '',
    updatedAt: work.updatedAt || '',
  }, 0, exportedAt)]
}

function normalizeExportChapter(chapter: unknown, index: number, exportedAt: Date): ExportChapter {
  const item = typeof chapter === 'object' && chapter ? chapter as Record<string, unknown> : {}
  const content = safeText(item.content ?? item.text ?? item.chapterText, '')
  return {
    id: safeText(item.id, `chapter-${index + 1}`),
    title: safeText(item.title ?? item.chapterTitle, `第 ${index + 1} 章`),
    content,
    status: safeText(item.status, 'draft'),
    wordCount: safeInteger(item.wordCount, countExportWords(content)),
    createdAt: safeText(item.createdAt, formatExportDateTime(exportedAt)),
    updatedAt: safeText(item.updatedAt, formatExportDateTime(exportedAt)),
  }
}

function sanitizeWorkForExport(work: WorkItem) {
  const source = work as WorkItem & { chapterTitle?: string; chapterText?: string; chapters?: unknown[] }
  return sanitizeForExport({
    ...work,
    chapterTitle: source.chapterTitle,
    chapterText: source.chapterText,
    chapters: undefined,
  })
}

function sanitizeForExport(value: unknown): unknown {
  if (value === undefined || value === null) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(sanitizeForExport)
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sanitizeForExport(item)]))
  }
  return ''
}

function readStorylineData(workId: string) {
  try {
    const raw = localStorage.getItem(`yixie-storyline-data-v1-${workId}`)
    if (!raw) return {}
    return sanitizeForExport(JSON.parse(raw))
  } catch {
    return {}
  }
}

function listMarkdown(items?: string[]) {
  const normalized = Array.isArray(items) ? items.map((item) => item.trim()).filter(Boolean) : []
  if (!normalized.length) return '暂无'
  return normalized.map((item) => `- ${item}`).join('\n')
}

function safeText(value: unknown, fallback = '暂无') {
  if (value === undefined || value === null) return fallback
  const text = String(value).trim()
  if (!text || text === 'undefined' || text === 'null' || text === 'NaN') return fallback
  return text
}

function safeInteger(value: unknown, fallback = 0) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || Number.isNaN(numberValue)) return fallback
  return Math.max(0, Math.floor(numberValue))
}

function countExportWords(text: string) {
  return text.replace(/\s/g, '').length
}

function buildExportFilename(title: string | undefined, format: ExportFormat, date: Date) {
  const safeTitle = sanitizeFilename(title || 'novel-ai-copilot-work')
  const stamp = formatFilenameDate(date)
  return format === 'markdown'
    ? `${safeTitle}-导出-${stamp}.md`
    : `${safeTitle}-备份-${stamp}.json`
}

function sanitizeFilename(value: string) {
  const cleaned = value.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-')
  return cleaned || 'novel-ai-copilot-work'
}

function formatFilenameDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
}

function formatExportDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function getCompletion(work: WorkItem) {
  const target = work.targetWords || 1
  return Math.min(100, Math.round((work.words / target) * 100))
}

function formatWan(value: number) {
  if (value >= 10000) return `${Number((value / 10000).toFixed(value >= 100000 ? 1 : 2))}万`
  return value.toLocaleString()
}

function primaryActionText(work: WorkItem) {
  if (work.projectStatus === 'completed') return '查看作品'
  if (work.projectStatus === 'published') return '发布管理'
  if (work.projectStatus === 'serializing') return '进入写作'
  return '继续写作'
}

function statusBadgeClass(status?: ProjectStatus) {
  if (status === 'published') return 'bg-orange-500'
  if (status === 'completed') return 'bg-blue-500'
  if (status === 'archived') return 'bg-slate-500'
  if (status === 'draft') return 'bg-slate-500'
  return 'bg-violet-600'
}

function getTimeValue(value?: string) {
  if (!value) return 0
  if (value.includes('刚刚') || value.includes('分钟前')) return Date.now()
  if (value.includes('小时')) return Date.now() - 60 * 60 * 1000
  if (value.includes('昨天')) return Date.now() - 24 * 60 * 60 * 1000
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}
