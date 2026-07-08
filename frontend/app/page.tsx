'use client'

import { useEffect, useMemo, useState } from 'react'
import { AiResultReview } from '@/components/phase-one/AiResultReview'
import { AppShell } from '@/components/phase-one/AppShell'
import { AuthModal, type AuthPayload, type AuthReason } from '@/components/phase-one/AuthModal'
import { CreateWorkModal } from '@/components/phase-one/CreateWorkModal'
import { CreationGuideWorkspace } from '@/components/phase-one/CreationGuideWorkspace'
import { CreativeAssistantPanel } from '@/components/phase-one/CreativeAssistantPanel'
import { LightCommunity } from '@/components/phase-one/LightCommunity'
import { AppearanceSettingsPage, ExportCenterPage, ModelSettingsPage } from '@/components/phase-one/PhaseFiveSettings'
import { SkillPlaza } from '@/components/phase-one/SkillPlaza'
import { SplashScreen } from '@/components/phase-one/SplashScreen'
import { StoryGraphCenter } from '@/components/phase-one/StoryGraphCenter'
import type { CreationMode, GuideDraft, OperationStatus, ParsedWorkResult, SavedWork, WorkChapter, WorkItem, WorkStatus, WorkspaceStep, WorkVersionRecord } from '@/components/phase-one/types'
import { WebAiPromptModal } from '@/components/phase-one/WebAiPromptModal'
import { WorksHome } from '@/components/phase-one/WorksHome'
import { WritingWorkspace } from '@/components/phase-one/WritingWorkspace'

type Screen = 'splash' | 'home' | 'works' | 'guide' | 'review' | 'workspace' | 'skills' | 'community' | 'model-settings' | 'appearance' | 'export' | 'story-graph'
type PendingAction = 'save-official' | null
type WorkspaceView = 'overview' | 'editor' | 'lore' | 'memory' | 'checks'
type LocalAccount = { username: string; account: string; password: string }
type BackendSession = { token: string; username: string }
type BackendResult<T> = { code: number; message: string; data: T }
type WorkSnapshotChapter = { frontendChapterId?: string; chapterNumber?: number; title?: string; content?: string; status?: string }
type WorkSnapshotResponse = { frontendWorkId: string; payload: string; chapters?: WorkSnapshotChapter[] }
type MigrationPrompt = {
  token: string
  backendWorks: SavedWork[]
  localOfficialCount: number
  localDraftCount: number
} | null

const accountStorageKey = 'yixie-local-accounts-v1'
const worksStorageKey = 'yixie-works-library-v1'
const workVersionStorageKey = 'yixie-work-version-history-v1'
const backendTokenStorageKey = 'yixie-backend-token-v1'
const backendApiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

function countChapterWords(text?: string) {
  return (text || '').replace(/\s/g, '').length
}

function normalizeWorkChapters(work: SavedWork): WorkChapter[] {
  const rawChapters = Array.isArray(work.chapters) ? work.chapters : []
  const normalized = rawChapters
    .map((chapter, index) => normalizeWorkChapter(chapter, index))
    .sort((a, b) => a.chapterNumber - b.chapterNumber)

  if (normalized.length === 0) {
    if (!work.chapterTitle && !work.chapterText) return []
    return [normalizeWorkChapter({
      id: 'chapter-1',
      chapterNumber: 1,
      title: work.chapterTitle || '第一章：未命名章节',
      content: work.chapterText || '',
      status: 'draft',
      wordCount: countChapterWords(work.chapterText),
    }, 0)]
  }

  const first = normalized[0]
  normalized[0] = {
    ...first,
    title: work.chapterTitle || first.title,
    content: typeof work.chapterText === 'string' ? work.chapterText : first.content,
    wordCount: countChapterWords(typeof work.chapterText === 'string' ? work.chapterText : first.content),
  }
  return normalized
}

function normalizeWorkChapter(chapter: Partial<WorkChapter>, index: number): WorkChapter {
  const content = typeof chapter.content === 'string' ? chapter.content : ''
  return {
    id: chapter.id || `chapter-${index + 1}`,
    chapterNumber: Number.isFinite(chapter.chapterNumber) && Number(chapter.chapterNumber) > 0 ? Number(chapter.chapterNumber) : index + 1,
    title: chapter.title || `第 ${index + 1} 章`,
    content,
    status: chapter.status === 'published' ? 'published' : 'draft',
    wordCount: typeof chapter.wordCount === 'number' ? chapter.wordCount : countChapterWords(content),
    createdAt: chapter.createdAt,
    updatedAt: chapter.updatedAt,
  }
}

function withChapterStats(work: SavedWork, markUpdated = false): SavedWork {
  const chapters = normalizeWorkChapters(work)
  const words = chapters.reduce((sum, chapter) => sum + countChapterWords(chapter.content), 0)
  const hasChapter = chapters.some((chapter) => chapter.content.trim())
  const chapterCount = chapters.length
  const monthlyUpdatedChapters = hasChapter && markUpdated ? Math.max(1, work.monthlyUpdatedChapters || 0) : Math.max(0, work.monthlyUpdatedChapters || 0)

  return {
    ...work,
    chapterTitle: chapters[0]?.title || work.chapterTitle,
    chapterText: typeof chapters[0]?.content === 'string' ? chapters[0].content : work.chapterText,
    chapters,
    words,
    chapterCount,
    monthlyUpdatedChapters,
    updatedAt: markUpdated ? '刚刚' : work.updatedAt,
  }
}

