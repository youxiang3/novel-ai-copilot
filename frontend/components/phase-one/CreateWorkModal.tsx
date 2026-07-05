'use client'

import { Code2, Globe2, Laptop, Lock, Sparkles, X } from 'lucide-react'
import type { CreationMode } from './types'
import { cn } from '@/lib/utils'

const modes: Array<{
  id: CreationMode
  title: string
  badge: string
  text: string
  icon: typeof Globe2
  enabled: boolean
}> = [
  {
    id: 'web-ai',
    title: '外部生成模式',
    badge: '推荐',
    text: '复制 Prompt 到 ChatGPT、DeepSeek 或 Gemini，生成后粘贴回来解析。',
    icon: Globe2,
    enabled: true,
  },
  {
    id: 'local',
    title: '本地体验模式',
    badge: '离线',
    text: '用本地规则创建草稿，适合快速体验和无 API 场景。',
    icon: Laptop,
    enabled: true,
  },
  {
    id: 'api',
    title: 'API 直连模式',
    badge: '需配置',
    text: '配置模型 API 后可直接在工作台生成内容，本阶段仅作为入口占位。',
    icon: Code2,
    enabled: false,
  },
]

export function CreateWorkModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (mode: CreationMode) => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">新建作品</h2>
            <p className="mt-2 text-sm text-slate-600">选择本次创作方式。未登录或未配置接口时，可以先用外部生成模式完成 Prompt 复制与回填。</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          {modes.map((mode) => (
            <button
              key={mode.id}
              disabled={!mode.enabled}
              onClick={() => onSelect(mode.id)}
              className={cn(
                'flex items-center gap-4 rounded-md border p-4 text-left transition',
                mode.enabled ? 'border-slate-200 hover:border-violet-300 hover:bg-violet-50' : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70',
              )}
            >
              <span className={cn('flex h-12 w-12 items-center justify-center rounded-md', mode.enabled ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-500')}>
                <mode.icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-slate-950">{mode.title}</span>
                  <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">{mode.badge}</span>
                  {!mode.enabled && <Lock className="h-4 w-4 text-slate-400" />}
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{mode.text}</span>
              </span>
              {mode.enabled && <Sparkles className="h-5 w-5 text-violet-500" />}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">取消</button>
          <button onClick={() => onSelect('web-ai')} className="rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500">使用外部生成模式</button>
        </div>
      </section>
    </div>
  )
}
