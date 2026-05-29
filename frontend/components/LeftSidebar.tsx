'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  Users, 
  MapPin, 
  Package,
  FileText,
  Plus
} from 'lucide-react'

interface Chapter {
  id: string
  title: string
  number: number
}

interface LoreItem {
  id: string
  name: string
  category: 'character' | 'location' | 'item'
}

const mockChapters: Chapter[] = [
  { id: '1', title: '第一章：初入江湖', number: 1 },
  { id: '2', title: '第二章：奇遇', number: 2 },
  { id: '3', title: '第三章：拜师学艺', number: 3 },
]

const mockLores: LoreItem[] = [
  { id: '1', name: '林青云', category: 'character' },
  { id: '2', name: '紫云宗', category: 'location' },
  { id: '3', name: '玄天剑', category: 'item' },
  { id: '4', name: '苏婉儿', category: 'character' },
]

export default function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<'chapters' | 'lore'>('chapters')
  const [expandedLore, setExpandedLore] = useState(true)

  const getLoreIcon = (category: string) => {
    switch (category) {
      case 'character': return <Users className="w-4 h-4" />
      case 'location': return <MapPin className="w-4 h-4" />
      case 'item': return <Package className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  return (
    <aside className="w-[20%] h-full bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          仙途漫漫
        </h1>
        <p className="text-xs text-muted-foreground mt-1">仙侠 · 连载中</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('chapters')}
          className={cn(
            "flex-1 py-2 text-sm font-medium transition-colors",
            activeTab === 'chapters' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          章节目录
        </button>
        <button
          onClick={() => setActiveTab('lore')}
          className={cn(
            "flex-1 py-2 text-sm font-medium transition-colors",
            activeTab === 'lore' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          设定库
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'chapters' ? (
          <div className="space-y-1">
            {mockChapters.map((chapter) => (
              <div
                key={chapter.id}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent cursor-pointer text-sm group"
              >
                <span className="text-muted-foreground w-8">{chapter.number}</span>
                <span className="flex-1 truncate">{chapter.title}</span>
              </div>
            ))}
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <Plus className="w-4 h-4" />
              新建章节
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Characters */}
            <div>
              <button
                onClick={() => setExpandedLore(!expandedLore)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium hover:bg-accent rounded-md"
              >
                {expandedLore ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Users className="w-4 h-4 text-primary" />
                人物
              </button>
              {expandedLore && (
                <div className="ml-6 mt-1 space-y-1">
                  {mockLores.filter(l => l.category === 'character').map((lore) => (
                    <div
                      key={lore.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
                    >
                      {getLoreIcon(lore.category)}
                      <span>{lore.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Locations */}
            <div>
              <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium hover:bg-accent rounded-md">
                <ChevronRight className="w-4 h-4" />
                <MapPin className="w-4 h-4 text-primary" />
                地点
              </button>
            </div>

            {/* Items */}
            <div>
              <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium hover:bg-accent rounded-md">
                <ChevronRight className="w-4 h-4" />
                <Package className="w-4 h-4 text-primary" />
                物品
              </button>
            </div>

            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-primary transition-colors mt-2">
              <Plus className="w-4 h-4" />
              添加设定
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <button className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          全局大纲
        </button>
      </div>
    </aside>
  )
}
