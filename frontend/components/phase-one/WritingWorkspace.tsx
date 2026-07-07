'use client'

import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Archive,
  BookOpen,
  Brain,
  CheckCircle2,
  Clipboard,
  Database,
  Download,
  Edit3,
  Eye,
  FileText,
  Film,
  Flag,
  Folder,
  Gamepad2,
  Globe2,
  History,
  Layers,
  Lightbulb,
  Link2,
  Loader2,
  MapPin,
  MessageSquare,
  PenLine,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserRound,
  Wand2,
  X,
} from 'lucide-react'
import type { CheckIssue, CheckIssueType, IssueSeverity, LoreEntry, LoreType, MemoryEntry, MemoryType, OperationStatus, SavedWork, WorkChapter } from './types'
import { cn } from '@/lib/utils'

type WorkspaceView = 'overview' | 'editor' | 'lore' | 'memory' | 'checks' | 'ip'
type IpFactoryMode = 'screenplay' | 'game'
const backendApiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'
type PromptRunStatus = 'copied' | 'parsed'
type ArtifactKind = 'summary' | 'check' | 'web-ai' | 'screenplay' | 'game'

interface PromptRunRecord {
  id: string
  target: 'check' | 'memory'
  status: PromptRunStatus
  createdAt: string
  promptCharacters: number
  estimatedTokens: number
  resultCharacters: number
}

interface ArtifactRecord {
  id: string
  kind: ArtifactKind
  title: string
  content: string
  createdAt: string
  chapterTitle: string
  source: 'local' | 'web-ai' | 'backend'
}

const loreTypeLabels: Record<LoreType, string> = {
  work: '作品资料',
  character: '人物设定',
  world: '世界观设定',
  location: '地点设定',
  item: '物品设定',
  faction: '势力设定',
  foreshadow: '伏笔线索',
  'chapter-summary': '章节摘要',
}

const loreTypeIcons: Record<LoreType, LucideIcon> = {
  work: BookOpen,
  character: UserRound,
  world: Globe2,
  location: MapPin,
  item: Archive,
  faction: Flag,
  foreshadow: Link2,
  'chapter-summary': FileText,
}

const memoryTypeLabels: Record<MemoryType, string> = {
  event: '已发生事件',
  'character-state': '人物状态变化',
  'world-fact': '世界观事实',
  'open-foreshadow': '未回收伏笔',
  'chapter-summary': '最近章节摘要',
  rule: '禁止违背设定',
}

const issueTypeLabels: Record<CheckIssueType, string> = {
  'character-ooc': '人物 OOC',
  'setting-conflict': '设定冲突',
  'timeline-conflict': '时间线矛盾',
  'open-foreshadow': '伏笔未回收',
  'emotion-flow': '情绪推进异常',
  'chapter-goal': '章节目标偏离',
}

const severityLabels: Record<IssueSeverity, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
}

const memoryStatusText: Record<NonNullable<MemoryEntry['status']>, string> = {
  draft: '待确认',
  confirmed: '已确认',
  rejected: '已拒绝',
  stale: '可能过期',
}

const memoryCreatedByText: Record<NonNullable<MemoryEntry['createdBy']>, string> = {
  user: '用户手动',
  local: '本地生成',
  'web-ai': '网页 AI',
}

