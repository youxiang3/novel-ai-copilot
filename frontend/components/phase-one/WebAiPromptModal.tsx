'use client'

import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FileCheck2,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { ParsedWorkResult } from './types'

const defaultPromptText = `你是一名中文网文编辑和小说开篇策划专家。
请根据以下作品资料和要求，生成【第一章】草稿。

【作品类型】青春校园 / 校园暗恋 / 成长治愈
【核心卖点】多年暗恋对象成为竞赛对手，双向拉扯与成长。
【主角】林深（男，内敛理性）
【女主】苏晚（女，温柔坚定）
【故事背景】高二下学期，学校科技竞赛季。

【第一章目标】
制造重逢场景，展现两人复杂关系，埋下竞赛冲突钩子。

【写作要求】
1. 前 300 字出现具体场景，快速代入。
2. 语言自然，符合高中生视角。
3. 不要大段内心独白。
4. 结尾留下愿意点下一章的悬念。

【输出格式】
作品标题：
题材：
核心卖点：
主角设定：
第一章标题：
第一章正文：
本章摘要：
新增伏笔：
下一章建议：`

export function WebAiPromptModal({
  open,
  onClose,
  onParsedResult,
}: {
  open: boolean
  onClose: () => void
  onParsedResult: (result: ParsedWorkResult) => void
}) {
  const [copied, setCopied] = useState(false)
  const [promptDraft, setPromptDraft] = useState(defaultPromptText)
  const [rawResult, setRawResult] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canParse = rawResult.trim().length > 0
  const canCopyPrompt = promptDraft.trim().length > 0
  const aiLinks = useMemo(() => [
    { label: 'ChatGPT', href: 'https://chatgpt.com/' },
    { label: 'DeepSeek', href: 'https://chat.deepseek.com/' },
    { label: 'Gemini', href: 'https://gemini.google.com/' },
  ], [])

  if (!open) return null

  function copyPrompt() {
    const text = promptDraft.trim()
    if (!text) {
      setStatus('error')
      setMessage('Prompt 不能为空，请先输入或恢复默认 Prompt。')
      return
    }
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setStatus('success')
    setMessage('当前 Prompt 已复制，可以粘贴到网页 AI。')
    window.setTimeout(() => setCopied(false), 1600)
  }

  function restoreDefaultPrompt() {
    setPromptDraft(defaultPromptText)
    setStatus('success')
    setMessage('已恢复默认 Prompt。本次编辑内容不会保存为模板。')
  }

  function importPrompt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const lowerName = file.name.toLowerCase()
    const isTextFile = lowerName.endsWith('.txt') || lowerName.endsWith('.md')
    if (!isTextFile) {
      setStatus('error')
      setMessage('仅支持导入 .txt 或 .md 文本 Prompt。')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '').trim()
      if (!text) {
        setStatus('error')
        setMessage('导入文件为空，请选择包含 Prompt 的文本文件。')
        return
      }
      setPromptDraft(text)
      setStatus('success')
      setMessage('Prompt 已导入。本次导入只影响当前生成，不会保存为模板。')
    }
    reader.onerror = () => {
      setStatus('error')
      setMessage('读取 Prompt 文件失败，请重试。')
    }
    reader.readAsText(file)
  }

  function parseResult() {
    if (!rawResult.trim()) {
      setStatus('error')
      setMessage('请先粘贴网页 AI 返回内容。')
      return
    }
    setStatus('loading')
    setMessage('正在解析 AI 返回内容...')
    window.setTimeout(() => {
      const parsed = parseWebAiResult(rawResult)
      setStatus('success')
      setMessage('解析成功，正在进入确认页。')
      onParsedResult(parsed)
      setRawResult('')
    }, 500)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-6 backdrop-blur-sm">
      <section className="mx-auto max-w-6xl rounded-lg border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-7 py-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-950">外部生成 · Prompt</h2>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">结果回填</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">编辑或导入 Prompt，复制到网页 AI，生成后把结果粘贴回来解析。</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </header>

        {message && (
          <div className={`mx-7 mt-5 rounded-md border px-4 py-3 text-sm ${status === 'error' ? 'border-red-200 bg-red-50 text-red-700' : status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_420px] gap-7 px-7 py-6">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-950">1. 编辑或导入 Prompt</h3>
              <div className="flex flex-wrap justify-end gap-2">
                <input ref={fileInputRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={importPrompt} />
                <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Upload className="h-4 w-4" />
                  导入 Prompt
                </button>
                <button onClick={restoreDefaultPrompt} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <RotateCcw className="h-4 w-4" />
                  恢复默认
                </button>
                <button disabled={!canCopyPrompt} onClick={copyPrompt} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40">
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {copied ? '已复制' : '复制当前 Prompt'}
                </button>
              </div>
            </div>
            <textarea
              value={promptDraft}
              onChange={(event) => setPromptDraft(event.target.value)}
              className="h-[360px] w-full resize-none rounded-md border border-slate-200 bg-slate-50/70 p-4 font-mono text-sm leading-6 text-slate-900 outline-none ring-slate-500/15 focus:border-slate-400 focus:ring-4"
              placeholder="在这里编辑本次要复制到网页 AI 的 Prompt..."
            />

            <div className="mt-6">
              <h3 className="font-semibold text-slate-950">3. 粘贴 AI 生成结果</h3>
              <textarea
                value={rawResult}
                onChange={(event) => setRawResult(event.target.value)}
                className="mt-3 h-40 w-full resize-none rounded-md border border-slate-200 p-4 text-sm leading-6 outline-none ring-slate-500/15 focus:border-slate-400 focus:ring-4"
                placeholder="请在这里粘贴网页 AI 生成的结果..."
              />
              <div className="mt-3 flex justify-end gap-3">
                <button onClick={() => setRawResult('')} className="rounded-md border border-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-slate-50">重新粘贴</button>
                <button disabled={!canParse || status === 'loading'} onClick={parseResult} className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">粘贴并解析结果</button>
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-md border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-950">2. 使用步骤</h3>
              <div className="mt-5 space-y-4">
                <Step icon={Clipboard} title="编辑 / 导入 Prompt" text="可以直接修改，也可以导入 .txt 或 .md 文本。" />
                <Step icon={MessageSquare} title="打开网页 AI 工具" text="把当前 Prompt 粘贴到任一网页 AI 对话框。" />
                <Step icon={Sparkles} title="生成内容" text="在网页 AI 中发送，生成小说内容。" />
                <Step icon={FileCheck2} title="粘贴结果回来" text="复制生成结果，回到这里解析确认。" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {aiLinks.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 px-2 py-2 text-xs font-medium hover:bg-slate-50">
                    {link.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </section>

            <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="font-semibold">小贴士</div>
              <p className="mt-2 leading-6">导入或修改 Prompt 只影响本次生成，不会自动保存为模板。结果不满意时，可以调整 Prompt 后重新生成；解析页仍可手动编辑字段。</p>
            </section>
          </aside>
        </div>
      </section>
    </div>
  )
}

function Step({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-950">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{text}</span>
      </span>
    </div>
  )
}

export function parseWebAiResult(raw: string): ParsedWorkResult {
  const text = raw.trim()
  const title = matchSection(text, ['作品标题', '标题']) || '星海尽头的回声'
  const genre = matchSection(text, ['题材', '作品类型']) || '青春校园 / 成长治愈'
  const sellingPoint = matchSection(text, ['核心卖点', '卖点']) || '多年暗恋对象成为竞赛对手，双向拉扯与成长。'
  const characterText = matchSection(text, ['主角设定', '人物', '角色设定']) || '林深（男，内敛理性）、苏晚（女，温柔坚定）'
  const chapterTitle = matchSection(text, ['第一章标题', '章节标题']) || '第一章：重逢在竞赛季'
  const chapterText = matchSection(text, ['第一章正文', '正文', '内容']) || text || '四月的风吹过实验楼，公告栏前挤满了人。林深看见苏晚的名字和自己并排出现在竞赛名单上，指尖忽然停住。'
  const summary = matchSection(text, ['本章摘要', '摘要']) || '主角在竞赛季与旧识重逢，关系和目标冲突被同时抛出。'
  const foreshadowing = (matchSection(text, ['新增伏笔', '伏笔']) || '竞赛名单异常；旧照片中的空白署名')
    .split(/[；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
  const nextStep = matchSection(text, ['下一章建议', '后续建议']) || '让两人第一次正面合作，并暴露竞赛背后的额外压力。'

  return {
    title,
    genre,
    sellingPoint,
    characters: characterText.split(/[、；;\n]/).map((item) => item.trim()).filter(Boolean),
    chapterTitle,
    chapterText,
    summary,
    nextStep,
    foreshadowing,
    rawText: raw,
  }
}

function matchSection(source: string, labels: string[]) {
  const allLabels = [
    '作品标题',
    '标题',
    '题材',
    '作品类型',
    '核心卖点',
    '卖点',
    '主角设定',
    '人物',
    '角色设定',
    '第一章标题',
    '章节标题',
    '第一章正文',
    '正文',
    '内容',
    '本章摘要',
    '摘要',
    '新增伏笔',
    '伏笔',
    '下一章建议',
    '后续建议',
  ]

  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const nextLabels = allLabels.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    const pattern = new RegExp(`${escaped}\\s*[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextLabels})\\s*[：:]|$)`, 'i')
    const match = source.match(pattern)
    if (match?.[1]?.trim()) return match[1].trim()
  }
  return ''
}
