'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  MessageSquare, 
  Sparkles, 
  Film, 
  Send,
  Bot,
  User,
  MoreVertical,
  RefreshCw
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const mockMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: '你好！我是你的 AI 创作助手。我可以帮你：\n\n1. 根据短画面扩写正文\n2. 续写当前章节\n3. 润色文字\n4. 分析剧情逻辑\n\n有什么我可以帮你的吗？',
    timestamp: new Date()
  }
]

export default function RightSidebar() {
  const [activeTab, setActiveTab] = useState<'chat' | 'derive'>('chat')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>(mockMessages)

  const handleSend = () => {
    if (!input.trim()) return
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    
    setMessages([...messages, userMsg])
    setInput('')
    
    // 模拟 AI 回复
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '收到你的消息！我正在分析当前章节的上下文，稍后为你生成回复...',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMsg])
    }, 1000)
  }

  return (
    <aside className="w-[20%] h-full bg-card border-l border-border flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
            activeTab === 'chat' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          AI 助手
        </button>
        <button
          onClick={() => setActiveTab('derive')}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
            activeTab === 'derive' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="w-4 h-4" />
          IP 衍生
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2",
                    msg.role === 'user' ? "flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                    msg.role === 'user' 
                      ? "bg-secondary" 
                      : "bg-primary"
                  )}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-secondary-foreground" />
                    ) : (
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    )}
                  </div>
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-lg text-sm",
                    msg.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground"
                  )}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-[10px] opacity-60 mt-1 block">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="输入消息..."
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={handleSend}
                  className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                AI 助手已读取当前章节上下文
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <h3 className="font-medium text-sm mb-4">IP 衍生创作</h3>
            
            {/* Short Drama */}
            <div className="p-4 bg-accent/50 rounded-lg border border-border mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Film className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">短剧脚本</h4>
                  <p className="text-xs text-muted-foreground">一键生成竖屏短剧</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                基于当前章节内容，自动生成适合短视频平台的 1-3 分钟短剧脚本，包含分镜、台词和场景描述。
              </p>
              <button className="w-full py-2 bg-orange-500 text-white rounded-md text-sm font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                生成短剧脚本
              </button>
            </div>

            {/* Comic */}
            <div className="p-4 bg-accent/50 rounded-lg border border-border mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium">漫剧分镜</h4>
                  <p className="text-xs text-muted-foreground">生成漫画分镜脚本</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                将当前章节转换为漫画分镜脚本，包含画面描述、人物表情和对话气泡位置。
              </p>
              <button className="w-full py-2 bg-purple-500 text-white rounded-md text-sm font-medium hover:bg-purple-600 transition-colors flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                生成漫剧分镜
              </button>
            </div>

            {/* Summary */}
            <div className="p-4 bg-accent/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">剧情摘要</h4>
                  <p className="text-xs text-muted-foreground">更新记忆摘要</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                为当前章节生成 200 字剧情摘要，用于后续章节的上下文记忆。
              </p>
              <button className="w-full py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                生成摘要
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
