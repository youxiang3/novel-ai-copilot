'use client'

import { ArrowLeft, CheckCircle2, Edit3, FileArchive, FileText, Loader2, Save, Sparkles } from 'lucide-react'
import { BrandMark } from './BrandMark'
import type { OperationStatus, ParsedWorkResult } from './types'
import { cn } from '@/lib/utils'

export function AiResultReview({
  result,
  status,
  message,
  onBack,
  onUpdate,
  onInsertEditor,
  onSaveTemp,
  onParseMaterials,
  onSaveOfficial,
}: {
  result: ParsedWorkResult
  status: OperationStatus
  message: string
  onBack: () => void
  onUpdate: (patch: Partial<ParsedWorkResult>) => void
  onInsertEditor: () => void
  onSaveTemp: () => void
  onParseMaterials: () => void
  onSaveOfficial: () => void
}) {
  const isBusy = status === 'loading'

  return (
    <main className="min-h-screen bg-[#f6f8ff] text-slate-950">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
        <div className="flex items-center gap-4">
          <BrandMark compact />
          <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700">外部生成模式</span>
          <span className="text-sm text-slate-500">作品首页 / 结果回填 / 解析确认</span>
        </div>
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
          返回 Prompt
        </button>
      </header>

      <div className="mx-auto max-w-[1480px] px-8 py-7">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <Sparkles className="h-6 w-6 text-blue-600" />
              结果回填 / 解析确认
            </h1>
            <p className="mt-2 text-sm text-slate-500">已从外部生成结果中完成解析，请确认并选择保存方式。</p>
          </div>
          <div className="flex gap-2">
            {['ChatGPT Web', 'DeepSeek Web', 'Gemini Web'].map((item) => (
              <span key={item} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium">{item}</span>
            ))}
          </div>
        </div>

        {message && (
          <div className={cn('mt-5 rounded-md border px-4 py-3 text-sm', status === 'error' ? 'border-red-200 bg-red-50 text-red-700' : status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700')}>
            {isBusy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
            {message}
          </div>
        )}

        <div className="mt-6 grid grid-cols-[430px_minmax(0,1fr)_420px] gap-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">原始返回内容</h2>
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium">
                来源：GPT Web
              </div>
              <textarea
                value={result.rawText}
                onChange={(event) => onUpdate({ rawText: event.target.value })}
                className="h-[520px] w-full resize-none bg-transparent text-sm leading-7 outline-none"
              />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                系统解析结果
              </h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">解析成功</span>
            </div>
            <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
              <EditableRow label="作品标题" value={result.title} onChange={(value) => onUpdate({ title: value })} />
              <EditableRow label="题材" value={result.genre} onChange={(value) => onUpdate({ genre: value })} />
              <EditableRow label="核心卖点" value={result.sellingPoint} onChange={(value) => onUpdate({ sellingPoint: value })} />
              <EditableRow label="主角设定" value={result.characters.join('、')} onChange={(value) => onUpdate({ characters: value.split(/[、,，]/).map((item) => item.trim()).filter(Boolean) })} />
              <EditableRow label="第一章标题" value={result.chapterTitle} onChange={(value) => onUpdate({ chapterTitle: value })} />
              <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 p-4">
                <div className="text-sm font-medium text-slate-500">第一章正文</div>
                <textarea value={result.chapterText} onChange={(event) => onUpdate({ chapterText: event.target.value })} className="h-40 resize-none rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-7 outline-none focus:ring-4 focus:ring-blue-100" />
              </div>
              <EditableRow label="本章摘要" value={result.summary} onChange={(value) => onUpdate({ summary: value })} />
              <EditableRow label="新增伏笔" value={result.foreshadowing.join('；')} onChange={(value) => onUpdate({ foreshadowing: value.split(/[；;]/).map((item) => item.trim()).filter(Boolean) })} />
              <EditableRow label="下一章建议" value={result.nextStep} onChange={(value) => onUpdate({ nextStep: value })} />
            </div>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">确认保存</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">请选择将解析结果如何保存到你的创作空间。</p>
            <div className="mt-5 space-y-3">
              <ActionButton icon={Edit3} title="仅插入编辑器" text="将内容插入当前编辑器，暂不保存作品资料" onClick={onInsertEditor} />
              <ActionButton icon={FileText} title="保存为临时草稿" text="保存到草稿箱，可继续编辑，未发布" onClick={onSaveTemp} />
              <ActionButton icon={FileArchive} title="解析为作品资料" text="仅保存为作品资料，不进入正式工作台" onClick={onParseMaterials} />
              <ActionButton icon={Save} title="保存为正式作品" text="创建新作品并保存完整章节内容" onClick={onSaveOfficial} highlight />
            </div>
            <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
              内容已成功解析，共识别 {7 + result.foreshadowing.length} 项信息。
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

function EditableRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 p-4">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 bg-transparent text-sm text-slate-800 outline-none" />
    </div>
  )
}

function ActionButton({ icon: Icon, title, text, onClick, highlight = false }: { icon: typeof Edit3; title: string; text: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-4 rounded-md border p-4 text-left transition', highlight ? 'border-violet-300 bg-violet-50 hover:bg-violet-100' : 'border-slate-200 hover:bg-slate-50')}>
      <span className={cn('flex h-11 w-11 items-center justify-center rounded-md text-white', highlight ? 'bg-violet-500' : 'bg-blue-500')}>
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{text}</span>
      </span>
    </button>
  )
}