function readWorkVersions(): WorkVersionRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(workVersionStorageKey) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    localStorage.removeItem(workVersionStorageKey)
    return []
  }
}

function writeWorkVersions(records: WorkVersionRecord[]) {
  localStorage.setItem(workVersionStorageKey, JSON.stringify(records.slice(0, 80)))
}

function createWorkVersion(work: SavedWork, source: WorkVersionRecord['source']): WorkVersionRecord {
  const snapshot = withChapterStats(work)
  return {
    id: `version-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    workId: snapshot.id,
    title: snapshot.title,
    source,
    createdAt: new Date().toLocaleString(),
    wordCount: snapshot.words,
    chapterCount: snapshot.chapterCount || normalizeWorkChapters(snapshot).length,
    snapshot,
  }
}

const emptyGuideDraft: GuideDraft = {
  title: '',
  idea: '',
  mode: 'web-ai',
  genre: '',
  sellingPoint: '',
  characters: [],
  chapterTitle: '第一章：未命名章节',
  chapterText: '',
  summary: '',
  nextStep: '',
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [isGuest, setIsGuest] = useState(true)
  const [username, setUsername] = useState('创作者')
  const [showCreate, setShowCreate] = useState(false)
  const [showWebAi, setShowWebAi] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authReason, setAuthReason] = useState<AuthReason>('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [works, setWorks] = useState<SavedWork[]>([])
  const [worksHydrated, setWorksHydrated] = useState(false)
  const [versionRecords, setVersionRecords] = useState<WorkVersionRecord[]>([])
  const [guideDraft, setGuideDraft] = useState<GuideDraft>(emptyGuideDraft)
  const [guideStep, setGuideStep] = useState<WorkspaceStep>('idea')
  const [parsedResult, setParsedResult] = useState<ParsedWorkResult | null>(null)
  const [activeWork, setActiveWork] = useState<SavedWork | null>(null)
  const [status, setStatus] = useState<OperationStatus>('idle')
  const [message, setMessage] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('editor')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)
  const [backendToken, setBackendToken] = useState('')
  const [backendAutoSaveEnabled, setBackendAutoSaveEnabled] = useState(false)
  const [migrationPrompt, setMigrationPrompt] = useState<MigrationPrompt>(null)

  const sortedWorks = useMemo(() => works, [works])
  const shellStatusText = isGuest ? '游客 · 本地模式 · 未同步' : `${username} · 已登录 · 可同步`

  useEffect(() => {
    try {
      const savedWorks = JSON.parse(localStorage.getItem(worksStorageKey) || '[]') as SavedWork[]
      if (Array.isArray(savedWorks) && savedWorks.length > 0) {
        setWorks(savedWorks)
      }
    } catch {
      localStorage.removeItem(worksStorageKey)
    } finally {
      setWorksHydrated(true)
    }
  }, [])

  useEffect(() => {
    setVersionRecords(readWorkVersions())
  }, [])

  useEffect(() => {
    const savedToken = localStorage.getItem(backendTokenStorageKey)
    if (savedToken) {
      setBackendToken(savedToken)
      setBackendAutoSaveEnabled(true)
    }
  }, [])

  useEffect(() => {
    if (!worksHydrated) return
    localStorage.setItem(worksStorageKey, JSON.stringify(works))
  }, [works, worksHydrated])

  useEffect(() => {
    if (isGuest || !backendToken || !backendAutoSaveEnabled || !worksHydrated) return
    works.filter((work) => work.status === 'official').forEach((work) => {
      void saveWorkSnapshotToBackend(work, backendToken)
    })
  }, [backendAutoSaveEnabled, backendToken, isGuest, works, worksHydrated])

  function setFeedback(nextStatus: OperationStatus, nextMessage: string) {
    setStatus(nextStatus)
    setMessage(nextMessage)
    if (nextStatus === 'success' || nextStatus === 'error') {
      setToast({ type: nextStatus, title: nextStatus === 'success' ? '操作成功' : '操作失败', message: nextMessage })
    }
    if (nextStatus === 'success') {
      window.setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 1800)
    }
  }

  function openAuth(reason: AuthReason) {
    setAuthReason(reason)
    setAuthError('')
    setAuthOpen(true)
  }

  function startGuestMode() {
    setIsGuest(true)
    setScreen('home')
  }

  function selectCreationMode(mode: CreationMode) {
    setShowCreate(false)
    setGuideDraft({
      ...emptyGuideDraft,
      mode,
      genre: mode === 'local' ? '本地体验 / 待整理' : mode === 'web-ai' ? '网页 AI / 待解析' : 'API 直连 / 待配置',
      sellingPoint: mode === 'web-ai' ? '复制 Prompt 到网页 AI 生成，再回填解析。' : '',
    })
    setGuideStep('idea')
    setFeedback('success', '已进入开书向导。游客内容会先作为本地临时草稿保存。')
    setScreen('guide')
  }

  function updateGuideDraft(patch: Partial<GuideDraft>) {
    setGuideDraft((current) => ({ ...current, ...patch }))
  }

  function handleParsedResult(result: ParsedWorkResult) {
    setShowWebAi(false)
    setParsedResult(result)
    setGuideDraft((current) => ({
      ...current,
      title: result.title,
      genre: result.genre,
      sellingPoint: result.sellingPoint,
      characters: result.characters,
      chapterTitle: result.chapterTitle,
      chapterText: result.chapterText,
      summary: result.summary,
      nextStep: result.nextStep,
      mode: 'web-ai',
    }))
    setGuideStep('draft')
    setFeedback('success', 'AI 返回内容已解析，请确认保存方式。')
    setScreen('review')
  }

  function handleSkillResult(result: ParsedWorkResult) {
    setParsedResult(result)
    setGuideDraft((current) => ({
      ...current,
      title: result.title,
      genre: result.genre,
      sellingPoint: result.sellingPoint,
      characters: result.characters,
      chapterTitle: result.chapterTitle,
      chapterText: result.chapterText,
      summary: result.summary,
      nextStep: result.nextStep,
      mode: 'web-ai',
    }))
    setGuideStep('draft')
    setFeedback('success', '技能结果已生成，请在确认页检查后再写入作品。')
    setScreen('review')
  }

  function updateParsedResult(patch: Partial<ParsedWorkResult>) {
    setParsedResult((current) => current ? { ...current, ...patch } : current)
  }

  function insertIntoEditor() {
    const work = createSavedWork(parsedResult, 'local-draft')
    setActiveWork(work)
    upsertWork(work)
    setFeedback('success', '内容已插入编辑器，并作为本地临时草稿保留。')
    setWorkspaceView('editor')
    setScreen('workspace')
  }

  function saveTemporaryDraft() {
    const work = createSavedWork(parsedResult, 'local-draft')
    setActiveWork(work)
    upsertWork(work)
    setFeedback('success', '已保存为本地临时草稿，仅本地保存、未同步。')
    setWorkspaceView('editor')
    setScreen('workspace')
  }

  function parseAsMaterials() {
    if (!parsedResult) return
    setGuideDraft((current) => ({
      ...current,
      title: parsedResult.title,
      genre: parsedResult.genre,
      sellingPoint: parsedResult.sellingPoint,
      characters: parsedResult.characters,
      chapterTitle: parsedResult.chapterTitle,
      chapterText: parsedResult.chapterText,
      summary: parsedResult.summary,
      nextStep: parsedResult.nextStep,
      mode: 'web-ai',
    }))
    setGuideStep('materials')
    setFeedback('success', '已解析为作品资料。当前仍是向导内容，不会进入正式作品库。')
    setScreen('guide')
  }

  function requestOfficialSave() {
    if (isGuest) {
      const localDraft = activeWork?.status === 'local-draft' ? activeWork : createSavedWork(parsedResult, 'local-draft')
      setActiveWork(localDraft)
      upsertWork(localDraft)
      setPendingAction('save-official')
      openAuth('save-official')
      setFeedback('idle', '保存为正式作品需要登录。登录后会继续保存，不会丢失当前输入。')
      return
    }
    finalizeOfficialSave()
  }

  function finalizeOfficialSave() {
    setStatus('loading')
    setMessage('正在保存为正式作品...')
    window.setTimeout(() => {
      const officialWork = convertToOfficial(activeWork ?? createSavedWork(parsedResult, 'local-draft'))
      setWorks((current) => {
        const withoutOld = current.filter((work) => work.id !== officialWork.id)
        return [officialWork, ...withoutOld]
      })
      setActiveWork(officialWork)
      setPendingAction(null)
      setStatus('success')
      setMessage('正式作品已保存，临时草稿已转入正式作品区。')
      setWorkspaceView('editor')
      setScreen('workspace')
      window.setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 1800)
    }, 650)
  }

  function createLocalDraftWork() {
    const work = createSavedWork(null, 'local-draft')
    setActiveWork(work)
    upsertWork(work)
    setFeedback('success', '已创建本地临时草稿，仅本地保存、未同步。')
    setWorkspaceView('editor')
    setScreen('workspace')
  }

  function createSavedWork(source: ParsedWorkResult | null, statusValue: WorkStatus): SavedWork {
    const chapterText = source?.chapterText || guideDraft.chapterText || '夜色刚落，故事从一支停在纸上的笔开始。'
    const title = source?.title || guideDraft.title || (statusValue === 'local-draft' ? '本地临时草稿' : '未命名作品')
    const chapterTitle = source?.chapterTitle || guideDraft.chapterTitle || '第一章：未命名章节'
    const isOfficial = statusValue === 'official'
    const words = chapterText.replace(/\s/g, '').length
    const targetWords = isOfficial ? 600000 : 300000
    return {
      id: activeWork?.status === 'local-draft' && statusValue === 'official' ? activeWork.id : `${statusValue}-${Date.now()}`,
      title,
      type: source?.genre || guideDraft.genre || '本地体验',
      status: statusValue,
      projectStatus: isOfficial ? 'serializing' : 'local-draft',
      syncState: isOfficial ? 'synced' : 'local-only',
      words,
      targetWords,
      plannedChapters: isOfficial ? 120 : 60,
      chapterCount: chapterText.trim() ? 1 : 0,
      currentPublishStatus: isOfficial ? '准备连载' : '未发布',
      weeklyUpdateGoal: isOfficial ? 3 : 1,
      authorName: username || '创作者',
      publishPlatform: '未设置平台',
      updatedAt: '刚刚',
      tags: isOfficial ? ['正式作品', '已同步'] : ['临时草稿', '仅本地保存', '未同步'],
      summary: source?.summary || guideDraft.summary || '从开书向导创建的本地临时草稿。',
      cover: isOfficial ? 'from-blue-700 via-violet-500 to-fuchsia-300' : 'from-amber-300 via-violet-400 to-blue-500',
      createdAt: '刚刚',
      monthlyUpdatedChapters: chapterText.trim() ? 1 : 0,
      sellingPoint: source?.sellingPoint || guideDraft.sellingPoint || '',
      description: source?.summary || guideDraft.summary || '',
      globalOutline: [source?.summary || guideDraft.summary, source?.nextStep || guideDraft.nextStep].filter(Boolean),
      protagonists: (source?.characters || guideDraft.characters).slice(0, 1),
      mainCharacters: source?.characters || guideDraft.characters,
      worldRules: [source?.genre || guideDraft.genre].filter(Boolean),
      coreConflict: source?.sellingPoint || guideDraft.sellingPoint || '',
      enabledTools: isOfficial ? ['黄金第一章', '长篇记忆'] : ['黄金第一章'],
      toolStates: isOfficial ? { '黄金第一章': 'enabled', '长篇记忆': 'enabled', 'OOC 检查': 'passed' } : { '黄金第一章': 'enabled' },
      recentTasks: isOfficial ? ['完善下一章冲突', '检查人物动机一致性'] : ['补齐作品设定', '确认第一章目标'],
      chapterTitle,
      chapterText,
      materials: {
        genre: source?.genre || guideDraft.genre || '待整理',
        sellingPoint: source?.sellingPoint || guideDraft.sellingPoint || '待补充',
        characters: source?.characters || guideDraft.characters,
        summary: source?.summary || guideDraft.summary || '待补充',
        nextStep: source?.nextStep || guideDraft.nextStep || '继续完善第一章冲突。',
      },
    }
  }

  function convertToOfficial(work: SavedWork): SavedWork {
    return {
      ...work,
      title: work.title || '未命名作品',
      status: 'official',
      projectStatus: work.projectStatus === 'local-draft' ? 'draft' : work.projectStatus,
      syncState: 'synced',
      publishPlatform: work.publishPlatform || '未设置平台',
      targetWords: work.targetWords || 600000,
      plannedChapters: work.plannedChapters || 120,
      chapterCount: work.chapterCount || 1,
      currentPublishStatus: work.currentPublishStatus || '准备连载',
      weeklyUpdateGoal: work.weeklyUpdateGoal || 3,
      updatedAt: '刚刚',
      tags: ['正式作品', '已同步'],
      cover: 'from-blue-700 via-violet-500 to-fuchsia-300',
      enabledTools: work.enabledTools?.length ? work.enabledTools : ['黄金第一章', '长篇记忆'],
      toolStates: work.toolStates || { '黄金第一章': 'enabled', '长篇记忆': 'enabled' },
    }
  }

  function upsertWork(work: SavedWork) {
    const nextWork = withChapterStats(work)
    setWorks((current) => {
      const exists = current.some((item) => item.id === nextWork.id)
      return exists ? current.map((item) => item.id === nextWork.id ? nextWork : item) : [nextWork, ...current]
    })
  }

  function handleUpdateWork(updatedWork: WorkItem) {
    setWorks((current) => current.map((item) => {
      if (item.id !== updatedWork.id) return item
      return withChapterStats({
        ...item,
        ...updatedWork,
        description: updatedWork.description ?? updatedWork.summary,
        materials: {
          ...item.materials,
          summary: updatedWork.summary,
          genre: updatedWork.type || item.materials.genre,
          sellingPoint: updatedWork.sellingPoint ?? item.materials.sellingPoint,
          characters: updatedWork.mainCharacters ?? updatedWork.protagonists ?? item.materials.characters,
        },
      })
    }))
    setActiveWork((current) => {
      if (!current || current.id !== updatedWork.id) return current
      return withChapterStats({
        ...current,
        ...updatedWork,
        description: updatedWork.description ?? updatedWork.summary,
        materials: {
          ...current.materials,
          summary: updatedWork.summary,
          genre: updatedWork.type || current.materials.genre,
          sellingPoint: updatedWork.sellingPoint ?? current.materials.sellingPoint,
          characters: updatedWork.mainCharacters ?? updatedWork.protagonists ?? current.materials.characters,
        },
      })
    })
  }

  function handleCreateWorkFromLibrary(work: WorkItem) {
    const savedWork = withChapterStats(work as SavedWork, true)
    setWorks((current) => [savedWork, ...current])
    setActiveWork(savedWork)
  }

  function handleDeleteWorkFromLibrary(workId: string) {
    setWorks((current) => current.filter((item) => item.id !== workId))
    setActiveWork((current) => current?.id === workId ? null : current)
    if (backendToken) void deleteWorkSnapshotFromBackend(workId, backendToken)
  }

  function handleAuthSubmit(payload: AuthPayload) {
    setAuthLoading(true)
    setAuthError('')
    window.setTimeout(() => {
      const accounts = readAccounts()

      if (payload.mode === 'login') {
        const matched = accounts.find((account) => account.account === payload.account)
        if (!matched) {
          setAuthLoading(false)
          setAuthError('登录失败：该账号还没有注册，请先切换到注册。')
          setToast({ type: 'error', title: '登录失败', message: '该账号还没有注册，请先切换到注册。' })
          return
        }
        if (matched.password !== payload.password) {
          setAuthLoading(false)
          setAuthError('登录失败：密码不正确。')
          setToast({ type: 'error', title: '登录失败', message: '密码不正确。' })
          return
        }
        setIsGuest(false)
        setUsername(matched.username)
        setAuthOpen(false)
        setAuthLoading(false)
        setFeedback('success', '登录成功，已进入创作者状态。')
        void connectBackendAfterAuth(payload)
        if (pendingAction === 'save-official') finalizeOfficialSave()
        return
      }

      if (!payload.username.trim()) {
        setAuthLoading(false)
        setAuthError('注册失败：请输入用户名。')
        setToast({ type: 'error', title: '注册失败', message: '请输入用户名。' })
        return
      }
      if (accounts.some((account) => account.account === payload.account)) {
        setAuthLoading(false)
        setAuthError('注册失败：该账号已经注册，请直接登录。')
        setToast({ type: 'error', title: '注册失败', message: '该账号已经注册，请直接登录。' })
        return
      }
      localStorage.setItem(accountStorageKey, JSON.stringify([...accounts, payload]))
      setIsGuest(false)
      setUsername(payload.username.trim())
      setAuthOpen(false)
      setAuthLoading(false)
      setFeedback('success', '注册成功，已进入创作者状态。')
      void connectBackendAfterAuth(payload)
      if (pendingAction === 'save-official') finalizeOfficialSave()
      return

      if (!payload.username.trim()) {
        setAuthLoading(false)
        setAuthError('登录失败，请检查账号信息。')
        return
      }
      setIsGuest(false)
      setUsername(payload.username.trim())
      setAuthOpen(false)
      setAuthLoading(false)
      setFeedback('success', payload.mode === 'register' ? '注册成功，已进入创作者状态。' : '登录成功，已进入创作者状态。')
      if (pendingAction === 'save-official') {
        finalizeOfficialSave()
      }
    }, 650)
  }

  function openWork(work: WorkItem) {
    const saved = works.find((item) => item.id === work.id) ?? createSavedWork(null, work.status)
    setActiveWork(saved)
    setWorkspaceView('overview')
    setScreen('workspace')
  }

  function readAccounts(): LocalAccount[] {
    try {
      return JSON.parse(localStorage.getItem(accountStorageKey) || '[]') as LocalAccount[]
    } catch {
      localStorage.removeItem(accountStorageKey)
      return []
    }
  }

  async function connectBackendAfterAuth(payload: AuthPayload) {
    const session = await authenticateBackend(payload)
    if (!session) {
      setFeedback('success', '已进入创作者状态。后端未连接，本次仍以前端本地保存为准。')
      return
    }
    localStorage.setItem(backendTokenStorageKey, session.token)
    setBackendToken(session.token)
    setUsername(session.username || username)
    const backendWorks = await fetchBackendWorkSnapshots(session.token)
    const localOfficialCount = works.filter((work) => work.status === 'official').length
    const localDraftCount = works.filter((work) => work.status === 'local-draft').length
    if (localOfficialCount > 0 || localDraftCount > 0) {
      setMigrationPrompt({
        token: session.token,
        backendWorks,
        localOfficialCount,
        localDraftCount,
      })
      setFeedback('success', '已连接后端作品库。请选择是否把本地正式作品上传到账号。')
      return
    }
    if (backendWorks.length > 0) {
      setWorks((current) => mergeWorks(current, backendWorks))
      setFeedback('success', '已连接后端作品库，后端作品已读取到当前作品库。')
    } else {
      setFeedback('success', '已连接后端作品库。当前账号暂无后端作品。')
    }
    setBackendAutoSaveEnabled(true)
  }

  function handleMigrationChoice(choice: 'upload' | 'backend-only' | 'later') {
    if (!migrationPrompt) return
    const { token, backendWorks } = migrationPrompt
    if (choice === 'upload') {
      const officialWorks = works.filter((work) => work.status === 'official')
      setWorks((current) => mergeWorks(current, backendWorks))
      officialWorks.forEach((work) => {
        void saveWorkSnapshotToBackend(work, token)
      })
      setBackendAutoSaveEnabled(true)
      setMigrationPrompt(null)
      setFeedback('success', `已上传 ${officialWorks.length} 个本地正式作品，临时草稿仍仅保存在本地。`)
      return
    }
    if (choice === 'backend-only') {
      setWorks((current) => mergeWorks(current, backendWorks))
      setBackendAutoSaveEnabled(false)
      setMigrationPrompt(null)
      setFeedback('success', '已读取后端作品。本地作品暂不上传，后续保存前会继续保留本地优先。')
      return
    }
    setBackendAutoSaveEnabled(false)
    setMigrationPrompt(null)
    setFeedback('success', '已暂缓迁移。本地作品不会自动上传到账号。')
  }

  async function authenticateBackend(payload: AuthPayload): Promise<BackendSession | null> {
    const usernameForBackend = payload.account.trim()
    const body = JSON.stringify({ username: usernameForBackend, password: payload.password })
    const endpoint = payload.mode === 'register' ? '/api/auth/register' : '/api/auth/login'
    const first = await postBackendAuth(endpoint, body)
    if (first) return { token: first.token, username: payload.username || first.username || usernameForBackend }
    if (payload.mode === 'register') {
      const fallbackLogin = await postBackendAuth('/api/auth/login', body)
      if (fallbackLogin) return { token: fallbackLogin.token, username: payload.username || fallbackLogin.username || usernameForBackend }
    }
    return null
  }

  async function postBackendAuth(endpoint: string, body: string): Promise<{ token: string; username: string } | null> {
    try {
      const response = await fetch(`${backendApiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (!response.ok) return null
      const result = await response.json() as BackendResult<{ token: string; username: string }>
      return result.code === 200 && result.data?.token ? result.data : null
    } catch {
      return null
    }
  }

  async function fetchBackendWorkSnapshots(token: string): Promise<SavedWork[]> {
    try {
      const response = await fetch(`${backendApiBase}/api/work-library`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) return []
      const result = await response.json() as BackendResult<WorkSnapshotResponse[]>
      if (result.code !== 200 || !Array.isArray(result.data)) return []
      return result.data
        .map((snapshot) => parseBackendWork(snapshot.payload, snapshot.chapters))
        .filter((work): work is SavedWork => Boolean(work))
    } catch {
      return []
    }
  }

  async function saveWorkSnapshotToBackend(work: SavedWork, token: string) {
    const chapters = normalizeWorkChapters(work)
    const payload = JSON.stringify({ ...work, chapters })
    try {
      await fetch(`${backendApiBase}/api/work-library`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frontendWorkId: work.id,
          title: work.title,
          globalOutline: Array.isArray(work.globalOutline) ? work.globalOutline.join('\n') : '',
          chapterTitle: work.chapterTitle,
          chapterText: work.chapterText,
          chapters: chapters.map((chapter) => ({
            frontendChapterId: chapter.id,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            content: chapter.content,
            status: chapter.status,
          })),
          payload,
        }),
      })
    } catch {
      // 后端不可用时保留前端 localStorage 闭环。
    }
  }

  async function deleteWorkSnapshotFromBackend(workId: string, token: string) {
    try {
      await fetch(`${backendApiBase}/api/work-library/${encodeURIComponent(workId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // 删除同步失败不影响本地删除。
    }
  }

  function recordVersion(work: SavedWork, source: WorkVersionRecord['source']) {
    const nextRecord = createWorkVersion(work, source)
    const nextRecords = [
      nextRecord,
      ...versionRecords.filter((record) => !(record.workId === work.id && record.wordCount === nextRecord.wordCount && record.chapterCount === nextRecord.chapterCount)).slice(0, 79),
    ]
    setVersionRecords(nextRecords)
    writeWorkVersions(nextRecords)
    return nextRecord
  }

  function createManualVersionSnapshot() {
    if (!activeWork) return
    recordVersion(activeWork, 'manual-snapshot')
    setFeedback('success', '已为当前作品保留一个本地版本快照，可在工作台恢复为新副本。')
  }

  async function syncActiveWorkSnapshot() {
    if (!activeWork) return
    if (!backendToken) {
      recordVersion(activeWork, 'manual-snapshot')
      setFeedback('error', '当前未连接后端作品库，已保留本地版本；登录后可再手动同步。')
      return
    }
    const nextWork = withChapterStats({ ...activeWork, status: 'official', syncState: 'syncing' }, true)
    setActiveWork(nextWork)
    upsertWork(nextWork)
    await saveWorkSnapshotToBackend(nextWork, backendToken)
    const syncedWork = withChapterStats({ ...nextWork, syncState: 'synced', tags: ['正式作品', '后端快照已更新'] })
    setActiveWork(syncedWork)
    upsertWork(syncedWork)
    recordVersion(syncedWork, 'manual-snapshot')
    setFeedback('success', '已手动同步到后端作品快照；后端不可用时仍保留本地工作台数据。')
  }

  function restoreVersionAsCopy(record: WorkVersionRecord) {
    const copy = withChapterStats({
      ...record.snapshot,
      id: `work-${Date.now()}`,
      title: `${record.snapshot.title} · 恢复副本`,
      status: 'local-draft',
      syncState: 'local-only',
      tags: ['版本恢复', '本地副本'],
      createdAt: new Date().toLocaleString(),
      updatedAt: '刚刚',
    }, true)
    const version = createWorkVersion(copy, 'restore-copy')
    const nextRecords = [version, ...versionRecords].slice(0, 80)
    setVersionRecords(nextRecords)
    writeWorkVersions(nextRecords)
    setWorks((current) => [copy, ...current])
    setActiveWork(copy)
    setWorkspaceView('editor')
    setScreen('workspace')
    setFeedback('success', '已将该版本恢复为新的本地副本，没有覆盖原作品。')
  }

  function parseBackendWork(payload: string, backendChapters?: WorkSnapshotChapter[]): SavedWork | null {
    try {
      const parsed = JSON.parse(payload) as SavedWork
      if (!parsed?.id || !parsed?.title) return null
      const chapters = Array.isArray(backendChapters) && backendChapters.length > 0
        ? backendChapters.map((chapter, index) => normalizeWorkChapter({
          id: chapter.frontendChapterId || `chapter-${chapter.chapterNumber || index + 1}`,
          chapterNumber: chapter.chapterNumber || index + 1,
          title: chapter.title || `第 ${index + 1} 章`,
          content: chapter.content || '',
          status: chapter.status === 'published' ? 'published' : 'draft',
        }, index))
        : normalizeWorkChapters(parsed)
      return withChapterStats({
        ...parsed,
        chapters,
        chapterTitle: chapters[0]?.title || parsed.chapterTitle,
        chapterText: typeof chapters[0]?.content === 'string' ? chapters[0].content : parsed.chapterText,
        status: 'official',
        syncState: 'synced',
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['正式作品', '后端已保存'],
      })
    } catch {
      return null
    }
  }

  function mergeWorks(localWorks: SavedWork[], backendWorks: SavedWork[]) {
    const byId = new Map<string, SavedWork>()
    backendWorks.forEach((work) => byId.set(work.id, work))
    localWorks.forEach((work) => {
      if (!byId.has(work.id)) byId.set(work.id, work)
    })
    return Array.from(byId.values())
  }

  function saveActiveWork() {
    if (!activeWork) return
    const nextWork: SavedWork = withChapterStats({
      ...activeWork,
      tags: activeWork.status === 'local-draft' ? ['临时草稿', '仅本地保存', '未同步'] : ['正式作品', '本地已保存'],
      syncState: activeWork.status === 'local-draft' ? 'local-only' : 'synced',
    }, true)
    setActiveWork(nextWork)
    upsertWork(nextWork)
    recordVersion(nextWork, 'manual-save')
    setFeedback('success', activeWork.status === 'local-draft' ? '临时草稿已保存到本地，作品统计已更新。' : '作品已保存，字数和章节统计已更新。')
  }

  function updateActiveWorkContent(content: string) {
    setActiveWork((current) => current ? withChapterStats({ ...current, chapterText: content }) : current)
  }

  function updateActiveWorkDraft(work: SavedWork) {
    setActiveWork(withChapterStats(work))
  }

  function appendAssistantText(text: string) {
    if (!activeWork) {
      setFeedback('error', '请先打开一个作品，再写入助手生成内容。')
      return
    }
    const nextText = `${activeWork.chapterText || ''}${activeWork.chapterText ? '\n\n' : ''}${text}`
    const nextWork = withChapterStats({ ...activeWork, chapterText: nextText }, true)
    setActiveWork(nextWork)
    upsertWork(nextWork)
    setWorkspaceView('editor')
    setScreen('workspace')
    setFeedback('success', '助手内容已追加到当前章节。')
  }

  function replaceAssistantDraft(text: string) {
    if (!activeWork) {
      setFeedback('error', '请先打开一个作品，再写入助手生成内容。')
      return
    }
    if (!window.confirm('确认用助手生成内容替换当前章节草稿吗？')) return
    const nextWork = withChapterStats({ ...activeWork, chapterText: text }, true)
    setActiveWork(nextWork)
    upsertWork(nextWork)
    setWorkspaceView('editor')
    setScreen('workspace')
    setFeedback('success', '当前章节草稿已替换为助手生成内容。')
  }

  function openWorkspaceView(view: WorkspaceView) {
    if (!activeWork) {
      setFeedback('error', view === 'lore' ? '请先新建或打开一个作品，再进入资料库。' : '请先新建或打开一个作品，再使用该工具。')
      setScreen('home')
      setShowCreate(true)
      return
    }
    setWorkspaceView(view)
    setScreen('workspace')
  }

  function renderShell(children: React.ReactNode, active = 'home') {
    return (
      <AppShell
        active={active}
        isGuest={isGuest}
        username={username}
        statusText={shellStatusText}
        onNavigateHome={() => setScreen('home')}
        onNewWork={() => setShowCreate(true)}
        onLogin={() => openAuth('login')}
        onOpenSkills={() => setScreen('skills')}
        onOpenCommunity={() => setScreen('community')}
        onOpenModelSettings={() => setScreen('model-settings')}
        onOpenAppearance={() => setScreen('appearance')}
        onOpenExport={() => setScreen('export')}
        onOpenWorks={() => setScreen('works')}
        onOpenMaterials={() => openWorkspaceView('lore')}
        onOpenTools={() => openWorkspaceView('checks')}
        onOpenPrompts={() => setScreen('skills')}
        onOpenStoryGraph={() => setScreen('story-graph')}
      >
        {children}
      </AppShell>
    )
  }

  const sharedModals = (
    <>
      <CreateWorkModal open={showCreate} onClose={() => setShowCreate(false)} onSelect={selectCreationMode} />
      <WebAiPromptModal open={showWebAi} onClose={() => setShowWebAi(false)} onParsedResult={handleParsedResult} />
      <AuthModal open={authOpen} reason={authReason} loading={authLoading} error={authError} onClose={() => setAuthOpen(false)} onSubmit={handleAuthSubmit} />
      <MigrationConfirmDialog prompt={migrationPrompt} onChoose={handleMigrationChoice} />
      <FeedbackDialog toast={toast} onClose={() => setToast(null)} />
      {screen !== 'splash' && (
        <CreativeAssistantPanel
          work={activeWork}
          token={backendToken}
          isGuest={isGuest}
          onRequireLogin={() => openAuth('login')}
          onOpenModelSettings={() => setScreen('model-settings')}
          onOpenExportCenter={() => setScreen('export')}
          onAppendChapterText={appendAssistantText}
          onReplaceChapterDraft={replaceAssistantDraft}
        />
      )}
    </>
  )

  if (screen === 'splash') {
    return (
      <>
        <SplashScreen onStart={startGuestMode} onLogin={() => openAuth('login')} />
        {sharedModals}
      </>
    )
  }

  if (screen === 'guide') {
    return (
      <>
        {renderShell(
          <CreationGuideWorkspace
            draft={guideDraft}
            step={guideStep}
            status={status}
            message={message}
            onDraftChange={updateGuideDraft}
            onStepChange={setGuideStep}
            onModeChange={(mode) => updateGuideDraft({ mode })}
            onOpenWebAi={() => setShowWebAi(true)}
            onInsertEditor={createLocalDraftWork}
            onSaveTemp={createLocalDraftWork}
            onSaveOfficial={requestOfficialSave}
          />,
          'create',
        )}
        {sharedModals}
      </>
    )
  }

  if (screen === 'review' && parsedResult) {
    return (
      <>
        {renderShell(
          <AiResultReview
            result={parsedResult}
            status={status}
            message={message}
            onBack={() => setShowWebAi(true)}
            onUpdate={updateParsedResult}
            onInsertEditor={insertIntoEditor}
            onSaveTemp={saveTemporaryDraft}
            onParseMaterials={parseAsMaterials}
            onSaveOfficial={requestOfficialSave}
          />,
          'create',
        )}
        {sharedModals}
      </>
    )
  }

  if (screen === 'skills') {
    return (
      <>
        {renderShell(
          <SkillPlaza
            isGuest={isGuest}
            onRequireLogin={() => openAuth('login')}
            onUseSkillResult={handleSkillResult}
          />,
          'skills',
        )}
        {sharedModals}
      </>
    )
  }

  if (screen === 'community') {
    return (
      <>
        {renderShell(
          <LightCommunity
            isGuest={isGuest}
            onRequireLogin={() => openAuth('login')}
            onOpenSkills={() => setScreen('skills')}
          />,
          'community',
        )}
        {sharedModals}
      </>
    )
  }

  if (screen === 'model-settings') {
    return (
      <>
        {renderShell(<ModelSettingsPage token={backendToken} isGuest={isGuest} onRequireLogin={() => openAuth('login')} />, 'model-settings')}
        {sharedModals}
      </>
    )
  }

  if (screen === 'appearance') {
    return (
      <>
        {renderShell(<AppearanceSettingsPage />, 'appearance')}
        {sharedModals}
      </>
    )
  }

  if (screen === 'export') {
    return (
      <>
        {renderShell(<ExportCenterPage work={activeWork} token={backendToken} isGuest={isGuest} onRequireLogin={() => openAuth('login')} onRestoreWork={handleCreateWorkFromLibrary} />, 'export')}
        {sharedModals}
      </>
    )
  }

  if (screen === 'story-graph') {
    return (
      <>
        {renderShell(
          <StoryGraphCenter
            works={sortedWorks}
            activeWork={activeWork}
            isGuest={isGuest}
            onOpenWorks={() => setScreen('works')}
          />,
          'story-graph',
        )}
        {sharedModals}
      </>
    )
  }

  if (screen === 'works') {
    return (
      <>
        {renderShell(
          <WorksHome
            works={sortedWorks}
            isGuest={isGuest}
            mode="library"
            onNewWork={() => setShowCreate(true)}
            onOpenWebAi={() => {
              setGuideDraft({ ...emptyGuideDraft, mode: 'web-ai', genre: '网页 AI / 待解析' })
              setScreen('guide')
              setShowWebAi(true)
            }}
            onOpenWork={openWork}
            onUpdateWork={handleUpdateWork}
            onCreateWork={handleCreateWorkFromLibrary}
            onDeleteWork={handleDeleteWorkFromLibrary}
            onOpenStoryGraph={() => setScreen('story-graph')}
          />,
          'works',
        )}
        {sharedModals}
      </>
    )
  }

  if (screen === 'workspace' && activeWork) {
    return (
      <>
        {renderShell(
          <WritingWorkspace
            work={activeWork}
            status={status}
            message={message}
            initialView={workspaceView}
            onBackHome={() => setScreen('home')}
            onOpenStoryGraph={() => setScreen('story-graph')}
            onWorkChange={updateActiveWorkDraft}
            onSave={saveActiveWork}
            backendToken={backendToken}
            versionRecords={versionRecords.filter((record) => record.workId === activeWork.id)}
            onCreateVersion={createManualVersionSnapshot}
            onRestoreVersion={restoreVersionAsCopy}
            onManualSync={syncActiveWorkSnapshot}
          />,
          'create',
        )}
        {sharedModals}
      </>
    )
  }

  return (
    <>
      {renderShell(
        <WorksHome
          works={sortedWorks}
          isGuest={isGuest}
          onNewWork={() => setShowCreate(true)}
          onOpenWebAi={() => {
            setGuideDraft({ ...emptyGuideDraft, mode: 'web-ai', genre: '网页 AI / 待解析' })
            setScreen('guide')
            setShowWebAi(true)
          }}
          onOpenWork={openWork}
          onOpenStoryGraph={() => setScreen('story-graph')}
        />,
        'home',
      )}
      {sharedModals}
    </>
  )
}

function MigrationConfirmDialog({
  prompt,
  onChoose,
}: {
  prompt: MigrationPrompt
  onChoose: (choice: 'upload' | 'backend-only' | 'later') => void
}) {
  if (!prompt) return null

  return (
    <div className="fixed inset-0 z-[88] flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm">
      <section className="w-full max-w-xl rounded-lg border border-white/70 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">云</div>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">是否把本地作品迁移到账号？</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              已连接后端作品库。当前浏览器里有 {prompt.localOfficialCount} 个本地正式作品、{prompt.localDraftCount} 个临时草稿；账号后端已有 {prompt.backendWorks.length} 个作品快照。
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          只有你确认后，本地正式作品才会上传到账号。临时草稿继续仅保存在当前浏览器，不会自动变成云端作品。
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button onClick={() => onChoose('upload')} className="rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">
            上传正式作品
          </button>
          <button onClick={() => onChoose('backend-only')} className="rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            仅读取账号作品
          </button>
          <button onClick={() => onChoose('later')} className="rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50">
            稍后处理
          </button>
        </div>
      </section>
    </div>
  )
}

function FeedbackDialog({
  toast,
  onClose,
}: {
  toast: { type: 'success' | 'error'; title: string; message: string } | null
  onClose: () => void
}) {
  if (!toast) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/30 p-6 backdrop-blur-sm">
      <section className="w-full max-w-sm rounded-lg border border-white/70 bg-white p-6 text-center shadow-2xl">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
          {toast.type === 'success' ? '✓' : '!'}
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">{toast.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{toast.message}</p>
        <button onClick={onClose} className="mt-5 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">
          知道了
        </button>
      </section>
    </div>
  )
}
