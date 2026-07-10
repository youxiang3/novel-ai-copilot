'use client'

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Cloud,
  Download,
  FileDown,
  FileText,
  Globe2,
  HardDrive,
  Loader2,
  Monitor,
  Moon,
  Palette,
  RefreshCcw,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
  Upload,
} from 'lucide-react'
import type { AppearanceSettings, AppTheme, ExportFormat, ExportScope, ModelProvider, ModelSettings, SavedWork } from './types'
import { cn } from '@/lib/utils'

const modelStorageKey = 'yixie-model-settings-v1'
const appearanceStorageKey = 'yixie-appearance-settings-v1'
const backupStorageKey = 'yixie-local-backup-records-v1'
const backendApiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

const defaultModelSettings: ModelSettings = {
  generationMode: 'web-ai',
  provider: 'OpenAI',
  baseUrl: 'https://api.openai.com/v1',
  modelName: 'gpt-4o',
  apiKey: '',
  routeMode: 'unified',
  taskModels: {
    creation: 'gpt-4o',
    memory: 'gpt-4o-mini',
    check: 'gpt-4o-mini',
    agent: 'gpt-4o',
  },
  webAiSites: ['chatgpt.com', 'chat.deepseek.com', 'gemini.google.com', 'claude.ai'],
  promptInjection: 'auto',
  pasteStrength: 'standard',
  fallbackReasons: ['请求超时', '服务不可用', '配额不足', '内容安全拦截', 'API Key 未配置', '用户未登录'],
}

const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'blue',
  sidebarCollapsed: false,
  density: 'comfortable',
  contentMode: 'card',
  editorFont: '思源宋体 (Source Han Serif)',
  editorFontSize: 16,
  lineHeight: 1.75,
  maxWidth: 750,
  focusMode: false,
  typewriterScroll: false,
  grammarCheck: true,
  animationLevel: 'medium',
  autosaveInterval: '30s',
  historyRetention: '30d',
}

const providerDefaults: Record<ModelProvider, { baseUrl: string; model: string }> = {
  OpenAI: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  DeepSeek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  Gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-pro' },
  OpenRouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o' },
  Custom: { baseUrl: '', model: '' },
}

const themeCards: Array<{ id: AppTheme; title: string; text: string; className: string }> = [
  { id: 'blue', title: '默认蓝', text: '清爽专注', className: 'from-blue-50 to-white text-blue-700' },
  { id: 'green', title: '护眼绿', text: '低刺激阅读', className: 'from-emerald-50 to-white text-emerald-700' },
  { id: 'paper', title: '暖纸模式', text: '长时间写作', className: 'from-amber-50 to-white text-amber-700' },
  { id: 'dark', title: '深色夜写', text: '夜间创作', className: 'from-slate-900 to-slate-700 text-white' },
]

