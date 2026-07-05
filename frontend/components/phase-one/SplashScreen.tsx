'use client'

import type { CSSProperties } from 'react'
import { BarChart3, FolderKanban, PenLine, Sparkles } from 'lucide-react'
import { BrandMark } from './BrandMark'

const features = [
  { icon: PenLine, title: '专注创作', text: '沉浸写作' },
  { icon: Sparkles, title: 'AI 灵感助力', text: '拓展思路' },
  { icon: FolderKanban, title: '作品管理', text: '安全可靠' },
  { icon: BarChart3, title: '成长陪伴', text: '见证成长' },
]

const papers = [
  { className: 'left-[47%] top-[12%] h-14 w-24 delay-300', rotate: '8deg' },
  { className: 'right-[11%] top-[17%] h-16 w-24 delay-700', rotate: '17deg' },
  { className: 'left-[58%] top-[68%] h-12 w-20 delay-500', rotate: '-10deg' },
]

const motes = [
  'left-[48%] top-[30%] h-1.5 w-1.5 delay-0 bg-amber-100',
  'left-[58%] top-[22%] h-2 w-2 delay-500 bg-sky-100',
  'right-[25%] top-[25%] h-1.5 w-1.5 delay-1000 bg-white',
  'right-[14%] top-[42%] h-2 w-2 delay-700 bg-amber-100',
  'left-[64%] top-[57%] h-1.5 w-1.5 delay-300 bg-sky-100',
]

export function SplashScreen({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_70%_28%,rgba(124,92,255,0.28),transparent_28%),radial-gradient(circle_at_42%_70%,rgba(79,140,255,0.18),transparent_32%),linear-gradient(135deg,#08112c_0%,#111b4a_48%,#050814_100%)] text-white">
      <img
        src="/assets/yixie-splash-hero.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,18,0.88)_0%,rgba(7,18,44,0.68)_34%,rgba(10,16,38,0.16)_62%,rgba(6,11,27,0.06)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#030712]/80 via-[#030712]/22 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-[58%] bg-[radial-gradient(circle_at_58%_38%,rgba(255,255,255,0.20),transparent_18%),radial-gradient(circle_at_54%_55%,rgba(124,92,255,0.17),transparent_25%)]" />
      <div className="splash-inspiration-mist absolute inset-0 opacity-80" />

      {papers.map((paper) => (
        <span
          key={paper.className}
          className={`splash-paper absolute z-10 rounded-sm border border-white/18 bg-white/14 shadow-[0_0_20px_rgba(255,255,255,0.12)] backdrop-blur-sm ${paper.className}`}
          style={{ '--paper-rotate': paper.rotate } as CSSProperties}
        >
          <span className="mx-3 mt-3 block h-px bg-white/32" />
          <span className="mx-3 mt-3 block h-px w-3/4 bg-white/20" />
          <span className="mx-3 mt-3 block h-px w-1/2 bg-white/20" />
        </span>
      ))}

      {motes.map((mote) => (
        <span key={mote} className={`splash-spark absolute z-10 rounded-full shadow-[0_0_16px_rgba(255,255,255,0.95)] ${mote}`} />
      ))}

      <div className="relative z-20 mx-auto flex min-h-screen max-w-7xl flex-col px-[72px] py-12">
        <header className="flex items-center justify-between">
          <BrandMark dark compact />
          <button onClick={onLogin} className="rounded-md border border-white/14 bg-white/8 px-4 py-2 text-sm text-blue-50/86 backdrop-blur-md transition hover:bg-white/14 hover:text-white">
            已有账号？登录
          </button>
        </header>

        <section className="flex flex-1 items-center pb-28">
          <div className="max-w-[680px]">
            <h1 className="text-[64px] font-extrabold leading-[1.12] tracking-normal text-white drop-shadow-[0_0_28px_rgba(180,210,255,0.38)]">
              让灵感落笔成故事
            </h1>
            <p className="mt-6 text-[22px] leading-9 text-blue-50/86">
              专为中文创作者打造的 AI 写作工作台
            </p>
            <button
              onClick={onStart}
              className="splash-start-button mt-11 flex h-[58px] w-[240px] items-center justify-center gap-3 rounded-[18px] border border-white/22 bg-[linear-gradient(135deg,rgba(79,140,255,0.92),rgba(124,92,255,0.92))] text-[19px] font-semibold text-white backdrop-blur-2xl transition hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(101,129,255,0.62)]"
            >
              开始创作
              <PenLine className="h-5 w-5" />
            </button>
          </div>
        </section>

        <div className="absolute bottom-14 left-[72px] right-[72px] flex max-w-4xl gap-6 rounded-md border border-white/12 bg-[#07122c]/36 px-5 py-3 backdrop-blur-2xl">
          {features.map((item) => (
            <div key={item.title} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-blue-100 ring-1 ring-white/10">
                <item.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5 text-white">{item.title}</span>
                <span className="block text-xs leading-4 text-blue-100/58">{item.text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
