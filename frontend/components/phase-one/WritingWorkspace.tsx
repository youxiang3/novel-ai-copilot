'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import type { CheckIssue, CheckIssueType, IssueSeverity, LoreEntry, LoreType, MemoryEntry, MemoryType, OperationStatus, SavedWork, WorkChapter, WorkVersionRecord } from './types'
import { cn } from '@/lib/utils'

type WorkspaceView = 'overview' | 'editor' | 'lore' | 'memory' | 'checks' | 'ip'
type IpFactoryMode = 'screenplay' | 'game'
const backendApiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'
type PromptRunStatus = 'copied' | 'parsed'
type WebAiTarget = 'check' | 'memory' | 'rewrite'
type ArtifactKind = 'summary' | 'check' | 'viral' | 'rewrite' | 'web-ai' | 'screenplay' | 'game'
type TextRange = { start: number; end: number }
type BackendResult<T> = { code: number; message: string; data: T }
type RewriteVersionOption = { id: string; title: string; tone: string; summary: string; text: string; source?: 'local' | 'backend' }
type RewriteDiffSegment = { type: 'equal' | 'added' | 'removed'; text: string }
type RewriteDiffPreview = { segments: RewriteDiffSegment[]; truncated: boolean }
type AssistantSearchKind = 'chapter' | 'lore' | 'memory' | 'issue' | 'artifact'
type AssistantSearchResult = { id: string; kind: AssistantSearchKind; title: string; excerpt: string; actionText?: string; targetView: WorkspaceView }
type BackendRewriteResult = {
  mode?: string
  replacementText?: string
  conservativeText?: string
  expandedText?: string
  polishedText?: string
  intenseText?: string
  riskNotes?: string[]
}
type BackendRewriteLog = {
  id: string
  novelId?: string
  chapterId?: string
  workflowType?: string
  promptSnapshot?: string
  responseSnapshot?: string
  modelName?: string
  tokenUsage?: number
  createTime?: string
}
type BackendLore = {
  id: string
  novelId: string
  category: string
  name: string
  content: string
  createTime?: string
  updateTime?: string
}

interface PromptRunRecord {
  id: string
  target: WebAiTarget
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
  metadata?: Record<string, unknown>
}