export function ModelSettingsPage({ token = '', isGuest = true, onRequireLogin }: { token?: string; isGuest?: boolean; onRequireLogin?: () => void }) {
  const [settings, setSettings] = useState<ModelSettings>(defaultModelSettings)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [newSite, setNewSite] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(modelStorageKey)
    if (saved) setSettings({ ...defaultModelSettings, ...JSON.parse(saved) })
  }, [])

  function update(patch: Partial<ModelSettings>) {
    setSettings((current) => ({ ...current, ...patch }))
  }

  function selectProvider(provider: ModelProvider) {
    const defaults = providerDefaults[provider]
    update({ provider, baseUrl: defaults.baseUrl, modelName: defaults.model })
  }

  async function testConnection() {
    setStatus('loading')
    setMessage('正在测试连接...')

    if (settings.generationMode === 'local') {
      flash('success', '本地体验可用：结果来自本地规则，不是真实 AI。')
      return
    }

    if (isGuest || !token) {
      flash('error', '测试真实模型需要先登录，并连接后端模型配置。')
      onRequireLogin?.()
      return
    }

    if (settings.generationMode === 'api' && !settings.apiKey.trim()) {
      flash('error', '连接失败：API Key 未配置。')
      return
    }

    try {
      const response = await fetch(`${backendApiBase}/api/model-config/test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toBackendModelConfig(settings)),
      })
      const result = await response.json() as { code: number; message: string; data?: string }
      if (!response.ok || result.code !== 200) {
        throw new Error(result.message || `HTTP ${response.status}`)
      }
      flash(result.data?.startsWith('测试失败') ? 'error' : 'success', result.data || '连接测试通过。')
    } catch (error) {
      flash('error', `连接失败：${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async function saveSettings() {
    localStorage.setItem(modelStorageKey, JSON.stringify(settings))
    if (isGuest || !token) {
      flash('success', '模型设置已保存到本地。登录后可同步到后端并供智能助手调用。')
      return
    }
    if (settings.generationMode === 'api' && !settings.apiKey.trim()) {
      flash('error', 'API 直连模式需要填写 API Key 后才能保存到后端。')
      return
    }
    try {
      const response = await fetch(`${backendApiBase}/api/model-config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toBackendModelConfig(settings)),
      })
      const result = await response.json() as { code: number; message: string }
      if (!response.ok || result.code !== 200) {
        throw new Error(result.message || `HTTP ${response.status}`)
      }
      flash('success', '模型设置已保存到本地和后端，智能助手可使用该模型配置。')
    } catch (error) {
      flash('error', `本地已保存，但后端保存失败：${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  function flash(nextStatus: typeof status, nextMessage: string) {
    setStatus(nextStatus)
    setMessage(nextMessage)
    window.setTimeout(() => {
      setStatus('idle')
      setMessage('')
    }, 2200)
  }

  function addSite() {
    if (!newSite.trim()) return
    update({ webAiSites: Array.from(new Set([...settings.webAiSites, newSite.trim()])) })
    setNewSite('')
  }

  return (
    <div className="yixie-editorial grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_300px] gap-6 bg-[#edf1ee] p-8">
      <section className="min-w-0">
        <h1 className="text-3xl font-semibold">模型设置</h1>
        <p className="mt-2 text-slate-600">配置 AI 生成方式与模型路由策略，系统会按规则选择最合适的生成方式。</p>
        <StatusBanner status={status} message={message} />

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">选择生成模式</h2>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <ModeCard active={settings.generationMode === 'local'} icon={HardDrive} title="本地体验" text="使用本地规则和 fallback，不是真实 AI。" onClick={() => update({ generationMode: 'local' })} />
            <ModeCard active={settings.generationMode === 'web-ai'} icon={Globe2} title="Web AI" text="生成 Prompt，复制到网页 AI 使用。" onClick={() => update({ generationMode: 'web-ai' })} />
            <ModeCard active={settings.generationMode === 'api'} icon={Cloud} title="API 直连" text="配置自己的 API Key，在易写内调用。" onClick={() => update({ generationMode: 'api' })} />
          </div>
        </section>

        <div className="mt-5 grid grid-cols-[240px_minmax(0,1fr)] gap-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold">选择 Provider</h2>
            <div className="mt-4 space-y-2">
              {(['OpenAI', 'DeepSeek', 'Gemini', 'OpenRouter', 'Custom'] as ModelProvider[]).map((provider) => (
                <button key={provider} onClick={() => selectProvider(provider)} className={cn('flex w-full items-center justify-between rounded-md border px-3 py-3 text-sm', settings.provider === provider ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50')}>
                  {provider}
                  <span className="text-xs">{provider === settings.provider ? '当前' : '未选'}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">API 配置</h2>
              <div className="flex gap-2">
                <button onClick={testConnection} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">
                  {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  测试连接
                </button>
                <button onClick={saveSettings} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                  <Save className="h-4 w-4" />
                  保存配置
                </button>
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              <Field label="Base URL" value={settings.baseUrl} onChange={(value) => update({ baseUrl: value })} placeholder="https://api.openai.com/v1" />
              <Field label="Model Name" value={settings.modelName} onChange={(value) => update({ modelName: value })} placeholder="gpt-4o / deepseek-chat" />
              <Field label="API Key" value={settings.apiKey} onChange={(value) => update({ apiKey: value })} placeholder={token ? '保存后加密写入后端' : '登录后可保存到后端'} type="password" />
            </div>
          </section>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">模型路由策略</h2>
            <RadioRow checked={settings.routeMode === 'unified'} title="统一使用当前模型" text="创作、记忆、检查、Agent 都使用当前选择的模型。" onClick={() => update({ routeMode: 'unified' })} />
            <RadioRow checked={settings.routeMode === 'by-task'} title="按任务分别配置模型" text="为不同任务选择更适合的模型。" onClick={() => update({ routeMode: 'by-task' })} />
            <div className="mt-4 grid gap-3">
              {Object.entries(settings.taskModels).map(([key, value]) => (
                <Field key={key} label={taskLabel(key)} value={value} onChange={(next) => update({ taskModels: { ...settings.taskModels, [key]: next } })} />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Web AI 设置</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {settings.webAiSites.map((site) => (
                <span key={site} className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700">{site}</span>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input value={newSite} onChange={(event) => setNewSite(event.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none" placeholder="新增自定义网站" />
              <button onClick={addSite} className="rounded-md border border-slate-200 px-3 text-sm hover:bg-slate-50">添加</button>
            </div>
            <Segment label="Prompt 注入策略" value={settings.promptInjection} options={[['auto', '自动优化（推荐）'], ['safe', '保守模式'], ['custom', '自定义']]} onChange={(value) => update({ promptInjection: value as ModelSettings['promptInjection'] })} />
            <Segment label="网页端粘贴强度" value={settings.pasteStrength} options={[['standard', '标准'], ['enhanced', '增强'], ['extreme', '极速']]} onChange={(value) => update({ pasteStrength: value as ModelSettings['pasteStrength'] })} />
          </section>
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">用量概览</h2>
          <div className="mt-5 rounded-full border-[10px] border-blue-100 p-7 text-center">
            <div className="text-3xl font-semibold text-blue-600">32%</div>
            <div className="text-xs text-slate-500">已使用</div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">当前为前端展示数据，后续可接真实计费/额度接口。</p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">回退策略</h2>
          <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm font-medium">API 直连失败 → Web AI Prompt → 本地体验 fallback</div>
          <div className="mt-4 space-y-2">
            {settings.fallbackReasons.map((reason) => (
              <div key={reason} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                {reason}
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  )
}

export function AppearanceSettingsPage() {
  const [settings, setSettings] = useState<AppearanceSettings>(defaultAppearanceSettings)
  const [status, setStatus] = useState<'idle' | 'success'>('idle')

  useEffect(() => {
    const saved = localStorage.getItem(appearanceStorageKey)
    if (saved) setSettings({ ...defaultAppearanceSettings, ...JSON.parse(saved) })
  }, [])

  function update(patch: Partial<AppearanceSettings>) {
    setSettings((current) => ({ ...current, ...patch }))
  }

  function saveSettings() {
    localStorage.setItem(appearanceStorageKey, JSON.stringify(settings))
    localStorage.setItem('yixie-app-shell-collapsed', String(settings.sidebarCollapsed))
    window.dispatchEvent(new Event('yixie-shell-collapsed-change'))
    window.dispatchEvent(new Event('yixie-appearance-change'))
    document.documentElement.dataset.yixieTheme = settings.theme
    setStatus('success')
    window.setTimeout(() => setStatus('idle'), 1800)
  }

  return (
    <div className="yixie-editorial grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_520px] gap-6 bg-[#edf1ee] p-8">
      <section className="min-w-0 space-y-5">
        <div>
          <h1 className="text-3xl font-semibold">外观与写作偏好设置</h1>
          <p className="mt-2 text-slate-600">自定义易写的主题、编辑器字体、布局密度和自动保存偏好。</p>
        </div>
        {status === 'success' && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/30 p-6 backdrop-blur-sm">
            <section className="w-full max-w-sm rounded-lg border border-white/70 bg-white p-6 text-center shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-600">✓</div>
              <h2 className="mt-4 text-xl font-semibold text-slate-950">保存成功</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">外观与写作偏好已保存，主题已应用到当前界面。</p>
            </section>
          </div>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">主题外观</h2>
          <div className="mt-4 grid grid-cols-4 gap-4">
            {themeCards.map((theme) => (
              <button key={theme.id} onClick={() => update({ theme: theme.id })} className={cn('rounded-lg border p-3 text-left', settings.theme === theme.id ? 'border-blue-500 ring-4 ring-blue-100' : 'border-slate-200')}>
                <div className={cn('h-24 rounded-md bg-gradient-to-br p-3', theme.className)}>
                  <div className="text-lg font-semibold">Aa</div>
                  <div className="mt-3 h-2 rounded bg-current opacity-20" />
                  <div className="mt-2 h-2 w-2/3 rounded bg-current opacity-20" />
                </div>
                <div className="mt-3 text-sm font-semibold">{theme.title}</div>
                <div className="text-xs text-slate-500">{theme.text}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">界面与布局</h2>
          <div className="mt-4 grid grid-cols-2 gap-5">
            <Toggle label="侧边栏默认折叠" checked={settings.sidebarCollapsed} onChange={(value) => update({ sidebarCollapsed: value })} />
            <Segment label="布局密度" value={settings.density} options={[['comfortable', '舒适'], ['compact', '紧凑']]} onChange={(value) => update({ density: value as AppearanceSettings['density'] })} />
            <Segment label="内容展示模式" value={settings.contentMode} options={[['card', '卡片视图'], ['list', '列表视图']]} onChange={(value) => update({ contentMode: value as AppearanceSettings['contentMode'] })} />
            <Segment label="动画效果强度" value={settings.animationLevel} options={[['off', '关闭'], ['low', '低'], ['medium', '中'], ['high', '高']]} onChange={(value) => update({ animationLevel: value as AppearanceSettings['animationLevel'] })} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">编辑器偏好</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="编辑器字体" value={settings.editorFont} onChange={(value) => update({ editorFont: value })} />
            <NumberField label="编辑器字号" value={settings.editorFontSize} suffix="px" onChange={(value) => update({ editorFontSize: value })} />
            <NumberField label="行间距" value={settings.lineHeight} step={0.05} onChange={(value) => update({ lineHeight: value })} />
            <NumberField label="段落最大宽度" value={settings.maxWidth} suffix="px" onChange={(value) => update({ maxWidth: value })} />
            <Toggle label="专注模式" checked={settings.focusMode} onChange={(value) => update({ focusMode: value })} />
            <Toggle label="打字机滚动" checked={settings.typewriterScroll} onChange={(value) => update({ typewriterScroll: value })} />
            <Toggle label="拼写与语法检查占位" checked={settings.grammarCheck} onChange={(value) => update({ grammarCheck: value })} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">自动保存与版本</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Segment label="自动保存间隔" value={settings.autosaveInterval} options={[['10s', '10 秒'], ['30s', '30 秒'], ['1m', '1 分钟'], ['off', '关闭']]} onChange={(value) => update({ autosaveInterval: value as AppearanceSettings['autosaveInterval'] })} />
            <Segment label="保留历史版本" value={settings.historyRetention} options={[['7d', '7 天'], ['30d', '30 天'], ['forever', '永久']]} onChange={(value) => update({ historyRetention: value as AppearanceSettings['historyRetention'] })} />
          </div>
        </section>
      </section>

      <aside className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">实时预览</h2>
            <div className="flex gap-2">
              <button className="rounded-md border border-blue-300 bg-blue-50 p-2 text-blue-600"><Monitor className="h-4 w-4" /></button>
              <button className="rounded-md border border-slate-200 p-2 text-slate-500"><Smartphone className="h-4 w-4" /></button>
            </div>
          </div>
          <Preview settings={settings} />
        </section>
        <section className="rounded-lg border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-700">
          <ShieldCheck className="mr-2 inline h-4 w-4" />
          游客设置仅保存在本地浏览器；登录后可预留云端同步接口。
        </section>
        <div className="flex justify-end gap-3">
          <button onClick={() => setSettings(defaultAppearanceSettings)} className="rounded-md border border-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-slate-50">恢复默认</button>
          <button onClick={saveSettings} className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">保存设置</button>
        </div>
      </aside>
    </div>
  )
}

export function ExportCenterPage({
  work,
  token = '',
  isGuest,
  onRequireLogin,
  onRestoreWork,
  onCloudSyncWork,
}: {
  work: SavedWork | null
  token?: string
  isGuest: boolean
  onRequireLogin: () => void
  onRestoreWork?: (work: SavedWork) => void
  onCloudSyncWork?: (work: SavedWork) => void
}) {
  const [tab, setTab] = useState<'export' | 'backup' | 'publish'>('export')
  const [format, setFormat] = useState<ExportFormat>('txt')
  const [scope, setScope] = useState<ExportScope>('current')
  const [includeCover, setIncludeCover] = useState(true)
  const [includeTitle, setIncludeTitle] = useState(true)
  const [includeInfo, setIncludeInfo] = useState(false)
  const [generateToc, setGenerateToc] = useState(true)
  const [noteMode, setNoteMode] = useState<'all' | 'body' | 'footnote'>('all')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [backupRecords, setBackupRecords] = useState<string[]>([])
  const [cloudSnapshots, setCloudSnapshots] = useState<CloudWorkSnapshot[]>([])
  const [publishDraft, setPublishDraft] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const exportWork = work

  useEffect(() => {
    const saved = localStorage.getItem(backupStorageKey)
    if (saved) setBackupRecords(JSON.parse(saved))
  }, [])

  const exportText = useMemo(() => exportWork ? buildExportContent(exportWork, format, { includeTitle, includeInfo, generateToc }) : '', [exportWork, format, generateToc, includeInfo, includeTitle])

  function flash(nextStatus: typeof status, nextMessage: string) {
    setStatus(nextStatus)
    setMessage(nextMessage)
    if (nextStatus === 'success') {
      window.setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 1800)
    }
  }

  function downloadExport() {
    if (!exportWork) {
      flash('error', '请先新建或打开一个作品，再导出当前作品内容。')
      return
    }
    if (format === 'more') {
      flash('error', '更多格式仍在规划中。当前可导出 TXT、Markdown、DOCX、PDF 打印版和 EPUB。')
      return
    }
    setStatus('loading')
    setMessage('正在生成导出文件...')
    window.setTimeout(() => {
      const filename = buildLocalExportFilename(exportWork.title, format)
      if (format === 'txt') {
        downloadFile(filename, exportText, 'text/plain;charset=utf-8')
      } else if (format === 'markdown') {
        downloadFile(filename, exportText, 'text/markdown;charset=utf-8')
      } else if (format === 'docx') {
        downloadBlob(filename, buildDocxBlob(exportWork, { includeTitle, includeInfo, generateToc }), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      } else if (format === 'epub') {
        downloadBlob(filename, buildEpubBlob(exportWork, { includeTitle, includeInfo, generateToc }), 'application/epub+zip')
      } else if (format === 'pdf') {
        openPrintableExport(exportWork, { includeTitle, includeInfo, generateToc })
      }
      flash('success', `${formatLabel(format)} 已生成。当前导出来自本地保存数据，不会修改作品。`)
    }, 500)
  }

  function downloadBackup() {
    if (!exportWork) {
      flash('error', '请先新建或打开一个作品，再下载本地备份。')
      return
    }
    const payload = {
      version: 'yixie-backup-v1',
      exportedAt: new Date().toISOString(),
      work: exportWork,
      settings: {
        model: readJson(modelStorageKey),
        appearance: readJson(appearanceStorageKey),
      },
    }
    downloadFile(`yixie-backup-${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
    const next = [`本地备份：${new Date().toLocaleString()}`, ...backupRecords].slice(0, 6)
    setBackupRecords(next)
    localStorage.setItem(backupStorageKey, JSON.stringify(next))
    flash('success', '完整作品数据 JSON 已下载。')
  }

  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = parseImportedBackup(String(reader.result))
        if (!imported) {
          flash('error', '导入失败：没有找到可恢复的作品数据。')
          return
        }
        if (!onRestoreWork) {
          flash('error', '导入失败：当前页面没有接入作品恢复入口。')
          return
        }
        onRestoreWork(imported)
        const next = [`导入恢复：${imported.title} · ${new Date().toLocaleString()}`, ...backupRecords].slice(0, 6)
        setBackupRecords(next)
        localStorage.setItem(backupStorageKey, JSON.stringify(next))
        flash('success', `已从备份恢复为新的本地作品：${imported.title}`)
      } catch {
        flash('error', '导入失败：不是有效 JSON 备份文件。')
      } finally {
        event.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  async function uploadCloudBackup() {
    if (!exportWork) {
      flash('error', '请先新建或打开一个作品，再进行云端备份。')
      return
    }
    if (isGuest || !token) {
      onRequireLogin()
      return
    }
    setStatus('loading')
    setMessage('正在写入后端作品快照...')
    try {
      const response = await fetch(`${backendApiBase}/api/work-library`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildCloudBackupPayload(exportWork)),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || result?.code !== 200) {
        throw new Error(result?.message || `HTTP ${response.status}`)
      }
      if (result?.data) {
        onCloudSyncWork?.(mergeCloudSyncResult(exportWork, result.data as CloudSyncResponse))
      }
      const next = [`云端快照：${exportWork.title} · ${new Date().toLocaleString()}`, ...backupRecords].slice(0, 6)
      setBackupRecords(next)
      localStorage.setItem(backupStorageKey, JSON.stringify(next))
      flash('success', '云端作品快照已更新。你仍可以下载本地 JSON 作为离线备份。')
    } catch (error) {
      const reason = error instanceof Error ? error.message : '后端不可用'
      flash('error', `云端备份失败：${reason}。本地作品未丢失，可先下载 JSON 备份。`)
    }
  }

  async function fetchCloudSnapshots() {
    if (isGuest || !token) {
      onRequireLogin()
      return []
    }
    setStatus('loading')
    setMessage('正在读取后端作品快照...')
    try {
      const response = await fetch(`${backendApiBase}/api/work-library/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || result?.code !== 200 || !Array.isArray(result?.data)) {
        throw new Error(result?.message || `HTTP ${response.status}`)
      }
      if (result.data.length === 0) {
        setCloudSnapshots([])
        flash('error', '云端还没有版本历史。请先写入一次云端备份。')
        return []
      }
      const snapshots = [...result.data].sort(compareCloudSnapshotUpdatedAt) as CloudWorkSnapshot[]
      setCloudSnapshots(snapshots)
      flash('success', `已读取 ${snapshots.length} 个云端版本。`)
      return snapshots
    } catch (error) {
      const reason = error instanceof Error ? error.message : '后端不可用'
      flash('error', `读取云端版本失败：${reason}。本地作品未被修改。`)
      return []
    }
  }

  function restoreCloudSnapshot(snapshot: CloudWorkSnapshot) {
    if (!onRestoreWork) {
      flash('error', '当前页面没有接入作品恢复入口。')
      return
    }
    const restored = parseCloudSnapshot(snapshot)
    if (!restored) {
      flash('error', '云端快照解析失败：没有找到可恢复的作品数据。')
      return
    }
    onRestoreWork(restored)
    const next = [`云端恢复：${restored.title} · ${new Date().toLocaleString()}`, ...backupRecords].slice(0, 6)
    setBackupRecords(next)
    localStorage.setItem(backupStorageKey, JSON.stringify(next))
    flash('success', `已从云端快照恢复为新的本地作品：${restored.title}`)
  }

  async function restoreLatestCloudBackup() {
    const snapshots = cloudSnapshots.length > 0 ? cloudSnapshots : await fetchCloudSnapshots()
    const latest = snapshots[0]
    if (latest) {
      restoreCloudSnapshot(latest)
    }
  }

  function platformPublishNotice() {
    if (isGuest) onRequireLogin()
    else flash('success', '发布平台授权未接入。当前可先生成简介、标签和章节文案，再手动发布。')
  }

  function generatePublishDraft(kind: 'intro' | 'tags') {
    if (!exportWork) {
      flash('error', '请先新建或打开一个作品，再生成发布准备内容。')
      return
    }
    const draft = kind === 'tags' ? buildPublishTags(exportWork) : buildPublishIntro(exportWork)
    setPublishDraft(draft)
    flash('success', kind === 'tags' ? '发布标签已生成，可在右侧复制使用。' : '发布简介已生成，可在右侧复制使用。')
  }

  function copyPublishDraft() {
    if (!publishDraft.trim()) {
      flash('error', '请先生成发布简介或标签。')
      return
    }
    navigator.clipboard?.writeText(publishDraft)
    flash('success', '发布准备内容已复制。')
  }

  return (
    <div className="yixie-editorial grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_320px] gap-6 bg-[#edf1ee] p-8">
      <section className="min-w-0">
        <h1 className="text-3xl font-semibold">导出 / 备份 / 发布中心</h1>
        <p className="mt-2 text-slate-600">一站式管理作品导出、本地备份和发布前准备工具。</p>
        <StatusBanner status={status} message={message} />

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-3 border-b border-slate-200 text-sm font-semibold">
            <TabButton active={tab === 'export'} icon={Download} label="导出" onClick={() => setTab('export')} />
            <TabButton active={tab === 'backup'} icon={Archive} label="备份" onClick={() => setTab('backup')} />
            <TabButton active={tab === 'publish'} icon={Send} label="发布" onClick={() => setTab('publish')} />
          </div>

          {tab === 'export' && (
            <div className="grid grid-cols-[minmax(0,1fr)_420px] gap-6 p-6">
              <section>
                <h2 className="font-semibold">1. 选择导出格式</h2>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {(['txt', 'docx', 'pdf', 'markdown', 'epub', 'more'] as ExportFormat[]).map((item) => (
                    <button key={item} onClick={() => setFormat(item)} className={cn('rounded-md border p-4 text-left', format === item ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50')}>
                      <FileDown className="mb-3 h-6 w-6" />
                      <div className="font-semibold">{formatLabel(item)}</div>
                      <div className="mt-1 text-xs text-slate-500">{item === 'more' ? '后续扩展' : item === 'pdf' ? '打印另存' : '本地可导出'}</div>
                    </button>
                  ))}
                </div>

                <h2 className="mt-6 font-semibold">2. 导出设置</h2>
                <div className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200">
                  <SettingRow label="导出范围">
                    <Segment value={scope} options={[['current', '当前章节'], ['selected', '选定章节'], ['all', '整部作品']]} onChange={(value) => setScope(value as ExportScope)} compact />
                  </SettingRow>
                  <SettingRow label="封面设置"><Toggle checked={includeCover} onChange={setIncludeCover} /></SettingRow>
                  <SettingRow label="包含章节标题"><Toggle checked={includeTitle} onChange={setIncludeTitle} /></SettingRow>
                  <SettingRow label="包含作品信息页"><Toggle checked={includeInfo} onChange={setIncludeInfo} /></SettingRow>
                  <SettingRow label="生成目录"><Toggle checked={generateToc} onChange={setGenerateToc} /></SettingRow>
                  <SettingRow label="注释处理">
                    <Segment value={noteMode} options={[['all', '包含批注'], ['body', '仅正文'], ['footnote', '脚注']]} onChange={(value) => setNoteMode(value as typeof noteMode)} compact />
                  </SettingRow>
                </div>
                <button onClick={downloadExport} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">
                  <Download className="h-4 w-4" />
                  立即导出
                </button>
              </section>

              {exportWork ? <ExportPreview work={exportWork} format={format} scope={scope} /> : <NoCurrentWork />}
            </div>
          )}

          {tab === 'backup' && (
            <div className="grid grid-cols-2 gap-6 p-6">
              <ActionPanel icon={HardDrive} title="备份到本地" text="下载完整作品数据 JSON，包含作品、章节、资料、记忆、检查结果和设置偏好。" action="下载 JSON 备份" onClick={downloadBackup} />
              <ActionPanel icon={Upload} title="导入备份文件" text="选择本地 JSON 备份文件，恢复为新的本地作品；不会覆盖当前作品。" action="选择文件" onClick={() => fileInputRef.current?.click()} />
              <ActionPanel icon={Cloud} title="云端备份" text="登录后写入后端作品快照，包含作品资料和章节正文；失败时仍保留本地备份入口。" action={status === 'loading' ? '备份中' : '写入云端快照'} onClick={uploadCloudBackup} />
              <ActionPanel icon={RefreshCcw} title="从云端恢复" text="读取当前账号最近的后端作品快照，恢复为新的本地副本；不会覆盖当前作品。" action={status === 'loading' ? '读取中' : '恢复最新快照'} onClick={restoreLatestCloudBackup} />
              <ActionPanel icon={Cloud} title="查看云端版本" text="列出当前账号已保存的后端版本历史，可选择其中一份恢复为本地副本。" action={status === 'loading' ? '读取中' : '查看列表'} onClick={fetchCloudSnapshots} />
              <ActionPanel icon={RefreshCcw} title="最近备份记录" text={backupRecords.join('\n') || '暂无备份记录。'} action="刷新记录" onClick={() => flash('success', '备份记录已刷新。')} />
              {cloudSnapshots.length > 0 && (
                <section className="col-span-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">云端版本历史</h3>
                      <p className="mt-1 text-sm text-slate-500">选择一份历史版本恢复为新的本地作品，不覆盖当前作品。</p>
                    </div>
                    <button onClick={fetchCloudSnapshots} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">刷新</button>
                  </div>
                  <div className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200">
                    {cloudSnapshots.map((snapshot) => (
                      <div key={snapshot.versionId || `${snapshot.frontendWorkId}-${snapshot.updatedAt || snapshot.createdAt}`} className="flex items-center justify-between gap-4 p-4">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">{cloudSnapshotTitle(snapshot)}</div>
                          <div className="mt-1 text-xs text-slate-500">{cloudSnapshotMeta(snapshot)}</div>
                        </div>
                        <button onClick={() => restoreCloudSnapshot(snapshot)} className="shrink-0 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">恢复副本</button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={importBackup} />
            </div>
          )}

          {tab === 'publish' && (
            <div className="grid grid-cols-2 gap-6 p-6">
              <ActionPanel icon={Send} title="发布到自定义平台" text="暂不自动发文；先生成可复制的平台简介、标签和章节摘要，作者手动发布。" action="准备文案" onClick={platformPublishNotice} />
              <ActionPanel icon={FileText} title="生成发布简介" text="根据当前作品资料和章节正文，生成可复制的简介、章节摘要和推广语。" action="生成简介" onClick={() => generatePublishDraft('intro')} />
              <ActionPanel icon={Palette} title="生成标签" text="输出适合平台检索的题材、角色、风格标签。" action="生成标签" onClick={() => generatePublishDraft('tags')} />
              <ActionPanel icon={AlertTriangle} title="发布须知" text="不会接入起点、番茄、晋江等真实平台；不会自动发文。" action="知道了" onClick={() => flash('success', '发布中心当前仅作为准备工具。')} />
              <section className="col-span-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">发布准备草稿</h3>
                    <p className="mt-1 text-sm text-slate-500">本地生成，不会自动发布到任何平台。</p>
                  </div>
                  <button onClick={copyPublishDraft} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">复制</button>
                </div>
                <pre className="mt-4 min-h-[180px] whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  {publishDraft || '生成发布简介或标签后，会显示在这里。'}
                </pre>
              </section>
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">导出摘要</h2>
          <div className="mt-4 flex gap-3">
            <div className="h-20 w-20 rounded-md bg-gradient-to-br from-amber-300 to-slate-800" />
            <div className="min-w-0">
              <div className="font-semibold">{exportWork?.title ?? '尚未选择作品'}</div>
              <div className="mt-1 text-sm text-slate-500">{exportWork?.type ?? '请先从首页打开作品'}</div>
              <div className="mt-1 text-sm text-slate-500">作者：易写用户</div>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <SummaryRow label="导出范围" value={scope === 'current' ? '当前章节' : scope === 'selected' ? '选定章节' : '整部作品'} />
            <SummaryRow label="预计字数" value={exportWork ? `${exportWork.chapterText.replace(/\s/g, '').length.toLocaleString()} 字` : '未选择'} />
            <SummaryRow label="预计页数" value={format === 'pdf' ? '由浏览器打印预览估算' : '约 1 页'} />
            <SummaryRow label="文件大小" value={format === 'txt' ? '约 8 KB' : '按格式估算'} />
          </dl>
        </section>
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          <div className="font-semibold">导出须知</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>TXT / Markdown / DOCX / EPUB 为本地文件导出。</li>
            <li>PDF 使用浏览器打印版，可在打印面板中另存为 PDF。</li>
            <li>游客只支持本地导出和本地备份。</li>
          </ul>
        </section>
      </aside>
    </div>
  )
}

function ModeCard({ active, icon: Icon, title, text, onClick }: { active: boolean; icon: typeof HardDrive; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('rounded-lg border p-5 text-left transition', active ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100' : 'border-slate-200 hover:bg-slate-50')}>
      <Icon className="h-7 w-7 text-blue-600" />
      <div className="mt-3 font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </button>
  )
}

function Field({ label, value, onChange, placeholder = '', type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="h-10 rounded-md border border-slate-200 px-3 outline-none ring-blue-500/15 focus:ring-4" placeholder={placeholder} />
    </label>
  )
}

function NumberField({ label, value, onChange, suffix, step = 1 }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; step?: number }) {
  return (
    <label className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="flex items-center gap-2">
        <input value={value} onChange={(event) => onChange(Number(event.target.value))} type="number" step={step} className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 outline-none" />
        {suffix && <span className="text-slate-500">{suffix}</span>}
      </span>
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm hover:bg-slate-50">
      {label && <span>{label}</span>}
      <span className={cn('relative h-6 w-11 rounded-full transition', checked ? 'bg-blue-600' : 'bg-slate-200')}>
        <span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  )
}

function Segment({ label, value, options, onChange, compact = false }: { label?: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void; compact?: boolean }) {
  return (
    <div className={cn(!compact && 'mt-4')}>
      {label && <div className="mb-2 text-sm font-medium text-slate-600">{label}</div>}
      <div className="flex flex-wrap gap-2">
        {options.map(([key, text]) => (
          <button key={key} onClick={() => onChange(key)} className={cn('rounded-md border px-3 py-2 text-sm', value === key ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white hover:bg-slate-50')}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function RadioRow({ checked, title, text, onClick }: { checked: boolean; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-4 flex w-full items-start gap-3 rounded-md p-2 text-left hover:bg-slate-50">
      <span className={cn('mt-1 h-4 w-4 rounded-full border', checked ? 'border-blue-600 bg-blue-600 ring-4 ring-blue-100' : 'border-slate-300')} />
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{text}</span>
      </span>
    </button>
  )
}

function StatusBanner({ status, message }: { status: 'idle' | 'loading' | 'success' | 'error'; message: string }) {
  if (!message) return null
  if (status === 'success' || status === 'error') {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/30 p-6 backdrop-blur-sm">
        <section className="w-full max-w-sm rounded-lg border border-white/70 bg-white p-6 text-center shadow-2xl">
          <div className={cn('mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold', status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600')}>
            {status === 'success' ? '✓' : '!'}
          </div>
          <h2 className="mt-4 text-xl font-semibold text-slate-950">{status === 'success' ? '操作成功' : '操作失败'}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        </section>
      </div>
    )
  }
  return (
    <div className="mt-5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
      {status === 'loading' && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
      {message}
    </div>
  )
}

function Preview({ settings }: { settings: AppearanceSettings }) {
  const theme = themeCards.find((item) => item.id === settings.theme) ?? themeCards[0]
  return (
    <div className={cn('mt-4 overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br', theme.className)}>
      <div className="flex h-14 items-center justify-between border-b border-current/10 px-5">
        <div className="font-semibold">未命名作品</div>
        <div className="rounded-full bg-white/50 px-3 py-1 text-xs">已自动保存</div>
      </div>
      <div className="p-8">
        <div className="text-2xl font-semibold" style={{ fontFamily: settings.editorFont, fontSize: settings.editorFontSize + 8, lineHeight: 1.2 }}>在文字的深处，遇见更好的自己</div>
        <p className="mt-6 max-w-[var(--preview-width)] leading-[var(--preview-leading)]" style={{ ['--preview-width' as string]: `${settings.maxWidth}px`, ['--preview-leading' as string]: settings.lineHeight }}>
          写作，是一场与自己的对话。易写致力于为每一位创作者提供沉浸、专注且高效的写作体验。
        </p>
        {settings.focusMode && <div className="mt-8 rounded-md bg-black/10 px-3 py-2 text-sm">专注模式：弱化无关元素</div>}
      </div>
    </div>
  )
}

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Download; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('inline-flex items-center justify-center gap-2 border-b-2 px-4 py-4', active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900')}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-4 px-4 py-4 text-sm">
      <span className="text-slate-600">{label}</span>
      <div>{children}</div>
    </div>
  )
}

function NoCurrentWork() {
  return (
    <section className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <FileText className="h-10 w-10 text-slate-300" />
      <h2 className="mt-4 font-semibold text-slate-900">尚未选择作品</h2>
      <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
        请先从首页新建或打开一个临时草稿 / 正式作品，再回到这里导出当前章节内容。
      </p>
    </section>
  )
}

function ExportPreview({ work, format, scope }: { work: SavedWork; format: ExportFormat; scope: ExportScope }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">预览</h2>
        <span className="text-xs text-slate-500">{formatLabel(format)} · {scope === 'all' ? '整部作品' : '当前章节'}</span>
      </div>
      <div className="mt-4 max-h-[520px] overflow-y-auto rounded-md border border-slate-200 bg-white p-5">
        <h3 className="text-xl font-semibold">{work.chapterTitle}</h3>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{work.chapterText.slice(0, 700)}</p>
      </div>
      <p className="mt-3 text-xs text-slate-500">预览为前端估算效果，真实排版以后续格式生成器为准。</p>
    </section>
  )
}

function ActionPanel({ icon: Icon, title, text, action, onClick }: { icon: typeof HardDrive; title: string; text: string; action: string; onClick: () => void }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <Icon className="h-7 w-7 text-blue-600" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{text}</p>
      <button onClick={onClick} className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">{action}</button>
    </section>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function formatLabel(format: ExportFormat) {
  return ({ txt: 'TXT', markdown: 'Markdown', docx: 'DOCX', pdf: 'PDF', epub: 'EPUB', more: '更多格式' } as Record<ExportFormat, string>)[format]
}

function toBackendModelConfig(settings: ModelSettings) {
  return {
    provider: settings.provider.toLowerCase(),
    baseUrl: settings.baseUrl,
    model: settings.modelName,
    apiKey: settings.apiKey,
  }
}

function taskLabel(key: string) {
  return ({ creation: '创作模型', memory: '记忆模型', check: '检查模型', agent: 'Agent 模型' } as Record<string, string>)[key] ?? key
}

function buildExportContent(work: SavedWork, format: ExportFormat, options: { includeTitle: boolean; includeInfo: boolean; generateToc: boolean }) {
  const lines: string[] = []
  if (options.includeInfo) lines.push(`# ${work.title}`, '', `类型：${work.type}`, `字数：${work.words}`, '')
  if (options.generateToc) lines.push(format === 'markdown' ? '## 目录' : '目录', `- ${work.chapterTitle}`, '')
  if (options.includeTitle) lines.push(format === 'markdown' ? `## ${work.chapterTitle}` : work.chapterTitle, '')
  lines.push(work.chapterText)
  return lines.join('\n')
}

function buildCloudBackupPayload(work: SavedWork) {
  const chapters = (work.chapters && work.chapters.length > 0
    ? work.chapters
    : [{
        id: 'chapter-1',
        chapterNumber: 1,
        title: work.chapterTitle || '第一章：未命名章节',
        content: work.chapterText || '',
        status: 'draft' as const,
        wordCount: (work.chapterText || '').replace(/\s/g, '').length,
      }]
  ).map((chapter, index) => ({
    frontendChapterId: chapter.id || `chapter-${index + 1}`,
    backendChapterId: chapter.backendChapterId,
    chapterNumber: chapter.chapterNumber || index + 1,
    title: chapter.title || `第 ${index + 1} 章`,
    content: chapter.content || '',
    status: chapter.status === 'published' ? 'published' : 'draft',
  }))

  return {
    frontendWorkId: work.id,
    title: work.title || '未命名作品',
    globalOutline: [
      ...(work.globalOutline || []),
      work.summary,
      work.materials?.summary,
      work.materials?.nextStep,
    ].filter(Boolean).join('\n'),
    payload: JSON.stringify(work),
    chapters,
    chapterTitle: chapters[0]?.title || work.chapterTitle,
    chapterText: chapters[0]?.content || work.chapterText,
  }
}

type CloudSyncResponse = {
  novelId?: string
  chapterId?: string
  frontendWorkId?: string
  chapters?: CloudSnapshotChapter[]
  updatedAt?: string
}

function mergeCloudSyncResult(work: SavedWork, snapshot: CloudSyncResponse): SavedWork {
  const responseChapters = Array.isArray(snapshot.chapters) ? snapshot.chapters : []
  const backendIdByFrontend = new Map(responseChapters
    .filter((chapter) => chapter.frontendChapterId && chapter.backendChapterId)
    .map((chapter) => [chapter.frontendChapterId as string, chapter.backendChapterId as string]))
  const backendIdByNumber = new Map(responseChapters
    .filter((chapter) => chapter.chapterNumber && chapter.backendChapterId)
    .map((chapter) => [Number(chapter.chapterNumber), chapter.backendChapterId as string]))
  const sourceChapters = work.chapters && work.chapters.length > 0
    ? work.chapters
    : [{
        id: 'chapter-1',
        chapterNumber: 1,
        title: work.chapterTitle || '第一章：未命名章节',
        content: work.chapterText || '',
        status: 'draft' as const,
        wordCount: (work.chapterText || '').replace(/\s/g, '').length,
      }]
  const chapters = sourceChapters.map((chapter, index) => {
    const chapterNumber = chapter.chapterNumber || index + 1
    return {
      ...chapter,
      backendChapterId: backendIdByFrontend.get(chapter.id) || backendIdByNumber.get(chapterNumber) || chapter.backendChapterId || (chapterNumber === 1 ? snapshot.chapterId : undefined),
    }
  })
  return {
    ...work,
    backendNovelId: snapshot.novelId || work.backendNovelId,
    chapters,
    chapterTitle: chapters[0]?.title || work.chapterTitle,
    chapterText: chapters[0]?.content || work.chapterText,
    syncState: 'synced',
    updatedAt: snapshot.updatedAt ? new Date(snapshot.updatedAt).toLocaleString() : '刚刚',
  }
}

function buildPublishIntro(work: SavedWork) {
  const summary = work.summary || work.description || work.materials.summary || summarizeText(work.chapterText, 96)
  const sellingPoint = work.sellingPoint || work.materials.sellingPoint || '以人物选择和章节钩子推动读者继续阅读。'
  const chapterSummary = summarizeText(work.chapterText, 120)
  const nextStep = work.materials.nextStep || '继续推进当前章节冲突，并回收已埋下的关键线索。'

  return [
    `《${work.title || '未命名作品'}》发布准备`,
    '',
    `题材：${work.type || work.materials.genre || '待整理题材'}`,
    `一句话卖点：${sellingPoint}`,
    '',
    '作品简介：',
    summary,
    '',
    `当前章节：${work.chapterTitle || '未命名章节'}`,
    `章节摘要：${chapterSummary}`,
    '',
    '推广短句：',
    `${sellingPoint}如果你喜欢节奏清晰、人物关系有拉扯感的长篇故事，可以从这一章开始读。`,
    '',
    `下一步更新方向：${nextStep}`,
  ].join('\n')
}

function buildPublishTags(work: SavedWork) {
  const base = [
    work.type,
    work.materials.genre,
    ...work.tags,
    ...work.materials.characters,
    work.sellingPoint,
    work.materials.sellingPoint,
  ].filter(Boolean).join(' ')

  const inferred = [
    ['成长', /成长|逆袭|重生|觉醒|升级|系统/.test(base)],
    ['悬疑', /悬疑|谜|案|真相|秘密|调查/.test(base)],
    ['强钩子', /钩子|冲突|危机|背叛|复仇|竞赛|对手/.test(base)],
    ['人物关系', /暗恋|关系|羁绊|家族|师徒|同伴|恋/.test(base)],
    ['世界观', /世界|规则|异能|魔法|仙|科幻|末世/.test(base)],
    ['短剧潜力', /反转|打脸|复仇|高能|爽点|悬念/.test(base)],
  ].filter(([, hit]) => hit).map(([tag]) => String(tag))

  const tags = Array.from(new Set([...(work.tags || []), work.type || work.materials.genre, ...inferred, '连载', '长篇'].filter(Boolean))).slice(0, 12)
  return [
    `《${work.title || '未命名作品'}》发布标签`,
    '',
    tags.map((tag) => `#${tag}`).join(' '),
    '',
    '平台检索关键词：',
    tags.join('、'),
    '',
    '备注：标签由本地规则根据作品资料生成，发布前建议人工删改。',
  ].join('\n')
}

function summarizeText(text: string, maxLength: number) {
  const normalized = (text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return '当前内容尚少，建议补充章节正文后再生成更准确的发布文案。'
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

function buildDocxBlob(work: SavedWork, options: { includeTitle: boolean; includeInfo: boolean; generateToc: boolean }) {
  const paragraphs = buildPlainExportLines(work, options).map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`).join('')
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`
  return createZipBlob([
    { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
    { name: '_rels/.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: 'word/document.xml', content: documentXml },
  ])
}

function buildEpubBlob(work: SavedWork, options: { includeTitle: boolean; includeInfo: boolean; generateToc: boolean }) {
  const body = buildPlainExportLines(work, options)
    .map((line) => line ? `<p>${escapeXml(line)}</p>` : '<p class="empty"></p>')
    .join('\n')
  const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN"><head><title>${escapeXml(work.title || '未命名作品')}</title><style>body{font-family:serif;line-height:1.8;}p.empty{height:1em;}</style></head><body>${body}</body></html>`
  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN"><head><title>目录</title></head><body><nav epub:type="toc"><h1>目录</h1><ol><li><a href="chapter-1.xhtml">${escapeXml(work.chapterTitle || '正文')}</a></li></ol></nav></body></html>`
  return createZipBlob([
    { name: 'mimetype', content: 'application/epub+zip' },
    { name: 'META-INF/container.xml', content: `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>` },
    { name: 'OEBPS/content.opf', content: `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${escapeXml(work.id)}</dc:identifier><dc:title>${escapeXml(work.title || '未命名作品')}</dc:title><dc:language>zh-CN</dc:language></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="chapter-1" href="chapter-1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter-1"/></spine></package>` },
    { name: 'OEBPS/nav.xhtml', content: navXhtml },
    { name: 'OEBPS/chapter-1.xhtml', content: chapterXhtml },
  ])
}

function buildPlainExportLines(work: SavedWork, options: { includeTitle: boolean; includeInfo: boolean; generateToc: boolean }) {
  const lines: string[] = []
  if (options.includeInfo) lines.push(work.title || '未命名作品', '', `类型：${work.type || '暂无'}`, `字数：${safeExportNumber(work.words)}`, '')
  if (options.generateToc) lines.push('目录', `- ${work.chapterTitle || '正文'}`, '')
  if (options.includeTitle) lines.push(work.chapterTitle || '正文', '')
  lines.push(...(work.chapterText || '暂无正文内容。').split(/\r?\n/))
  return lines
}

function openPrintableExport(work: SavedWork, options: { includeTitle: boolean; includeInfo: boolean; generateToc: boolean }) {
  const printable = window.open('', '_blank', 'width=960,height=720')
  if (!printable) return
  const lines = buildPlainExportLines(work, options).map((line) => `<p>${line ? escapeHtml(line) : '&nbsp;'}</p>`).join('')
  printable.document.write(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(work.title || '未命名作品')} - PDF 打印版</title><style>body{max-width:760px;margin:48px auto;font-family:"Noto Serif SC","SimSun",serif;line-height:1.9;color:#0f172a;}h1{font-size:24px;}p{margin:0 0 12px;}@media print{body{margin:24mm auto;}}</style></head><body><h1>${escapeHtml(work.title || '未命名作品')}</h1>${lines}<script>window.onload=function(){window.print()}</script></body></html>`)
  printable.document.close()
}

function createZipBlob(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const centralDirectory: Uint8Array[] = []
  let offset = 0

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name)
    const contentBytes = encoder.encode(file.content)
    const crc = crc32(contentBytes)
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, 0, true)
    localView.setUint16(12, 0, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, contentBytes.length, true)
    localView.setUint32(22, contentBytes.length, true)
    localView.setUint16(26, nameBytes.length, true)
    localHeader.set(nameBytes, 30)
    chunks.push(localHeader, contentBytes)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, 0, true)
    centralView.setUint16(14, 0, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, contentBytes.length, true)
    centralView.setUint32(24, contentBytes.length, true)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint32(42, offset, true)
    centralHeader.set(nameBytes, 46)
    centralDirectory.push(centralHeader)
    offset += localHeader.length + contentBytes.length
  })

  const centralSize = centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0)
  const endRecord = new Uint8Array(22)
  const endView = new DataView(endRecord.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)
  return new Blob([...chunks, ...centralDirectory, endRecord].map(toBlobPart), { type: 'application/zip' })
}

function toBlobPart(bytes: Uint8Array): BlobPart {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function crc32(bytes: Uint8Array) {
  let crc = -1
  for (let index = 0; index < bytes.length; index += 1) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[index]) & 0xff]
  }
  return (crc ^ -1) >>> 0
}

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let c = index
    for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[index] = c >>> 0
  }
  return table
})()

function buildLocalExportFilename(title: string, format: ExportFormat) {
  const extension = format === 'markdown' ? 'md' : format === 'pdf' ? 'html' : format
  const safeTitle = sanitizeLocalFilename(title || 'novel-ai-copilot-work')
  return `${safeTitle}-${format === 'pdf' ? 'PDF打印版' : '导出'}-${formatLocalStamp()}.${extension}`
}

function sanitizeLocalFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'novel-ai-copilot-work'
}

function formatLocalStamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

function safeExportNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function escapeXml(value: string) {
  return escapeHtml(value).replace(/'/g, '&apos;')
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  downloadBlob(filename, blob, type)
}

function downloadBlob(filename: string, blob: Blob, type: string) {
  const typedBlob = blob.type === type ? blob : new Blob([blob], { type })
  const url = URL.createObjectURL(typedBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function readJson(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

type CloudSnapshotChapter = {
  frontendChapterId?: string
  backendChapterId?: string
  chapterNumber?: number
  title?: string
  content?: string
  status?: string
}

type CloudWorkSnapshot = {
  versionId?: string
  frontendWorkId?: string
  title?: string
  payload?: string
  chapters?: CloudSnapshotChapter[]
  createdAt?: string
  updatedAt?: string
  chapterCount?: number
  wordCount?: number
}

function compareCloudSnapshotUpdatedAt(left: CloudWorkSnapshot, right: CloudWorkSnapshot) {
  return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime()
}

function cloudSnapshotTitle(snapshot: CloudWorkSnapshot) {
  if (snapshot.title) return snapshot.title
  try {
    const parsed = JSON.parse(snapshot.payload || '{}') as Partial<SavedWork>
    return parsed.title || snapshot.frontendWorkId || '未命名云端快照'
  } catch {
    return snapshot.frontendWorkId || '未命名云端快照'
  }
}

function cloudSnapshotMeta(snapshot: CloudWorkSnapshot) {
  const updatedAt = snapshot.updatedAt || snapshot.createdAt
  const timeText = updatedAt ? new Date(updatedAt).toLocaleString() : '未知时间'
  const chapterCount = snapshot.chapterCount || (Array.isArray(snapshot.chapters) ? snapshot.chapters.length : 0)
  const wordCount = snapshot.wordCount ? ` · ${snapshot.wordCount.toLocaleString()} 字` : ''
  return `${timeText} · ${chapterCount || 1} 章${wordCount} · ${snapshot.frontendWorkId || '无本地映射 ID'}`
}

function parseCloudSnapshot(snapshot: CloudWorkSnapshot): SavedWork | null {
  if (!snapshot?.payload) return null
  let parsed: Partial<SavedWork>
  try {
    parsed = JSON.parse(snapshot.payload) as Partial<SavedWork>
  } catch {
    return null
  }

  const cloudChapters = Array.isArray(snapshot.chapters) ? snapshot.chapters : []
  const chapters = cloudChapters.length > 0
    ? cloudChapters.map((chapter, index) => {
        const content = String(chapter.content || '')
        return {
          id: chapter.frontendChapterId || `cloud-chapter-${index + 1}`,
          backendChapterId: chapter.backendChapterId,
          chapterNumber: Number.isFinite(Number(chapter.chapterNumber)) ? Number(chapter.chapterNumber) : index + 1,
          title: chapter.title || `第 ${index + 1} 章`,
          content,
          status: chapter.status === 'published' ? 'published' as const : 'draft' as const,
          wordCount: content.replace(/\s/g, '').length,
        }
      })
    : parsed.chapters

  const restored = parseImportedBackup(JSON.stringify({
    work: {
      ...parsed,
      id: snapshot.frontendWorkId || parsed.id,
      chapters,
      chapterTitle: chapters?.[0]?.title || parsed.chapterTitle,
      chapterText: chapters?.[0]?.content || parsed.chapterText,
    },
  }))
  if (!restored) return null

  const baseTitle = restored.title.replace(/（导入）$/, '').replace(/（云端恢复）$/, '')
  return {
    ...restored,
    title: `${baseTitle}（云端恢复）`,
    tags: Array.from(new Set([...(restored.tags || []), '云端恢复'])),
    summary: restored.summary || '从后端作品快照恢复的本地副本。',
  }
}

function parseImportedBackup(raw: string): SavedWork | null {
  const parsed = JSON.parse(raw) as unknown
  const source = extractBackupWork(parsed)
  if (!source || typeof source !== 'object') return null

  const candidate = source as Partial<SavedWork>
  if (!candidate.title && !candidate.chapterTitle && !candidate.chapterText && !candidate.chapters) return null

  const now = new Date().toLocaleString()
  const chapters = normalizeImportedChapters(candidate)
  const firstChapter = chapters[0]
  const title = String(candidate.title || '导入作品').trim() || '导入作品'
  const type = String(candidate.type || candidate.materials?.genre || '导入备份').trim() || '导入备份'
  const summary = String(candidate.summary || candidate.description || candidate.materials?.summary || '从本地备份导入的作品。')
  const words = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0)

  return {
    ...(candidate as SavedWork),
    id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.endsWith('（导入）') ? title : `${title}（导入）`,
    type,
    status: 'local-draft',
    projectStatus: 'local-draft',
    syncState: 'local-only',
    words,
    chapterCount: chapters.length,
    chapters,
    chapterTitle: firstChapter.title,
    chapterText: firstChapter.content,
    updatedAt: now,
    createdAt: now,
    tags: Array.from(new Set([...(Array.isArray(candidate.tags) ? candidate.tags : []), '本地导入'])),
    summary,
    description: candidate.description || summary,
    cover: candidate.cover || 'from-slate-700 via-teal-500 to-emerald-200',
    materials: {
      genre: candidate.materials?.genre || type,
      sellingPoint: candidate.materials?.sellingPoint || candidate.sellingPoint || '',
      characters: Array.isArray(candidate.materials?.characters) ? candidate.materials.characters : [],
      summary,
      nextStep: candidate.materials?.nextStep || '检查导入章节与资料，继续完善当前作品。',
    },
  }
}

function extractBackupWork(value: unknown): unknown {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (record.work) return record.work
  if (Array.isArray(record.works) && record.works[0]) return record.works[0]
  if (record.exportVersion && record.work) return record.work
  return value
}

function normalizeImportedChapters(work: Partial<SavedWork>) {
  const rawChapters = Array.isArray(work.chapters) ? work.chapters : []
  const chapters = rawChapters
    .map((chapter, index) => {
      const content = String(chapter?.content || '')
      return {
        id: String(chapter?.id || `chapter-${index + 1}`),
        chapterNumber: Number.isFinite(Number(chapter?.chapterNumber)) ? Number(chapter?.chapterNumber) : index + 1,
        title: String(chapter?.title || `第 ${index + 1} 章`),
        content,
        status: chapter?.status === 'published' ? 'published' as const : 'draft' as const,
        wordCount: content.replace(/\s/g, '').length,
        createdAt: chapter?.createdAt,
        updatedAt: chapter?.updatedAt,
      }
    })
    .sort((a, b) => a.chapterNumber - b.chapterNumber)

  if (chapters.length > 0) {
    return chapters.map((chapter, index) => ({ ...chapter, id: `imported-chapter-${Date.now()}-${index + 1}`, chapterNumber: index + 1 }))
  }

  const content = String(work.chapterText || '')
  return [{
    id: `imported-chapter-${Date.now()}-1`,
    chapterNumber: 1,
    title: String(work.chapterTitle || '第一章：未命名章节'),
    content,
    status: 'draft' as const,
    wordCount: content.replace(/\s/g, '').length,
    createdAt: new Date().toLocaleString(),
    updatedAt: new Date().toLocaleString(),
  }]
}

function sampleWork(): SavedWork {
  return {
    id: 'sample-export',
    title: '黄金第一章',
    type: '奇幻 / 连载中',
    status: 'local-draft',
    syncState: 'local-only',
    words: 1236,
    updatedAt: '刚刚',
    tags: ['本地示例'],
    summary: '一键生成引人入胜、信息完整的小说第一章。',
    cover: 'from-amber-300 to-slate-800',
    chapterTitle: '黄金第一章',
    chapterText: '夜色如墨，风雪渐起。\n\n北境的苍狼山脉，山风卷着雪粒，拍打在破旧的猎人小屋上。\n\n屋内，火光微弱。少年斜倚在窗前，掌心托着一枚被擦亮的玉佩。玉佩微微发凉，竟像有淡淡的暖流，仿佛有生命般回应着他的心跳。\n\n这是他在三日前，从一头凶狠的咆吼里取出的东西。\n\n白日之后，他更多地睡得不再平静。',
    materials: {
      genre: '奇幻',
      sellingPoint: '信息完整、开篇吸引、伏笔合理。',
      characters: ['少年主角'],
      summary: '示例章节摘要。',
      nextStep: '继续推进主角身世线索。',
    },
  }
}
