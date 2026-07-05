'use client'

import { Bot, CheckCircle2, ChevronRight, FileText, Globe2, Laptop, Link2, Loader2, PenLine, Save, Sparkles, UserRound } from 'lucide-react'
import { BrandMark } from './BrandMark'
import type { CreationMode, GuideDraft, OperationStatus, WorkspaceStep } from './types'
import { cn } from '@/lib/utils'

const steps: Array<{ id: WorkspaceStep; label: string }> = [
  { id: 'idea', label: '脑洞' },
  { id: 'materials', label: '资料' },
  { id: 'outline', label: '第一章骨架' },
  { id: 'draft', label: '第一章草稿' },
  { id: 'confirm', label: '确认创建' },
]

const modeCards: Array<{ id: CreationMode; icon: typeof Laptop; title: string; text: string }> = [
  { id: 'local', icon: Laptop, title: '本地体验', text: '离线整理，本地规则' },
  { id: 'web-ai', icon: Globe2, title: '网页 AI', text: '复制 Prompt 到网页 AI' },
  { id: 'api', icon: Link2, title: 'API 直连', text: '自定义 API，自由配置' },
]

export function CreationGuideWorkspace({
  draft,
  step,
  status,
  message,
  onDraftChange,
  onStepChange,
  onModeChange,
  onOpenWebAi,
  onInsertEditor,
  onSaveTemp,
  onSaveOfficial,
}: {
  draft: GuideDraft
  step: WorkspaceStep
  status: OperationStatus
  message: string
  onDraftChange: (patch: Partial<GuideDraft>) => void
  onStepChange: (step: WorkspaceStep) => void
  onModeChange: (mode: CreationMode) => void
  onOpenWebAi: () => void
  onInsertEditor: () => void
  onSaveTemp: () => void
  onSaveOfficial: () => void
}) {
  const currentIndex = steps.findIndex((item) => item.id === step)
  const isBusy = status === 'loading'

  return (
    <main className="min-h-screen bg-[#f4f8ff] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1480px] flex-col px-8 py-6">
        <header className="flex h-16 items-center gap-5 rounded-lg border border-slate-200 bg-white px-6 shadow-sm">
          <BrandMark compact />
          <div className="h-7 w-px bg-slate-200" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{draft.title || '未命名作品'}</div>
            <div className="mt-1 text-xs text-slate-500">{draft.mode === 'web-ai' ? '外部生成模式' : draft.mode === 'api' ? '接口直连模式' : '本地体验模式'}</div>
          </div>
          <button onClick={onSaveTemp} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            <Save className="h-4 w-4" />
            保存草稿
          </button>
          <button onClick={onSaveOfficial} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            确认创建
            <ChevronRight className="h-4 w-4" />
          </button>
        </header>

        <div className="mt-5 rounded-lg border border-slate-200 bg-white px-8 py-4 shadow-sm">
          <div className="flex items-center justify-center">
            {steps.map((item, index) => {
              const active = item.id === step
              const done = index < currentIndex
              return (
                <div key={item.id} className="flex items-center">
                  <button onClick={() => onStepChange(item.id)} className="flex flex-col items-center gap-1">
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold', active ? 'border-blue-600 bg-blue-600 text-white' : done ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-400')}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className={cn('text-xs font-medium', active ? 'text-blue-600' : done ? 'text-blue-500' : 'text-slate-400')}>{item.label}</span>
                  </button>
                  {index < steps.length - 1 && <span className={cn('mx-4 h-px w-24', index < currentIndex ? 'bg-blue-400' : 'bg-slate-200')} />}
                </div>
              )
            })}
          </div>
        </div>

        {message && (
          <div className={cn('mt-4 rounded-md border px-4 py-3 text-sm', status === 'error' ? 'border-red-200 bg-red-50 text-red-700' : status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700')}>
            {isBusy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
            {message}
          </div>
        )}

        <div className="mt-5 grid min-h-[560px] flex-1 grid-cols-[260px_minmax(0,1fr)_300px] gap-5">
          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-blue-600" />
              作品信息
            </h2>
            <div className="mt-4 space-y-4">
              <label className="block text-xs font-medium text-slate-500">作品标题</label>
              <input value={draft.title} onChange={(event) => onDraftChange({ title: event.target.value })} className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:ring-4 focus:ring-blue-100" placeholder="请输入作品标题" />
              <label className="block text-xs font-medium text-slate-500">一句脑洞</label>
              <textarea value={draft.idea} onChange={(event) => onDraftChange({ idea: event.target.value })} className="h-24 w-full resize-none rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:ring-4 focus:ring-blue-100" placeholder="例如：她发现暗恋多年的人，成了竞赛对手。" />
              <InfoRow label="题材方向" value={draft.genre || '待整理'} />
              <InfoRow label="核心卖点" value={draft.sellingPoint || '等待 AI 整理'} />
              <InfoRow label="角色设定" value={draft.characters.join('、') || '待补充'} />
            </div>
          </aside>

          <section className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  开书向导
                </h1>
                <p className="mt-2 text-sm text-slate-500">先完成脑洞拆解、资料整理，再生成第一章骨架。</p>
              </div>
              <button onClick={() => onStepChange(steps[Math.min(currentIndex + 1, steps.length - 1)].id)} className="text-sm font-medium text-blue-600 hover:text-blue-500">跳到下一步</button>
            </div>

            <div className="mt-7 rounded-lg border border-blue-100 bg-blue-50/60 p-5">
              <div className="text-sm font-semibold text-blue-700">当前问题</div>
              <h2 className="mt-3 text-lg font-semibold">这个故事里，主角为什么必须重新出发？</h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {['为了夺回被误解的人生', '有人利用主角的弱点逼迫', '保护身边人需要成长'].map((option) => (
                  <button key={option} onClick={() => onDraftChange({ sellingPoint: option })} className={cn('rounded-md border p-3 text-left text-sm leading-6 hover:border-blue-300 hover:bg-white', draft.sellingPoint === option ? 'border-blue-500 bg-white text-blue-700' : 'border-slate-200 bg-white/70')}>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 p-5">
              <h3 className="font-semibold">已整理的故事方向</h3>
              <div className="mt-4 grid gap-3 text-sm leading-6">
                <InfoRow label="题材" value={draft.genre || '青春校园 / 成长治愈'} />
                <InfoRow label="一句话卖点" value={draft.sellingPoint || '多年暗恋对象成为竞赛对手，双向拉扯与成长。'} />
                <InfoRow label="第一章目标" value={draft.summary || '制造重逢场景，展现两人复杂关系，埋下竞赛冲突钩子。'} />
              </div>
            </div>

            <div className="mt-7 flex justify-center gap-4">
              <button onClick={() => onStepChange('outline')} className="inline-flex h-12 w-56 items-center justify-center gap-2 rounded-md bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500">
                继续下一问
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={onOpenWebAi} className="inline-flex h-12 w-64 items-center justify-center gap-2 rounded-md border border-blue-200 bg-white text-sm font-semibold text-blue-600 hover:bg-blue-50">
                <Sparkles className="h-4 w-4" />
                生成草稿
              </button>
            </div>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-blue-600" />
              写作助手
            </h2>
            <div className="mt-4 space-y-3">
              <AICard title="当前下一步" text="先明确第一章冲突，再进入骨架生成。" />
              <AICard title="结构建议" text="建议补充主角动机与势力关系，增强冲突张力。" />
              <AICard title="已确认内容" text={`题材：${draft.genre || '待定'}\n标题：${draft.title || '未命名'}`} />
            </div>
          </aside>
        </div>

        <div className="mx-auto mt-5 grid w-[760px] grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          {modeCards.map((mode) => (
            <button key={mode.id} onClick={() => onModeChange(mode.id)} className={cn('flex items-center gap-3 rounded-md border px-4 py-3 text-left', draft.mode === mode.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50')}>
              <mode.icon className="h-5 w-5" />
              <span>
                <span className="block text-sm font-semibold">{mode.title}</span>
                <span className="text-xs text-slate-500">{mode.text}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 text-slate-800">{value}</span>
    </div>
  )
}

function AICard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-blue-700">{title}</div>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{text}</p>
    </div>
  )
}