type ViralDimensionKey = 'genreClarity' | 'sellingPoint' | 'openingHook' | 'protagonistDrive' | 'conflictPressure' | 'payoffRhythm' | 'cliffhanger' | 'ipAdaptation' | 'aiFlavorRisk'
type ViralDiagnosisSummary = {
  diagnosisVersion: 'viral-potential-local-v0'
  diagnosisMode: 'local-rules'
  overallLevel: '高潜力' | '中等潜力' | '待打磨'
  overallScore: number
  overallSummary: string
  dimensionScores: Record<ViralDimensionKey, number>
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
  disclaimer: string
}
type ViralDiagnosisResult = {
  summary: ViralDiagnosisSummary
  issues: CheckIssue[]
  promptText: string
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

const viralDimensionLabels: Record<ViralDimensionKey, string> = {
  genreClarity: '题材清晰度',
  sellingPoint: '卖点强度',
  openingHook: '开篇钩子',
  protagonistDrive: '主角目标',
  conflictPressure: '冲突压力',
  payoffRhythm: '爽点兑现',
  cliffhanger: '章末追读',
  ipAdaptation: 'IP 衍生',
  aiFlavorRisk: '模板化风险',
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
  backendToken = '',
  versionRecords = [],
  onCreateVersion,
  onRestoreVersion,
  onManualSync,
}: {
  work: SavedWork
  status: OperationStatus
  message: string
  initialView?: WorkspaceView
  onBackHome: () => void
  onOpenStoryGraph?: () => void
  onWorkChange: (work: SavedWork) => void
  onSave: () => void
  backendToken?: string
  versionRecords?: WorkVersionRecord[]
  onCreateVersion?: () => void
  onRestoreVersion?: (record: WorkVersionRecord) => void
  onManualSync?: () => void
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
  const [webAiTarget, setWebAiTarget] = useState<WebAiTarget>('check')
  const [webAiResult, setWebAiResult] = useState('')
  const [promptRuns, setPromptRuns] = useState<PromptRunRecord[]>([])
  const [artifactRecords, setArtifactRecords] = useState<ArtifactRecord[]>([])
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])
  const [ipMode, setIpMode] = useState<IpFactoryMode>('screenplay')
  const [ipOutput, setIpOutput] = useState('')
  const [ipGenerating, setIpGenerating] = useState(false)
  const [loreSyncMessage, setLoreSyncMessage] = useState('')
  const [viralDiagnosis, setViralDiagnosis] = useState<ViralDiagnosisSummary | null>(null)
  const [viralPromptText, setViralPromptText] = useState('')
  const [rewriteInstruction, setRewriteInstruction] = useState('')
  const [selectedRewriteText, setSelectedRewriteText] = useState('')
  const [selectedRewriteRange, setSelectedRewriteRange] = useState<TextRange | null>(null)
  const [rewriteApplyText, setRewriteApplyText] = useState('')
  const [backendRewriteLoading, setBackendRewriteLoading] = useState(false)
  const [backendRewriteOptions, setBackendRewriteOptions] = useState<RewriteVersionOption[]>([])
  const [backendRewriteLogs, setBackendRewriteLogs] = useState<BackendRewriteLog[]>([])
  const [backendRewriteLogsLoading, setBackendRewriteLogsLoading] = useState(false)
  const [assistantSearchQuery, setAssistantSearchQuery] = useState('')
  const backendRewriteAbortRef = useRef<AbortController | null>(null)
  const storageKey = `yixie-phase3-workspace-${work.id}`
  const promptRunStorageKey = `yixie-prompt-runs-v1-${work.id}`
  const artifactStorageKey = `yixie-artifact-runs-v1-${work.id}`
  const chapters = normalizeWorkspaceChapters(work)
  const currentChapter = chapters.find((chapter) => chapter.id === selectedChapterId) ?? chapters[0]
  const wordCount = currentChapter.content.replace(/\s/g, '').length
  const canSyncLore = Boolean(backendToken && work.backendNovelId && work.status === 'official')

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
    void refreshBackendRewriteLogs(false)
  }, [backendToken, work.backendNovelId])

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

  useEffect(() => {
    if (!canSyncLore || !work.backendNovelId) {
      setLoreSyncMessage(work.status === 'official' && backendToken ? '资料库将在下次保存作品后接入后端。' : '资料库当前为本地保存。')
      return
    }
    let cancelled = false
    async function loadBackendLore() {
      try {
        const response = await fetch(`${backendApiBase}/api/lore/list?novelId=${encodeURIComponent(work.backendNovelId || '')}`, {
          headers: { Authorization: `Bearer ${backendToken}` },
        })
        if (!response.ok) throw new Error('lore list failed')
        const result = await response.json() as BackendResult<BackendLore[]>
        if (cancelled || result.code !== 200 || !Array.isArray(result.data)) return
        if (result.data.length > 0) {
          setLoreEntries(result.data.map(loreFromBackend))
          setSelectedLoreId((current) => current || result.data[0]?.id || '')
          setLoreSyncMessage('资料库已从后端读取。')
        } else {
          setLoreSyncMessage('后端资料库暂无内容，新保存的资料会同步。')
        }
      } catch {
        if (!cancelled) setLoreSyncMessage('后端资料库暂不可用，继续使用本地资料。')
      }
    }
    void loadBackendLore()
    return () => {
      cancelled = true
    }
  }, [backendToken, canSyncLore, work.backendNovelId, work.status])

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
  const webAiPrompt = useMemo(() => buildWorkspacePrompt(webAiTarget, work, currentChapter, loreEntries, memoryEntries, rewriteInstruction, selectedRewriteText), [currentChapter, loreEntries, memoryEntries, rewriteInstruction, selectedRewriteText, webAiTarget, work])
  const assistantSearchResults = useMemo(() => buildAssistantSearchResults(assistantSearchQuery, chapters, loreEntries, memoryEntries, checkIssues, artifactRecords), [artifactRecords, assistantSearchQuery, chapters, checkIssues, loreEntries, memoryEntries])

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

  async function saveLoreDraft() {
    if (!loreDraft.title.trim() || !loreDraft.content.trim()) {
      flash('error', '请填写资料标题和内容。')
      return
    }
    const next = { ...loreDraft, updatedAt: '刚刚', tags: normalizeTags(loreDraft.tags) }
    if (!canSyncLore || !work.backendNovelId) {
      setLoreEntries((current) => upsertLoreEntry(current, next))
      setSelectedLoreId(next.id)
      flash('success', '资料已保存到本地。')
      return
    }

    try {
      const saved = await saveLoreToBackend(next, work.backendNovelId, backendToken)
      setLoreEntries((current) => upsertLoreEntry(current.filter((entry) => entry.id !== next.id), saved))
      setLoreDraft(saved)
      setSelectedLoreId(saved.id)
      setLoreSyncMessage('资料已同步到后端。')
      flash('success', '资料已保存并同步到后端。')
    } catch {
      setLoreEntries((current) => upsertLoreEntry(current, next))
      setSelectedLoreId(next.id)
      setLoreSyncMessage('后端同步失败，已保留本地资料。')
      flash('success', '资料已保存到本地，后端同步稍后可重试。')
    }
  }

  function editLore(entry: LoreEntry) {
    setLoreDraft(entry)
    setSelectedLoreId(entry.id)
  }

  async function deleteLore(id: string) {
    if (canSyncLore && isUuid(id)) {
      try {
        await fetch(`${backendApiBase}/api/lore/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${backendToken}` },
        })
        setLoreSyncMessage('资料删除已同步到后端。')
      } catch {
        setLoreSyncMessage('后端删除同步失败，已先从本地移除。')
      }
    }
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

  function extractMemoryCandidates() {
    setWorkspaceStatus('loading')
    setWorkspaceMessage('正在提取本地记忆候选...')
    window.setTimeout(() => {
      const candidates = buildLocalMemoryCandidates(work, currentChapter, loreEntries)
      setMemoryEntries((current) => [...candidates, ...current])
      recordArtifact('summary', `${currentChapter.title} 记忆候选`, candidates.map((entry) => `- [${memoryTypeLabels[entry.type]}] ${entry.title}: ${entry.content}`).join('\n'), 'local')
      setView('memory')
      flash('success', `已提取 ${candidates.length} 条待确认记忆候选。`)
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

  function runReadthroughDiagnosis() {
    setWorkspaceStatus('loading')
    setWorkspaceMessage('正在执行本地追读诊断...')
    window.setTimeout(() => {
      const issues = localReadthroughDiagnosis(work, currentChapter, loreEntries, memoryEntries)
      setCheckIssues(issues)
      recordArtifact('check', `${currentChapter.title} 追读诊断`, issues.map((issue) => `${severityLabels[issue.severity]}｜${issueTypeLabels[issue.issueType]}\n${issue.position}\n${issue.description}\n建议：${issue.suggestion}`).join('\n\n'), 'local')
      setView('checks')
      flash('success', '追读诊断已生成，结果仅作为本地修稿参考。')
    }, 650)
  }

  function runHumanTasteRevision() {
    setWorkspaceStatus('loading')
    setWorkspaceMessage('正在生成本地人味修订建议...')
    window.setTimeout(() => {
      const issues = localHumanTasteRevision(work, currentChapter)
      setCheckIssues(issues)
      recordArtifact('check', `${currentChapter.title} 人味修订`, issues.map((issue) => `${severityLabels[issue.severity]}｜${issueTypeLabels[issue.issueType]}\n${issue.position}\n${issue.description}\n建议：${issue.suggestion}`).join('\n\n'), 'local')
      setView('checks')
      flash('success', '人味修订建议已生成，需要你确认后再改正文。')
    }, 650)
  }

  function runViralPotentialDiagnosis() {
    setWorkspaceStatus('loading')
    setWorkspaceMessage('正在执行本地爆款潜力诊断...')
    window.setTimeout(() => {
      const result = localViralPotentialDiagnosis(work, currentChapter, loreEntries, memoryEntries)
      setCheckIssues(result.issues)
      setViralDiagnosis(result.summary)
      setViralPromptText(result.promptText)
      recordArtifact('viral', `${currentChapter.title} 爆款潜力诊断`, formatViralDiagnosisArtifact(result), 'local', {
        diagnosisVersion: result.summary.diagnosisVersion,
        diagnosisMode: result.summary.diagnosisMode,
        overallLevel: result.summary.overallLevel,
        overallScore: result.summary.overallScore,
        issueCount: result.issues.length,
        highRiskCount: result.summary.highRiskCount,
        mediumRiskCount: result.summary.mediumRiskCount,
        createdAt: new Date().toLocaleString(),
        workId: work.id,
        chapterTitle: currentChapter.title,
        promptText: result.promptText,
        issues: result.issues,
      })
      setView('checks')
      flash('success', '爆款潜力诊断已生成。当前为本地规则评分，仅作创作参考。')
    }, 650)
  }

  function copyViralDeepPrompt() {
    const prompt = viralPromptText || buildViralDeepDiagnosisPrompt(work, currentChapter, loreEntries, memoryEntries)
    navigator.clipboard?.writeText(prompt)
    flash('success', '深度诊断 Prompt 已复制。')
  }

  function copyViralIssueRewritePrompt(issue: CheckIssue) {
    navigator.clipboard?.writeText(buildViralIssueRewritePrompt(work, currentChapter, issue))
    flash('success', '单项改写 Prompt 已复制。')
  }

  function runLocalRewritePackage(instruction: string, targetText = selectedRewriteText) {
    if (!currentChapter.content.trim()) {
      flash('error', '当前章节还没有正文，先写入内容再生成改稿建议。')
      return
    }
    const result = buildLocalRewritePackage(work, currentChapter, instruction, targetText)
    recordArtifact('rewrite', `${currentChapter.title} 改写扩写精修`, result, 'local', {
      mode: 'local-rules',
      workId: work.id,
      chapterTitle: currentChapter.title,
      instruction: instruction.trim(),
      targetText: targetText.trim(),
      createdAt: new Date().toLocaleString(),
    })
    updateChapter({ content: `${currentChapter.content}\n\n【修改区】${result}` })
    setRewriteInstruction('')
    flash('success', '改写 / 扩写 / 精修建议已生成，并插入正文末尾修改区。')
  }

  async function runBackendRewritePackage(instruction: string, targetText = selectedRewriteText) {
    if (!backendToken) {
      flash('error', '请先登录并在模型设置中保存 API Key，再使用 API 改稿。')
      return
    }
    if (!currentChapter.content.trim() && !targetText.trim()) {
      flash('error', '当前章节还没有正文，先写入内容再调用 API 改稿。')
      return
    }
    backendRewriteAbortRef.current?.abort()
    const controller = new AbortController()
    backendRewriteAbortRef.current = controller
    const timeoutId = window.setTimeout(() => controller.abort(), 120000)
    setBackendRewriteLoading(true)
    try {
      const response = await fetch(`${backendApiBase}/api/chapters/rewrite`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${backendToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          novelId: work.backendNovelId,
          workTitle: work.title,
          genre: work.type || work.materials?.genre,
          sellingPoint: work.sellingPoint || work.materials?.sellingPoint,
          chapterTitle: currentChapter.title,
          chapterText: currentChapter.content,
          selectedText: targetText.trim(),
          instruction: instruction.trim(),
          loreContext: loreEntries.slice(0, 20).map((entry) => `[${loreTypeLabels[entry.type]}] ${entry.title}: ${entry.content}`),
          memoryContext: memoryEntries.slice(0, 20).map((entry) => {
            const normalized = normalizeMemoryEntry(entry)
            return `[${memoryTypeLabels[normalized.type]} / ${memoryStatusText[normalized.status ?? 'draft']}] ${normalized.title}: ${normalized.content}`
          }),
        }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = await response.json() as BackendResult<BackendRewriteResult>
      if (result.code !== 200) throw new Error(result.message || 'API 改稿失败')
      const data = result.data
      const replacementText = data.replacementText?.trim() || data.conservativeText?.trim() || data.polishedText?.trim() || ''
      if (!replacementText) throw new Error('模型没有返回可采用文本')
      setBackendRewriteOptions(buildBackendRewriteVersionOptions(data))
      setRewriteApplyText(replacementText)
      recordArtifact('rewrite', `${currentChapter.title} API 改稿`, formatBackendRewriteArtifact(data, instruction, targetText), 'backend', {
        mode: data.mode || 'model-api',
        workId: work.id,
        chapterTitle: currentChapter.title,
        instruction: instruction.trim(),
        targetText: targetText.trim(),
        createdAt: new Date().toLocaleString(),
      })
      void refreshBackendRewriteLogs(false)
      flash('success', 'API 改稿已生成，并填入“采用文本”。请检查 diff 后再替换。')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        flash('error', 'API 改稿已取消或超时；正文未被修改，可稍后重试。')
        return
      }
      flash('error', `API 改稿失败：${error instanceof Error ? error.message : '未知错误'}。可继续使用本地改稿或 Web AI。`)
    } finally {
      window.clearTimeout(timeoutId)
      if (backendRewriteAbortRef.current === controller) backendRewriteAbortRef.current = null
      setBackendRewriteLoading(false)
    }
  }

  function cancelBackendRewrite() {
    backendRewriteAbortRef.current?.abort()
  }

  async function refreshBackendRewriteLogs(showMessage = true) {
    if (!backendToken || !work.backendNovelId) {
      setBackendRewriteLogs([])
      return
    }
    setBackendRewriteLogsLoading(true)
    try {
      const response = await fetch(`${backendApiBase}/api/chapters/rewrite/logs?novelId=${encodeURIComponent(work.backendNovelId)}`, {
        headers: { Authorization: `Bearer ${backendToken}` },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = await response.json() as BackendResult<BackendRewriteLog[]>
      if (result.code !== 200) throw new Error(result.message || '读取 API 改稿历史失败')
      setBackendRewriteLogs(Array.isArray(result.data) ? result.data.slice(0, 12) : [])
      if (showMessage) flash('success', 'API 改稿历史已刷新。')
    } catch (error) {
      if (showMessage) flash('error', `读取 API 改稿历史失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setBackendRewriteLogsLoading(false)
    }
  }

  function adoptBackendRewriteLog(log: BackendRewriteLog) {
    const result = parseBackendRewriteLogResult(log.responseSnapshot || '')
    const replacementText = result.replacementText?.trim() || result.conservativeText?.trim() || result.polishedText?.trim() || ''
    if (!replacementText) {
      flash('error', '这条历史记录没有可再次采用的文本。')
      return
    }
    setBackendRewriteOptions(buildBackendRewriteVersionOptions(result))
    setRewriteApplyText(replacementText)
    flash('success', '已从 API 历史填入“采用文本”，请检查 diff 后再替换。')
  }

  function applyRewriteToSelection(replacement: string) {
    const nextText = replacement.trim()
    if (!selectedRewriteRange || !selectedRewriteText.trim()) {
      flash('error', '请先在正文中选中需要替换的片段。')
      return
    }
    if (!nextText) {
      flash('error', '请先粘贴或输入要采用的改稿文本。')
      return
    }
    const currentSelected = currentChapter.content.slice(selectedRewriteRange.start, selectedRewriteRange.end).trim()
    if (currentSelected !== selectedRewriteText.trim()) {
      flash('error', '选区内容已变化，请重新选择要替换的片段。')
      return
    }
    if (!window.confirm(`确认用采用文本替换当前选中的 ${selectedRewriteText.replace(/\s/g, '').length} 字吗？`)) return
    const content = `${currentChapter.content.slice(0, selectedRewriteRange.start)}${nextText}${currentChapter.content.slice(selectedRewriteRange.end)}`
    const originalCharCount = countTextChars(selectedRewriteText)
    const replacementCharCount = countTextChars(nextText)
    const charDelta = replacementCharCount - originalCharCount
    recordArtifact('rewrite', `${currentChapter.title} 选区替换`, [
      '# 选区替换记录',
      '',
      `章节：${currentChapter.title}`,
      `替换时间：${new Date().toLocaleString()}`,
      `字数变化：${originalCharCount} -> ${replacementCharCount}（${charDelta >= 0 ? '+' : ''}${charDelta}）`,
      '',
      '## 原选区',
      selectedRewriteText,
      '',
      '## 采用文本',
      nextText,
    ].join('\n'), 'local', {
      mode: 'selection-replace',
      workId: work.id,
      chapterTitle: currentChapter.title,
      originalText: selectedRewriteText,
      replacementText: nextText,
      originalCharCount,
      replacementCharCount,
      charDelta,
      createdAt: new Date().toLocaleString(),
    })
    updateChapter({ content })
    setSelectedRewriteText('')
    setSelectedRewriteRange(null)
    setRewriteApplyText('')
    flash('success', '已替换选中文本，并保存本地替换记录。')
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

  function openAssistantSearchResult(result: AssistantSearchResult) {
    setView(result.targetView)
    if (result.kind === 'chapter') {
      setSelectedChapterId(result.id)
    } else if (result.kind === 'lore') {
      setSelectedLoreId(result.id)
      setLoreSearch('')
      setLoreFilter('all')
    }
    flash('success', `已定位：${result.title}`)
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

  function moveChapter(id: string, direction: -1 | 1) {
    const index = chapters.findIndex((chapter) => chapter.id === id)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= chapters.length) return
    const nextChapters = [...chapters]
    const current = nextChapters[index]
    nextChapters[index] = nextChapters[nextIndex]
    nextChapters[nextIndex] = current
    onWorkChange(applyWorkspaceChapters(work, nextChapters))
    flash('success', '章节顺序已更新，保存后写入作品库。')
  }

  function toggleChapterSelection(id: string) {
    setSelectedChapterIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function batchSetChapterStatus(status: WorkChapter['status']) {
    if (selectedChapterIds.length === 0) return
    const nextChapters = chapters.map((chapter) => selectedChapterIds.includes(chapter.id) ? { ...chapter, status, updatedAt: '刚刚' } : chapter)
    onWorkChange(applyWorkspaceChapters(work, nextChapters))
    flash('success', status === 'published' ? '已将选中章节标记为发布。' : '已将选中章节退回草稿。')
  }

  function batchDeleteChapters() {
    if (selectedChapterIds.length === 0) return
    if (chapters.length - selectedChapterIds.length < 1) {
      flash('error', '至少保留一个章节。')
      return
    }
    if (!window.confirm(`确认删除 ${selectedChapterIds.length} 个选中章节吗？`)) return
    const nextChapters = chapters.filter((chapter) => !selectedChapterIds.includes(chapter.id))
    onWorkChange(applyWorkspaceChapters(work, nextChapters))
    setSelectedChapterIds([])
    if (!nextChapters.some((chapter) => chapter.id === currentChapter.id)) setSelectedChapterId(nextChapters[0]?.id || '')
    flash('success', '选中章节已删除，保存后生效。')
  }

  function runBackendCheck() {
    if (!backendToken) {
      recordArtifact('check', `${currentChapter.title} 后端分析入口`, '当前未登录或后端 token 不可用。本次保留本地规则检查与 Web AI Prompt 路径；登录并连接后端后可优先尝试后端章节分析。', 'local')
      flash('error', '后端分析需要登录并连接后端；已保留本地检查入口。')
      return
    }
    runLocalCheck()
    recordArtifact('check', `${currentChapter.title} 后端分析回退`, '已检测到登录 token，但当前前端作品尚未绑定真实后端 novelId/chapterId，因此本次使用本地 OOC / 伏笔规则检查作为 MVP 回退。', 'local')
  }

  function syncMemorySummary() {
    const confirmed = memoryEntries.filter((entry) => normalizeMemoryEntry(entry).status === 'confirmed')
    const content = confirmed.length
      ? confirmed.map((entry) => `- ${entry.title}: ${entry.content}`).join('\n')
      : memoryEntries.map((entry) => `- ${entry.title}: ${entry.content}`).join('\n')
    recordArtifact('summary', `${work.title} 记忆摘要`, content || '当前还没有可同步的长篇记忆。', backendToken ? 'backend' : 'local')
    flash(backendToken ? 'success' : 'error', backendToken ? '已生成可提交到后端记忆摘要的本地记录。' : '当前未连接后端，已先保存本地记忆摘要记录。')
  }

  function openWebAi(target: WebAiTarget) {
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
    } else if (webAiTarget === 'memory') {
      const parsedMemories = parseMemoryEntries(webAiResult)
      setMemoryEntries((current) => [...parsedMemories, ...current])
      recordArtifact('web-ai', 'Web AI 记忆结果', webAiResult, 'web-ai')
      setView('memory')
      flash('success', '网页 AI 返回内容已解析为记忆条目。')
    } else {
      const content = formatWebAiRewriteResult(webAiResult, rewriteInstruction, selectedRewriteText)
      recordArtifact('rewrite', `${currentChapter.title} Web AI 改稿`, content, 'web-ai', {
        mode: 'web-ai-paste',
        workId: work.id,
        chapterTitle: currentChapter.title,
        instruction: rewriteInstruction.trim(),
        targetText: selectedRewriteText.trim(),
        createdAt: new Date().toLocaleString(),
      })
      insertSuggestion(content)
      setView('editor')
      flash('success', '网页 AI 改稿结果已插入修改区，并保存为本地产物记录。')
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

  function recordArtifact(kind: ArtifactKind, title: string, content: string, source: ArtifactRecord['source'], metadata?: Record<string, unknown>) {
    if (!content.trim()) return
    const nextRecord: ArtifactRecord = {
      id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      title,
      content,
      createdAt: new Date().toLocaleString(),
      chapterTitle: currentChapter.title,
      source,
      metadata,
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
              {selectedChapterIds.length > 0 && (
                <div className="mt-3 rounded-md border border-[#d8e5e4] bg-[#f6fbfa] p-2 text-xs">
                  <div className="font-semibold text-slate-700">已选 {selectedChapterIds.length} 章</div>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <button onClick={() => batchSetChapterStatus('published')} className="rounded border border-emerald-200 bg-white px-2 py-1 text-emerald-700">批量发布</button>
                    <button onClick={() => batchSetChapterStatus('draft')} className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-600">退回草稿</button>
                    <button onClick={() => setSelectedChapterIds([])} className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-600">取消选择</button>
                    <button onClick={batchDeleteChapters} className="rounded border border-red-200 bg-white px-2 py-1 text-red-600">批量删除</button>
                  </div>
                </div>
              )}
              <div className="mt-3 space-y-2 text-sm">
                <SideButton active={view === 'overview'} icon={BookOpen} label="作品总览" onClick={() => setView('overview')} />
                {chapters.map((chapter, index) => (
                  <ChapterNavItem
                    key={chapter.id}
                    chapter={chapter}
                    active={view === 'editor' && chapter.id === currentChapter.id}
                    selected={selectedChapterIds.includes(chapter.id)}
                    onOpen={() => {
                      setSelectedChapterId(chapter.id)
                      setView('editor')
                    }}
                    onSelect={() => toggleChapterSelection(chapter.id)}
                    onMoveUp={() => moveChapter(chapter.id, -1)}
                    onMoveDown={() => moveChapter(chapter.id, 1)}
                    moveUpDisabled={index === 0}
                    moveDownDisabled={index === chapters.length - 1}
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
            {view === 'editor' && (
              <EditorView
                chapter={currentChapter}
                rewriteInstruction={rewriteInstruction}
                selectedRewriteText={selectedRewriteText}
                rewriteApplyText={rewriteApplyText}
                backendRewriteLoading={backendRewriteLoading}
                backendRewriteOptions={backendRewriteOptions}
                onChapterChange={updateChapter}
                onGenerateSummary={generateChapterSummary}
                onTogglePublish={() => togglePublishChapter(currentChapter.id)}
                onRewriteInstructionChange={setRewriteInstruction}
                onSelectedRewriteTextChange={(value) => {
                  setSelectedRewriteText(value)
                  setBackendRewriteOptions([])
                }}
                onSelectedRewriteRangeChange={setSelectedRewriteRange}
                onRewriteApplyTextChange={setRewriteApplyText}
                onGenerateRewrite={runLocalRewritePackage}
                onGenerateBackendRewrite={runBackendRewritePackage}
                onCancelBackendRewrite={cancelBackendRewrite}
                onOpenRewriteWebAi={() => openWebAi('rewrite')}
                onApplyRewriteToSelection={applyRewriteToSelection}
              />
            )}
            {view === 'lore' && (
              <LoreView
                entries={filteredLore}
                selected={selectedLore}
                draft={loreDraft}
                filter={loreFilter}
                search={loreSearch}
                syncMessage={loreSyncMessage}
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
                onExtractCandidates={extractMemoryCandidates}
                onAdd={addMemory}
                onUpdate={updateMemory}
                onStatusChange={updateMemoryStatus}
                onDelete={deleteMemory}
                onOpenWebAi={() => openWebAi('memory')}
                onSyncSummary={syncMemorySummary}
              />
            )}
            {view === 'checks' && (
              <ChecksView
                issues={checkIssues}
                viralSummary={viralDiagnosis}
                onRunCheck={runLocalCheck}
                onRunReadthroughDiagnosis={runReadthroughDiagnosis}
                onRunHumanTasteRevision={runHumanTasteRevision}
                onRunViralPotentialDiagnosis={runViralPotentialDiagnosis}
                onCopyViralPrompt={copyViralDeepPrompt}
                onCopyViralIssuePrompt={copyViralIssueRewritePrompt}
                onCopySuggestion={copySuggestion}
                onInsertSuggestion={insertSuggestion}
                onStatusChange={updateIssueStatus}
                onOpenWebAi={() => openWebAi('check')}
                onRunBackendCheck={runBackendCheck}
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
            <LocalAssistantSearchPanel
              query={assistantSearchQuery}
              results={assistantSearchResults}
              onQueryChange={setAssistantSearchQuery}
              onOpenResult={openAssistantSearchResult}
              onInsertResult={(text) => insertSuggestion(text)}
            />
            <div className="mt-4 space-y-2">
              <PilotCard title="生成章节摘要" text={`${memoryEntries.length} 条记忆，${memoryEntries.filter((entry) => entry.type === 'open-foreshadow').length} 条伏笔`} action="生成" onAction={generateChapterSummary} />
              <PilotCard title="提取记忆候选" text="事件 / 人物 / 设定 / 伏笔" action="提取" onAction={extractMemoryCandidates} />
              <PilotCard title="检查人物与伏笔" text={openIssues.length ? `${openIssues.length} 条待处理` : '本地规则检查'} action="检查" onAction={runLocalCheck} />
              <PilotCard title="爆款潜力诊断" text="卖点 / 钩子 / 爽点 / IP" action="诊断" onAction={runViralPotentialDiagnosis} />
              <PilotCard title="改写 / 扩写 / 精修" text="本地改稿包，不覆盖正文" action="生成" onAction={() => runLocalRewritePackage(rewriteInstruction)} />
              <PilotCard title="追读诊断" text="钩子 / 目标 / 爽点 / 悬念" action="诊断" onAction={runReadthroughDiagnosis} />
              <PilotCard title="人味修订" text="保守 / 强刺激 / 爽文方向" action="修订" onAction={runHumanTasteRevision} />
              <PilotCard title="章节衍生" text="短剧 / 互动剧情游戏设定包" action="打开" onAction={() => setView('ip')} />
            </div>
            <VersionHistoryPanel
              records={versionRecords}
              canSync={Boolean(backendToken)}
              onCreateVersion={onCreateVersion}
              onManualSync={onManualSync}
              onRestoreVersion={onRestoreVersion}
            />
            <BackendRewriteLogPanel
              logs={backendRewriteLogs}
              loading={backendRewriteLogsLoading}
              canLoad={Boolean(backendToken && work.backendNovelId)}
              onRefresh={() => void refreshBackendRewriteLogs(true)}
              onAdopt={adoptBackendRewriteLog}
            />
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

function LocalAssistantSearchPanel({
  query,
  results,
  onQueryChange,
  onOpenResult,
  onInsertResult,
}: {
  query: string
  results: AssistantSearchResult[]
  onQueryChange: (value: string) => void
  onOpenResult: (result: AssistantSearchResult) => void
  onInsertResult: (text: string) => void
}) {
  return (
    <section className="mt-4 rounded-md border border-teal-100 bg-white/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Search className="h-4 w-4 text-teal-700" />
          本地助手搜索
        </h3>
        <span className="rounded bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">安全操作 V0</span>
      </div>
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className="mt-3 h-9 w-full rounded-md border border-slate-200 px-3 text-xs outline-none ring-teal-500/15 focus:ring-4"
        placeholder="搜章节、设定、记忆、检查、产物..."
      />
      <div className="mt-3 space-y-2">
        {results.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-400">
            输入关键词后，会在当前作品内检索，并只提供需要你确认的打开、复制或插入动作。
          </div>
        ) : (
          results.map((result) => (
            <article key={`${result.kind}-${result.id}`} className="rounded-md border border-slate-200 bg-white p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{assistantSearchKindText(result.kind)}</span>
                    <h4 className="truncate text-xs font-semibold text-slate-800">{result.title}</h4>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{result.excerpt}</p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => onOpenResult(result)} className="rounded border border-teal-200 px-2 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50">打开</button>
                {result.actionText && <button onClick={() => onInsertResult(result.actionText || '')} className="rounded border border-violet-200 px-2 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-50">插入修改区</button>}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
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

function countTextChars(value: string) {
  return value.replace(/\s/g, '').length
}

function buildAssistantSearchResults(
  query: string,
  chapters: WorkChapter[],
  loreEntries: LoreEntry[],
  memoryEntries: MemoryEntry[],
  checkIssues: CheckIssue[],
  artifactRecords: ArtifactRecord[],
): AssistantSearchResult[] {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return []
  const results: AssistantSearchResult[] = []

  chapters.forEach((chapter) => {
    const text = `${chapter.title} ${chapter.content}`.toLowerCase()
    if (!text.includes(keyword)) return
    results.push({
      id: chapter.id,
      kind: 'chapter',
      title: chapter.title || `第 ${chapter.chapterNumber} 章`,
      excerpt: extractSearchExcerpt(chapter.content, keyword) || `${chapter.wordCount} 字 · ${chapter.status === 'published' ? '已发布' : '草稿'}`,
      targetView: 'editor',
    })
  })

  loreEntries.forEach((entry) => {
    const text = `${entry.title} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase()
    if (!text.includes(keyword)) return
    results.push({
      id: entry.id,
      kind: 'lore',
      title: entry.title,
      excerpt: extractSearchExcerpt(entry.content, keyword) || entry.tags.join('、') || loreTypeLabels[entry.type],
      actionText: `【资料库引用】${entry.title}\n${entry.content}`,
      targetView: 'lore',
    })
  })

  memoryEntries.map(normalizeMemoryEntry).forEach((entry) => {
    const text = `${entry.title} ${entry.content}`.toLowerCase()
    if (!text.includes(keyword)) return
    results.push({
      id: entry.id,
      kind: 'memory',
      title: entry.title,
      excerpt: extractSearchExcerpt(entry.content, keyword) || memoryTypeLabels[entry.type],
      actionText: `【长篇记忆引用】${entry.title}\n${entry.content}`,
      targetView: 'memory',
    })
  })

  checkIssues.forEach((issue) => {
    const text = `${issue.title || ''} ${issue.description} ${issue.evidence || ''} ${issue.suggestionText || issue.suggestion}`.toLowerCase()
    if (!text.includes(keyword)) return
    results.push({
      id: issue.id,
      kind: 'issue',
      title: issue.title || issue.description,
      excerpt: extractSearchExcerpt(issue.description, keyword) || issue.reason || issue.evidence || issue.suggestion,
      actionText: issue.suggestionText || issue.suggestion,
      targetView: 'checks',
    })
  })

  artifactRecords.forEach((record) => {
    const text = `${record.title} ${record.content} ${record.chapterTitle}`.toLowerCase()
    if (!text.includes(keyword)) return
    results.push({
      id: record.id,
      kind: 'artifact',
      title: record.title,
      excerpt: extractSearchExcerpt(record.content, keyword) || `${artifactKindLabel(record.kind)} · ${record.createdAt}`,
      actionText: record.content,
      targetView: 'overview',
    })
  })

  return results.slice(0, 8)
}

function extractSearchExcerpt(value: string, keyword: string) {
  const text = value.trim()
  if (!text) return ''
  const lower = text.toLowerCase()
  const index = lower.indexOf(keyword)
  if (index < 0) return text.slice(0, 90)
  const start = Math.max(0, index - 36)
  const end = Math.min(text.length, index + keyword.length + 54)
  return `${start > 0 ? '...' : ''}${text.slice(start, end)}${end < text.length ? '...' : ''}`
}

function assistantSearchKindText(kind: AssistantSearchKind) {
  const labels: Record<AssistantSearchKind, string> = {
    chapter: '章节',
    lore: '资料',
    memory: '记忆',
    issue: '检查',
    artifact: '产物',
  }
  return labels[kind]
}

function artifactKindLabel(kind: ArtifactKind) {
  const labels: Record<ArtifactKind, string> = {
    summary: '摘要',
    check: '检查',
    viral: '爆款',
    rewrite: '改稿',
    'web-ai': 'Web AI',
    screenplay: '短剧',
    game: '游戏',
  }
  return labels[kind]
}

function buildRewriteVersionOptions(original: string, instruction: string): RewriteVersionOption[] {
  const source = original.trim()
  if (!source) return []
  const compactInstruction = instruction.trim()
  const cleaned = normalizeRewriteCandidate(source)
  const expanded = expandRewriteCandidate(source, compactInstruction)
  const polished = polishRewriteCandidate(source)
  const intense = intensifyRewriteCandidate(source, compactInstruction)
  return [
    {
      id: 'conservative',
      title: '保守改',
      tone: '保留剧情',
      summary: '尽量不改变事件顺序，只减少说明感并补一点动作停顿。',
      text: cleaned,
    },
    {
      id: 'expanded',
      title: '扩写',
      tone: '补现场',
      summary: '补环境压力、人物动作和一句短反应，适合需要更有画面的段落。',
      text: expanded,
    },
    {
      id: 'polished',
      title: '精修',
      tone: '提节奏',
      summary: '拆短句、去重复，让信息推进更清楚。',
      text: polished,
    },
    {
      id: 'intense',
      title: '强刺激改',
      tone: '加冲突',
      summary: '在不改主线设定的前提下，把压力、代价或章末钩子往前推。',
      text: intense,
    },
  ].filter((option, index, list) => option.text && list.findIndex((item) => item.text === option.text) === index)
}

function buildBackendRewriteVersionOptions(result: BackendRewriteResult): RewriteVersionOption[] {
  const options: RewriteVersionOption[] = [
    {
      id: 'backend-recommended',
      title: '推荐采用',
      tone: 'API 推荐',
      summary: '模型综合判断后最建议填入采用文本的版本。',
      text: result.replacementText?.trim() || '',
      source: 'backend',
    },
    {
      id: 'backend-conservative',
      title: '保守改',
      tone: 'API 保守',
      summary: '尽量保留剧情和设定，只增强表达。',
      text: result.conservativeText?.trim() || '',
      source: 'backend',
    },
    {
      id: 'backend-expanded',
      title: '扩写',
      tone: 'API 扩写',
      summary: '补场景、动作、对话和心理，让片段更有画面。',
      text: result.expandedText?.trim() || '',
      source: 'backend',
    },
    {
      id: 'backend-polished',
      title: '精修',
      tone: 'API 精修',
      summary: '压缩说明腔，调整句式和节奏。',
      text: result.polishedText?.trim() || '',
      source: 'backend',
    },
    {
      id: 'backend-intense',
      title: '强刺激改',
      tone: 'API 强刺激',
      summary: '增强冲突、反差、代价或章末追读。',
      text: result.intenseText?.trim() || '',
      source: 'backend',
    },
  ]
  return options.filter((option, index, list) => option.text && list.findIndex((item) => item.text === option.text) === index)
}

function parseBackendRewriteLogResult(value: string): BackendRewriteResult {
  const raw = value.trim()
  if (!raw) return {}
  try {
    return JSON.parse(extractJsonObject(raw)) as BackendRewriteResult
  } catch {
    return {
      mode: 'model-api-raw',
      replacementText: raw,
      conservativeText: raw,
      riskNotes: ['历史响应不是标准 JSON，已按原始文本再次采用；替换前请人工检查。'],
    }
  }
}

function extractJsonObject(value: string) {
  const start = value.indexOf('{')
  const end = value.lastIndexOf('}')
  return start >= 0 && end > start ? value.slice(start, end + 1) : value
}

function formatBackendLogTime(value?: string) {
  if (!value) return '未知时间'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function normalizeRewriteCandidate(value: string) {
  return value
    .replace(/其实|显然|他意识到|她意识到|这意味着|毫无疑问/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function expandRewriteCandidate(value: string, instruction: string) {
  const text = normalizeRewriteCandidate(value)
  const hint = instruction ? ` ${instruction}` : ''
  return [
    text,
    '',
    `他没有立刻接话。周围的动静像是被压低了一层，连呼吸都显得格外清楚。${hint ? `他想起刚才那个要求：${hint.trim()}。` : '他把已经到嘴边的话压了回去。'}下一刻，他才抬眼，声音比刚才更低：“我只问一次，你确定要这么做？”`,
  ].join('\n').trim()
}

function polishRewriteCandidate(value: string) {
  return normalizeRewriteCandidate(value)
    .replace(/。/g, '。\n')
    .replace(/\n{2,}/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

function intensifyRewriteCandidate(value: string, instruction: string) {
  const text = normalizeRewriteCandidate(value)
  const pressure = /章末|钩子|悬念|结尾/.test(instruction)
    ? '屏幕忽然亮了一下。那条本该被删掉的消息，正安静地躺在最上面。'
    : '门外的脚步声停住了。对方没有催，只像是在提醒他：选择的时间到了。'
  return `${text}\n\n${pressure}\n他指节抵住桌沿，终于笑了一下：“好，那就照你的规矩来。”`
}

function buildRewriteDiffPreview(original: string, replacement: string): RewriteDiffPreview {
  const maxTokens = 900
  const originalTokens = tokenizeRewriteDiffText(original)
  const replacementTokens = tokenizeRewriteDiffText(replacement)
  const truncated = originalTokens.length > maxTokens || replacementTokens.length > maxTokens
  const sourceTokens = originalTokens.slice(0, maxTokens)
  const targetTokens = replacementTokens.slice(0, maxTokens)
  if (!sourceTokens.length && !targetTokens.length) return { segments: [], truncated }

  const rows = sourceTokens.length + 1
  const cols = targetTokens.length + 1
  const table = Array.from({ length: rows }, () => Array<number>(cols).fill(0))

  for (let i = sourceTokens.length - 1; i >= 0; i -= 1) {
    for (let j = targetTokens.length - 1; j >= 0; j -= 1) {
      table[i][j] = sourceTokens[i] === targetTokens[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }

  const segments: RewriteDiffSegment[] = []
  let i = 0
  let j = 0
  while (i < sourceTokens.length && j < targetTokens.length) {
    if (sourceTokens[i] === targetTokens[j]) {
      pushRewriteDiffSegment(segments, 'equal', sourceTokens[i])
      i += 1
      j += 1
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      pushRewriteDiffSegment(segments, 'removed', sourceTokens[i])
      i += 1
    } else {
      pushRewriteDiffSegment(segments, 'added', targetTokens[j])
      j += 1
    }
  }

  while (i < sourceTokens.length) {
    pushRewriteDiffSegment(segments, 'removed', sourceTokens[i])
    i += 1
  }
  while (j < targetTokens.length) {
    pushRewriteDiffSegment(segments, 'added', targetTokens[j])
    j += 1
  }

  return { segments, truncated }
}

function tokenizeRewriteDiffText(value: string) {
  const tokens = value.match(/[\u4e00-\u9fa5]|[A-Za-z0-9_]+|\s+|[^\sA-Za-z0-9_\u4e00-\u9fa5]/g)
  return tokens ?? []
}

function pushRewriteDiffSegment(segments: RewriteDiffSegment[], type: RewriteDiffSegment['type'], text: string) {
  const last = segments[segments.length - 1]
  if (last?.type === type) {
    last.text += text
    return
  }
  segments.push({ type, text })
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
  const chapterWords = normalizedChapters.reduce((sum, chapter) => sum + chapter.content.replace(/\s/g, '').length, 0)
  const publishedChapterCount = normalizedChapters.filter((chapter) => chapter.status === 'published').length

  return {
    ...work,
    title: work.title || '未命名作品',
    type: work.type || materials.genre || '待整理题材',
    words: chapterWords,
    targetWords: safeNumber(work.targetWords),
    plannedChapters: safeNumber(work.plannedChapters),
    chapterCount: normalizedChapters.length,
    weeklyUpdateGoal: safeNumber(work.weeklyUpdateGoal),
    monthlyUpdatedChapters: publishedChapterCount,
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
  const words = normalized.reduce((sum, chapter) => sum + chapter.content.replace(/\s/g, '').length, 0)
  const publishedChapterCount = normalized.filter((chapter) => chapter.status === 'published').length

  return {
    ...work,
    chapters: normalized,
    chapterTitle: first?.title || work.chapterTitle,
    chapterText: first?.content ?? work.chapterText,
    words,
    chapterCount: normalized.length,
    monthlyUpdatedChapters: publishedChapterCount,
    updatedAt: '刚刚',
  }
}

function ChapterNavItem({
  chapter,
  active,
  selected,
  moveUpDisabled,
  moveDownDisabled,
  onOpen,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
  onTogglePublish,
}: {
  chapter: WorkChapter
  active: boolean
  selected: boolean
  moveUpDisabled: boolean
  moveDownDisabled: boolean
  onOpen: () => void
  onSelect: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onTogglePublish: () => void
}) {
  return (
    <div className={cn('group rounded-md border px-2 py-2', active ? 'border-blue-200 bg-blue-50' : selected ? 'border-[#d8e5e4] bg-[#f6fbfa]' : 'border-transparent hover:border-slate-200 hover:bg-slate-50')}>
      <div className="flex w-full items-center gap-2">
        <input type="checkbox" checked={selected} onChange={onSelect} onClick={(event) => event.stopPropagation()} className="h-3.5 w-3.5 rounded border-slate-300 accent-[#0f766e]" aria-label="选择章节" />
        <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <FileText className={cn('h-4 w-4 shrink-0', active ? 'text-blue-600' : 'text-slate-400')} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{chapter.title}</span>
          <span className={cn('rounded px-1.5 py-0.5 text-[10px]', chapter.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
            {chapter.status === 'published' ? '已发布' : '草稿'}
          </span>
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>第 {chapter.chapterNumber} 章 · {chapter.wordCount.toLocaleString()} 字</span>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button onClick={onMoveUp} disabled={moveUpDisabled} className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-white hover:text-teal-700 disabled:opacity-30">↑</button>
          <button onClick={onMoveDown} disabled={moveDownDisabled} className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-white hover:text-teal-700 disabled:opacity-30">↓</button>
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

function EditorView({
  chapter,
  rewriteInstruction,
  selectedRewriteText,
  rewriteApplyText,
  backendRewriteLoading,
  backendRewriteOptions,
  onChapterChange,
  onGenerateSummary,
  onTogglePublish,
  onRewriteInstructionChange,
  onSelectedRewriteTextChange,
  onSelectedRewriteRangeChange,
  onRewriteApplyTextChange,
  onGenerateRewrite,
  onGenerateBackendRewrite,
  onCancelBackendRewrite,
  onOpenRewriteWebAi,
  onApplyRewriteToSelection,
}: {
  chapter: WorkChapter
  rewriteInstruction: string
  selectedRewriteText: string
  rewriteApplyText: string
  backendRewriteLoading: boolean
  backendRewriteOptions: RewriteVersionOption[]
  onChapterChange: (patch: Partial<WorkChapter>) => void
  onGenerateSummary: () => void
  onTogglePublish: () => void
  onRewriteInstructionChange: (value: string) => void
  onSelectedRewriteTextChange: (value: string) => void
  onSelectedRewriteRangeChange: (range: TextRange | null) => void
  onRewriteApplyTextChange: (value: string) => void
  onGenerateRewrite: (instruction: string, targetText?: string) => void
  onGenerateBackendRewrite: (instruction: string, targetText?: string) => void
  onCancelBackendRewrite: () => void
  onOpenRewriteWebAi: () => void
  onApplyRewriteToSelection: (replacement: string) => void
}) {
  const originalCharCount = countTextChars(selectedRewriteText)
  const replacementCharCount = countTextChars(rewriteApplyText)
  const charDelta = replacementCharCount - originalCharCount
  const rewriteDiffPreview = useMemo(() => buildRewriteDiffPreview(selectedRewriteText, rewriteApplyText), [rewriteApplyText, selectedRewriteText])
  const rewriteVersionOptions = useMemo(() => buildRewriteVersionOptions(selectedRewriteText, rewriteInstruction), [rewriteInstruction, selectedRewriteText])
  const visibleRewriteVersionOptions = useMemo(() => [...backendRewriteOptions, ...rewriteVersionOptions], [backendRewriteOptions, rewriteVersionOptions])

  function captureSelection(element: HTMLTextAreaElement) {
    const start = element.selectionStart
    const end = element.selectionEnd
    const selected = element.value.slice(start, end).trim()
    onSelectedRewriteTextChange(selected)
    onSelectedRewriteRangeChange(selected ? { start, end } : null)
  }

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
        <textarea
          value={chapter.content}
          onChange={(event) => onChapterChange({ content: event.target.value })}
          onSelect={(event) => captureSelection(event.currentTarget)}
          onKeyUp={(event) => captureSelection(event.currentTarget)}
          onMouseUp={(event) => captureSelection(event.currentTarget)}
          className="min-h-[520px] w-full resize-none bg-transparent text-[17px] leading-9 outline-none"
        />
      </div>
      <div className="border-t border-slate-200 p-4">
        <div className="rounded-md border border-blue-100 bg-blue-50/50 p-3">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-blue-600" />
            {selectedRewriteText && <span className="shrink-0 rounded bg-white px-2 py-1 text-xs font-semibold text-blue-700">已选 {selectedRewriteText.replace(/\s/g, '').length} 字</span>}
            <input
              value={rewriteInstruction}
              onChange={(event) => onRewriteInstructionChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onGenerateRewrite(rewriteInstruction)
              }}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder="输入改稿要求，例如：扩写打脸现场、精修章末钩子、压缩说明腔..."
            />
            <button onClick={() => onGenerateRewrite(rewriteInstruction, selectedRewriteText)} className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white">生成改稿</button>
            <button onClick={() => onGenerateBackendRewrite(rewriteInstruction, selectedRewriteText)} disabled={backendRewriteLoading} className="rounded-md border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60">
              {backendRewriteLoading ? 'API 改稿中' : 'API 改稿'}
            </button>
            {backendRewriteLoading && <button onClick={onCancelBackendRewrite} className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">取消</button>}
            <button onClick={onOpenRewriteWebAi} className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Web AI</button>
          </div>
          {selectedRewriteText && (
            <div className="mt-3 border-t border-blue-100 pt-3">
              {visibleRewriteVersionOptions.length > 0 && (
                <div className="mb-3 grid gap-2 lg:grid-cols-4">
                  {visibleRewriteVersionOptions.map((option) => {
                    const optionCharCount = countTextChars(option.text)
                    const optionDelta = optionCharCount - originalCharCount
                    return (
                      <div key={option.id} className="rounded-md border border-blue-100 bg-white p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                              <span>{option.title}</span>
                              <span className={cn('rounded px-1.5 py-0.5 text-[10px]', option.source === 'backend' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700')}>
                                {option.source === 'backend' ? 'API' : '本地'}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">{option.tone} · {optionCharCount} 字 · {optionDelta >= 0 ? '+' : ''}{optionDelta}</div>
                          </div>
                          <button onClick={() => onRewriteApplyTextChange(option.text)} className="shrink-0 rounded bg-blue-600 px-2 py-1 font-semibold text-white hover:bg-blue-500">采用</button>
                        </div>
                        <p className="mt-2 line-clamp-2 text-slate-500">{option.summary}</p>
                        <div className="mt-2 max-h-20 overflow-hidden whitespace-pre-wrap rounded bg-slate-50 p-2 leading-5 text-slate-600">{option.text}</div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  value={rewriteApplyText}
                  onChange={(event) => onRewriteApplyTextChange(event.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-blue-100 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300"
                  placeholder="粘贴要采用的改稿片段，然后点击替换选区"
                />
                <button onClick={() => onApplyRewriteToSelection(rewriteApplyText)} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">替换选区</button>
              </div>
              {rewriteApplyText.trim() && (
                <div className="mt-2 space-y-2 text-xs text-slate-600">
                  <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-white px-2 py-1">原选区 {originalCharCount} 字</span>
                  <span className="rounded bg-white px-2 py-1">采用文本 {replacementCharCount} 字</span>
                  <span className={cn('rounded px-2 py-1 font-semibold', Math.abs(charDelta) > Math.max(80, originalCharCount * 0.5) ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>
                    变化 {charDelta >= 0 ? '+' : ''}{charDelta} 字
                  </span>
                  {Math.abs(charDelta) > Math.max(80, originalCharCount * 0.5) && <span className="text-amber-700">变化较大，替换前建议再确认节奏和设定。</span>}
                  </div>
                  <div className="rounded-md border border-blue-100 bg-white p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-700">逐词 diff 预览</span>
                      <span className="rounded bg-rose-50 px-2 py-0.5 font-medium text-rose-700">红色为删除</span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">绿色为新增</span>
                      {rewriteDiffPreview.truncated && <span className="text-amber-700">文本较长，仅预览前 900 个片段。</span>}
                    </div>
                    <div className="max-h-32 overflow-y-auto rounded border border-slate-100 bg-slate-50 p-2 leading-6 text-slate-700">
                      {rewriteDiffPreview.segments.map((segment, index) => (
                        <span
                          key={`${segment.type}-${index}`}
                          className={cn(
                            'whitespace-pre-wrap rounded-sm px-0.5',
                            segment.type === 'added' && 'bg-emerald-100 text-emerald-800',
                            segment.type === 'removed' && 'bg-rose-100 text-rose-700 line-through',
                          )}
                        >
                          {segment.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
  syncMessage,
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
  syncMessage: string
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
        {syncMessage && <p className="mt-2 text-xs leading-5 text-slate-500">{syncMessage}</p>}
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
  onExtractCandidates,
  onAdd,
  onUpdate,
  onStatusChange,
  onDelete,
  onOpenWebAi,
  onSyncSummary,
}: {
  entries: MemoryEntry[]
  stats: Array<{ type: MemoryType; count: number }>
  onGenerateSummary: () => void
  onExtractCandidates: () => void
  onAdd: (type: MemoryType) => void
  onUpdate: (id: string, content: string) => void
  onStatusChange: (id: string, status: NonNullable<MemoryEntry['status']>) => void
  onDelete: (id: string) => void
  onOpenWebAi: () => void
  onSyncSummary: () => void
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
          <button onClick={onSyncSummary} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">同步/保存记忆摘要</button>
          <button onClick={onOpenWebAi} className="rounded-md border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">Web AI 记忆 Prompt</button>
          <button onClick={onExtractCandidates} className="rounded-md border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">提取记忆候选</button>
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
  viralSummary,
  onRunCheck,
  onRunReadthroughDiagnosis,
  onRunHumanTasteRevision,
  onRunViralPotentialDiagnosis,
  onCopyViralPrompt,
  onCopyViralIssuePrompt,
  onCopySuggestion,
  onInsertSuggestion,
  onStatusChange,
  onOpenWebAi,
  onRunBackendCheck,
}: {
  issues: CheckIssue[]
  viralSummary: ViralDiagnosisSummary | null
  onRunCheck: () => void
  onRunReadthroughDiagnosis: () => void
  onRunHumanTasteRevision: () => void
  onRunViralPotentialDiagnosis: () => void
  onCopyViralPrompt: () => void
  onCopyViralIssuePrompt: (issue: CheckIssue) => void
  onCopySuggestion: (text: string) => void
  onInsertSuggestion: (text: string) => void
  onStatusChange: (id: string, status: CheckIssue['status']) => void
  onOpenWebAi: () => void
  onRunBackendCheck: () => void
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
          <button onClick={onRunBackendCheck} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">后端分析</button>
          <button onClick={onRunViralPotentialDiagnosis} className="rounded-md border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">爆款诊断</button>
          <button onClick={onCopyViralPrompt} className="rounded-md border border-fuchsia-200 px-4 py-2 text-sm font-semibold text-fuchsia-700 hover:bg-fuchsia-50">深度诊断 Prompt</button>
          <button onClick={onRunReadthroughDiagnosis} className="rounded-md border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">追读诊断</button>
          <button onClick={onRunHumanTasteRevision} className="rounded-md border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">人味修订</button>
          <button onClick={onRunCheck} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">开始本地检查</button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-3">
        <StatCard label="高风险" value={counts.high} tone="red" />
        <StatCard label="中风险" value={counts.medium} tone="amber" />
        <StatCard label="低风险" value={counts.low} tone="blue" />
        <StatCard label="已处理" value={counts.resolved} tone="emerald" />
      </div>
      {viralSummary && (
        <section className="mt-5 rounded-md border border-rose-200 bg-rose-50/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-950">爆款潜力诊断 · {viralSummary.overallLevel}</h3>
                <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-rose-700">{viralSummary.overallScore} / 100</span>
                <span className="rounded bg-white px-2 py-1 text-xs text-slate-500">本地规则评分，仅作创作参考</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{viralSummary.overallSummary}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{viralSummary.disclaimer}</p>
            </div>
            <div className="grid min-w-[240px] grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded bg-white px-2 py-2"><div className="font-semibold text-red-600">{viralSummary.highRiskCount}</div><div className="text-slate-500">高风险</div></div>
              <div className="rounded bg-white px-2 py-2"><div className="font-semibold text-amber-600">{viralSummary.mediumRiskCount}</div><div className="text-slate-500">中风险</div></div>
              <div className="rounded bg-white px-2 py-2"><div className="font-semibold text-blue-600">{viralSummary.lowRiskCount}</div><div className="text-slate-500">低风险</div></div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs md:grid-cols-5">
            {(Object.entries(viralSummary.dimensionScores) as Array<[ViralDimensionKey, number]>).map(([key, score]) => (
              <div key={key} className="rounded bg-white px-2 py-2">
                <div className="font-semibold text-slate-800">{viralDimensionLabels[key]}</div>
                <div className="mt-1 text-slate-500">{score} / 100</div>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="mt-5 space-y-3">
        {issues.map((issue) => (
          <article key={issue.id} className={cn('rounded-md border p-4', issue.status === 'ignored' ? 'border-slate-200 bg-slate-50 opacity-70' : issue.severity === 'high' ? 'border-red-200 bg-red-50/50' : issue.severity === 'medium' ? 'border-amber-200 bg-amber-50/50' : 'border-blue-200 bg-blue-50/40')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white px-2 py-1 text-xs font-semibold">{severityLabels[issue.severity]}</span>
                  <span className="text-sm font-semibold">{issue.title || issueTypeLabels[issue.issueType]}</span>
                  <span className="text-xs text-slate-500">{issue.position}</span>
                </div>
                {issue.dimension && <p className="mt-2 text-xs font-semibold text-slate-500">维度：{issue.dimension} · 优先级：{issue.priority ?? '-'} · 置信度：{Math.round((issue.confidence ?? 0) * 100)}%</p>}
                <p className="mt-3 text-sm leading-6 text-slate-700">{issue.description}</p>
                {issue.excerpt && <p className="mt-2 rounded-md bg-white/70 p-3 text-xs leading-5 text-slate-500">摘录：{issue.excerpt}</p>}
                {issue.reason && <p className="mt-2 text-sm leading-6 text-slate-600">原因：{issue.reason}</p>}
                <p className="mt-2 rounded-md bg-white/70 p-3 text-sm leading-6 text-slate-600">建议：{issue.suggestion}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"><Eye className="mr-1 inline h-3 w-3" />查看原文</button>
                <button onClick={() => onCopySuggestion(issue.suggestionText || issue.suggestion)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"><Clipboard className="mr-1 inline h-3 w-3" />复制建议</button>
                {issue.source === 'viral-potential-local-v0' && <button onClick={() => onCopyViralIssuePrompt(issue)} className="rounded-md border border-fuchsia-200 bg-white px-3 py-1.5 text-xs text-fuchsia-700 hover:bg-fuchsia-50">单项 Prompt</button>}
                <button onClick={() => onInsertSuggestion(issue.suggestionText || issue.suggestion)} className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500">插入修改区</button>
                <button onClick={() => onStatusChange(issue.id, 'ignored')} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50">忽略</button>
                <button onClick={() => onStatusChange(issue.id, 'resolved')} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">标记已处理</button>
              </div>
            </div>
          </article>
        ))}
        {issues.length === 0 && <div className="rounded-md border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500">暂无检查结果，点击“爆款诊断”“开始本地检查”“追读诊断”“人味修订”或生成 Web AI 检查 Prompt。</div>}
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

function VersionHistoryPanel({
  records,
  canSync,
  onCreateVersion,
  onManualSync,
  onRestoreVersion,
}: {
  records: WorkVersionRecord[]
  canSync: boolean
  onCreateVersion?: () => void
  onManualSync?: () => void
  onRestoreVersion?: (record: WorkVersionRecord) => void
}) {
  return (
    <section className="mt-5 rounded-lg border border-[#d8e5e4] bg-white/78 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><History className="h-4 w-4 text-[#2f7f86]" />版本与同步</h3>
        <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', canSync ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
          {canSync ? '可手动同步' : '本地模式'}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">MVP：保留本地快照，可恢复为新副本；云端仅做手动作品快照，不做实时协同。</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onCreateVersion} className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">留版本</button>
        <button onClick={onManualSync} className="rounded-md bg-slate-950 px-2 py-2 text-xs font-semibold text-white hover:bg-slate-800">{canSync ? '手动同步' : '本地备份'}</button>
      </div>
      <div className="mt-3 space-y-2">
        {records.slice(0, 4).map((record) => (
          <article key={record.id} className="rounded-md border border-slate-100 bg-[#f8fbfa] p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-slate-800">{record.createdAt}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{record.chapterCount} 章 · {record.wordCount.toLocaleString()} 字</div>
              </div>
              <button onClick={() => onRestoreVersion?.(record)} className="shrink-0 rounded border border-[#d8e5e4] bg-white px-2 py-1 text-[11px] font-semibold text-[#0f766e] hover:bg-[#e7f3ef]">恢复副本</button>
            </div>
          </article>
        ))}
        {records.length === 0 && <div className="rounded-md border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500">还没有版本快照，保存或点击“留版本”后会出现在这里。</div>}
      </div>
    </section>
  )
}

function BackendRewriteLogPanel({
  logs,
  loading,
  canLoad,
  onRefresh,
  onAdopt,
}: {
  logs: BackendRewriteLog[]
  loading: boolean
  canLoad: boolean
  onRefresh: () => void
  onAdopt: (log: BackendRewriteLog) => void
}) {
  return (
    <section className="mt-5 rounded-lg border border-emerald-100 bg-white/78 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><History className="h-4 w-4 text-emerald-700" />API 改稿历史</h3>
        <button onClick={onRefresh} disabled={!canLoad || loading} className="rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? '刷新中' : '刷新'}
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">读取后端 `chapter_rewrite` 日志；再次采用只会填入采用文本，不覆盖正文。</p>
      <div className="mt-3 space-y-2">
        {!canLoad && <div className="rounded-md border border-dashed border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-700">登录并同步正式作品后，可查看后端 API 改稿历史。</div>}
        {canLoad && logs.slice(0, 5).map((log) => {
          const parsed = parseBackendRewriteLogResult(log.responseSnapshot || '')
          const preview = parsed.replacementText || parsed.conservativeText || log.responseSnapshot || ''
          return (
            <article key={log.id} className="rounded-md border border-emerald-100 bg-[#f8fbfa] p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-slate-800">{formatBackendLogTime(log.createTime)}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{log.modelName || 'model-api'} · {log.tokenUsage || 0} token 估算</div>
                </div>
                <button onClick={() => onAdopt(log)} className="shrink-0 rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">再次采用</button>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500">{preview || '暂无响应快照'}</p>
            </article>
          )
        })}
        {canLoad && !loading && logs.length === 0 && <div className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">暂无 API 改稿历史。</div>}
      </div>
    </section>
  )
}

function ArtifactRunList({ records, onCopy, onInsert, onDownload }: { records: ArtifactRecord[]; onCopy: (record: ArtifactRecord) => void; onInsert: (record: ArtifactRecord) => void; onDownload: (record: ArtifactRecord) => void }) {
  const visibleRecords = records.slice(0, 5)
  const labels: Record<ArtifactKind, string> = {
    summary: '摘要',
    check: '检查',
    viral: '爆款',
    rewrite: '改稿',
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
  target: WebAiTarget
  prompt: string
  rawResult: string
  promptRuns: PromptRunRecord[]
  onRawResultChange: (value: string) => void
  onPromptCopied: (prompt: string) => void
  onClose: () => void
  onParse: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [userInstruction, setUserInstruction] = useState('')
  const effectivePrompt = userInstruction.trim()
    ? `${prompt}\n\n【本次额外要求】\n${userInstruction.trim()}`
    : prompt
  const inspection = inspectPrompt(effectivePrompt)
  if (!open) return null
  function copyPrompt() {
    navigator.clipboard?.writeText(effectivePrompt)
    onPromptCopied(effectivePrompt)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 p-6 backdrop-blur-sm">
      <section className="mx-auto max-w-6xl rounded-lg border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-7 py-6">
          <div>
            <h2 className="text-xl font-semibold">Web AI 模式 · {target === 'check' ? '检查 Prompt' : target === 'memory' ? '长篇记忆 Prompt' : '改稿 Prompt'}</h2>
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
            <label className="mb-3 block">
              <span className="text-xs font-semibold text-slate-500">本次额外要求</span>
              <textarea
                value={userInstruction}
                onChange={(event) => setUserInstruction(event.target.value)}
                className="mt-2 h-24 w-full resize-none rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-violet-300"
                placeholder="例如：优先检查章末钩子；建议更偏男频爽文节奏；不要直接改写正文。"
              />
            </label>
            <pre className="h-[330px] overflow-y-auto whitespace-pre-wrap rounded-md border border-violet-200 bg-violet-50/70 p-4 text-sm leading-6">{effectivePrompt}</pre>
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
                      <span className="font-semibold text-slate-800">{run.target === 'check' ? '检查 Prompt' : run.target === 'memory' ? '记忆 Prompt' : '改稿 Prompt'} · {run.status === 'copied' ? '已复制' : '已解析'}</span>
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

function buildLocalMemoryCandidates(work: SavedWork, chapter: WorkChapter, loreEntries: LoreEntry[]): MemoryEntry[] {
  const text = chapter.content || work.chapterText || ''
  const summary = localSummary(text)
  const sourceText = text.slice(0, 260)
  const now = Date.now()
  const characterName = [
    ...(work.protagonists || []),
    ...(work.mainCharacters || []),
    ...loreEntries.filter((entry) => entry.type === 'character').map((entry) => entry.title),
  ].find(Boolean) || '主角'
  const worldSignal = (work.worldRules || []).find(Boolean) || loreEntries.find((entry) => entry.type === 'world')?.content || work.materials.genre || '当前世界规则'
  const foreshadowSignal = loreEntries.find((entry) => entry.type === 'foreshadow')?.content || work.materials.nextStep || '当前章节留下的后续问题'
  const contentHasForeshadow = /秘密|线索|异常|约定|伏笔|真相|背后|不见了|消息|声音|血|门外/.test(text)
  const contentHasWorldFact = /规则|门派|家族|学院|公司|系统|灵气|契约|禁令|法则|组织|城|世界/.test(text)
  const contentHasCharacterState = /犹豫|害怕|愤怒|不甘|决定|承认|隐瞒|背叛|相信|怀疑|喜欢|讨厌|失望|沉默/.test(text)

  const candidates: MemoryEntry[] = [
    {
      id: `memory-event-${now}`,
      type: 'event',
      title: `${chapter.title} 事件摘要`,
      content: summary,
      sourceChapterId: chapter.id,
      updatedAt: '刚刚',
      status: 'draft',
      confidence: 0.72,
      sourceText,
      createdBy: 'local',
      createdAt: '刚刚',
    },
    {
      id: `memory-character-${now + 1}`,
      type: 'character-state',
      title: `${characterName} 状态变化`,
      content: contentHasCharacterState
        ? `${characterName} 在「${chapter.title}」中出现了明确情绪、选择或关系变化，需要用户确认后写入长篇记忆。`
        : `${characterName} 在「${chapter.title}」中的状态暂未明确变化；如本章有关键决定，可手动补充后确认。`,
      sourceChapterId: chapter.id,
      updatedAt: '刚刚',
      status: 'draft',
      confidence: contentHasCharacterState ? 0.68 : 0.45,
      sourceText,
      createdBy: 'local',
      createdAt: '刚刚',
    },
    {
      id: `memory-world-${now + 2}`,
      type: 'world-fact',
      title: `${chapter.title} 设定事实`,
      content: contentHasWorldFact
        ? `本章可能补充了世界观 / 组织 / 规则信息：${worldSignal}。请确认是否成为后续不可违背事实。`
        : `本章暂未检测到强设定信息；可把与「${worldSignal}」相关的新规则补充到这里后确认。`,
      sourceChapterId: chapter.id,
      updatedAt: '刚刚',
      status: 'draft',
      confidence: contentHasWorldFact ? 0.62 : 0.4,
      sourceText,
      createdBy: 'local',
      createdAt: '刚刚',
    },
    {
      id: `memory-foreshadow-${now + 3}`,
      type: 'open-foreshadow',
      title: `${chapter.title} 未回收伏笔`,
      content: contentHasForeshadow
        ? `本章出现可追踪的异常、线索或未解问题：${foreshadowSignal}。后续章节应回收或强化。`
        : `本章未检测到明显伏笔；如章末埋了问题，可在这里改写后确认。参考下一步：${foreshadowSignal}`,
      sourceChapterId: chapter.id,
      updatedAt: '刚刚',
      status: 'draft',
      confidence: contentHasForeshadow ? 0.66 : 0.38,
      sourceText,
      createdBy: 'local',
      createdAt: '刚刚',
    },
  ]

  return candidates.map(normalizeMemoryEntry)
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

function upsertLoreEntry(entries: LoreEntry[], next: LoreEntry) {
  return entries.some((entry) => entry.id === next.id) ? entries.map((entry) => entry.id === next.id ? next : entry) : [next, ...entries]
}

async function saveLoreToBackend(entry: LoreEntry, novelId: string, token: string): Promise<LoreEntry> {
  const isUpdate = isUuid(entry.id)
  const response = await fetch(`${backendApiBase}/api/lore${isUpdate ? `/${encodeURIComponent(entry.id)}` : ''}`, {
    method: isUpdate ? 'PUT' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      novelId,
      category: loreTypeToBackendCategory(entry.type),
      name: entry.title,
      content: entry.content,
    }),
  })
  if (!response.ok) throw new Error('save lore failed')
  const result = await response.json() as BackendResult<BackendLore | null>
  if (isUpdate) return entry
  if (result.code !== 200 || !result.data?.id) throw new Error('invalid lore response')
  return loreFromBackend(result.data)
}

function loreFromBackend(lore: BackendLore): LoreEntry {
  const type = backendCategoryToLoreType(lore.category)
  return {
    id: lore.id,
    title: lore.name || loreTypeLabels[type],
    type,
    content: lore.content || '',
    tags: [loreTypeLabels[type]],
    relatedChapterIds: [],
    updatedAt: formatBackendTime(lore.updateTime || lore.createTime),
  }
}

function loreTypeToBackendCategory(type: LoreType) {
  const map: Record<LoreType, string> = {
    work: 'work',
    character: 'character',
    world: 'world_rule',
    location: 'location',
    item: 'item',
    faction: 'sect',
    foreshadow: 'foreshadow',
    'chapter-summary': 'chapter_summary',
  }
  return map[type]
}

function backendCategoryToLoreType(category: string): LoreType {
  const map: Record<string, LoreType> = {
    work: 'work',
    character: 'character',
    world: 'world',
    world_rule: 'world',
    location: 'location',
    item: 'item',
    faction: 'faction',
    sect: 'faction',
    foreshadow: 'foreshadow',
    chapter_summary: 'chapter-summary',
  }
  return map[category] || 'world'
}

function formatBackendTime(value?: string) {
  if (!value) return '刚刚'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚'
  return date.toLocaleString()
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
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

function localReadthroughDiagnosis(work: SavedWork, chapter: WorkChapter, loreEntries: LoreEntry[], memoryEntries: MemoryEntry[]): CheckIssue[] {
  const text = chapter.content || work.chapterText || ''
  const compactText = text.replace(/\s/g, '')
  const opening = compactText.slice(0, 300)
  const ending = compactText.slice(-300)
  const issues: CheckIssue[] = []
  const confirmedMemoryCount = memoryEntries.map(normalizeMemoryEntry).filter((entry) => entry.status === 'confirmed').length
  const hasCharacterContext = Boolean(work.mainCharacters?.length || work.protagonists?.length || loreEntries.some((entry) => entry.type === 'character'))

  if (compactText.length < 800) {
    issues.push({
      id: `readthrough-length-${Date.now()}`,
      issueType: 'chapter-goal',
      severity: 'medium',
      position: '全文篇幅',
      description: `当前章节约 ${compactText.length} 字，追读诊断依据偏少，可能还没有形成完整的目标、阻碍和章末钩子。`,
      suggestion: '先补齐本章的“目标 -> 阻碍 -> 变化 -> 章末问题”，再运行追读诊断会更稳定。',
      status: 'open',
    })
  }

  if (!/(死|杀|逃|追|危|血|债|秘密|背叛|异常|忽然|必须|不能|只剩|最后|代价|威胁|失去|爆|怒|痛)/.test(opening)) {
    issues.push({
      id: `readthrough-hook-${Date.now() + 1}`,
      issueType: 'chapter-goal',
      severity: 'high',
      position: '开头 300 字',
      description: '开头缺少明显的问题、欲望、冲突或异常信号，读者可能还没形成“为什么要继续看”的理由。',
      suggestion: '把本章最尖锐的麻烦前置：用一句异常事件、明确威胁、主角强欲望或反常细节开场，少用背景解释铺垫。',
      status: 'open',
    })
  }

  if (!/(想要|必须|决定|打算|我要|不能|为了|目标|救|查|赢|拿到|找到|证明|离开)/.test(compactText)) {
    issues.push({
      id: `readthrough-goal-${Date.now() + 2}`,
      issueType: 'chapter-goal',
      severity: 'high',
      position: '本章目标',
      description: hasCharacterContext
        ? '已有角色资料，但正文里主角本章想要什么仍不够清晰。'
        : '正文里主角本章想要什么不够清晰，读者难以判断剧情推进方向。',
      suggestion: '在前半章明确主角的当下目标，并让一个具体阻碍立刻挡住他，例如“他必须在天亮前拿到证据，否则会失去资格”。',
      status: 'open',
    })
  }

  if (!/(阻止|拦|敌|对手|威胁|代价|失败|惩罚|暴露|追杀|期限|倒计时|损失|赌|不能输)/.test(compactText)) {
    issues.push({
      id: `readthrough-pressure-${Date.now() + 3}`,
      issueType: 'emotion-flow',
      severity: 'medium',
      position: '冲突压力',
      description: '本章缺少明确对抗、期限、损失或情绪压力，剧情可能显得顺滑但不够抓人。',
      suggestion: '给主角目标加一个硬阻碍：对手提前行动、时间限制、误会升级、代价增加，至少保留一个会迫使主角选择的压力点。',
      status: 'open',
    })
  }

  if (!/(反击|打脸|赢|突破|揭开|真相|奖励|升级|获得|亲近|承认|震惊|跪|服|爽)/.test(compactText)) {
    issues.push({
      id: `readthrough-payoff-${Date.now() + 4}`,
      issueType: 'emotion-flow',
      severity: 'medium',
      position: '爽点兑现',
      description: '本章没有明显的阶段性获得、反击、揭示或关系推进，读者可能觉得投入没有回报。',
      suggestion: '在中后段安排一个小兑现：主角赢下一步、揭开一个信息、让关系发生变化，或让前文压力得到一次反向释放。',
      status: 'open',
    })
  }

  if (/(解释|说明|介绍|其实|原来|背景|设定)/.test(compactText) && !/(问|说|喊|看|冲|推|抓|笑|沉默|转身|停下)/.test(compactText)) {
    issues.push({
      id: `readthrough-density-${Date.now() + 5}`,
      issueType: 'emotion-flow',
      severity: 'low',
      position: '信息密度',
      description: '章节里解释性表达较多，但动作、对话或即时反应信号偏少，可能出现说明腔。',
      suggestion: '把设定解释拆进对话、动作后果和角色误判里；每段说明后补一个能改变局势的动作或反应。',
      status: 'open',
    })
  }

  if (!/(？|吗|秘密|真相|出现|推门|电话|消息|血|死|等着|下一|忽然|背后|声音|黑暗|不见了|来了)$/.test(ending)) {
    issues.push({
      id: `readthrough-ending-${Date.now() + 6}`,
      issueType: 'open-foreshadow',
      severity: 'high',
      position: '章末 300 字',
      description: '章末没有明显未解决问题、反转、危险或下一章诱因，追读动力可能偏弱。',
      suggestion: '把章末收在一个新问题上：未读消息、反常来客、证据反转、主角误判被揭穿，或让读者知道“下一章马上要付出代价”。',
      status: 'open',
    })
  }

  if (!issues.length) {
    issues.push({
      id: `readthrough-ok-${Date.now()}`,
      issueType: 'chapter-goal',
      severity: 'low',
      position: '全文',
      description: confirmedMemoryCount > 0
        ? `本地规则参考了 ${confirmedMemoryCount} 条已确认记忆，未发现明显追读风险。`
        : '本地规则未发现明显追读风险；当前未接平台数据和真实模型，只能作为修稿清单参考。',
      suggestion: '发布前仍建议人工检查开头 300 字和章末 300 字，确认读者能立刻看到问题，并愿意点下一章。',
      status: 'open',
    })
  }

  return issues
}

function localHumanTasteRevision(work: SavedWork, chapter: WorkChapter): CheckIssue[] {
  const text = chapter.content || work.chapterText || ''
  const compactText = text.replace(/\s/g, '')
  const hasDialogue = /“[^”]{2,}”|「[^」]{2,}」/.test(text)
  const hasBodyDetail = /(手|眼|肩|背|指尖|呼吸|喉咙|脚步|衣角|冷汗|发抖|僵住|低头|抬眼)/.test(compactText)
  const hasInnerConflict = /(犹豫|后悔|不甘|嫉妒|害怕|想逃|忍住|骗自己|明知道|偏要|舍不得)/.test(compactText)
  const templateTone = /(毫无疑问|众所周知|与此同时|值得一提|显而易见|不可避免|他意识到|她意识到|内心深处|命运的齿轮)/.test(compactText)
  const issues: CheckIssue[] = []
  const basePosition = chapter.title || '当前章节'

  issues.push({
    id: `human-conservative-${Date.now()}`,
    issueType: 'emotion-flow',
    severity: templateTone || !hasBodyDetail ? 'medium' : 'low',
    position: `${basePosition} · 保守改`,
    description: templateTone
      ? '章节里存在偏模板化或总结腔的表达，保守改方向适合在不改变剧情的前提下增加现场感。'
      : '当前章节可以做轻量人味增强：保留原剧情，只增加动作、停顿和具体反应。',
    suggestion: `保守改：挑 2-3 段说明性句子，改成“动作 + 反应 + 半句没说完的话”。示例方向：不要写“他意识到局势危险”，改成“他把话咽回去，指节抵在桌沿，才发现掌心全是汗”。`,
    status: 'open',
  })

  issues.push({
    id: `human-intense-${Date.now() + 1}`,
    issueType: 'chapter-goal',
    severity: hasInnerConflict ? 'low' : 'medium',
    position: `${basePosition} · 强刺激改`,
    description: hasInnerConflict
      ? '章节已经有一定人物矛盾，可以进一步把误判、欲望或代价推到台前。'
      : '章节的人物选择较顺，缺少误判、犹豫、欲望或代价，强刺激改可以增强人性张力。',
    suggestion: `强刺激改：让主角做一个不完全正确但能理解的选择。给他一个私心、误判或不能说出口的欲望，再让这个选择马上带来代价。`,
    status: 'open',
  })

  issues.push({
    id: `human-webnovel-${Date.now() + 2}`,
    issueType: 'emotion-flow',
    severity: hasDialogue ? 'low' : 'medium',
    position: `${basePosition} · 爽文改`,
    description: hasDialogue
      ? '章节已有对话基础，可以把对话改得更有攻防和情绪台阶。'
      : '章节对话信号偏少，爽文改方向适合补充短句交锋、压迫感和反击节点。',
    suggestion: `爽文改：增加一轮“压迫 -> 嘲讽 / 误解 -> 主角反击 -> 对方失态”的短对话。台词尽量短，少解释，多用停顿、反问和具体动作托住情绪。`,
    status: 'open',
  })

  if (compactText.length < 500) {
    issues.push({
      id: `human-length-${Date.now() + 3}`,
      issueType: 'chapter-goal',
      severity: 'low',
      position: `${basePosition} · 篇幅提示`,
      description: `当前章节约 ${compactText.length} 字，人味修订只能给方向，难以判断完整节奏。`,
      suggestion: '先补足一个完整场景，再从三种方向里选择一种执行；不要一次把三种风格全部叠上去。',
      status: 'open',
    })
  }

  return issues
}

function buildLocalRewritePackage(work: SavedWork, chapter: WorkChapter, instruction: string, targetText = '') {
  const rawText = chapter.content || work.chapterText || ''
  const compactText = rawText.replace(/\s+/g, '')
  const selectedText = targetText.trim()
  const userIntent = instruction.trim() || '请基于当前章节生成可确认的改写 / 扩写 / 精修建议。'
  const focusLabel = selectedText
    ? '选中文本片段'
    : /开头|开篇|前300|前 300/.test(userIntent)
    ? '开篇片段'
    : /结尾|章末|收尾|悬念|钩子/.test(userIntent)
      ? '章末片段'
      : /压缩|去水|精简|删/.test(userIntent)
        ? '说明性片段'
        : /爽点|打脸|反击|强刺激|冲突/.test(userIntent)
          ? '冲突 / 爽点片段'
          : '当前重点片段'
  const excerpt = selectedText || selectRewriteExcerpt(rawText, userIntent)
  const hasDialogue = /“[^”]{2,}”|「[^」]{2,}」/.test(rawText)
  const hasConflict = /(威胁|阻止|不能|必须|代价|失败|追杀|误会|敌|对手|背叛|期限|倒计时)/.test(compactText)
  const hasPayoff = /(反击|打脸|赢|突破|揭开|真相|获得|升级|震惊|承认)/.test(compactText)
  const toneHint = work.type || work.materials?.genre || '当前题材'
  const sellingPoint = firstText(work.sellingPoint, work.materials?.sellingPoint, work.coreConflict) || '当前卖点未填写，建议先明确主角欲望、冲突和爽点承诺。'

  return [
    '# 改写 / 扩写 / 精修 V0',
    '',
    '模式：本地规则改稿包',
    '边界：仅作为创作参考，不接真实模型，不自动覆盖正文，最终写入需要作者确认。',
    '',
    `作品：${work.title || '未命名作品'}`,
    `章节：${chapter.title || '未命名章节'}`,
    `改稿要求：${userIntent}`,
    `改稿范围：${selectedText ? `选中文本（${selectedText.replace(/\s/g, '').length} 字）` : '当前章节自动取样'}`,
    `题材参考：${toneHint}`,
    `卖点参考：${sellingPoint}`,
    '',
    `## ${focusLabel}`,
    excerpt || '当前章节正文为空或片段不足。',
    '',
    '## 1. 保守改',
    '目标：不改变剧情，只增强现场感和人物反应。',
    [
      '- 把抽象判断改成动作、停顿、视线和身体反应。',
      '- 保留原事件顺序，每段只补 1 个具体动作和 1 个短反应。',
      hasDialogue ? '- 已有对话基础：优先删解释，让台词承担信息。' : '- 对话偏少：补一句短台词，让人物关系更直接。',
    ].join('\n'),
    '',
    '可插入示例：',
    `他没有立刻回答。指节抵住桌沿，停了半拍，才把那句已经到嘴边的话压回去。`,
    '',
    '## 2. 扩写',
    '目标：补场景、动作、对话、心理和代价，让一段情节更像小说场面。',
    [
      '- 先补环境压力：声音、光线、人群反应或距离变化。',
      '- 再补人物动作：靠近、后退、停顿、抓住某物、避开目光。',
      '- 最后补一个代价或误判，让扩写不是单纯加字。',
    ].join('\n'),
    '',
    '可插入示例：',
    `门外的脚步声停住时，他才意识到自己已经没有退路。那人没有催，只轻轻敲了两下门，像是在提醒他：选择的时间到了。`,
    '',
    '## 3. 精修',
    '目标：减少说明腔和重复信息，让句子更短、更有推进力。',
    [
      '- 删掉“其实、显然、他意识到、这意味着”等解释性过渡。',
      '- 长句拆短句，把因果藏进动作和对话。',
      '- 每 3-5 段保留一个情绪落点，避免全程平铺。',
    ].join('\n'),
    '',
    '可插入示例：',
    `原本可以解释的部分，改成一句动作：他看了眼名单，笑意慢慢收住。`,
    '',
    '## 4. 强刺激改',
    '目标：增强冲突、反差、代价或爽点，但不改变主线设定。',
    [
      hasConflict ? '- 当前已有冲突信号：把阻碍提前，并让主角更快付出选择代价。' : '- 当前冲突偏弱：加一个明确对手、期限或失败后果。',
      hasPayoff ? '- 当前已有兑现信号：把兑现前的压迫再抬一层，释放会更爽。' : '- 当前爽点偏弱：安排一次小反击、揭示或关系推进。',
      '- 章末可以用未读消息、证据反转、危险逼近或主角误判收住。',
    ].join('\n'),
    '',
    '可插入示例：',
    `下一秒，屏幕亮起。那条本该被删除的消息，正安静地躺在最上面。发件人只有两个字：别信。`,
    '',
    '## 5. 执行顺序',
    '1. 先选一个目标：保守改 / 扩写 / 精修 / 强刺激改。',
    '2. 只改一个片段，确认不破坏人物动机和世界观。',
    '3. 再决定是否替换正文；不要一次性把全部建议叠加进章节。',
  ].join('\n')
}

function selectRewriteExcerpt(text: string, instruction: string) {
  const normalized = text.trim()
  if (!normalized) return ''
  if (/开头|开篇|前300|前 300/.test(instruction)) return normalized.slice(0, 420)
  if (/结尾|章末|收尾|悬念|钩子/.test(instruction)) return normalized.slice(-420)
  const paragraphs = normalized.split(/\n+/).map((item) => item.trim()).filter(Boolean)
  const target = paragraphs.find((item) => /(解释|说明|背景|其实|原来|意识到|显然)/.test(item))
    || paragraphs.find((item) => /(威胁|必须|不能|代价|反击|真相|秘密|消息)/.test(item))
    || paragraphs[Math.max(0, Math.floor(paragraphs.length / 2))]
  return target.slice(0, 420)
}

function localViralPotentialDiagnosis(work: SavedWork, chapter: WorkChapter, loreEntries: LoreEntry[], memoryEntries: MemoryEntry[]): ViralDiagnosisResult {
  const chapterText = chapter.content || work.chapterText || ''
  const compactText = chapterText.replace(/\s/g, '')
  const opening = compactText.slice(0, 300)
  const ending = compactText.slice(-300)
  const genre = firstText(work.materials?.genre, work.type)
  const sellingPoint = firstText(work.sellingPoint, work.materials?.sellingPoint, work.coreConflict)
  const description = firstText(work.description, work.summary, work.materials?.summary)
  const tags = Array.isArray(work.tags) ? work.tags.filter(Boolean) : []
  const protagonists = [...(work.protagonists || []), ...(work.mainCharacters || []), ...(work.materials?.characters || [])].filter(Boolean)
  const worldRules = Array.isArray(work.worldRules) ? work.worldRules.filter(Boolean) : []
  const confirmedMemories = memoryEntries.map(normalizeMemoryEntry).filter((entry) => entry.status === 'confirmed')
  const hasGenre = Boolean(genre && !/待整理|本地体验|未设置|未知/.test(genre))
  const hasTags = tags.length >= 2
  const hasSellingPoint = sellingPoint.length >= 12
  const hasHook = /(死|杀|逃|追|危|血|债|秘密|背叛|异常|忽然|必须|不能|只剩|最后|代价|威胁|失去|爆|怒|痛|问题|为什么|谁)/.test(opening)
  const hasGoal = /(想要|必须|决定|打算|我要|不能|为了|目标|救|查|赢|拿到|找到|证明|离开)/.test(compactText)
  const hasConflict = /(阻止|拦|敌|对手|威胁|代价|失败|惩罚|暴露|追杀|期限|倒计时|损失|竞争|背叛|误会|不能输)/.test(compactText)
  const hasPayoff = /(反击|打脸|赢|突破|揭开|真相|奖励|升级|获得|亲近|承认|震惊|跪|服|爽|关系|推进)/.test(compactText)
  const hasCliffhanger = /(？|吗|秘密|真相|出现|推门|电话|消息|血|死|等着|下一|忽然|背后|声音|黑暗|不见了|来了)$/.test(ending)
  const hasScene = /(雨|夜|门|街|楼|殿|山|城|房间|大厅|血|火|灯|镜头|回头|推门|窗)/.test(compactText)
  const hasDialogue = /“[^”]{2,}”|「[^」]{2,}」/.test(chapterText)
  const hasChoiceSignal = /(选择|答应|拒绝|相信|背叛|隐瞒|公开|离开|留下|救|杀|放过)/.test(compactText)
  const hasTemplateTone = /(毫无疑问|众所周知|与此同时|值得一提|显而易见|不可避免|他意识到|她意识到|内心深处|命运的齿轮|这是一个|在这个世界)/.test(compactText)
  const hasConcreteAction = /(手|眼|肩|背|指尖|呼吸|喉咙|脚步|衣角|冷汗|发抖|僵住|低头|抬眼|推开|抓住|转身|笑|喊|问)/.test(compactText)
  const sellingPointSignals = /(复仇|逆袭|重生|穿越|系统|金手指|隐藏身份|身份|危机|契约|爽|打脸|追妻|黑化|背叛|禁忌|反差|天才|废柴|秘密)/.test(sellingPoint)

  const dimensionScores: Record<ViralDimensionKey, number> = {
    genreClarity: scoreBySignals([hasGenre, hasTags, Boolean(description)], 40),
    sellingPoint: scoreBySignals([hasSellingPoint, sellingPointSignals, Boolean(work.coreConflict)], 35),
    openingHook: scoreBySignals([hasHook, opening.length >= 120, !/(介绍|背景|设定|世界观)/.test(opening)], 30),
    protagonistDrive: scoreBySignals([hasGoal, protagonists.length > 0, confirmedMemories.some((entry) => entry.type === 'character-state')], 35),
    conflictPressure: scoreBySignals([hasConflict, /(期限|代价|损失|不能输)/.test(compactText), /(敌|对手|背叛|误会)/.test(compactText)], 30),
    payoffRhythm: scoreBySignals([hasPayoff, /(反击|获得|揭开|升级)/.test(compactText), compactText.length >= 1200], 35),
    cliffhanger: scoreBySignals([hasCliffhanger, ending.length >= 120, /(下一|秘密|真相|消息|背后|不见了)/.test(ending)], 30),
    ipAdaptation: scoreBySignals([hasScene, hasDialogue, hasChoiceSignal, worldRules.length > 0], 30),
    aiFlavorRisk: scoreBySignals([!hasTemplateTone, hasConcreteAction, hasDialogue], 35),
  }

  const issues: CheckIssue[] = []
  const pushIssue = (params: {
    id: string
    dimension: string
    issueType: CheckIssueType
    severity: IssueSeverity
    title: string
    position: string
    description: string
    evidence: string
    excerpt?: string
    reason: string
    suggestion: string
    suggestionText: string
    priority: number
    confidence: number
  }) => {
    issues.push({
      id: `viral-${params.id}-${Date.now()}`,
      issueType: params.issueType,
      severity: params.severity,
      level: params.severity,
      dimension: params.dimension,
      title: params.title,
      position: params.position,
      description: params.description,
      evidence: params.evidence,
      excerpt: params.excerpt,
      reason: params.reason,
      suggestion: params.suggestion,
      suggestionText: params.suggestionText,
      priority: params.priority,
      confidence: params.confidence,
      source: 'viral-potential-local-v0',
      status: 'open',
    })
  }

  if (!hasGenre || !hasTags) {
    pushIssue({
      id: 'genre',
      dimension: '题材清晰度',
      issueType: 'chapter-goal',
      severity: hasGenre ? 'medium' : 'high',
      title: '题材和标签不够清晰',
      position: '作品资料',
      description: '作品题材或标签不足，读者可能无法快速判断这本书属于哪个赛道。',
      evidence: `题材：${genre || '未填写'}；标签：${tags.join('、') || '暂无'}`,
      reason: '网文点击通常先由题材、标签和卖点建立预期；预期模糊会削弱开书吸引力。',
      suggestion: '补齐 2-4 个明确标签，并把题材写成读者能立刻识别的类型。',
      suggestionText: `建议先补齐题材和标签：题材用一个明确赛道表达，标签至少包含题材、爽点、关系或金手指，例如“都市逆袭 / 隐藏身份 / 强反差 / 追妻火葬场”。`,
      priority: hasGenre ? 6 : 3,
      confidence: 0.76,
    })
  }
  if (!hasSellingPoint || !sellingPointSignals) {
    pushIssue({
      id: 'selling-point',
      dimension: '卖点强度',
      issueType: 'chapter-goal',
      severity: !hasSellingPoint ? 'high' : 'medium',
      title: '卖点不够清晰',
      position: '一句话卖点',
      description: '一句话卖点缺少主角欲望、冲突、反差、危机或爽点承诺。',
      evidence: sellingPoint || '当前缺少一句话卖点。',
      reason: '爆款潜力首先取决于读者能否在几秒内理解“为什么要看这本”。',
      suggestion: '把卖点改成“主角身份 / 欲望 + 最大阻碍 + 爽点承诺”的结构。',
      suggestionText: `请重写一句话卖点：用“主角是谁 + 他必须解决什么危机 + 最大反差或爽点是什么”表达，控制在 30-60 字。`,
      priority: 1,
      confidence: 0.82,
    })
  }
  if (!hasHook) {
    pushIssue({
      id: 'opening-hook',
      dimension: '开篇钩子',
      issueType: 'chapter-goal',
      severity: 'high',
      title: '开篇 300 字缺少钩子',
      position: '开篇 300 字',
      description: '开篇没有明显异常、威胁、秘密、冲突、强欲望或问题。',
      evidence: '本地规则未在开头检测到危机、异常、秘密、代价或强问题信号。',
      excerpt: opening || '当前章节正文为空。',
      reason: '开篇钩子决定读者是否继续阅读；慢热背景铺垫容易降低点击后的留存。',
      suggestion: '把最尖锐的麻烦或异常前置，让读者立刻知道主角遇到了什么问题。',
      suggestionText: `建议改写开头：第一段直接出现异常、威胁、秘密或主角强欲望，少讲背景，先抛出“为什么会这样 / 主角必须怎么办”的问题。`,
      priority: 1,
      confidence: 0.8,
    })
  }
  if (!hasGoal) {
    pushIssue({
      id: 'protagonist-drive',
      dimension: '主角目标',
      issueType: 'chapter-goal',
      severity: 'high',
      title: '主角目标不明确',
      position: '当前章节',
      description: '当前章节里主角想要什么、必须做什么不够清楚。',
      evidence: protagonists.length ? `人物：${protagonists.slice(0, 3).join('、')}` : '当前缺少明确主角资料或行动目标。',
      reason: '读者需要跟随主角的欲望和选择推进剧情；目标弱会让章节显得散。',
      suggestion: '在前半章明确主角的短期目标，并安排一个立刻阻挡他的障碍。',
      suggestionText: `请补一段主角目标：明确“主角现在必须完成什么、失败会失去什么、谁或什么正在阻止他”。`,
      priority: 2,
      confidence: 0.78,
    })
  }
  if (!hasConflict) {
    pushIssue({
      id: 'conflict-pressure',
      dimension: '冲突密度',
      issueType: 'emotion-flow',
      severity: 'high',
      title: '冲突压力不足',
      position: '当前章节',
      description: '章节缺少对抗、期限、损失、误会、竞争、背叛或代价。',
      evidence: '本地规则未检测到明显压力词和对抗信号。',
      reason: '爆款章节通常需要持续压力推动读者翻页；太顺会降低期待感。',
      suggestion: '加入一个会迫使主角选择的压力点，例如时间限制、对手提前行动或失败代价。',
      suggestionText: `请增加冲突压力：给主角目标增加一个硬阻碍，并说明失败代价；最好让对手、期限或误会立刻压上来。`,
      priority: 2,
      confidence: 0.77,
    })
  }
  if (!hasPayoff) {
    pushIssue({
      id: 'payoff',
      dimension: '爽点兑现',
      issueType: 'emotion-flow',
      severity: 'medium',
      title: '爽点兑现偏晚',
      position: '中后段',
      description: '章节里阶段性获得、反击、揭示真相、关系推进或情绪释放不足。',
      evidence: '未检测到明显反击、获得、升级、揭示或关系推进信号。',
      reason: '只有铺垫没有回报，会让读者觉得章节“不够爽”或进展慢。',
      suggestion: '在中后段安排一次小兑现，让主角赢下一步、获得信息或让关系发生变化。',
      suggestionText: `请给本章补一个小爽点：主角至少赢下一步、揭开一个信息、反击一次误解，或让人物关系产生明确变化。`,
      priority: 5,
      confidence: 0.68,
    })
  }
  if (!hasCliffhanger) {
    pushIssue({
      id: 'cliffhanger',
      dimension: '章末追读',
      issueType: 'open-foreshadow',
      severity: 'high',
      title: '章末追读弱',
      position: '章末 300 字',
      description: '结尾没有明显未解决问题、危险、反转、消息或下一章诱因。',
      evidence: '本地规则未在结尾检测到强悬念或下一章驱动力信号。',
      excerpt: ending || '当前章节正文为空。',
      reason: '章末追读是连载留存关键；平收、总结收、解释收会降低下一章点击欲望。',
      suggestion: '把结尾收在一个新问题或反转上，避免用总结句结束。',
      suggestionText: `请改写章末：用未读消息、反常来客、证据反转、危险逼近或主角误判被揭穿收尾，让读者必须点下一章。`,
      priority: 1,
      confidence: 0.82,
    })
  }
  if (dimensionScores.ipAdaptation >= 65 && !hasChoiceSignal) {
    pushIssue({
      id: 'ip-choice',
      dimension: '商业化 / IP 衍生潜力',
      issueType: 'open-foreshadow',
      severity: 'low',
      title: '影游化潜力存在，但缺少选择节点',
      position: 'IP 衍生观察',
      description: '章节具备场景或对话基础，适合短剧 / 影游化，但缺少玩家可选择的分歧点。',
      evidence: `场景信号：${hasScene ? '有' : '弱'}；对话信号：${hasDialogue ? '有' : '弱'}`,
      reason: '互动剧情需要“选择 -> 后果 -> 分支”的结构，单线剧情需要额外改编。',
      suggestion: '在关键情绪节点加入 2-3 个选择，例如相信 / 隐瞒 / 反击 / 离开。',
      suggestionText: `影游化改编建议：找出本章一个关键选择点，设计 2-3 个选项，并给每个选项设置好感、信任、危险或线索值变化。`,
      priority: 8,
      confidence: 0.58,
    })
  }
  if (hasTemplateTone || !hasConcreteAction || !hasDialogue) {
    pushIssue({
      id: 'ai-flavor',
      dimension: 'AI 味 / 模板化风险',
      issueType: 'emotion-flow',
      severity: hasTemplateTone && !hasConcreteAction ? 'medium' : 'low',
      title: 'AI 味 / 模板化风险',
      position: '全文表达',
      description: '章节可能存在抽象概括、说明腔，或缺少具体动作、场景和对话。',
      evidence: `模板化表达：${hasTemplateTone ? '检测到' : '未明显检测'}；动作细节：${hasConcreteAction ? '有' : '偏少'}；对话：${hasDialogue ? '有' : '偏少'}`,
      reason: '网文读者更容易被具体场景、人物反应和短句交锋带入。',
      suggestion: '把抽象判断改成动作、停顿、眼神、台词和场景后果。',
      suggestionText: `去模板腔建议：挑出说明性段落，改成“动作 + 对话 + 具体反应”。少写总结，多写人物此刻做了什么、说了什么、忍住了什么。`,
      priority: 7,
      confidence: 0.62,
    })
  }

  if (!issues.length) {
    pushIssue({
      id: 'ok',
      dimension: '综合观察',
      issueType: 'chapter-goal',
      severity: 'low',
      title: '暂无明显高风险问题',
      position: '全文',
      description: '本地规则未发现明显爆款潜力短板，但仍建议用深度诊断 Prompt 做人工二次判断。',
      evidence: `已确认记忆 ${confirmedMemories.length} 条；章节字数 ${compactText.length} 字。`,
      reason: '本地规则只能识别结构信号，无法替代真实编辑判断、平台数据或模型深度分析。',
      suggestion: '继续检查卖点和章末追读，并保留多个改写版本。',
      suggestionText: '建议复制深度诊断 Prompt 到外部模型，让模型给出更细的改写方向，但最终写入仍由作者确认。',
      priority: 9,
      confidence: 0.48,
    })
  }

  const highRiskCount = issues.filter((issue) => issue.severity === 'high').length
  const mediumRiskCount = issues.filter((issue) => issue.severity === 'medium').length
  const lowRiskCount = issues.filter((issue) => issue.severity === 'low').length
  const coreKeys: ViralDimensionKey[] = ['genreClarity', 'sellingPoint', 'openingHook', 'protagonistDrive', 'conflictPressure', 'payoffRhythm', 'cliffhanger', 'aiFlavorRisk']
  const overallScore = Math.round(coreKeys.reduce((sum, key) => sum + dimensionScores[key], 0) / coreKeys.length)
  const overallLevel: ViralDiagnosisSummary['overallLevel'] = overallScore >= 76 && highRiskCount === 0 ? '高潜力' : overallScore >= 55 ? '中等潜力' : '待打磨'
  const summary: ViralDiagnosisSummary = {
    diagnosisVersion: 'viral-potential-local-v0',
    diagnosisMode: 'local-rules',
    overallLevel,
    overallScore,
    overallSummary: buildViralOverallSummary(overallLevel, issues),
    dimensionScores,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    disclaimer: viralDiagnosisDisclaimer,
  }
  return {
    summary,
    issues: issues.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99)),
    promptText: buildViralDeepDiagnosisPrompt(work, chapter, loreEntries, memoryEntries),
  }
}

const viralDiagnosisDisclaimer = '本诊断基于文本结构、网文创作规律和本地规则生成，仅作为创作参考，不代表平台推荐结果、真实商业表现或检测器判断。'

function scoreBySignals(signals: boolean[], base = 35) {
  const hit = signals.filter(Boolean).length
  return Math.max(0, Math.min(100, base + Math.round((hit / Math.max(1, signals.length)) * (100 - base))))
}

function firstText(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim() || ''
}

function buildViralOverallSummary(level: ViralDiagnosisSummary['overallLevel'], issues: CheckIssue[]) {
  const top = issues.filter((issue) => issue.severity === 'high').slice(0, 2).map((issue) => issue.title || issue.dimension).filter(Boolean)
  if (level === '高潜力') return '当前作品和章节具备较清晰的卖点、冲突与追读结构；建议继续强化章末钩子和可视化场景。'
  if (top.length) return `当前主要短板在于：${top.join('、')}。优先修这些点，再考虑深度改写或 IP 衍生。`
  return '当前具备一定基础，但仍需要增强题材卖点、主角目标、冲突压力和章末追读。'
}

function formatViralDiagnosisArtifact(result: ViralDiagnosisResult) {
  const scores = Object.entries(result.summary.dimensionScores).map(([key, value]) => `- ${viralDimensionLabels[key as ViralDimensionKey]}：${value}/100`).join('\n')
  const issues = result.issues.map((issue) => [
    `## ${issue.title || issue.dimension}`,
    `- 维度：${issue.dimension}`,
    `- 风险：${severityLabels[issue.severity]}`,
    `- 优先级：${issue.priority ?? '-'}`,
    `- 置信度：${Math.round((issue.confidence ?? 0) * 100)}%`,
    `- 证据：${issue.evidence || '无'}`,
    issue.excerpt ? `- 摘录：${issue.excerpt}` : '',
    `- 原因：${issue.reason || issue.description}`,
    `- 建议：${issue.suggestionText || issue.suggestion}`,
  ].filter(Boolean).join('\n')).join('\n\n')

  return [
    `# 爆款潜力诊断 V0`,
    '',
    `诊断版本：${result.summary.diagnosisVersion}`,
    `诊断模式：${result.summary.diagnosisMode}`,
    `综合判断：${result.summary.overallLevel}（${result.summary.overallScore}/100）`,
    `说明：${result.summary.overallSummary}`,
    '',
    result.summary.disclaimer,
    '',
    `## 维度评分`,
    scores,
    '',
    `## 风险卡片`,
    issues,
    '',
    `## 深度诊断 Prompt`,
    result.promptText,
  ].join('\n')
}

function buildViralDeepDiagnosisPrompt(work: SavedWork, chapter: WorkChapter, loreEntries: LoreEntry[], memoryEntries: MemoryEntry[]) {
  const confirmedMemoryText = memoryEntries
    .map(normalizeMemoryEntry)
    .filter((entry) => entry.status === 'confirmed')
    .map((entry) => `- [${memoryTypeLabels[entry.type]}] ${entry.title}: ${entry.content}`)
    .join('\n')
  const loreText = loreEntries.map((entry) => `- [${loreTypeLabels[entry.type]}] ${entry.title}: ${entry.content}`).join('\n')
  return `你是中文网文编辑、商业化策划和互动剧情改编顾问。请基于我提供的作品资料和当前章节，做“爆款潜力诊断”。\n\n重要边界：\n- 这不是平台真实数据预测。\n- 禁止输出真实爆款概率、平台推荐概率或保证爆款结论。\n- 只能从文本结构、网文创作规律、读者预期和 IP 改编潜力角度分析。\n\n请输出合法 JSON，字段如下：\n{\n  \"overallLevel\": \"高潜力 / 中等潜力 / 待打磨\",\n  \"overallScore\": 0,\n  \"disclaimer\": \"本诊断仅作创作参考，不代表平台推荐结果或真实商业表现。\",\n  \"scores\": {\n    \"genreClarity\": 0,\n    \"sellingPoint\": 0,\n    \"openingHook\": 0,\n    \"protagonistDrive\": 0,\n    \"conflictPressure\": 0,\n    \"payoffRhythm\": 0,\n    \"cliffhanger\": 0,\n    \"aiFlavorRisk\": 0,\n    \"shortDramaPotential\": 0,\n    \"interactiveDramaPotential\": 0\n  },\n  \"risks\": [\n    {\n      \"level\": \"high / medium / low\",\n      \"dimension\": \"题材清晰度 / 卖点强度 / 开篇钩子 / 主角目标 / 冲突压力 / 爽点兑现 / 章末追读 / AI味模板化 / 短剧影游潜力\",\n      \"title\": \"问题标题\",\n      \"evidence\": \"文本证据或摘录\",\n      \"reason\": \"为什么影响追读或商业化\",\n      \"suggestion\": \"可执行修改建议\"\n    }\n  ],\n  \"rewriteDirections\": {\n    \"conservative\": \"保守改方向\",\n    \"strongStimulus\": \"强刺激改方向\",\n    \"webNovelHook\": \"网文钩子增强版方向\"\n  },\n  \"ipAdaptation\": {\n    \"shortDramaPotential\": \"高 / 中 / 低\",\n    \"interactiveDramaPotential\": \"高 / 中 / 低\",\n    \"visualAssets\": [\"封面或角色/场景视觉建议\"],\n    \"choiceNodes\": [\"可改成玩家选择的节点\"]\n  }\n}\n\n【作品资料】\n作品名：${work.title || '未命名作品'}\n题材：${firstText(work.materials?.genre, work.type) || '暂无'}\n一句话卖点：${firstText(work.sellingPoint, work.materials?.sellingPoint, work.coreConflict) || '暂无'}\n简介：${firstText(work.description, work.summary, work.materials?.summary) || '暂无'}\n标签：${(work.tags || []).join('、') || '暂无'}\n主角 / 主要人物：${[...(work.protagonists || []), ...(work.mainCharacters || []), ...(work.materials?.characters || [])].filter(Boolean).join('、') || '暂无'}\n世界观规则：${(work.worldRules || []).join('；') || '暂无'}\n全局大纲：${(work.globalOutline || []).join('；') || '暂无'}\n下一步提示：${work.materials?.nextStep || '暂无'}\n发布状态：${work.currentPublishStatus || '未设置'}\n章节数：${work.chapterCount ?? 0}\n当前字数：${work.words ?? 0}\n\n【资料库】\n${loreText || '暂无'}\n\n【已确认长篇记忆】\n${confirmedMemoryText || '暂无'}\n\n【当前章节】\n标题：${chapter.title || work.chapterTitle || '未命名章节'}\n字数：${(chapter.content || '').replace(/\\s/g, '').length}\n正文：\n${chapter.content || work.chapterText || '暂无正文'}`
}

function buildViralIssueRewritePrompt(work: SavedWork, chapter: WorkChapter, issue: CheckIssue) {
  return `你是中文网文编辑。请只针对下面这个问题给出改写方案，不要输出真实爆款概率，不要承诺平台推荐。\n\n【作品】${work.title || '未命名作品'}\n【章节】${chapter.title || '未命名章节'}\n【问题维度】${issue.dimension || '爆款潜力诊断'}\n【问题标题】${issue.title || issue.description}\n【问题说明】${issue.description}\n【证据】${issue.evidence || issue.excerpt || '暂无'}\n【原因】${issue.reason || '请从网文追读和商业化角度分析。'}\n\n请输出：\n1. 保守改：尽量不改变剧情，只增强表达。\n2. 强刺激改：增强冲突、代价、反差或情绪压力。\n3. 网文钩子增强版：更强开篇/章末钩子或爽点表达。\n4. 可直接替换或插入的文本片段。\n\n【当前章节正文】\n${chapter.content || work.chapterText || '暂无正文'}`
}

function buildWorkspacePrompt(target: WebAiTarget, work: SavedWork, chapter: WorkChapter, loreEntries: LoreEntry[], memoryEntries: MemoryEntry[], rewriteInstruction = '', selectedRewriteText = '') {
  const loreText = loreEntries.map((entry) => `- [${loreTypeLabels[entry.type]}] ${entry.title}: ${entry.content}`).join('\n')
  const memoryText = memoryEntries
    .map(normalizeMemoryEntry)
    .filter((entry) => entry.status !== 'rejected')
    .map((entry) => `- [${memoryTypeLabels[entry.type]} / ${memoryStatusText[entry.status ?? 'draft']}] ${entry.title}: ${entry.content}`)
    .join('\n')
  if (target === 'rewrite') {
    const selectedText = selectedRewriteText.trim()
    return `你是中文网文编辑和章节改稿助手。请基于作品资料、长篇记忆和当前章节，输出“改写 / 扩写 / 精修”建议。

重要边界：
- 不要承诺平台推荐、真实商业表现或检测器判断。
- 不要自动替作者决定剧情走向。
- 输出内容用于作者复制回写作工具的【修改区】，不是直接覆盖正文。

【本次改稿要求】
${rewriteInstruction.trim() || '请优先增强当前章节的现场感、冲突压力、爽点兑现和章末追读。'}

【改稿范围】
${selectedText ? `请优先改写下面这段选中文本，不要改写全文：\n${selectedText}` : '未提供选中文本，请围绕当前章节中最需要修改的片段给出建议。'}

【作品资料】
作品名：${work.title || '未命名作品'}
题材：${work.type || work.materials?.genre || '暂无'}
一句话卖点：${firstText(work.sellingPoint, work.materials?.sellingPoint, work.coreConflict) || '暂无'}
简介：${firstText(work.description, work.summary, work.materials?.summary) || '暂无'}
标签：${(work.tags || []).join('、') || '暂无'}

【资料库 / 设定】
${loreText || '暂无'}

【长篇记忆摘要】
${memoryText || '暂无'}

【当前章节】
标题：${chapter.title || work.chapterTitle || '未命名章节'}
正文：
${chapter.content || work.chapterText || '暂无正文'}

【输出格式】
# Web AI 改稿结果
## 1. 保守改
- 修改目标：
- 适合替换 / 插入的位置：
- 改写片段：

## 2. 扩写
- 扩写目标：
- 新增细节：
- 扩写片段：

## 3. 精修
- 需要删减或压缩的表达：
- 节奏调整：
- 精修片段：

## 4. 强刺激改
- 增强的冲突 / 代价 / 爽点：
- 风险提示：
- 改写片段：

## 5. 作者确认清单
- 是否改变人物动机：
- 是否新增设定：
- 是否影响后续伏笔：
- 建议采用顺序：`
  }
  const goal = target === 'check'
    ? '请检查人物 OOC、设定冲突、时间线矛盾、伏笔未回收、情绪推进异常、章节目标偏离，并按卡片格式输出。'
    : '请从当前章节中提取章节摘要、已发生事件、人物状态变化、世界观事实、未回收伏笔和禁止违背设定。'
  return `你是中文长篇小说编辑与连续性审稿助手。

【当前检查目标】
${goal}

【当前章节标题】
${chapter.title || work.chapterTitle}

【当前章节正文】
${chapter.content || work.chapterText}

【作品资料 / 人物设定 / 世界观规则 / 伏笔】
${loreText || '暂无'}

【长篇记忆摘要】
${memoryText || '暂无'}

【输出格式】
${target === 'check'
  ? '检查结果：\n- 类型：人物 OOC / 设定冲突 / 时间线矛盾 / 伏笔未回收 / 情绪推进异常 / 章节目标偏离\n  严重程度：高风险 / 中风险 / 低风险\n  位置：\n  问题：\n  建议：'
  : '记忆条目：\n- 类型：已发生事件 / 人物状态变化 / 世界观事实 / 未回收伏笔 / 最近章节摘要 / 禁止违背设定\n  标题：\n  内容：'}`
}

function formatWebAiRewriteResult(raw: string, instruction: string, selectedText = '') {
  return [
    '# Web AI 改稿回填',
    '',
    '来源：外部网页 AI 粘贴结果',
    '边界：该内容仅插入修改区，不自动覆盖正文；采用前需要作者确认人物动机、设定和伏笔。',
    '',
    `本次改稿要求：${instruction.trim() || '未填写，按当前章节综合改稿。'}`,
    selectedText.trim() ? `选中文本：${selectedText.trim()}` : '选中文本：未指定，按当前章节综合改稿。',
    '',
    raw.trim(),
  ].join('\n')
}

function formatBackendRewriteArtifact(result: BackendRewriteResult, instruction: string, selectedText = '') {
  return [
    '# API 改稿结果',
    '',
    `模式：${result.mode || 'model-api'}`,
    '边界：该内容仅填入采用文本或修改区，不自动覆盖正文；采用前需要作者确认人物动机、设定和伏笔。',
    '',
    `本次改稿要求：${instruction.trim() || '未填写，按当前章节综合改稿。'}`,
    selectedText.trim() ? `选中文本：${selectedText.trim()}` : '选中文本：未指定，按当前章节综合改稿。',
    '',
    '## 推荐采用文本',
    result.replacementText?.trim() || '模型未返回推荐采用文本。',
    '',
    '## 保守改',
    result.conservativeText?.trim() || '未返回。',
    '',
    '## 扩写',
    result.expandedText?.trim() || '未返回。',
    '',
    '## 精修',
    result.polishedText?.trim() || '未返回。',
    '',
    '## 强刺激改',
    result.intenseText?.trim() || '未返回。',
    '',
    '## 风险提示',
    result.riskNotes?.length ? result.riskNotes.map((note) => `- ${note}`).join('\n') : '- 暂无；仍建议替换前人工确认。',
  ].join('\n')
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
