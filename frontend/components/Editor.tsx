'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { 
  Sparkles, 
  Wand2, 
  RotateCcw, 
  MoreHorizontal,
  Send,
  Bot,
  Square,
  Loader2
} from 'lucide-react'

export default function Editor() {
  const [content, setContent] = useState(`第一章：初入江湖

夕阳西下，晚霞染红了天际。

林青云站在山巅，望着远方连绵起伏的群山，心中涌起一股豪情。十八年了，他终于可以走出这个小山村，去追寻那传说中的修仙之路。

"青云，此去路途遥远，你要多加小心。"身后传来师父苍老的声音。

林青云转身，看着这位抚养自己长大的老人，眼眶微红："师父，弟子一定不会辜负您的期望。"

老人点点头，从怀中取出一枚玉佩递给他："这是你父母留下的唯一信物，收好了。"

林青云接过玉佩，只见上面刻着一个古朴的"林"字，入手温润，似乎蕴含着某种神秘的力量。

"师父，我父母他们……"

"等你修为有成，自然会知道一切。"老人摆摆手，"去吧，天色不早了。"

林青云深深一拜，转身大步向山下走去。他不知道，这一去，将彻底改变他的命运……`)

  const [aiInput, setAiInput] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedText, setGeneratedText] = useState('')
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleGenerate = useCallback(async () => {
    if (!aiInput.trim() || isGenerating) return

    setIsGenerating(true)
    setGeneratedText('')
    
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const response = await fetch('/api/novel/expand-scene', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          novelId: '123e4567-e89b-12d3-a456-426614174000',
          targetChapterNumber: 4,
          sceneDescription: aiInput
        }),
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error('Failed to generate')
      }

      const reader = response.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder('utf-8')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        setGeneratedText(prev => prev + chunk)
      }

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Generation aborted')
      } else {
        console.error('Generation error:', error)
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }, [aiInput, isGenerating])

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  const handleInsertGenerated = useCallback(() => {
    if (!generatedText) return
    setContent(prev => prev + '\n\n' + generatedText)
    setGeneratedText('')
    setAiInput('')
    setShowAiPanel(false)
  }, [generatedText])

  const wordCount = content.replace(/\s/g, '').length
  const lineCount = content.split('\n').length

  return (
    <main className="flex-1 h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">第一章：初入江湖</span>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">草稿</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors" title="AI续写">
            <Sparkles className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors" title="润色">
            <Wand2 className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors" title="撤销">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-8 px-8">
          {/* Fake Textarea - styled contenteditable div */}
          <div
            ref={contentRef}
            className={cn(
              "min-h-[600px] outline-none",
              "focus:ring-0"
            )}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => setContent(e.currentTarget.textContent || '')}
            style={{
              lineHeight: '2',
              fontSize: '16px',
              whiteSpace: 'pre-wrap',
              fontFamily: 'Georgia, serif'
            }}
          >
            {content.split('\n').map((line, index) => (
              <p key={index} className={cn(
                "mb-4",
                line.trim() === '' ? 'h-4' : ''
              )}>
                {line}
              </p>
            ))}
          </div>

          {/* AI Generated Content Preview */}
          {generatedText && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI 生成中...</span>
                {isGenerating && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                )}
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{generatedText}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInsertGenerated}
                  disabled={isGenerating}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  插入到文档
                </button>
                <button
                  onClick={handleStop}
                  disabled={!isGenerating}
                  className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Square className="w-3 h-3" />
                  停止
                </button>
              </div>
            </div>
          )}

          {/* AI Input Trigger */}
          <div className="mt-8 flex items-center gap-2 text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <button 
              onClick={() => setShowAiPanel(!showAiPanel)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:text-primary transition-colors"
            >
              <Bot className="w-4 h-4" />
              输入 /ai 唤醒 AI 助手
            </button>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* AI Input Panel */}
          {showAiPanel && !isGenerating && (
            <div className="mt-4 p-4 bg-accent/50 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">描述你想写的场景，AI 会帮你扩写成完整章节</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                      placeholder="例如：林青云在客栈遇到神秘老者，得到一本秘籍..."
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button 
                      onClick={handleGenerate}
                      disabled={!aiInput.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <Send className="w-4 h-4" />
                      生成
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-8 border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground bg-card">
        <div className="flex items-center gap-4">
          <span>字数: {wordCount}</span>
          <span>行数: {lineCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "w-2 h-2 rounded-full",
            isGenerating ? "bg-blue-500 animate-pulse" : "bg-green-500"
          )} />
          <span>{isGenerating ? 'AI 生成中...' : '已保存'}</span>
        </div>
      </div>
    </main>
  )
}
