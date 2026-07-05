'use client'

import { useMemo, useState } from 'react'
import { Bot, CheckCircle2, Loader2, MessageSquare, Send, Settings, Sparkles, X } from 'lucide-react'
import type { SavedWork } from './types'
import { cn } from '@/lib/utils'

type AssistantRole = 'user' | 'assistant' | 'system'

interface AssistantMessage {
  id: string
  role: AssistantRole
  content: string
}

interface AssistantAction {
  type: string
  label: string
  payload: string
}

interface AssistantResponse {
  reply: string
  actions?: AssistantAction[]
  warnings?: string[]
}

interface BackendResult<T> {
  code: number
  message: string
  data: T
}

const backendApiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

export function CreativeAssistantPanel({
  work,
  token,
  isGuest,
  onRequireLogin,
  onOpenModelSettings,
  onOpenExportCenter,
  onAppendChapterText,
  onReplaceChapterDraft,
}: {
  work: SavedWork | null
  token: string
  isGuest: boolean
  onRequireLogin: () => void
  onOpenModelSettings: () => void
  onOpenExportCenter: () => void
  onAppendChapterText: (text: string) => void
  onReplaceChapterDraft: (text: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '我是智能创作助手。登录并配置模型后，可以根据当前作品上下文帮你规划、续写、检查和生成可确认动作。',
    },
  ])
  const [actions, setActions] = useState<AssistantAction[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  const contextLabel = useMemo(() => {
    if (!work) return '未选择作品'
    return `${work.title || '未命名作品'} · ${work.chapterTitle || '当前章节'}`
  }, [work])

  async function sendMessage() {
    const message = input.trim()
    if (!message || loading) return
    setInput('')
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: message }])
    setActions([])
    setWarnings([])

    if (isGuest || !token) {
      setMessages((current) => [...current, { id: `system-${Date.now()}`, role: 'system', content: '需要先登录并连接后端模型配置，才能使用真实 AI 智能助手。' }])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${backendApiBase}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          workContext: buildWorkContext(work),
        }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const result = await response.json() as BackendResult<AssistantResponse>
      if (result.code !== 200) {
        throw new Error(result.message || '模型调用失败')
      }
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: result.data.reply || '模型没有返回内容。' }])
      setActions(result.data.actions || [])
      setWarnings(result.data.warnings || [])
    } catch (error) {
      setMessages((current) => [...current, { id: `error-${Date.now()}`, role: 'system', content: `智能助手调用失败：${error instanceof Error ? error.message : '未知错误'}。请检查后端、登录状态和模型配置。` }])
    } finally {
      setLoading(false)
    }
  }

  function executeAction(action: AssistantAction) {
    if (action.type === 'appendChapterText') {
      onAppendChapterText(action.payload)
    } else if (action.type === 'replaceChapterDraft') {
      onReplaceChapterDraft(action.payload)
    } else if (action.type === 'openModelSettings') {
      onOpenModelSettings()
    } else if (action.type === 'openExportCenter') {
      onOpenExportCenter()
    } else {
      setMessages((current) => [...current, { id: `action-${Date.now()}`, role: 'system', content: `动作“${action.label}”已识别，但当前 P0 只展示建议，不自动执行该动作。` }])
      return
    }
    setMessages((current) => [...current, { id: `action-${Date.now()}`, role: 'system', content: `已执行：${action.label}` }])
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[60] inline-flex h-12 items-center gap-2 rounded-full border border-teal-200 bg-teal-700 px-5 text-sm font-semibold text-white shadow-xl hover:bg-teal-600"
      >
        <Sparkles className="h-4 w-4" />
        智能助手
      </button>

      {open && (
        <section className="fixed bottom-24 right-6 z-[70] flex h-[640px] w-[420px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-200 px-4 py-4">
            <div>
              <div className="flex items-center gap-2 font-semibold text-slate-950">
                <Bot className="h-5 w-5 text-teal-700" />
                智能创作助手
              </div>
              <p className="mt-1 text-xs text-slate-500">{contextLabel}</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="关闭助手">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex gap-2 border-b border-slate-100 px-4 py-3 text-xs">
            {isGuest || !token ? (
              <button onClick={onRequireLogin} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-800">登录后启用</button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />后端模型通道</span>
            )}
            <button onClick={onOpenModelSettings} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50"><Settings className="h-3.5 w-3.5" />模型设置</button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'rounded-md px-3 py-2 text-sm leading-6',
                  message.role === 'user' && 'ml-8 bg-teal-700 text-white',
                  message.role === 'assistant' && 'mr-8 border border-slate-200 bg-white text-slate-700',
                  message.role === 'system' && 'border border-amber-200 bg-amber-50 text-amber-800',
                )}
              >
                {message.content}
              </div>
            ))}
            {loading && <div className="mr-8 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />模型正在思考...</div>}

            {warnings.length > 0 && (
              <div className="space-y-1">
                {warnings.map((warning) => <div key={warning} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{warning}</div>)}
              </div>
            )}

            {actions.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500">建议动作，需要你确认</div>
                {actions.map((action) => (
                  <button key={`${action.type}-${action.label}`} onClick={() => executeAction(action)} className="w-full rounded-md border border-teal-200 bg-white px-3 py-2 text-left text-sm hover:bg-teal-50">
                    <div className="font-semibold text-teal-800">{action.label}</div>
                    {action.payload && <div className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">{action.payload}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-3">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void sendMessage()
                  }
                }}
                className="h-20 min-w-0 flex-1 resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-500/15 focus:ring-4"
                placeholder="例如：帮我规划下一章，或者检查这一章的问题..."
              />
              <button onClick={() => void sendMessage()} disabled={loading || !input.trim()} className="inline-flex w-12 items-center justify-center rounded-md bg-teal-700 text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400"><MessageSquare className="h-3 w-3" />AI 内容仅为建议，写入作品前需要你确认。</p>
          </div>
        </section>
      )}
    </>
  )
}

function buildWorkContext(work: SavedWork | null) {
  if (!work) return '当前没有打开作品。'
  return JSON.stringify({
    id: work.id,
    title: work.title,
    authorName: work.authorName,
    type: work.type,
    projectStatus: work.projectStatus,
    publishPlatform: work.publishPlatform,
    words: work.words,
    targetWords: work.targetWords,
    chapterTitle: work.chapterTitle,
    chapterText: limitText(work.chapterText, 6000),
    summary: work.summary,
    sellingPoint: work.sellingPoint,
    description: work.description,
    globalOutline: work.globalOutline?.slice(0, 8),
    mainCharacters: work.mainCharacters?.slice(0, 12),
    protagonists: work.protagonists?.slice(0, 6),
    worldRules: work.worldRules?.slice(0, 12),
    coreConflict: work.coreConflict,
    recentTasks: work.recentTasks?.slice(0, 8),
  })
}

function limitText(text: string, limit: number) {
  if (!text) return ''
  return text.length > limit ? `${text.slice(0, limit)}\n（后文已截断）` : text
}
