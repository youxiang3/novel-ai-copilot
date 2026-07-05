'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bookmark,
  BookmarkCheck,
  Copy,
  Heart,
  MessageCircle,
  PenLine,
  Search,
  Sparkles,
  Star,
  Wand2,
  X,
} from 'lucide-react'
import type { CommunityPost, CommunityPostType } from './types'
import { cn } from '@/lib/utils'

const favoriteStorageKey = 'yixie-community-favorites-v1'

const typeLabels: Record<CommunityPostType | 'all', string> = {
  all: '全部',
  inspiration: '灵感分享',
  prompt: 'Prompt 分享',
  skill: '技能推荐',
}

const postTypeStyles: Record<CommunityPostType, string> = {
  inspiration: 'bg-blue-50 text-blue-700',
  prompt: 'bg-violet-50 text-violet-700',
  skill: 'bg-emerald-50 text-emerald-700',
}

const mockPosts: CommunityPost[] = [
  {
    id: 'opening-stall',
    type: 'inspiration',
    title: '如何写出让读者停不下来的开场？',
    summary: '分享我在构思开场时常用的三步法：人物钩子、冲突预告、场景推进。',
    content:
      '我会先写一个能暴露人物欲望的小动作，再用一句对白把冲突推到台前，最后让场景里出现一个无法忽视的异常。这样开场不会只是在介绍世界，而是让读者直接进入问题现场。',
    author: '清浅时光',
    authorBadge: '优质作者',
    createdAt: '2 小时前',
    tags: ['写作心得', '开场设计', '小说创作'],
    likes: 128,
    favorites: 86,
    comments: 32,
  },
  {
    id: 'rain-letter',
    type: 'inspiration',
    title: '雨夜、旧书店，和一封未寄出的信',
    summary: '一段片段练习：尝试用环境描写推动情绪。',
    content:
      '雨水敲打着旧书店的玻璃，像谁在轻声数着往事。她推开门，风铃响起，也惊醒了书页里沉默的名字。',
    author: '云起南山',
    authorBadge: '优质作者',
    createdAt: '4 小时前',
    tags: ['片段分享', '环境描写', '情感表达'],
    likes: 96,
    favorites: 64,
    comments: 18,
  },
  {
    id: 'world-five',
    type: 'skill',
    title: '奇幻世界观的 5 个构建切入点',
    summary: '从地理、信仰、能量体系、权力结构、日常生活拆解世界设定。',
    content:
      '推荐先从角色每天会接触到的规则写起：他们吃什么、害怕什么、相信什么、不能越过什么。宏大设定要落回具体生活，读者才会觉得可信。',
    author: '星河煮字',
    authorBadge: '新锐作者',
    createdAt: '6 小时前',
    tags: ['开书灵感', '世界观', '奇幻'],
    likes: 142,
    favorites: 103,
    comments: 27,
    skillName: '世界观整理',
  },
  {
    id: 'prompt-template',
    type: 'prompt',
    title: '我常用的万能 Prompt 模板（可直接套用）',
    summary: '适用于角色设定、情节扩展、润色优化等场景。',
    content:
      '这个模板强调“输入资料、目标、限制、输出格式”四件事，适合在 Web AI 模式里稳定复用。',
    author: '墨舟行远',
    authorBadge: '优质作者',
    createdAt: '8 小时前',
    tags: ['Prompt 分享', '写作助手', '模板'],
    likes: 88,
    favorites: 77,
    comments: 21,
    prompt:
      '你是一名中文长篇小说编辑。请基于以下资料完成写作任务：\n【作品资料】...\n【当前目标】...\n【限制条件】保持人物一致性，不改动既有设定。\n【输出格式】1. 修改建议 2. 可替换正文 3. 下一步建议',
  },
  {
    id: 'stuck-list',
    type: 'inspiration',
    title: '写作卡壳时，我会做的 7 件小事',
    summary: '整理了一份个人清单，从换视角到换场景，给自己一点呼吸空间。',
    content:
      '卡壳不一定是不会写，也可能是当前视角没有压力、场景没有选择、人物没有代价。我会先问：这场戏里谁最怕失去什么？',
    author: '鹿与森',
    authorBadge: '新锐作者',
    createdAt: '10 小时前',
    tags: ['写作心得', '创作习惯', '灵感管理'],
    likes: 75,
    favorites: 58,
    comments: 13,
  },
]