export function WritingWorkspace({
  work: rawWork,
  status,
  message,
  initialView = 'editor',
  onBackHome,
  onOpenStoryGraph,
  onWorkChange,
  onSave,
}: {
  work: SavedWork
  status: OperationStatus
  message: string
  initialView?: WorkspaceView
  onBackHome: () => void
  onOpenStoryGraph?: () => void
  onWorkChange: (work: SavedWork) => void
  onSave: () => void
}) {
  const work = normalizeWorkspaceWork(rawWork)
  const [view, setView] = useState<WorkspaceView>(initialView)
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>(() => seedLore(work))
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>(() => seedMemory(work))
  const [checkIssues, setCheckIssues] = useState<CheckIssue[]>([])
  const [selectedLoreId, setSelectedLoreId] = useState('')
  const [loreSearch, setLoreSearch] = useState('')
  const [loreFilter, setLoreFilter] = useState<LoreType | 'all'>('all')
  const [loreDraft, setLoreDraft] = useState<LoreEntry>(() => blankLore('character'))
  const [workspaceStatus, setWorkspaceStatus] = useState<OperationStatus>('idle')
  const [workspaceMessage, setWorkspaceMessage] = useState('')
  const [webAiOpen, setWebAiOpen] = useState(false)
  const [webAiTarget, setWebAiTarget] = useState<'check' | 'memory'>('check')
  const [webAiResult, setWebAiResult] = useState('')
  const [promptRuns, setPromptRuns] = useState<PromptRunRecord[]>([])
  const [artifactRecords, setArtifactRecords] = useState<ArtifactRecord[]>([])
  const [ipMode, setIpMode] = useState<IpFactoryMode>('screenplay')
  const [ipOutput, setIpOutput] = useState('')
  const [ipGenerating, setIpGenerating] = useState(false)
  const storageKey = `yixie-phase3-workspace-${work.id}`
  const promptRunStorageKey = `yixie-prompt-runs-v1-${work.id}`
  const artifactStorageKey = `yixie-artifact-runs-v1-${work.id}`
  const chapters = normalizeWorkspaceChapters(work)
  const currentChapter = chapters.find((chapter) => chapter.id === selectedChapterId) ?? chapters[0]
  const wordCount = currentChapter.content.replace(/\s/g, '').length

  useEffect(() => {
    setView(initialView)
  }, [initialView, work.id])

  useEffect(() => {
    setSelectedChapterId((current) => {
      if (chapters.some((chapter) => chapter.id === current)) return current
      return chapters[0]?.id || ''
    })
  }, [work.id, chapters])

  useEffect(() => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { loreEntries?: LoreEntry[]; memoryEntries?: MemoryEntry[]; checkIssues?: CheckIssue[] }
      if (parsed.loreEntries?.length) setLoreEntries(parsed.loreEntries)
      if (parsed.memoryEntries?.length) setMemoryEntries(parsed.memoryEntries.map(normalizeMemoryEntry))
      if (parsed.checkIssues) setCheckIssues(parsed.checkIssues)
    } catch {
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ loreEntries, memoryEntries, checkIssues, syncState: work.syncState }))
  }, [checkIssues, loreEntries, memoryEntries, storageKey, work.syncState])

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(promptRunStorageKey) || '[]')
      setPromptRuns(Array.isArray(parsed) ? parsed.slice(0, 20) : [])
    } catch {
      setPromptRuns([])
      localStorage.removeItem(promptRunStorageKey)
    }
  }, [promptRunStorageKey])

  useEffect(() => {
    localStorage.setItem(promptRunStorageKey, JSON.stringify(promptRuns.slice(0, 20)))
  }, [promptRunStorageKey, promptRuns])

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(artifactStorageKey) || '[]')
      setArtifactRecords(Array.isArray(parsed) ? parsed.slice(0, 30) : [])
    } catch {
      setArtifactRecords([])
      localStorage.removeItem(artifactStorageKey)
    }
  }, [artifactStorageKey])

  useEffect(() => {
    localStorage.setItem(artifactStorageKey, JSON.stringify(artifactRecords.slice(0, 30)))
  }, [artifactRecords, artifactStorageKey])

  const selectedLore = loreEntries.find((entry) => entry.id === selectedLoreId) ?? loreEntries[0]
  const filteredLore = loreEntries.filter((entry) => {
    const hitType = loreFilter === 'all' || entry.type === loreFilter
    const keyword = loreSearch.trim().toLowerCase()
    const hitSearch = !keyword || `${entry.title} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase().includes(keyword)
    return hitType && hitSearch
  })
  const memoryStats = useMemo(() => {
    return Object.keys(memoryTypeLabels).map((key) => ({
      type: key as MemoryType,
      count: memoryEntries.filter((entry) => entry.type === key).length,
    }))
  }, [memoryEntries])
  const openIssues = checkIssues.filter((issue) => issue.status === 'open')
  const webAiPrompt = useMemo(() => buildWorkspacePrompt(webAiTarget, work, loreEntries, memoryEntries), [loreEntries, memoryEntries, webAiTarget, work])

  function flash(nextStatus: OperationStatus, nextMessage: string) {
    setWorkspaceStatus(nextStatus)
    setWorkspaceMessage(nextMessage)
    if (nextStatus === 'success') {
      window.setTimeout(() => {
        setWorkspaceStatus('idle')
        setWorkspaceMessage('')
      }, 1800)
    }
  }

  function saveLoreDraft() {
    if (!loreDraft.title.trim() || !loreDraft.content.trim()) {
      flash('error', '请填写资料标题和内容。')
      return
    }
    const next = { ...loreDraft, updatedAt: '刚刚', tags: normalizeTags(loreDraft.tags) }
    setLoreEntries((current) => current.some((entry) => entry.id === next.id) ? current.map((entry) => entry.id === next.id ? next : entry) : [next, ...current])
    setSelectedLoreId(next.id)
    flash('success', work.syncState === 'local-only' ? '资料已保存到本地。' : '资料已保存，后续可接入后端同步。')
  }

  function editLore(entry: LoreEntry) {
    setLoreDraft(entry)
    setSelectedLoreId(entry.id)
  }

  function deleteLore(id: string) {
    setLoreEntries((current) => current.filter((entry) => entry.id !== id))
    if (selectedLoreId === id) setSelectedLoreId('')
    flash('success', '资料已删除。')
  }

  function generateChapterSummary() {
    setWorkspaceStatus('loading')
    setWorkspaceMessage('正在从当前章节生成摘要...')
    window.setTimeout(() => {
      const summary = localSummary(currentChapter.content)
      recordArtifact('summary', `${currentChapter.title} 摘要`, summary, 'local')
      const summaryLore: LoreEntry = {
        id: `lore-summary-${Date.now()}`,
        title: `${currentChapter.title} 摘要`,
        type: 'chapter-summary',
        content: summary,
        tags: ['章节摘要', '自动生成'],
        relatedChapterIds: [currentChapter.id],
        updatedAt: '刚刚',
      }
      const memory: MemoryEntry = {
        id: `memory-summary-${Date.now()}`,
        type: 'chapter-summary',
        title: `${currentChapter.title} 摘要`,
        content: summary,
        sourceChapterId: currentChapter.id,
        updatedAt: '刚刚',
        status: 'draft',
        confidence: 0.7,
        sourceText: currentChapter.content.slice(0, 240),
        createdBy: 'local',
        createdAt: '刚刚',
      }
      setLoreEntries((current) => [summaryLore, ...current])
      setMemoryEntries((current) => [memory, ...current])
      setView('memory')
      flash('success', '章节摘要已生成，并写入长篇记忆。')
    }, 550)
  }

  function addMemory(type: MemoryType) {
    const entry: MemoryEntry = {
      id: `memory-${Date.now()}`,
      type,
      title: memoryTypeLabels[type],
      content: type === 'rule' ? '禁止违背已确认的人物动机、世界观规则和章节目标。' : '双击或直接编辑这条记忆内容。',
      sourceChapterId: 'chapter-1',
      updatedAt: '刚刚',
      status: 'draft',
      confidence: 1,
      sourceText: '',
      createdBy: 'user',
      createdAt: '刚刚',
    }
    setMemoryEntries((current) => [entry, ...current])
    flash('success', '记忆条目已新增。')
  }

  function updateMemory(id: string, content: string) {
    setMemoryEntries((current) => current.map((entry) => entry.id === id ? { ...entry, content, updatedAt: '刚刚' } : entry))
  }

  function updateMemoryStatus(id: string, status: NonNullable<MemoryEntry['status']>) {
    setMemoryEntries((current) => current.map((entry) => entry.id === id ? { ...entry, status, updatedAt: '刚刚' } : entry))
    flash('success', status === 'confirmed' ? '记忆条目已确认。' : status === 'rejected' ? '记忆条目已拒绝。' : '记忆条目已标记为可能过期。')
  }

  function deleteMemory(id: string) {
    setMemoryEntries((current) => current.filter((entry) => entry.id !== id))
    flash('success', '记忆条目已删除。')
  }

  function runLocalCheck() {
    setWorkspaceStatus('loading')
    setWorkspaceMessage('正在执行本地 OOC / 伏笔检查...')
    window.setTimeout(() => {
      const issues = localCheck(work, loreEntries, memoryEntries)
      setCheckIssues(issues)
      recordArtifact('check', `${currentChapter.title} 本地检查`, issues.map((issue) => `${severityLabels[issue.severity]}｜${issueTypeLabels[issue.issueType]}\n${issue.description}\n建议：${issue.suggestion}`).join('\n\n'), 'local')
      setView('checks')
      flash('success', '检查完成，结果已生成。')
    }, 650)
  }

  function updateIssueStatus(id: string, nextStatus: CheckIssue['status']) {
    setCheckIssues((current) => current.map((issue) => issue.id === id ? { ...issue, status: nextStatus } : issue))
  }

  function copySuggestion(text: string) {
    navigator.clipboard?.writeText(text)
    flash('success', '修改建议已复制。')
  }

  function insertSuggestion(text: string) {
    updateChapter({ content: `${currentChapter.content}\n\n【修改区】${text}` })
    flash('success', '建议已插入到正文末尾的修改区。')
  }

  function updateChapter(patch: Partial<WorkChapter>) {
    const nextChapters = chapters.map((chapter) => {
      if (chapter.id !== currentChapter.id) return chapter
      const nextContent = typeof patch.content === 'string' ? patch.content : chapter.content
      return {
        ...chapter,
        ...patch,
        content: nextContent,
        wordCount: nextContent.replace(/\s/g, '').length,
        updatedAt: '刚刚',
      }
    })
    onWorkChange(applyWorkspaceChapters(work, nextChapters))
  }

  function createChapter() {
    const nextNumber = chapters.reduce((max, chapter) => Math.max(max, chapter.chapterNumber), 0) + 1
    const nextChapter: WorkChapter = {
      id: `chapter-${Date.now()}`,
      chapterNumber: nextNumber,
      title: `第 ${nextNumber} 章`,
      content: '',
      status: 'draft',
      wordCount: 0,
      createdAt: '刚刚',
      updatedAt: '刚刚',
    }
    onWorkChange(applyWorkspaceChapters(work, [...chapters, nextChapter]))
    setSelectedChapterId(nextChapter.id)
    setView('editor')
    flash('success', '新章节已创建，保存后会同步到作品库。')
  }

  function deleteChapter(id: string) {
    if (chapters.length <= 1) {
      flash('error', '至少保留一个章节。')
      return
    }
    const target = chapters.find((chapter) => chapter.id === id)
    if (!target || !window.confirm(`确认删除「${target.title}」吗？保存后后端章节也会同步删除。`)) return
    const nextChapters = chapters.filter((chapter) => chapter.id !== id).map((chapter, index) => ({ ...chapter, chapterNumber: index + 1, updatedAt: '刚刚' }))
    onWorkChange(applyWorkspaceChapters(work, nextChapters))
    setSelectedChapterId(nextChapters[0]?.id || '')
    flash('success', '章节已删除，保存后生效。')
  }

  function togglePublishChapter(id: string) {
    const nextChapters = chapters.map((chapter) => chapter.id === id ? { ...chapter, status: chapter.status === 'published' ? 'draft' as const : 'published' as const, updatedAt: '刚刚' } : chapter)
    onWorkChange(applyWorkspaceChapters(work, nextChapters))
    flash('success', '章节发布状态已更新，保存后会同步。')
  }

  function openWebAi(target: 'check' | 'memory') {
    setWebAiTarget(target)
    setWebAiResult('')
    setWebAiOpen(true)
  }

  function parseWebAiWorkspaceResult() {
    if (!webAiResult.trim()) {
      flash('error', '请先粘贴网页 AI 返回结果。')
      return
    }
    if (webAiTarget === 'check') {
      const parsedIssues = parseCheckIssues(webAiResult)
      setCheckIssues((current) => [...parsedIssues, ...current])
      recordArtifact('web-ai', 'Web AI 检查结果', webAiResult, 'web-ai')
      setView('checks')
      flash('success', '网页 AI 检查结果已解析为卡片。')
    } else {
      const parsedMemories = parseMemoryEntries(webAiResult)
      setMemoryEntries((current) => [...parsedMemories, ...current])
      recordArtifact('web-ai', 'Web AI 记忆结果', webAiResult, 'web-ai')
      setView('memory')
      flash('success', '网页 AI 返回内容已解析为记忆条目。')
    }
    recordPromptRun('parsed', webAiPrompt, webAiResult)
    setWebAiOpen(false)
  }

  function recordPromptRun(status: PromptRunStatus, prompt: string, result = '') {
    const inspection = inspectPrompt(prompt)
    const nextRecord: PromptRunRecord = {
      id: `prompt-run-${Date.now()}`,
      target: webAiTarget,
      status,
      createdAt: new Date().toLocaleString(),
      promptCharacters: inspection.characters,
      estimatedTokens: inspection.estimatedTokens,
      resultCharacters: result.length,
    }
    setPromptRuns((current) => [nextRecord, ...current].slice(0, 20))
  }

  async function generateIpAsset(mode: IpFactoryMode) {
    setIpMode(mode)
    setIpGenerating(true)
    setWorkspaceStatus('loading')
    setWorkspaceMessage(mode === 'screenplay' ? '正在生成短剧脚本...' : '正在生成互动剧情游戏设定包...')

    const request = {
      workTitle: work.title,
      chapterTitle: currentChapter.title,
      chapterContent: currentChapter.content,
      genre: work.type || work.materials.genre,
      sellingPoint: work.sellingPoint || work.materials.sellingPoint,
      summary: work.summary || work.materials.summary,
      characters: uniqueText([...listText(work.protagonists), ...listText(work.mainCharacters), ...work.materials.characters]),
      worldRules: listText(work.worldRules),
      targetScene: currentChapter.title,
      targetDuration: 90,
    }

    try {
      const endpoint = mode === 'screenplay' ? 'screenplay-draft' : 'game-package'
      const response = await fetch(`${backendApiBase}/api/workflow/ip/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      if (!response.ok) throw new Error('后端暂不可用')
      const result = await response.json()
      const text = result?.data
      if (!text) throw new Error('模型没有返回内容')
      setIpOutput(String(text))
      recordArtifact(mode === 'screenplay' ? 'screenplay' : 'game', mode === 'screenplay' ? `${currentChapter.title} 短剧脚本` : `${currentChapter.title} 游戏设定包`, String(text), 'backend')
      setView('ip')
      flash('success', mode === 'screenplay' ? '短剧脚本已生成。' : '互动剧情游戏设定包已生成。')
    } catch {
      const fallback = mode === 'screenplay' ? buildLocalScreenplay(work, currentChapter) : buildLocalGamePackage(work, currentChapter)
      setIpOutput(fallback)
      recordArtifact(mode === 'screenplay' ? 'screenplay' : 'game', mode === 'screenplay' ? `${currentChapter.title} 短剧脚本` : `${currentChapter.title} 游戏设定包`, fallback, 'local')
      setView('ip')
      flash('success', mode === 'screenplay' ? '已生成本地短剧脚本草案。' : '已生成本地游戏设定包草案。')
    } finally {
      setIpGenerating(false)
    }
  }

  function copyIpOutput() {
    if (!ipOutput.trim()) {
      flash('error', '还没有可复制的衍生成果。')
      return
    }
    navigator.clipboard?.writeText(ipOutput)
    flash('success', 'IP 衍生成果已复制。')
  }

  function downloadIpOutput() {
    if (!ipOutput.trim()) {
      flash('error', '还没有可导出的衍生成果。')
      return
    }
    const extension = ipMode === 'game' ? 'json' : 'md'
    const blob = new Blob([ipOutput], { type: ipMode === 'game' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${safeFileName(work.title)}-${ipMode === 'game' ? '互动剧情游戏设定包' : '短剧脚本'}.${extension}`
    link.click()
    URL.revokeObjectURL(url)
    flash('success', '文件已导出到浏览器下载目录。')
  }

  function recordArtifact(kind: ArtifactKind, title: string, content: string, source: ArtifactRecord['source']) {
    if (!content.trim()) return
    const nextRecord: ArtifactRecord = {
      id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      title,
      content,
      createdAt: new Date().toLocaleString(),
      chapterTitle: currentChapter.title,
      source,
    }
    setArtifactRecords((current) => [nextRecord, ...current].slice(0, 30))
  }

  function copyArtifact(record: ArtifactRecord) {
    navigator.clipboard?.writeText(record.content)
    flash('success', '生成结果已复制。')
  }

  function insertArtifact(record: ArtifactRecord) {
    if (record.kind === 'game') {
      flash('error', '游戏设定包更适合复制或导出，不建议直接插入正文。')
      return
    }
    insertSuggestion(record.content)
  }

  function downloadArtifact(record: ArtifactRecord) {
    const extension = record.kind === 'game' ? 'json' : 'md'
    const blob = new Blob([record.content], { type: record.kind === 'game' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${safeFileName(work.title)}-${safeFileName(record.title)}.${extension}`
    link.click()
    URL.revokeObjectURL(url)
    flash('success', '生成结果已导出。')
  }

  const combinedStatus = workspaceStatus !== 'idle' ? workspaceStatus : status
  const combinedMessage = workspaceMessage || message

  return (
    <main className="yixie-editorial min-h-[calc(100vh-5rem)] bg-[#edf1ee] p-4 text-slate-950">
      <div className="mx-auto min-h-[calc(100vh-7rem)] max-w-[1540px] overflow-hidden rounded-lg border border-white/70 bg-white/72 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
        <header className="flex h-[68px] items-center gap-5 border-b border-[#d8e5e4] bg-white/62 px-6">
          <button onClick={onBackHome} className="flex items-center gap-2 text-sm font-semibold text-[#2f7f86]">
            <BookOpen className="h-5 w-5" />
            {work.title}
          </button>
          <div className="h-7 w-px bg-[#d8e5e4]" />
          <span className="text-sm font-medium">{currentChapter.title}</span>
          <span className={cn('rounded-full px-3 py-1 text-xs font-medium', work.syncState === 'local-only' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>
            {work.syncState === 'local-only' ? '本地保存 · 未同步' : '正式作品 · 已同步'}
          </span>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
            <span>字数：{wordCount.toLocaleString()} 字</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 自动保存预览</span>
            <button onClick={onSave} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
              <Save className="h-4 w-4" />
              保存
            </button>
          </div>
        </header>

        {combinedMessage && (
          <div className={cn('mx-6 mt-4 rounded-md border px-4 py-3 text-sm', combinedStatus === 'error' ? 'border-red-200 bg-red-50 text-red-700' : combinedStatus === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700')}>
            {combinedStatus === 'loading' && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
            {combinedMessage}
          </div>
        )}

        <div className="grid h-[calc(100vh-10rem)] min-h-[680px] grid-cols-[270px_minmax(0,1fr)_310px] gap-0 p-4">
          <aside className="mr-4 flex min-h-0 flex-col gap-4">
            <section className="rounded-lg border border-white/70 bg-white/72 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">章节目录</h2>
                <button onClick={createChapter} className="rounded p-1 text-[#2f7f86] hover:bg-[#e7f3f4]" title="新建章节">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <SideButton active={view === 'overview'} icon={BookOpen} label="作品总览" onClick={() => setView('overview')} />
                {chapters.map((chapter) => (
                  <ChapterNavItem
                    key={chapter.id}
                    chapter={chapter}
                    active={view === 'editor' && chapter.id === currentChapter.id}
                    onOpen={() => {
                      setSelectedChapterId(chapter.id)
                      setView('editor')
                    }}
                    onDelete={() => deleteChapter(chapter.id)}
                    onTogglePublish={() => togglePublishChapter(chapter.id)}
                  />
                ))}
              </div>
            </section>
            <section className="flex-1 overflow-y-auto rounded-lg border border-white/70 bg-white/72 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">资料与记忆入口</h2>
                <button onClick={() => setView('lore')} className="rounded p-1 text-[#2f7f86] hover:bg-[#e7f3f4]">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {(Object.keys(loreTypeLabels) as LoreType[]).map((type) => {
                  const Icon = loreTypeIcons[type]
                  return (
                    <SideButton
                      key={type}
                      icon={Icon}
                      label={loreTypeLabels[type]}
                      count={loreEntries.filter((entry) => entry.type === type).length}
                      active={view === 'lore' && loreFilter === type}
                      onClick={() => {
                        setLoreFilter(type)
                        setView('lore')
                      }}
                    />
                  )
                })}
                <SideButton icon={Brain} label="长篇记忆" count={memoryEntries.length} active={view === 'memory'} onClick={() => setView('memory')} />
              </div>
            </section>
          </aside>

          <section className="min-w-0 rounded-lg border border-white/70 bg-white/82 shadow-sm backdrop-blur">
            {view === 'overview' && (
              <OverviewView
                work={work}
                loreEntries={loreEntries}
                memoryEntries={memoryEntries}
                onOpenEditor={() => setView('editor')}
                onOpenLore={() => setView('lore')}
                onOpenStoryGraph={onOpenStoryGraph}
                onOpenMemory={() => setView('memory')}
                onOpenChecks={() => setView('checks')}
              />
            )}
            {view === 'editor' && <EditorView chapter={currentChapter} onChapterChange={updateChapter} onGenerateSummary={generateChapterSummary} onTogglePublish={() => togglePublishChapter(currentChapter.id)} />}
            {view === 'lore' && (
              <LoreView
                entries={filteredLore}
                selected={selectedLore}
                draft={loreDraft}
                filter={loreFilter}
                search={loreSearch}
                onFilterChange={setLoreFilter}
                onSearchChange={setLoreSearch}
                onDraftChange={setLoreDraft}
                onNew={(type) => setLoreDraft(blankLore(type))}
                onSave={saveLoreDraft}
                onEdit={editLore}
                onDelete={deleteLore}
                onSelect={(entry) => setSelectedLoreId(entry.id)}
              />
            )}
            {view === 'memory' && (
              <MemoryView
                entries={memoryEntries}
                stats={memoryStats}
                onGenerateSummary={generateChapterSummary}
                onAdd={addMemory}
                onUpdate={updateMemory}
                onStatusChange={updateMemoryStatus}
                onDelete={deleteMemory}
                onOpenWebAi={() => openWebAi('memory')}
              />
            )}
            {view === 'checks' && (
              <ChecksView
                issues={checkIssues}
                onRunCheck={runLocalCheck}
                onCopySuggestion={copySuggestion}
                onInsertSuggestion={insertSuggestion}
                onStatusChange={updateIssueStatus}
                onOpenWebAi={() => openWebAi('check')}
              />
            )}
            {view === 'ip' && (
              <IpFactoryView
                mode={ipMode}
                output={ipOutput}
                generating={ipGenerating}
                work={work}
                chapter={currentChapter}
                onModeChange={setIpMode}
                onGenerate={generateIpAsset}
                onCopy={copyIpOutput}
                onDownload={downloadIpOutput}
              />
            )}
          </section>

          <aside className="ml-4 rounded-lg border border-white/70 bg-[#f6fbfa]/82 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold"><MessageSquare className="h-5 w-5 text-[#2f7f86]" />创作任务</h2>
              <span className="rounded bg-white px-2 py-1 text-xs font-medium text-slate-500">当前章</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <PilotTab active={view === 'editor'} icon={PenLine} label="续写" onClick={() => setView('editor')} />
              <PilotTab active={view === 'lore'} icon={Database} label="资料" onClick={() => setView('lore')} />
              <PilotTab active={view === 'memory'} icon={Brain} label="记忆" onClick={() => setView('memory')} />
              <PilotTab active={view === 'checks'} icon={ShieldAlert} label="检查" onClick={() => setView('checks')} />
              <PilotTab active={view === 'ip'} icon={Film} label="IP" onClick={() => setView('ip')} />
            </div>
            <div className="mt-5 rounded-md border border-[#d8e5e4] bg-white/78 p-3">
              <div className="text-xs font-medium text-slate-500">下一步</div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{work.materials.nextStep || '继续推进当前章节目标。'}</p>
              <button onClick={() => insertSuggestion(work.materials.nextStep || '继续推进当前章节目标。')} className="mt-3 text-sm font-semibold text-teal-700 hover:text-teal-800">插入到正文</button>
            </div>
            <div className="mt-4 space-y-2">
              <PilotCard title="生成章节摘要" text={`${memoryEntries.length} 条记忆，${memoryEntries.filter((entry) => entry.type === 'open-foreshadow').length} 条伏笔`} action="生成" onAction={generateChapterSummary} />
              <PilotCard title="检查人物与伏笔" text={openIssues.length ? `${openIssues.length} 条待处理` : '本地规则检查'} action="检查" onAction={runLocalCheck} />
              <PilotCard title="章节衍生" text="短剧 / 互动剧情游戏设定包" action="打开" onAction={() => setView('ip')} />
            </div>
            <ArtifactRunList records={artifactRecords} onCopy={copyArtifact} onInsert={insertArtifact} onDownload={downloadArtifact} />
          </aside>
        </div>
      </div>

      <WorkspaceWebAiModal
        open={webAiOpen}
        target={webAiTarget}
        prompt={webAiPrompt}
        rawResult={webAiResult}
        promptRuns={promptRuns}
        onRawResultChange={setWebAiResult}
        onPromptCopied={(prompt) => recordPromptRun('copied', prompt)}
        onClose={() => setWebAiOpen(false)}
        onParse={parseWebAiWorkspaceResult}
      />
    </main>
  )
}

function OverviewView({
  work,
  loreEntries,
  memoryEntries,
  onOpenEditor,
  onOpenLore,
  onOpenStoryGraph,
  onOpenMemory,
  onOpenChecks,
}: {
  work: SavedWork
  loreEntries: LoreEntry[]
  memoryEntries: MemoryEntry[]
  onOpenEditor: () => void
  onOpenLore: () => void
  onOpenStoryGraph?: () => void
  onOpenMemory: () => void
  onOpenChecks: () => void
}) {
  const [outlineExpanded, setOutlineExpanded] = useState(false)
  const targetWords = safeNumber(work.targetWords)
  const words = safeNumber(work.words)
  const plannedChapters = safeNumber(work.plannedChapters)
  const chapterCount = safeNumber(work.chapterCount)
  const wordPercent = safePercent(words, targetWords)
  const chapterPercent = safePercent(chapterCount, plannedChapters)
  const globalOutline = Array.isArray(work.globalOutline) ? work.globalOutline.filter(Boolean) : []
  const visibleOutline = outlineExpanded ? globalOutline : globalOutline.slice(0, 4)
  const loreCharacters = loreEntries.filter((entry) => entry.type === 'character').map((entry) => entry.title)
  const characters = uniqueText([
    ...listText(work.protagonists),
    ...listText(work.mainCharacters),
    ...listText(work.materials?.characters),
    ...loreCharacters,
  ])
  const worldRules = uniqueText([...listText(work.worldRules), ...loreEntries.filter((entry) => entry.type === 'world').map((entry) => entry.title)])
  const coreConflict = work.coreConflict || work.materials?.sellingPoint || ''
  const description = work.description || work.summary || work.materials?.summary || ''
  const sellingPoint = work.sellingPoint || work.materials?.sellingPoint || ''
  const recentChapterTitle = work.chapterTitle || '未命名章节'
  const hasChapterContent = Boolean(work.chapterText?.trim())
  const officialTools = [
    { title: '黄金第一章', integration: '本地可用', note: '开篇结构与吸引力检查入口。' },
    { title: '人物关系图', integration: '原型展示', note: '关系可视化入口，暂未扩展故事线图逻辑。' },
    { title: '钩子 / 伏笔线性图', integration: '原型展示', note: '伏笔追踪入口，当前为展示占位。' },
    { title: '长篇记忆', integration: '模型待接入', note: `本地已有 ${memoryEntries.length} 条记忆，真实抽取模型未接入。` },
    { title: 'OOC 检查', integration: '模型待接入', note: '当前可做本地检查，真实一致性模型未接入。' },
    { title: '卡文急救', integration: '本地可用', note: '提供创作提示入口，模型调用仍按现有流程。' },
    { title: '发布准备', integration: '云端待同步', note: '发布清单展示，未接真实平台发布。' },
  ]
  const notice = work.status === 'local-draft'
    ? '游客草稿仅保存在当前浏览器，本地缓存清理或更换设备后可能丢失。'
    : '正式作品已加入作品库，当前以本地保存为准；云端同步仍是占位状态。'

  return (
    <div className="h-full overflow-y-auto bg-slate-50/60 p-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start gap-5">
          <div className={cn('h-28 w-36 shrink-0 rounded-lg bg-gradient-to-br', work.cover || 'from-blue-700 via-violet-500 to-fuchsia-300')} />
          <div className="min-w-[240px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-950">{work.title || '未命名作品'}</h1>
              <StatusBadge text={projectStatusText(work.projectStatus, work.status)} tone={work.status === 'local-draft' ? 'amber' : 'blue'} />
              <StatusBadge text={syncStateText(work.syncState, work.status)} tone={work.syncState === 'failed' ? 'red' : work.syncState === 'local-only' ? 'amber' : 'emerald'} />
            </div>
            <p className="mt-2 text-sm text-slate-500">作者：{work.authorName || '创作者'} · 发布平台：{work.publishPlatform || '未设置平台'} · 发布状态：{work.currentPublishStatus || '未发布'}</p>
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>
          </div>
          <div className="grid min-w-[260px] grid-cols-2 gap-3 text-sm">
            <OverviewMetric label="当前字数" value={`${words.toLocaleString()} / ${targetWords ? targetWords.toLocaleString() : '未设置'}`} />
            <OverviewMetric label="章节进度" value={`${chapterCount} / ${plannedChapters || '未设置'}`} />
            <OverviewMetric label="最近更新" value={work.updatedAt || '暂无记录'} />
            <OverviewMetric label="同步状态" value={syncStateText(work.syncState, work.status)} />
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-5">
        <div className="space-y-5">
          <OverviewSection title="作品核心信息">
            <div className="grid gap-4 md:grid-cols-2">
              <InfoBlock label="题材" value={work.type || work.materials?.genre || '待整理题材'} />
              <InfoBlock label="标签" value={work.tags?.length ? work.tags.join('、') : '暂无标签'} />
            </div>
            <InfoBlock label="一句话卖点" value={sellingPoint || '还没有一句话卖点，可在作品管理中补充。'} empty={!sellingPoint} />
            <InfoBlock label="简介" value={description || '暂无简介，可在作品管理中补充。'} empty={!description} />
          </OverviewSection>

          <OverviewSection
            title="全局大纲"
            action={<button onClick={onOpenStoryGraph ?? onOpenLore} className="text-sm font-semibold text-blue-600 hover:text-blue-500">进入故事线图</button>}
          >
            {globalOutline.length > 0 ? (
              <div className="space-y-3">
                {visibleOutline.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex gap-3 rounded-md border border-slate-200 bg-white p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-50 text-sm font-semibold text-blue-700">{index + 1}</span>
                    <p className="text-sm leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
                {globalOutline.length > 4 && (
                  <button onClick={() => setOutlineExpanded((current) => !current)} className="text-sm font-semibold text-blue-600 hover:text-blue-500">
                    {outlineExpanded ? '收起' : '展开全部'}
                  </button>
                )}
              </div>
            ) : (
              <EmptyState text="还没有全局大纲，可在作品资料或新建作品确认流程中补充。" />
            )}
          </OverviewSection>

          <OverviewSection title="作品资料摘要">
            <div className="grid gap-4 md:grid-cols-2">
              <InfoList title="主角 / 主要人物" items={characters} emptyText="暂无人物资料，可在资料库补充。" />
              <InfoList title="世界规则" items={worldRules} emptyText="暂无世界规则，可在资料库补充。" />
            </div>
            <InfoBlock label="核心冲突" value={coreConflict || '暂无核心冲突记录。'} empty={!coreConflict} />
          </OverviewSection>
        </div>

        <div className="space-y-5">
          <OverviewSection title="创作进度">
            <ProgressLine label="字数完成度" current={words} total={targetWords} percent={wordPercent} unit="字" />
            <ProgressLine label="章节完成度" current={chapterCount} total={plannedChapters} percent={chapterPercent} unit="章" />
            <div className="grid grid-cols-2 gap-3">
              <OverviewMetric label="本周更新目标" value={`${safeNumber(work.weeklyUpdateGoal)} 章`} />
              <OverviewMetric label="本月更新章节" value={`${safeNumber(work.monthlyUpdatedChapters)} 章`} />
            </div>
          </OverviewSection>

          <OverviewSection title="章节入口">
            {hasChapterContent || chapterCount > 0 ? (
              <div className="space-y-3">
                <InfoBlock label="最近章节" value={recentChapterTitle} />
                <InfoBlock label="章节数量" value={`${chapterCount} 章`} />
              </div>
            ) : (
              <EmptyState text="还没有章节内容，可从编辑器开始写第一章。" />
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={onOpenEditor} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">新建章节入口</button>
              <button onClick={onOpenEditor} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">进入章节管理</button>
            </div>
          </OverviewSection>

          <OverviewSection title="官方工具状态">
            <div className="space-y-3">
              {officialTools.map((tool) => {
                const state = toolStateFor(work, tool.title)
                return (
                  <div key={tool.title} className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">{tool.title}</h3>
                      <div className="flex shrink-0 gap-1.5">
                        <StatusBadge text={toolStateTextFor(state)} tone={state === 'risk' ? 'red' : state === 'disabled' ? 'slate' : 'emerald'} />
                        <StatusBadge text={tool.integration} tone={tool.integration === '模型待接入' ? 'amber' : tool.integration === '原型展示' ? 'slate' : 'blue'} />
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{tool.note}</p>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={onOpenMemory} className="rounded-md border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">管理工具</button>
              <button onClick={onOpenChecks} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">查看检查</button>
            </div>
          </OverviewSection>
        </div>
      </div>
    </div>
  )
}

function OverviewSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function OverviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function InfoBlock({ label, value, empty = false }: { label: string; value: string; empty?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={cn('mt-1 rounded-md border px-3 py-2 text-sm leading-6', empty ? 'border-dashed border-slate-200 bg-slate-50 text-slate-400' : 'border-slate-200 bg-white text-slate-700')}>{value}</p>
    </div>
  )
}

function InfoList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{title}</p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => <span key={item} className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{item}</span>)}
        </div>
      ) : (
        <EmptyState text={emptyText} compact />
      )}
    </div>
  )
}

function ProgressLine({ label, current, total, percent, unit }: { label: string; current: number; total: number; percent: number; unit: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{current.toLocaleString()} / {total ? total.toLocaleString() : '未设置'} {unit} · {percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={cn('rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400', compact ? 'mt-2 px-3 py-2' : 'px-4 py-6 text-center')}>{text}</div>
}

function StatusBadge({ text, tone }: { text: string; tone: 'blue' | 'emerald' | 'amber' | 'red' | 'slate' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-600',
  }
  return <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', tones[tone])}>{text}</span>
}

function listText(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

function uniqueText(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
}

function safeNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.floor(numberValue) : 0
}

function safePercent(current: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)))
}

function projectStatusText(projectStatus: SavedWork['projectStatus'], status: SavedWork['status']) {
  if (status === 'local-draft' || projectStatus === 'local-draft') return '临时草稿'
  if (projectStatus === 'draft') return '草稿'
  if (projectStatus === 'completed') return '已完结'
  if (projectStatus === 'published') return '已发布'
  if (projectStatus === 'archived') return '已归档'
  return '连载中'
}

function syncStateText(syncState: SavedWork['syncState'], status: SavedWork['status']) {
  if (status === 'local-draft' || syncState === 'local-only') return '仅本地保存'
  if (syncState === 'pending') return '待同步'
  if (syncState === 'syncing') return '同步中'
  if (syncState === 'failed') return '同步失败'
  if (syncState === 'synced') return '已同步（本地占位）'
  return '本地保存'
}

function toolStateFor(work: SavedWork, title: string) {
  const explicit = work.toolStates?.[title]
  if (explicit) return explicit
  const enabled = work.enabledTools?.some((tool) => tool === title || tool.includes(title) || title.includes(tool))
  return enabled ? 'enabled' : 'disabled'
}

function toolStateTextFor(state: ReturnType<typeof toolStateFor>) {
  if (state === 'enabled') return '已启用'
  if (state === 'running') return '进行中'
  if (state === 'passed') return '上次通过'
  if (state === 'risk') return '存在风险'
  return '未启用'
}

function normalizeWorkspaceWork(work: SavedWork): SavedWork {
  const materials = work.materials ?? {
    genre: work.type || '待整理',
    sellingPoint: work.sellingPoint || '',
    characters: [],
    summary: work.description || work.summary || '',
    nextStep: '',
  }

  const normalizedChapters = normalizeWorkspaceChapters({
    ...work,
    chapterTitle: work.chapterTitle || '未命名章节',
    chapterText: work.chapterText || '',
  } as SavedWork)
  const firstChapter = normalizedChapters[0]

  return {
    ...work,
    title: work.title || '未命名作品',
    type: work.type || materials.genre || '待整理题材',
    words: safeNumber(work.words),
    targetWords: safeNumber(work.targetWords),
    plannedChapters: safeNumber(work.plannedChapters),
    chapterCount: normalizedChapters.length || safeNumber(work.chapterCount),
    weeklyUpdateGoal: safeNumber(work.weeklyUpdateGoal),
    monthlyUpdatedChapters: safeNumber(work.monthlyUpdatedChapters),
    tags: Array.isArray(work.tags) ? work.tags : [],
    summary: work.summary || materials.summary || '',
    description: work.description || work.summary || materials.summary || '',
    sellingPoint: work.sellingPoint || materials.sellingPoint || '',
    cover: work.cover || 'from-blue-700 via-violet-500 to-fuchsia-300',
    syncState: work.syncState ?? (work.status === 'local-draft' ? 'local-only' : 'pending'),
    updatedAt: work.updatedAt || '暂无记录',
    chapterTitle: firstChapter?.title || work.chapterTitle || '未命名章节',
    chapterText: typeof firstChapter?.content === 'string' ? firstChapter.content : work.chapterText || '',
    chapters: normalizedChapters,
    materials: {
      genre: materials.genre || work.type || '待整理',
      sellingPoint: materials.sellingPoint || work.sellingPoint || '',
      characters: Array.isArray(materials.characters) ? materials.characters : [],
      summary: materials.summary || work.summary || '',
      nextStep: materials.nextStep || '',
    },
  }
}

function normalizeWorkspaceChapters(work: SavedWork): WorkChapter[] {
  const rawChapters = Array.isArray(work.chapters) ? work.chapters : []
  const normalized = rawChapters
    .map((chapter, index) => normalizeWorkspaceChapter(chapter, index))
    .sort((a, b) => a.chapterNumber - b.chapterNumber)

  if (normalized.length > 0) {
    return normalized.map((chapter, index) => ({
      ...chapter,
      chapterNumber: index + 1,
    }))
  }

  return [normalizeWorkspaceChapter({
    id: 'chapter-1',
    chapterNumber: 1,
    title: work.chapterTitle || '第一章：未命名章节',
    content: work.chapterText || '',
    status: 'draft',
    wordCount: (work.chapterText || '').replace(/\s/g, '').length,
  }, 0)]
}

function normalizeWorkspaceChapter(chapter: Partial<WorkChapter>, index: number): WorkChapter {
  const content = typeof chapter.content === 'string' ? chapter.content : ''
  return {
    id: chapter.id || `chapter-${index + 1}`,
    chapterNumber: typeof chapter.chapterNumber === 'number' && chapter.chapterNumber > 0 ? chapter.chapterNumber : index + 1,
    title: chapter.title || `第 ${index + 1} 章`,
    content,
    status: chapter.status === 'published' ? 'published' : 'draft',
    wordCount: typeof chapter.wordCount === 'number' ? chapter.wordCount : content.replace(/\s/g, '').length,
    createdAt: chapter.createdAt,
    updatedAt: chapter.updatedAt,
  }
}

function applyWorkspaceChapters(work: SavedWork, chapters: WorkChapter[]): SavedWork {
  const normalized = chapters.map((chapter, index) => normalizeWorkspaceChapter({ ...chapter, chapterNumber: index + 1 }, index))
  const first = normalized[0]
  return {
    ...work,
    chapters: normalized,
    chapterTitle: first?.title || work.chapterTitle,
    chapterText: first?.content ?? work.chapterText,
    words: normalized.reduce((sum, chapter) => sum + chapter.content.replace(/\s/g, '').length, 0),
    chapterCount: normalized.length,
    monthlyUpdatedChapters: Math.max(work.monthlyUpdatedChapters || 0, normalized.filter((chapter) => chapter.status === 'published').length),
    updatedAt: '刚刚',
  }
}

function ChapterNavItem({ chapter, active, onOpen, onDelete, onTogglePublish }: { chapter: WorkChapter; active: boolean; onOpen: () => void; onDelete: () => void; onTogglePublish: () => void }) {
  return (
    <div className={cn('group rounded-md border px-2 py-2', active ? 'border-blue-200 bg-blue-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50')}>
      <button onClick={onOpen} className="flex w-full items-center gap-2 text-left">
        <FileText className={cn('h-4 w-4 shrink-0', active ? 'text-blue-600' : 'text-slate-400')} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{chapter.title}</span>
        <span className={cn('rounded px-1.5 py-0.5 text-[10px]', chapter.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
          {chapter.status === 'published' ? '已发布' : '草稿'}
        </span>
      </button>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>第 {chapter.chapterNumber} 章 · {chapter.wordCount.toLocaleString()} 字</span>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button onClick={onTogglePublish} className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-white hover:text-emerald-600">
            {chapter.status === 'published' ? '撤回' : '发布'}
          </button>
          <button onClick={onDelete} className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-red-600" title="删除章节">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function EditorView({ chapter, onChapterChange, onGenerateSummary, onTogglePublish }: { chapter: WorkChapter; onChapterChange: (patch: Partial<WorkChapter>) => void; onGenerateSummary: () => void; onTogglePublish: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 items-center gap-3 border-b border-slate-200 px-4 text-sm">
        <select className="rounded border border-slate-200 px-2 py-1 outline-none"><option>正文</option></select>
        <select className="rounded border border-slate-200 px-2 py-1 outline-none"><option>16</option></select>
        {['B', 'I', 'U', 'S'].map((item) => <button key={item} className="rounded px-2 py-1 font-semibold hover:bg-slate-100">{item}</button>)}
        <button onClick={onTogglePublish} className={cn('rounded-md border px-3 py-1.5 font-semibold', chapter.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
          {chapter.status === 'published' ? '已发布' : '标记发布'}
        </button>
        <button onClick={onGenerateSummary} className="ml-auto inline-flex items-center gap-2 rounded-md border border-blue-200 px-3 py-1.5 text-blue-600 hover:bg-blue-50">
          <Brain className="h-4 w-4" />
          生成章节摘要
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-14 py-10">
        <input value={chapter.title} onChange={(event) => onChapterChange({ title: event.target.value })} className="mb-8 w-full bg-transparent text-3xl font-semibold outline-none" />
        <textarea value={chapter.content} onChange={(event) => onChapterChange({ content: event.target.value })} className="min-h-[520px] w-full resize-none bg-transparent text-[17px] leading-9 outline-none" />
      </div>
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-3 rounded-md border border-blue-100 bg-blue-50/50 p-3">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="输入需要扩写的场景、人物动作或情绪推进..." />
          <button className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white">扩写</button>
        </div>
      </div>
    </div>
  )
}

function LoreView({
  entries,
  selected,
  draft,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onDraftChange,
  onNew,
  onSave,
  onEdit,
  onDelete,
  onSelect,
}: {
  entries: LoreEntry[]
  selected?: LoreEntry
  draft: LoreEntry
  filter: LoreType | 'all'
  search: string
  onFilterChange: (type: LoreType | 'all') => void
  onSearchChange: (value: string) => void
  onDraftChange: (entry: LoreEntry) => void
  onNew: (type: LoreType) => void
  onSave: () => void
  onEdit: (entry: LoreEntry) => void
  onDelete: (id: string) => void
  onSelect: (entry: LoreEntry) => void
}) {
  return (
    <div className="grid h-full grid-cols-[220px_minmax(0,1fr)_300px]">
      <aside className="border-r border-slate-200 p-4">
        <h2 className="font-semibold">资料库</h2>
        <button onClick={() => onFilterChange('all')} className={cn('mt-4 w-full rounded-md px-3 py-2 text-left text-sm', filter === 'all' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50')}>全部</button>
        {(Object.keys(loreTypeLabels) as LoreType[]).map((type) => (
          <button key={type} onClick={() => onFilterChange(type)} className={cn('mt-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm', filter === type ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50')}>
            <span>{loreTypeLabels[type]}</span>
          </button>
        ))}
      </aside>

      <section className="min-w-0 border-r border-slate-200 p-5">
        <div className="flex gap-3">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => onSearchChange(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 pl-10 pr-3 text-sm outline-none ring-blue-500/15 focus:ring-4" placeholder="搜索人物设定、世界观、伏笔..." />
          </label>
          <button onClick={() => onNew(filter === 'all' ? 'character' : filter)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500">
            <Plus className="h-4 w-4" />
            新增资料
          </button>
        </div>
        <div className="mt-4 space-y-3 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <article key={entry.id} onClick={() => onSelect(entry)} className={cn('cursor-pointer rounded-md border p-4 transition hover:border-blue-200', selected?.id === entry.id ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 bg-white')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{entry.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{loreTypeLabels[entry.type]} · 更新：{entry.updatedAt}</p>
                </div>
                <button onClick={(event) => { event.stopPropagation(); onEdit(entry) }} className="rounded p-1 text-slate-500 hover:bg-white"><Edit3 className="h-4 w-4" /></button>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{entry.content}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => <span key={tag} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{tag}</span>)}
              </div>
            </article>
          ))}
          {entries.length === 0 && <div className="rounded-md border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">暂无资料，点击新增资料开始整理。</div>}
        </div>
      </section>

      <aside className="p-5">
        <h3 className="font-semibold">资料详情 / 编辑</h3>
        <div className="mt-4 space-y-3">
          <input value={draft.title} onChange={(event) => onDraftChange({ ...draft, title: event.target.value })} className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none" placeholder="资料标题" />
          <select value={draft.type} onChange={(event) => onDraftChange({ ...draft, type: event.target.value as LoreType })} className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none">
            {(Object.keys(loreTypeLabels) as LoreType[]).map((type) => <option key={type} value={type}>{loreTypeLabels[type]}</option>)}
          </select>
          <textarea value={draft.content} onChange={(event) => onDraftChange({ ...draft, content: event.target.value })} className="h-40 w-full resize-none rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none" placeholder="资料内容" />
          <input value={draft.tags.join('，')} onChange={(event) => onDraftChange({ ...draft, tags: event.target.value.split(/[，,\s]/).filter(Boolean) })} className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none" placeholder="标签，用逗号分隔" />
          <input value={draft.relatedChapterIds.join('，')} onChange={(event) => onDraftChange({ ...draft, relatedChapterIds: event.target.value.split(/[，,\s]/).filter(Boolean) })} className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none" placeholder="关联章节 ID" />
          <button onClick={onSave} className="w-full rounded-md bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500">保存资料</button>
        </div>
        {selected && (
          <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{selected.title}</h4>
              <button onClick={() => onDelete(selected.id)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{selected.content}</p>
          </div>
        )}
      </aside>
    </div>
  )
}

function MemoryView({
  entries,
  stats,
  onGenerateSummary,
  onAdd,
  onUpdate,
  onStatusChange,
  onDelete,
  onOpenWebAi,
}: {
  entries: MemoryEntry[]
  stats: Array<{ type: MemoryType; count: number }>
  onGenerateSummary: () => void
  onAdd: (type: MemoryType) => void
  onUpdate: (id: string, content: string) => void
  onStatusChange: (id: string, status: NonNullable<MemoryEntry['status']>) => void
  onDelete: (id: string) => void
  onOpenWebAi: () => void
}) {
  const normalizedEntries = entries.map(normalizeMemoryEntry)
  const confirmedCount = normalizedEntries.filter((entry) => entry.status === 'confirmed').length
  const draftCount = normalizedEntries.filter((entry) => entry.status === 'draft').length
  const staleCount = normalizedEntries.filter((entry) => entry.status === 'stale').length

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">长篇记忆</h2>
          <p className="mt-1 text-sm text-slate-500">Memory V0：本地维护章节摘要、人物状态、世界观事实和未回收伏笔；真实模型抽取待接入。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onOpenWebAi} className="rounded-md border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">Web AI 记忆 Prompt</button>
          <button onClick={onGenerateSummary} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">生成当前章节摘要</button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatCard label="待确认记忆" value={draftCount} tone="blue" />
        <StatCard label="已确认记忆" value={confirmedCount} tone="emerald" />
        <StatCard label="可能过期" value={staleCount} tone="amber" />
      </div>
      <div className="mt-5 grid grid-cols-6 gap-3">
        {stats.map((stat) => (
          <button key={stat.type} onClick={() => onAdd(stat.type)} className="rounded-md border border-slate-200 bg-white p-4 text-left hover:border-blue-200">
            <div className="text-2xl font-semibold text-blue-600">{stat.count}</div>
            <div className="mt-1 text-xs text-slate-500">{memoryTypeLabels[stat.type]}</div>
          </button>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        {normalizedEntries.map((entry) => (
          <article key={entry.id} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{entry.title}</h3>
                  <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', memoryStatusClass(entry.status ?? 'draft'))}>{memoryStatusText[entry.status ?? 'draft']}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{memoryTypeLabels[entry.type]} · 来源：{entry.sourceChapterId || '当前章节'} · {entry.updatedAt}</p>
              </div>
              <button onClick={() => onDelete(entry.id)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            </div>
            <textarea value={entry.content} onChange={(event) => onUpdate(entry.id, event.target.value)} className="mt-3 h-24 w-full resize-none rounded-md border border-slate-100 bg-slate-50 p-3 text-sm leading-6 outline-none" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>置信度：{Math.round((entry.confidence ?? 1) * 100)}% · 来源：{memoryCreatedByText[entry.createdBy ?? 'user']}</span>
              <div className="flex gap-2">
                <button onClick={() => onStatusChange(entry.id, 'confirmed')} className="rounded border border-emerald-200 px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-50">确认</button>
                <button onClick={() => onStatusChange(entry.id, 'stale')} className="rounded border border-amber-200 px-2 py-1 font-semibold text-amber-700 hover:bg-amber-50">标记过期</button>
                <button onClick={() => onStatusChange(entry.id, 'rejected')} className="rounded border border-slate-200 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-50">拒绝</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function ChecksView({
  issues,
  onRunCheck,
  onCopySuggestion,
  onInsertSuggestion,
  onStatusChange,
  onOpenWebAi,
}: {
  issues: CheckIssue[]
  onRunCheck: () => void
  onCopySuggestion: (text: string) => void
  onInsertSuggestion: (text: string) => void
  onStatusChange: (id: string, status: CheckIssue['status']) => void
  onOpenWebAi: () => void
}) {
  const counts = {
    high: issues.filter((issue) => issue.severity === 'high' && issue.status === 'open').length,
    medium: issues.filter((issue) => issue.severity === 'medium' && issue.status === 'open').length,
    low: issues.filter((issue) => issue.severity === 'low' && issue.status === 'open').length,
    resolved: issues.filter((issue) => issue.status === 'resolved').length,
  }
  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">OOC / 伏笔检查结果</h2>
          <p className="mt-1 text-sm text-slate-500">本地规则会优先参考已确认记忆，忽略已拒绝记忆；真实模型一致性检查仍待接入。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onOpenWebAi} className="rounded-md border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">Web AI 检查 Prompt</button>
          <button onClick={onRunCheck} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">开始本地检查</button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-3">
        <StatCard label="高风险" value={counts.high} tone="red" />
        <StatCard label="中风险" value={counts.medium} tone="amber" />
        <StatCard label="低风险" value={counts.low} tone="blue" />
        <StatCard label="已处理" value={counts.resolved} tone="emerald" />
      </div>
      <div className="mt-5 space-y-3">
        {issues.map((issue) => (
          <article key={issue.id} className={cn('rounded-md border p-4', issue.status === 'ignored' ? 'border-slate-200 bg-slate-50 opacity-70' : issue.severity === 'high' ? 'border-red-200 bg-red-50/50' : issue.severity === 'medium' ? 'border-amber-200 bg-amber-50/50' : 'border-blue-200 bg-blue-50/40')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white px-2 py-1 text-xs font-semibold">{severityLabels[issue.severity]}</span>
                  <span className="text-sm font-semibold">{issueTypeLabels[issue.issueType]}</span>
                  <span className="text-xs text-slate-500">{issue.position}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{issue.description}</p>
                <p className="mt-2 rounded-md bg-white/70 p-3 text-sm leading-6 text-slate-600">建议：{issue.suggestion}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"><Eye className="mr-1 inline h-3 w-3" />查看原文</button>
                <button onClick={() => onCopySuggestion(issue.suggestion)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"><Clipboard className="mr-1 inline h-3 w-3" />复制建议</button>
                <button onClick={() => onInsertSuggestion(issue.suggestion)} className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500">插入修改区</button>
                <button onClick={() => onStatusChange(issue.id, 'ignored')} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50">忽略</button>
                <button onClick={() => onStatusChange(issue.id, 'resolved')} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">标记已处理</button>
              </div>
            </div>
          </article>
        ))}
        {issues.length === 0 && <div className="rounded-md border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500">暂无检查结果，点击“开始本地检查”或生成 Web AI 检查 Prompt。</div>}
      </div>
    </div>
  )
}

function IpFactoryView({
  mode,
  output,
  generating,
  work,
  chapter,
  onModeChange,
  onGenerate,
  onCopy,
  onDownload,
}: {
  mode: IpFactoryMode
  output: string
  generating: boolean
  work: SavedWork
  chapter: WorkChapter
  onModeChange: (mode: IpFactoryMode) => void
  onGenerate: (mode: IpFactoryMode) => void
  onCopy: () => void
  onDownload: () => void
}) {
  const hasContent = Boolean(chapter.content.trim())
  return (
    <div className="h-full overflow-y-auto bg-slate-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">IP Factory</h2>
          <p className="mt-1 text-sm text-slate-500">将当前章节衍生为短剧脚本或互动剧情游戏设定包。后端模型不可用时会生成本地结构化草案。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCopy} disabled={!output.trim()} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            <Clipboard className="h-4 w-4" />
            复制
          </button>
          <button onClick={onDownload} disabled={!output.trim()} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            <Download className="h-4 w-4" />
            导出
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <IpModeCard
          active={mode === 'screenplay'}
          icon={Film}
          title="小说转短剧脚本"
          description="生成竖屏短剧结构，包含 3 秒钩子、场次、镜头、动作、台词与结尾悬念。"
          action="生成短剧脚本"
          disabled={!hasContent || generating}
          onSelect={() => onModeChange('screenplay')}
          onGenerate={() => onGenerate('screenplay')}
        />
        <IpModeCard
          active={mode === 'game'}
          icon={Gamepad2}
          title="互动剧情游戏设定包"
          description="生成可交给前端或游戏引擎继续实现的 JSON，包含玩法循环、角色、场景、任务和分支选择。"
          action="生成游戏设定包"
          disabled={!hasContent || generating}
          onSelect={() => onModeChange('game')}
          onGenerate={() => onGenerate('game')}
        />
      </div>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">当前输入</h3>
            <p className="mt-1 text-sm text-slate-500">{work.title} · {chapter.title} · {chapter.wordCount.toLocaleString()} 字</p>
          </div>
          {generating && <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"><Loader2 className="h-3.5 w-3.5 animate-spin" />生成中</span>}
        </div>
        {!hasContent && <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">当前章节还没有正文，先写入章节内容再生成 IP 衍生资产。</div>}
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="font-semibold">{mode === 'screenplay' ? '短剧脚本结果' : '游戏设定包结果'}</h3>
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">{mode === 'screenplay' ? 'Markdown' : 'JSON'}</span>
        </div>
        <pre className="min-h-[360px] overflow-x-auto whitespace-pre-wrap p-5 text-sm leading-6 text-slate-700">
          {output || '生成结果会显示在这里。'}
        </pre>
      </section>
    </div>
  )
}

function IpModeCard({ active, icon: Icon, title, description, action, disabled, onSelect, onGenerate }: { active: boolean; icon: LucideIcon; title: string; description: string; action: string; disabled: boolean; onSelect: () => void; onGenerate: () => void }) {
  return (
    <article onClick={onSelect} className={cn('cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition', active ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-200')}>
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500')}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <button onClick={(event) => { event.stopPropagation(); onGenerate() }} disabled={disabled} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300">
        {disabled ? <Loader2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        {action}
      </button>
    </article>
  )
}

function ArtifactRunList({ records, onCopy, onInsert, onDownload }: { records: ArtifactRecord[]; onCopy: (record: ArtifactRecord) => void; onInsert: (record: ArtifactRecord) => void; onDownload: (record: ArtifactRecord) => void }) {
  const visibleRecords = records.slice(0, 5)
  const labels: Record<ArtifactKind, string> = {
    summary: '摘要',
    check: '检查',
    'web-ai': 'Web AI',
    screenplay: '短剧',
    game: '游戏',
  }

  return (
    <section className="mt-5 rounded-md border border-[#d8e5e4] bg-white/78 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">生成记录</h3>
        <span className="text-[11px] text-slate-400">仅本地保存</span>
      </div>
      <div className="mt-3 space-y-2">
        {visibleRecords.map((record) => (
          <article key={record.id} className="rounded-md border border-[#d8e5e4] bg-[#f8fbfa] px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#e5f2f2] px-1.5 py-0.5 text-[10px] font-semibold text-[#2f7f86]">{labels[record.kind]}</span>
                  <p className="truncate text-xs font-semibold text-slate-900">{record.title}</p>
                </div>
                <p className="mt-1 truncate text-[11px] text-slate-500">{record.chapterTitle} · {record.createdAt}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button onClick={() => onCopy(record)} className="inline-flex items-center gap-1 rounded border border-[#cfe0df] bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-[#2f7f86] hover:text-[#2f7f86]"><Clipboard className="h-3 w-3" />复制</button>
              <button onClick={() => onDownload(record)} className="inline-flex items-center gap-1 rounded border border-[#cfe0df] bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-[#2f7f86] hover:text-[#2f7f86]"><Download className="h-3 w-3" />导出</button>
              <button onClick={() => onInsert(record)} disabled={record.kind === 'game'} className="inline-flex items-center gap-1 rounded border border-[#cfe0df] bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-[#2f7f86] hover:text-[#2f7f86] disabled:cursor-not-allowed disabled:opacity-40"><PenLine className="h-3 w-3" />插入</button>
            </div>
          </article>
        ))}
        {!visibleRecords.length && (
          <div className="rounded-md border border-dashed border-[#cfe0df] px-3 py-4 text-center text-xs text-slate-400">
            生成摘要、检查或 IP 衍生后，会在这里保留可复制、导出的本地记录。
          </div>
        )}
      </div>
    </section>
  )
}

function WorkspaceWebAiModal({
  open,
  target,
  prompt,
  rawResult,
  promptRuns,
  onRawResultChange,
  onPromptCopied,
  onClose,
  onParse,
}: {
  open: boolean
  target: 'check' | 'memory'
  prompt: string
  rawResult: string
  promptRuns: PromptRunRecord[]
  onRawResultChange: (value: string) => void
  onPromptCopied: (prompt: string) => void
  onClose: () => void
  onParse: () => void
}) {
  const [copied, setCopied] = useState(false)
  const inspection = inspectPrompt(prompt)
  if (!open) return null
  function copyPrompt() {
    navigator.clipboard?.writeText(prompt)
    onPromptCopied(prompt)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 p-6 backdrop-blur-sm">
      <section className="mx-auto max-w-6xl rounded-lg border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-7 py-6">
          <div>
            <h2 className="text-xl font-semibold">Web AI 模式 · {target === 'check' ? '检查 Prompt' : '长篇记忆 Prompt'}</h2>
            <p className="mt-2 text-sm text-slate-500">复制到 ChatGPT / DeepSeek / Gemini 网页生成，返回后粘贴解析。</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        <div className="grid grid-cols-[minmax(0,1fr)_420px] gap-6 p-7">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">1. 复制 Prompt</h3>
              <button onClick={copyPrompt} className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? '已复制' : '复制 Prompt'}
              </button>
            </div>
            <pre className="h-[430px] overflow-y-auto whitespace-pre-wrap rounded-md border border-violet-200 bg-violet-50/70 p-4 text-sm leading-6">{prompt}</pre>
          </div>
          <aside className="space-y-4">
            <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Prompt Inspector V0</h3>
                <span className="rounded bg-white px-2 py-1 text-[11px] font-semibold text-slate-500">本地预览</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <InspectorMetric label="字符" value={inspection.characters} />
                <InspectorMetric label="估算 token" value={inspection.estimatedTokens} />
                <InspectorMetric label="上下文段" value={inspection.sections.length} />
              </div>
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-500">上下文来源</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {inspection.sections.map((section) => <span key={section} className="rounded bg-white px-2 py-1 text-[11px] text-slate-600">{section}</span>)}
                  {!inspection.sections.length && <span className="text-xs text-slate-400">未识别到结构化段落</span>}
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {inspection.warnings.map((warning) => <div key={warning} className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs leading-5 text-amber-800">{warning}</div>)}
                {!inspection.warnings.length && <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-700">未发现明显本地风险。真实模型输出仍需人工确认。</div>}
              </div>
            </section>
            <section className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">PromptRun 本地记录</h3>
                <span className="text-[11px] text-slate-400">仅当前浏览器</span>
              </div>
              <div className="mt-3 space-y-2">
                {promptRuns.slice(0, 4).map((run) => (
                  <div key={run.id} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800">{run.target === 'check' ? '检查 Prompt' : '记忆 Prompt'} · {run.status === 'copied' ? '已复制' : '已解析'}</span>
                      <span>{run.createdAt}</span>
                    </div>
                    <div className="mt-1 text-slate-500">{run.promptCharacters.toLocaleString()} 字符 · 约 {run.estimatedTokens.toLocaleString()} token · 结果 {run.resultCharacters.toLocaleString()} 字符</div>
                  </div>
                ))}
                {!promptRuns.length && <div className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">暂无记录。复制 Prompt 或解析结果后会保留本地记录。</div>}
              </div>
            </section>
            <section>
              <h3 className="font-semibold">2. 粘贴返回结果</h3>
              <textarea value={rawResult} onChange={(event) => onRawResultChange(event.target.value)} className="mt-3 h-[250px] w-full resize-none rounded-md border border-slate-200 p-4 text-sm leading-6 outline-none" placeholder="粘贴网页 AI 返回的检查结果、记忆条目或章节摘要..." />
            </section>
            <button onClick={onParse} className="mt-4 w-full rounded-md bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500">粘贴并解析</button>
          </aside>
        </div>
      </section>
    </div>
  )
}

function inspectPrompt(prompt: string) {
  const normalizedPrompt = prompt || ''
  const characters = normalizedPrompt.length
  const estimatedTokens = Math.max(0, Math.ceil(characters / 1.8))
  const knownSections = [
    '当前检查目标',
    '当前章节标题',
    '当前章节正文',
    '作品资料 / 人物设定 / 世界观规则 / 伏笔',
    '长篇记忆摘要',
    '输出格式',
  ]
  const sections = knownSections.filter((section) => normalizedPrompt.includes(`【${section}】`))
  const warnings: string[] = []

  if (!normalizedPrompt.trim()) {
    warnings.push('当前 Prompt 为空，请先生成或补充 Prompt。')
  }
  if (!normalizedPrompt.includes('【当前章节正文】')) {
    warnings.push('未识别到当前章节正文，上下文可能不足。')
  }
  if (normalizedPrompt.includes('【作品资料 / 人物设定 / 世界观规则 / 伏笔】\n暂无')) {
    warnings.push('作品资料 / 人物设定 / 世界观规则暂缺，检查结果可能偏泛。')
  }
  if (normalizedPrompt.includes('【长篇记忆摘要】\n暂无')) {
    warnings.push('长篇记忆摘要暂缺，连续性检查依据有限。')
  }
  if (characters > 12000) {
    warnings.push('Prompt 字符较多，部分网页 AI 可能截断上下文。')
  }
  if (estimatedTokens > 7000) {
    warnings.push('估算 token 较高，建议删减资料或分段检查。')
  }

  return {
    characters,
    estimatedTokens,
    sections,
    warnings,
  }
}

function InspectorMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2 py-2">
      <div className="text-base font-semibold text-slate-900">{value.toLocaleString()}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{label}</div>
    </div>
  )
}

function SideButton({ icon: Icon, label, count, active = false, onClick }: { icon: LucideIcon; label: string; count?: number; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-slate-50', active && 'bg-blue-50 text-blue-700')}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {typeof count === 'number' && <span className="text-xs text-slate-400">{count}</span>}
    </button>
  )
}

function PilotTab({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-medium', active ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function PilotCard({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">{title}</div>
        <p className="mt-1 truncate text-xs text-slate-500">{text}</p>
      </div>
      <button onClick={onAction} className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{action}</button>
    </div>
  )
}

function buildLocalScreenplay(work: SavedWork, chapter: WorkChapter) {
  const hook = chapter.content.replace(/\s+/g, '').slice(0, 80) || work.sellingPoint || work.summary || '主角遭遇无法回避的关键冲突。'
  const conflict = work.coreConflict || work.sellingPoint || work.materials.sellingPoint || '围绕主角目标与阻碍展开强冲突。'
  const protagonist = listText(work.protagonists)[0] || work.materials.characters[0] || '主角'
  return [
    `# ${work.title} · ${chapter.title} 短剧脚本`,
    '',
    '## 3 秒高能钩子',
    `画面直接切入：${hook}`,
    '',
    '## 改编核心',
    `- 核心冲突：${conflict}`,
    `- 主视角人物：${protagonist}`,
    '- 竖屏时长建议：60-90 秒',
    '',
    '## 分镜脚本',
    '| 镜头 | 景别 | 画面 / 动作 | 台词 / 字幕 | 情绪目标 |',
    '| --- | --- | --- | --- | --- |',
    `| 1 | 近景 | ${protagonist} 被突发事件逼到选择前。 | “现在退，我就什么都没有了。” | 立刻制造压力 |`,
    '| 2 | 中景 | 反方或阻碍出现，抛出不可接受的条件。 | “你没有资格拒绝。” | 强化压迫 |',
    '| 3 | 特写 | 主角注意到一个反常细节，意识到局面有破绽。 | 字幕：机会只出现一瞬。 | 制造悬念 |',
    '| 4 | 推近 | 主角反击，抛出反转信息。 | “你以为我什么都不知道？” | 爽点释放 |',
    '| 5 | 定格 | 对方表情失控，新的危机浮出水面。 | 字幕：真正的幕后人出现了。 | 留下追更钩子 |',
    '',
    '## 拍摄提示',
    '- 保持竖屏构图，人物脸部和关键道具不要离开中心区域。',
    '- 每 8-12 秒给一次信息反转或情绪推进。',
    '- 结尾保留一个未回答问题，用于下一集承接。',
  ].join('\n')
}

function buildLocalGamePackage(work: SavedWork, chapter: WorkChapter) {
  const characters = uniqueText([...listText(work.protagonists), ...listText(work.mainCharacters), ...work.materials.characters])
  const packageDraft = {
    title: `${work.title}：${chapter.title} 互动剧情游戏设定包`,
    source: {
      workTitle: work.title,
      chapterTitle: chapter.title,
      genre: work.type || work.materials.genre,
      sellingPoint: work.sellingPoint || work.materials.sellingPoint,
    },
    gameType: '互动叙事 / AVG / 轻量剧情解谜',
    coreLoop: ['阅读剧情片段', '识别关键线索', '做出分支选择', '改变人物关系或资源状态', '触发成功 / 失败反馈'],
    playerGoal: work.coreConflict || work.materials.nextStep || '帮助主角在当前章节冲突中做出关键选择，并保留后续悬念。',
    characters: (characters.length ? characters : ['主角']).slice(0, 5).map((name, index) => ({
      id: `character_${index + 1}`,
      name,
      role: index === 0 ? 'player_protagonist' : 'supporting_or_opponent',
      motivation: index === 0 ? '突破当前困境并接近真相' : '推动冲突或提供线索',
      relationshipVariables: ['trust', 'pressure', 'secret'],
    })),
    scenes: [
      {
        id: 'scene_1',
        name: chapter.title,
        objective: '建立冲突、给出第一个关键选择',
        sourceExcerpt: chapter.content.slice(0, 180),
        interactiveObjects: ['异常线索', '关键道具', '对方话术破绽'],
      },
    ],
    quests: [
      {
        id: 'quest_1',
        title: '找出当前冲突的突破口',
        successCondition: '玩家选择能保留主角主动权的行动',
        failureCondition: '玩家忽略线索或过早妥协',
      },
    ],
    branches: [
      {
        id: 'choice_1',
        prompt: '面对压迫性条件，玩家如何回应？',
        options: [
          { id: 'a', text: '正面反击', effect: { pressure: 2, trust: -1 }, result: '进入高冲突路线，获得爽点反转机会。' },
          { id: 'b', text: '暂时示弱并观察', effect: { secret: 2, pressure: -1 }, result: '进入线索收集路线，发现隐藏信息。' },
          { id: 'c', text: '向盟友求助', effect: { trust: 2, pressure: 1 }, result: '进入关系路线，但可能暴露弱点。' },
        ],
      },
    ],
    exportNotes: ['该 JSON 是前端/引擎原型草案，可继续拆成节点图、Ink 脚本或 RenPy/AVG 剧本。'],
  }
  return JSON.stringify(packageDraft, null, 2)
}

function safeFileName(value: string) {
  return (value || '未命名作品').replace(/[\\/:*?"<>|]/g, '-').slice(0, 48)
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'red' | 'amber' | 'blue' | 'emerald' }) {
  const toneClass = {
    red: 'text-red-600 bg-red-50 border-red-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  }[tone]
  return (
    <div className={cn('rounded-md border p-4', toneClass)}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs">{label}</div>
    </div>
  )
}

function seedLore(work: SavedWork): LoreEntry[] {
  const now = '刚刚'
  return [
    { id: 'lore-work', title: work.title, type: 'work', content: work.summary || work.materials.summary, tags: ['作品资料'], relatedChapterIds: ['chapter-1'], updatedAt: now },
    { id: 'lore-world', title: work.materials.genre || '世界观基调', type: 'world', content: work.materials.sellingPoint || '待补充世界观规则。', tags: ['世界观'], relatedChapterIds: [], updatedAt: now },
    ...work.materials.characters.map((name, index) => ({ id: `lore-character-${index}`, title: name, type: 'character' as LoreType, content: `${name} 的人物设定，后续可继续补充动机、禁忌和关系变化。`, tags: ['人物'], relatedChapterIds: ['chapter-1'], updatedAt: now })),
    { id: 'lore-foreshadow', title: '下一章伏笔', type: 'foreshadow', content: work.materials.nextStep || '继续推进下一章悬念。', tags: ['伏笔'], relatedChapterIds: ['chapter-1'], updatedAt: now },
  ]
}

function seedMemory(work: SavedWork): MemoryEntry[] {
  return [
    normalizeMemoryEntry({ id: 'memory-event-1', type: 'event', title: '当前章节事件', content: localSummary(work.chapterText), sourceChapterId: 'chapter-1', updatedAt: '刚刚', status: 'draft', confidence: 0.65, sourceText: work.chapterText.slice(0, 240), createdBy: 'local', createdAt: '刚刚' }),
    normalizeMemoryEntry({ id: 'memory-rule-1', type: 'rule', title: '禁止违背设定', content: work.materials.sellingPoint || '不得违背已确认的核心卖点和人物动机。', sourceChapterId: 'chapter-1', updatedAt: '刚刚', status: 'confirmed', confidence: 1, sourceText: work.materials.sellingPoint || '', createdBy: 'user', createdAt: '刚刚' }),
  ]
}

function normalizeMemoryEntry(entry: MemoryEntry): MemoryEntry {
  return {
    ...entry,
    status: entry.status ?? 'draft',
    confidence: typeof entry.confidence === 'number' ? Math.max(0, Math.min(1, entry.confidence)) : 1,
    sourceText: entry.sourceText ?? '',
    createdBy: entry.createdBy ?? 'user',
    createdAt: entry.createdAt ?? entry.updatedAt ?? '刚刚',
    updatedAt: entry.updatedAt || '刚刚',
  }
}

function memoryStatusClass(status: NonNullable<MemoryEntry['status']>) {
  if (status === 'confirmed') return 'bg-emerald-50 text-emerald-700'
  if (status === 'rejected') return 'bg-slate-100 text-slate-500'
  if (status === 'stale') return 'bg-amber-50 text-amber-700'
  return 'bg-blue-50 text-blue-700'
}

function blankLore(type: LoreType): LoreEntry {
  return {
    id: `lore-${Date.now()}`,
    title: '',
    type,
    content: '',
    tags: [],
    relatedChapterIds: [],
    updatedAt: '刚刚',
  }
}

function normalizeTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)))
}

function localSummary(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return '当前章节尚无正文，等待写入后生成摘要。'
  return cleaned.length > 120 ? `${cleaned.slice(0, 120)}...` : cleaned
}

function localCheck(work: SavedWork, loreEntries: LoreEntry[], memoryEntries: MemoryEntry[]): CheckIssue[] {
  const issues: CheckIssue[] = []
  const text = work.chapterText
  const normalizedMemories = memoryEntries.map(normalizeMemoryEntry)
  const confirmedMemories = normalizedMemories.filter((entry) => entry.status === 'confirmed')
  const staleMemories = normalizedMemories.filter((entry) => entry.status === 'stale')
  const confirmedRules = confirmedMemories.filter((entry) => entry.type === 'rule')
  const confirmedForeshadows = confirmedMemories.filter((entry) => entry.type === 'open-foreshadow')
  const confirmedCharacterStates = confirmedMemories.filter((entry) => entry.type === 'character-state')

  if (text.length < 500) {
    issues.push({
      id: `issue-goal-${Date.now()}`,
      issueType: 'chapter-goal',
      severity: 'medium',
      position: '全文',
      description: '当前章节篇幅偏短，章节目标可能还没有充分展开。',
      suggestion: '补充一个具体场景，让人物行动承接核心冲突，并在结尾留下下一章钩子。',
      status: 'open',
    })
  }
  if ((loreEntries.some((entry) => entry.type === 'foreshadow') || confirmedForeshadows.length > 0) && !/伏笔|线索|秘密|异常|约定/.test(text)) {
    issues.push({
      id: `issue-foreshadow-${Date.now() + 1}`,
      issueType: 'open-foreshadow',
      severity: 'low',
      position: '章节结尾',
      description: confirmedForeshadows.length > 0
        ? `已确认记忆中存在 ${confirmedForeshadows.length} 条未回收伏笔，但当前正文没有明显承接。`
        : '资料库中存在伏笔线索，但当前正文没有明显承接。',
      suggestion: '在章节末尾加入一个可被后续回收的异常细节，避免伏笔长期悬空。',
      status: 'open',
    })
  }
  if (confirmedRules.length > 0 && /突然完全变了|毫无理由|凭空/.test(text)) {
    issues.push({
      id: `issue-ooc-${Date.now() + 2}`,
      issueType: 'character-ooc',
      severity: 'high',
      position: '疑似人物转折段',
      description: `正文出现缺少动机支撑的突变表达，且存在 ${confirmedRules.length} 条已确认规则记忆，可能造成人物 OOC。`,
      suggestion: `参考已确认记忆“${confirmedRules[0]?.title || '禁止违背设定'}”，补充人物做出选择前的触发事件、心理防线或外部压力。`,
      status: 'open',
    })
  }
  if (confirmedCharacterStates.length > 0 && /陌生|完全不认识|第一次见/.test(text)) {
    issues.push({
      id: `issue-character-memory-${Date.now() + 3}`,
      issueType: 'character-ooc',
      severity: 'medium',
      position: '人物关系描写',
      description: `已确认记忆中存在 ${confirmedCharacterStates.length} 条人物状态记录，但正文出现“陌生 / 完全不认识”等可能冲突表达。`,
      suggestion: '核对人物是否确实失忆、伪装或关系重置；如果不是，请补充过渡解释。',
      status: 'open',
    })
  }
  if (staleMemories.length > 0) {
    issues.push({
      id: `issue-stale-memory-${Date.now() + 4}`,
      issueType: 'setting-conflict',
      severity: 'low',
      position: '长篇记忆',
      description: `当前有 ${staleMemories.length} 条记忆被标记为可能过期，本地检查未将其作为强依据。`,
      suggestion: '进入长篇记忆页确认、修正或删除过期记忆，再重新运行本地检查。',
      status: 'open',
    })
  }
  if (!issues.length) {
    issues.push({
      id: `issue-ok-${Date.now()}`,
      issueType: 'emotion-flow',
      severity: 'low',
      position: '全文',
      description: confirmedMemories.length > 0
        ? `本地规则已参考 ${confirmedMemories.length} 条已确认记忆，未发现明显高风险问题。`
        : '本地规则未发现明显高风险问题；当前缺少已确认记忆，检查依据有限。',
      suggestion: '如需更细检查，可先确认长篇记忆条目，或生成 Web AI 检查 Prompt 进行二次审稿。',
      status: 'open',
    })
  }
  return issues
}

function buildWorkspacePrompt(target: 'check' | 'memory', work: SavedWork, loreEntries: LoreEntry[], memoryEntries: MemoryEntry[]) {
  const loreText = loreEntries.map((entry) => `- [${loreTypeLabels[entry.type]}] ${entry.title}: ${entry.content}`).join('\n')
  const memoryText = memoryEntries
    .map(normalizeMemoryEntry)
    .filter((entry) => entry.status !== 'rejected')
    .map((entry) => `- [${memoryTypeLabels[entry.type]} / ${memoryStatusText[entry.status ?? 'draft']}] ${entry.title}: ${entry.content}`)
    .join('\n')
  const goal = target === 'check'
    ? '请检查人物 OOC、设定冲突、时间线矛盾、伏笔未回收、情绪推进异常、章节目标偏离，并按卡片格式输出。'
    : '请从当前章节中提取章节摘要、已发生事件、人物状态变化、世界观事实、未回收伏笔和禁止违背设定。'
  return `你是中文长篇小说编辑与连续性审稿助手。

【当前检查目标】
${goal}

【当前章节标题】
${work.chapterTitle}

【当前章节正文】
${work.chapterText}

【作品资料 / 人物设定 / 世界观规则 / 伏笔】
${loreText || '暂无'}

【长篇记忆摘要】
${memoryText || '暂无'}

【输出格式】
${target === 'check'
  ? '检查结果：\n- 类型：人物 OOC / 设定冲突 / 时间线矛盾 / 伏笔未回收 / 情绪推进异常 / 章节目标偏离\n  严重程度：高风险 / 中风险 / 低风险\n  位置：\n  问题：\n  建议：'
  : '记忆条目：\n- 类型：已发生事件 / 人物状态变化 / 世界观事实 / 未回收伏笔 / 最近章节摘要 / 禁止违背设定\n  标题：\n  内容：'}`
}

function parseCheckIssues(raw: string): CheckIssue[] {
  const blocks = raw.split(/\n\s*-\s*/).map((item) => item.trim()).filter(Boolean)
  return blocks.map((block, index) => ({
    id: `web-issue-${Date.now()}-${index}`,
    issueType: inferIssueType(block),
    severity: inferSeverity(block),
    position: matchValue(block, '位置') || '网页 AI 返回位置',
    description: matchValue(block, '问题') || block.slice(0, 120),
    suggestion: matchValue(block, '建议') || '请根据网页 AI 返回内容手动调整正文。',
    status: 'open',
  }))
}

function parseMemoryEntries(raw: string): MemoryEntry[] {
  const blocks = raw.split(/\n\s*-\s*/).map((item) => item.trim()).filter(Boolean)
  return blocks.map((block, index) => normalizeMemoryEntry({
    id: `web-memory-${Date.now()}-${index}`,
    type: inferMemoryType(block),
    title: matchValue(block, '标题') || memoryTypeLabels[inferMemoryType(block)],
    content: matchValue(block, '内容') || block,
    sourceChapterId: 'chapter-1',
    updatedAt: '刚刚',
    status: 'draft',
    confidence: 0.6,
    sourceText: block,
    createdBy: 'web-ai',
    createdAt: '刚刚',
  }))
}

function inferIssueType(text: string): CheckIssueType {
  if (text.includes('OOC')) return 'character-ooc'
  if (text.includes('设定')) return 'setting-conflict'
  if (text.includes('时间')) return 'timeline-conflict'
  if (text.includes('伏笔')) return 'open-foreshadow'
  if (text.includes('情绪')) return 'emotion-flow'
  return 'chapter-goal'
}

function inferSeverity(text: string): IssueSeverity {
  if (text.includes('高风险') || text.includes('严重')) return 'high'
  if (text.includes('中风险') || text.includes('一般')) return 'medium'
  return 'low'
}

function inferMemoryType(text: string): MemoryType {
  if (text.includes('人物状态')) return 'character-state'
  if (text.includes('世界观')) return 'world-fact'
  if (text.includes('伏笔')) return 'open-foreshadow'
  if (text.includes('摘要')) return 'chapter-summary'
  if (text.includes('禁止')) return 'rule'
  return 'event'
}

function matchValue(text: string, label: string) {
  const match = text.match(new RegExp(`${label}[：:]\\s*([^\\n]+)`))
  return match?.[1]?.trim() ?? ''
}
