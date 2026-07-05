'use client'

import {
  Bell,
  Box,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Home,
  Library,
  MessageSquare,
  Network,
  Palette,
  PenLine,
  Search,
  Settings,
  Share2,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { BrandMark } from './BrandMark'
import { cn } from '@/lib/utils'

const shellStorageKey = 'yixie-app-shell-collapsed'

const navItems = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'create', label: '创作台', icon: PenLine },
  { key: 'works', label: '作品库', icon: Library },
  { key: 'materials', label: '资料库', icon: Database },
  { key: 'skills', label: '写作工具', icon: Sparkles },
  { key: 'community', label: '灵感记录', icon: Share2 },
  { key: 'model-settings', label: '模型设置', icon: Settings },
  { key: 'appearance', label: '外观主题', icon: Palette },
  { key: 'export', label: '导出发布', icon: Download },
  { key: 'tools', label: '工具箱', icon: Box },
  { key: 'prompts', label: '提示词库', icon: MessageSquare },
  { key: 'story-graph', label: '故事线图', icon: Network },
]

export function AppShell({
  children,
  active = 'home',
  isGuest,
  username,
  statusText,
  onNavigateHome,
  onNewWork,
  onLogin,
  onOpenSkills,
  onOpenCommunity,
  onOpenModelSettings,
  onOpenAppearance,
  onOpenExport,
  onOpenWorks,
  onOpenMaterials,
  onOpenTools,
  onOpenPrompts,
  onOpenStoryGraph,
}: {
  children: React.ReactNode
  active?: string
  isGuest: boolean
  username: string
  statusText: string
  onNavigateHome: () => void
  onNewWork: () => void
  onLogin: () => void
  onOpenSkills: () => void
  onOpenCommunity: () => void
  onOpenModelSettings: () => void
  onOpenAppearance: () => void
  onOpenExport: () => void
  onOpenWorks: () => void
  onOpenMaterials: () => void
  onOpenTools: () => void
  onOpenPrompts: () => void
  onOpenStoryGraph: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState('blue')

  useEffect(() => {
    setCollapsed(localStorage.getItem(shellStorageKey) === 'true')
    syncTheme()

    function syncCollapsed() {
      setCollapsed(localStorage.getItem(shellStorageKey) === 'true')
    }

    function syncTheme() {
      try {
        const saved = JSON.parse(localStorage.getItem('yixie-appearance-settings-v1') || '{}') as { theme?: string }
        setTheme(saved.theme || 'blue')
      } catch {
        setTheme('blue')
      }
    }

    window.addEventListener('yixie-shell-collapsed-change', syncCollapsed)
    window.addEventListener('yixie-appearance-change', syncTheme)
    return () => {
      window.removeEventListener('yixie-shell-collapsed-change', syncCollapsed)
      window.removeEventListener('yixie-appearance-change', syncTheme)
    }
  }, [])

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value
      localStorage.setItem(shellStorageKey, String(next))
      return next
    })
  }

  function handleNav(key: string) {
    if (key === 'home') onNavigateHome()
    if (key === 'create') onNewWork()
    if (key === 'works') onOpenWorks()
    if (key === 'materials') onOpenMaterials()
    if (key === 'skills') onOpenSkills()
    if (key === 'community') onOpenCommunity()
    if (key === 'model-settings') onOpenModelSettings()
    if (key === 'appearance') onOpenAppearance()
    if (key === 'export') onOpenExport()
    if (key === 'tools') onOpenTools()
    if (key === 'prompts') onOpenPrompts()
    if (key === 'story-graph') onOpenStoryGraph()
  }

  const themeStyles = {
    blue: {
      app: 'bg-[#f7f8f5] text-slate-950',
      sidebar: 'border-slate-200 bg-[#fcfcfa]',
      header: 'border-slate-200 bg-[#fcfcfa]/92',
      panel: 'border-teal-100 bg-teal-50/70 text-slate-800',
      panelText: 'text-slate-600',
      active: 'bg-teal-50 text-teal-800',
    },
    green: {
      app: 'bg-emerald-50 text-slate-950',
      sidebar: 'border-emerald-100 bg-[#fbfffc]',
      header: 'border-emerald-100 bg-[#fbfffc]/90',
      panel: 'border-emerald-100 bg-emerald-50 text-emerald-900',
      panelText: 'text-emerald-800/80',
      active: 'bg-emerald-100 text-emerald-800',
    },
    paper: {
      app: 'bg-[#fbf4e8] text-stone-950',
      sidebar: 'border-amber-100 bg-[#fffaf1]',
      header: 'border-amber-100 bg-[#fffaf1]/90',
      panel: 'border-amber-100 bg-amber-50 text-amber-900',
      panelText: 'text-amber-800/80',
      active: 'bg-amber-100 text-amber-800',
    },
    dark: {
      app: 'bg-slate-950 text-slate-100',
      sidebar: 'border-slate-800 bg-slate-900',
      header: 'border-slate-800 bg-slate-900/90',
      panel: 'border-slate-700 bg-slate-800 text-slate-100',
      panelText: 'text-slate-300',
      active: 'bg-slate-800 text-blue-200',
    },
  }[theme] ?? {
    app: 'bg-[#f7f8f5] text-slate-950',
    sidebar: 'border-slate-200 bg-[#fcfcfa]',
    header: 'border-slate-200 bg-[#fcfcfa]/92',
    panel: 'border-teal-100 bg-teal-50/70 text-slate-800',
    panelText: 'text-slate-600',
    active: 'bg-teal-50 text-teal-800',
  }

  return (
    <main className={cn('yixie-editorial min-h-screen', themeStyles.app)}>
      <div className="flex min-h-screen">
        <aside className={cn('flex shrink-0 flex-col border-r transition-[width] duration-200', themeStyles.sidebar, collapsed ? 'w-[76px]' : 'w-64')}>
          <div className="flex h-20 items-center justify-between px-5">
            <button onClick={onNavigateHome} className={cn(collapsed && 'mx-auto')} aria-label="回到首页">
              <BrandMark compact />
            </button>
            {!collapsed && (
              <button onClick={toggleCollapsed} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="收起侧边栏">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
          {collapsed && (
            <button onClick={toggleCollapsed} className="mx-auto mb-3 rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="展开侧边栏">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <nav className="space-y-1 px-3">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                title={collapsed ? item.label : undefined}
                className={cn('group relative flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm transition', active === item.key ? themeStyles.active : 'text-slate-600 hover:bg-slate-100', collapsed && 'justify-center px-0')}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {collapsed && (
                  <span className="pointer-events-none absolute left-[58px] z-50 hidden whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                    {item.label}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto p-4">
            <div className={cn('rounded-md border p-3 text-sm', themeStyles.panel, collapsed && 'p-2 text-center')}>
              {collapsed ? (
                <span className="font-semibold">写</span>
              ) : (
                <>
                  <div className="font-semibold">{isGuest ? '游客草稿模式' : '创作者模式'}</div>
                  <p className={cn('mt-2 leading-5', themeStyles.panelText)}>{isGuest ? '临时草稿仅保存在本地。' : '正式作品可持续管理。'}</p>
                  {isGuest && <button onClick={onLogin} className="mt-3 font-semibold text-teal-700">登录 / 注册</button>}
                </>
              )}
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className={cn('flex h-20 items-center gap-5 border-b px-8 backdrop-blur', themeStyles.header)}>
            <div className="relative max-w-xl flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="h-11 w-full rounded-md border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none ring-teal-500/15 focus:ring-4" placeholder="搜索作品、章节、角色、资料..." />
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">{statusText}</span>
            <button className="rounded-md border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50" aria-label="通知">
              <Bell className="h-5 w-5" />
            </button>
            <button onClick={onLogin} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100">
              <UserRound className="h-8 w-8 rounded-full bg-teal-50 p-1.5 text-teal-700" />
              <span className="text-sm font-medium">{isGuest ? '游客' : username || '创作者'}</span>
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </section>
      </div>
    </main>
  )
}