export function LightCommunity({
  isGuest,
  onRequireLogin,
  onOpenSkills,
}: {
  isGuest: boolean
  onRequireLogin: () => void
  onOpenSkills: () => void
}) {
  const [activeType, setActiveType] = useState<CommunityPostType | 'all'>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'latest' | 'hot'>('latest')
  const [favorites, setFavorites] = useState<string[]>([])
  const [likedIds, setLikedIds] = useState<string[]>([])
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null)
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem(favoriteStorageKey) || '[]') as string[])
    } catch {
      localStorage.removeItem(favoriteStorageKey)
    }
  }, [])

  const visiblePosts = useMemo(() => {
    const filtered = mockPosts.filter((post) => {
      const matchType = activeType === 'all' || post.type === activeType
      const text = `${post.title} ${post.summary} ${post.tags.join(' ')} ${post.author}`.toLowerCase()
      return matchType && text.includes(query.trim().toLowerCase())
    })
    return [...filtered].sort((a, b) => {
      if (sort === 'hot') return b.likes + b.favorites - (a.likes + a.favorites)
      return mockPosts.indexOf(a) - mockPosts.indexOf(b)
    })
  }, [activeType, query, sort])

  function toggleFavorite(post: CommunityPost) {
    if (isGuest) {
      setNotice({ title: '收藏需要登录', message: '游客可以浏览、复制 Prompt 和点赞占位；收藏会在登录后开放。' })
      onRequireLogin()
      return
    }
    setFavorites((current) => {
      const next = current.includes(post.id) ? current.filter((id) => id !== post.id) : [...current, post.id]
      localStorage.setItem(favoriteStorageKey, JSON.stringify(next))
      setNotice({ title: next.includes(post.id) ? '已收藏' : '已取消收藏', message: next.includes(post.id) ? '这条分享已加入你的本地收藏夹。' : '已从本地收藏夹移除。' })
      return next
    })
  }

  function toggleLike(post: CommunityPost) {
    setLikedIds((current) => {
      const next = current.includes(post.id) ? current.filter((id) => id !== post.id) : [...current, post.id]
      setNotice({ title: next.includes(post.id) ? '已点赞' : '已取消点赞', message: '点赞目前是前端占位计数，后续可接入社区服务。' })
      return next
    })
  }

  async function copyPrompt(post: CommunityPost) {
    if (!post.prompt) return
    try {
      await navigator.clipboard.writeText(post.prompt)
      setNotice({ title: 'Prompt 已复制', message: '可以粘贴到 ChatGPT / DeepSeek / Gemini 网页 AI 使用。' })
    } catch {
      setNotice({ title: '复制失败', message: '浏览器暂时没有开放剪贴板权限，请手动选中复制。' })
    }
  }

  function openCommentPlaceholder(post: CommunityPost) {
    setSelectedPost(post)
    setNotice({ title: '评论占位', message: '本轮只保留评论入口，不实现评论流、回复和关注体系。' })
  }

  const favoriteCount = favorites.length

  return (
    <div className="min-h-full bg-[#f7f9ff] p-8">
      <div className="mx-auto grid max-w-[1500px] grid-cols-[minmax(0,1fr)_320px] gap-6">
        <section className="min-w-0 space-y-5">
          <div className="overflow-hidden rounded-lg border border-violet-100 bg-gradient-to-r from-white via-violet-50 to-blue-50 p-8 shadow-sm">
            <div className="grid grid-cols-[1fr_280px] items-center gap-6">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-600">
                  <Sparkles className="h-4 w-4" />
                  轻社区
                </div>
                <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">灵感社区 · 分享广场</h1>
                <p className="mt-3 text-base text-slate-600">分享灵感、Prompt 和好用技能，让创作不再孤单。</p>
                <div className="mt-7 flex gap-8 text-slate-700">
                  <Stat label="社区成员" value="12.8w" />
                  <Stat label="本月分享" value="4.6w" />
                  <Stat label="收藏与点赞" value="36.2w" />
                </div>
              </div>
              <div className="relative h-40 rounded-lg bg-white/60 p-6">
                <div className="absolute right-6 top-6 h-20 w-20 rounded-full bg-violet-200/60 blur-2xl" />
                <div className="absolute bottom-5 right-8 rotate-[-10deg] rounded-md border border-violet-100 bg-white p-4 shadow-lg">
                  <PenLine className="h-12 w-12 text-violet-500" />
                </div>
                <div className="absolute left-7 top-8 rounded-md border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-blue-700 shadow-sm">
                  Prompt 分享
                </div>
                <div className="absolute bottom-8 left-14 rounded-md border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm">
                  技能推荐
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(Object.keys(typeLabels) as Array<CommunityPostType | 'all'>).map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={cn('rounded-md border px-4 py-2 text-sm font-semibold transition', activeType === type ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700')}
              >
                {typeLabels[type]}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setSort('latest')} className={cn('rounded-md px-4 py-2 text-sm font-semibold', sort === 'latest' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-white')}>最新</button>
              <button onClick={() => setSort('hot')} className={cn('rounded-md px-4 py-2 text-sm font-semibold', sort === 'hot' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-white')}>最热</button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 w-full rounded-md border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none ring-blue-500/20 focus:ring-4"
              placeholder="搜索灵感、Prompt、技能或作者..."
            />
          </div>

          <div className="space-y-4">
            {visiblePosts.map((post) => {
              const liked = likedIds.includes(post.id)
              const saved = favorites.includes(post.id)
              return (
                <article key={post.id} className="grid grid-cols-[180px_1fr] gap-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                  <div className="flex gap-3 border-r border-slate-100 pr-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-violet-100 text-lg font-bold text-blue-700">
                      {post.author.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">{post.author}</div>
                      <span className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">{post.authorBadge}</span>
                      <p className="mt-2 text-xs text-slate-400">发布于 {post.createdAt}</p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-xl font-bold text-slate-950">{post.title}</h2>
                          <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', postTypeStyles[post.type])}>{typeLabels[post.type]}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{post.summary}</p>
                      </div>
                      <button onClick={() => setSelectedPost(post)} className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                        查看详情
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">{tag}</span>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {post.prompt && (
                          <button onClick={() => copyPrompt(post)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                            <Copy className="h-4 w-4" />
                            复制 Prompt
                          </button>
                        )}
                        {post.type === 'skill' && (
                          <button onClick={onOpenSkills} className="inline-flex items-center gap-2 rounded-md border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                            <Wand2 className="h-4 w-4" />
                            去技能广场
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <button onClick={() => toggleLike(post)} className={cn('inline-flex items-center gap-1.5 hover:text-red-500', liked && 'text-red-500')}>
                          <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
                          {post.likes + (liked ? 1 : 0)}
                        </button>
                        <button onClick={() => toggleFavorite(post)} className={cn('inline-flex items-center gap-1.5 hover:text-blue-600', saved && 'text-blue-600')}>
                          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                          {post.favorites + (saved ? 1 : 0)}
                        </button>
                        <button onClick={() => openCommentPlaceholder(post)} className="inline-flex items-center gap-1.5 hover:text-violet-600">
                          <MessageCircle className="h-4 w-4" />
                          {post.comments}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <aside className="space-y-5">
          <SidePanel title="热门话题">
            {['开场如何抓住读者', '角色动机怎么写', '世界观构建', '写作卡壳怎么办', 'Prompt 模板分享'].map((topic, index) => (
              <div key={topic} className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-slate-50">
                <span><b className="mr-2 text-orange-500">{index + 1}</b># {topic}</span>
                <span className="text-slate-400">{index === 0 ? '2.1w' : `${9 - index}.8k`}</span>
              </div>
            ))}
          </SidePanel>

          <SidePanel title="技能推荐">
            {['黄金第一章生成器', '人物 OOC 检查', '世界观整理'].map((skill) => (
              <button key={skill} onClick={onOpenSkills} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-slate-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600"><Star className="h-4 w-4" /></span>
                <span className="text-sm font-semibold text-slate-800">{skill}</span>
              </button>
            ))}
          </SidePanel>

          <SidePanel title="我的收藏">
            <p className="text-sm leading-6 text-slate-600">已收藏 {favoriteCount} 条分享。收藏数据当前保存在本地浏览器。</p>
          </SidePanel>

          <div className="rounded-lg border border-violet-100 bg-gradient-to-br from-white to-violet-50 p-5">
            <h3 className="font-bold text-slate-950">分享你的 Prompt 模板</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">本轮保留发布入口占位，后续可接入轻量发布流程。</p>
            <button onClick={() => setNotice({ title: '发布占位', message: '轻社区 MVP 暂不实现公开发布流程，只保留入口和展示结构。' })} className="mt-4 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500">
              去发布 Prompt
            </button>
          </div>
        </aside>
      </div>

      <PostDetail
        post={selectedPost}
        saved={selectedPost ? favorites.includes(selectedPost.id) : false}
        onClose={() => setSelectedPost(null)}
        onCopy={copyPrompt}
        onFavorite={toggleFavorite}
        onOpenSkills={onOpenSkills}
      />
      <NoticeDialog notice={notice} onClose={() => setNotice(null)} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-slate-950">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  )
}

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-slate-950">{title}</h2>
      {children}
    </section>
  )
}

function PostDetail({
  post,
  saved,
  onClose,
  onCopy,
  onFavorite,
  onOpenSkills,
}: {
  post: CommunityPost | null
  saved: boolean
  onClose: () => void
  onCopy: (post: CommunityPost) => void
  onFavorite: (post: CommunityPost) => void
  onOpenSkills: () => void
}) {
  if (!post) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm">
      <section className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', postTypeStyles[post.type])}>{typeLabels[post.type]}</span>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">{post.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{post.author} · {post.createdAt}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-5 whitespace-pre-line rounded-md bg-slate-50 p-4 text-sm leading-7 text-slate-700">{post.content}</p>

        {post.prompt && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-md border border-violet-100 bg-violet-50/60 p-4 text-sm leading-6 text-slate-700">
            {post.prompt}
          </pre>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">{tag}</span>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {post.prompt && (
            <button onClick={() => onCopy(post)} className="rounded-md border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">复制 Prompt</button>
          )}
          {post.type === 'skill' && (
            <button onClick={onOpenSkills} className="rounded-md border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">查看推荐技能</button>
          )}
          <button onClick={() => onFavorite(post)} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            {saved ? '取消收藏' : '收藏'}
          </button>
        </div>
      </section>
    </div>
  )
}

function NoticeDialog({
  notice,
  onClose,
}: {
  notice: { title: string; message: string } | null
  onClose: () => void
}) {
  if (!notice) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/20 p-6">
      <section className="w-full max-w-sm rounded-lg border border-white/70 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-950">{notice.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{notice.message}</p>
        <button onClick={onClose} className="mt-5 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">知道了</button>
      </section>
    </div>
  )
}
