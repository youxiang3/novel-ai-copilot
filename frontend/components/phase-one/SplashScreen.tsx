'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { BookOpen, Clock3, FolderKanban, PenLine } from 'lucide-react'
import { BrandMark } from './BrandMark'

const features = [
  { icon: PenLine, title: '当前章节', text: '正文、摘要、检查' },
  { icon: FolderKanban, title: '作品库', text: '草稿、正式作品、导出' },
  { icon: BookOpen, title: '长篇资料', text: '人物、世界观、伏笔' },
  { icon: Clock3, title: '更新节奏', text: '字数、章节、同步状态' },
]

const manuscripts = [
  { className: 'hero-manuscript-far left-[47%] top-[15%] hidden h-14 w-24 rotate-[-8deg] lg:block', delay: '-1.2s' },
  { className: 'hero-manuscript-near right-[10%] top-[17%] hidden h-16 w-28 rotate-[10deg] md:block', delay: '-3.8s' },
  { className: 'hero-manuscript-mid right-[31%] bottom-[18%] hidden h-12 w-20 rotate-[-13deg] xl:block', delay: '-5.4s' },
  { className: 'hero-manuscript-far left-[52%] bottom-[29%] hidden h-10 w-16 rotate-[9deg] lg:block', delay: '-2.6s' },
]

export function SplashScreen({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const [parallax, setParallax] = useState({ x: 0, y: 0 })

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return
    const x = (event.clientX / window.innerWidth - 0.5) * 2
    const y = (event.clientY / window.innerHeight - 0.5) * 2
    setParallax({ x, y })
  }

  const parallaxStyle = {
    '--hero-parallax-x': `${parallax.x.toFixed(3)}`,
    '--hero-parallax-y': `${parallax.y.toFixed(3)}`,
  } as CSSProperties

  return (
    <main
      className="yixie-dynamic-hero relative min-h-screen overflow-hidden bg-[#edf1ee] text-slate-950"
      style={parallaxStyle}
      onPointerMove={handlePointerMove}
    >
      <HomeHeroBackground />
      <InspirationParticles />
      <FloatingManuscripts />
      <InspirationTrail />

      <div className="relative z-20 mx-auto flex min-h-screen max-w-[1680px] flex-col px-7 py-6 sm:px-10 lg:px-14 xl:px-20">
        <header className="flex items-center justify-between">
          <BrandMark compact />
          <button onClick={onLogin} className="rounded-md border border-slate-300/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:border-slate-400 hover:bg-white">
            登录
          </button>
        </header>

        <section className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(420px,0.38fr)_minmax(560px,0.46fr)] xl:gap-16">
          <div className="hero-copy max-w-[560px]">
            <p className="text-sm font-semibold tracking-[0.12em] text-teal-900">STORY AWAKENS HERE</p>
            <h1 className="mt-5 max-w-[520px] whitespace-pre-line text-[38px] font-semibold leading-[1.12] tracking-normal text-slate-950 sm:text-[48px] lg:text-[52px]">
              {'灵感落在指尖，\n故事便有了呼吸'}
            </h1>
            <p className="mt-6 max-w-xl whitespace-pre-line text-base leading-8 text-slate-700 sm:text-lg">
              {'把章节、人物、世界观、记忆与 IP，\n都安放在同一个地方。\n在这里，灵感被唤醒，文字被点亮，\n每一个故事，都值得被继续书写。'}
            </p>
            <div className="hero-action mt-9">
              <button
                onClick={onStart}
                className="hero-primary-button group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-md bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.16)] transition hover:bg-slate-800"
              >
                <span className="hero-button-shine" />
                <PenLine className="relative z-10 h-4 w-4" />
                <span className="relative z-10">进入工作台</span>
              </button>
            </div>
            <button onClick={onLogin} className="mt-4 text-sm leading-6 text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline">
              已有作品需要同步？登录账号
            </button>
          </div>

          <WorkspacePreview onStart={onStart} />
        </section>
      </div>
    </main>
  )
}

function HomeHeroBackground() {
  return (
    <>
      <img
        src="/assets/yixie-splash-hero.png"
        alt=""
        aria-hidden="true"
        className="hero-scene-image absolute inset-y-0 right-0 h-full w-[68%] object-cover object-center opacity-[0.72]"
      />
      <div className="hero-paper-wash absolute inset-0" />
      <div className="hero-night-glow absolute inset-y-0 right-0 w-[68%]" />
      <div className="hero-star-depth hero-star-depth-far absolute inset-y-0 right-0 w-[68%]" />
      <div className="hero-star-depth hero-star-depth-near absolute inset-y-0 right-0 w-[68%]" />
      <div className="hero-paper-grain absolute inset-0" />
      <div className="hero-bottom-fade absolute inset-x-0 bottom-0 h-48" />
      <div className="hero-breath-light absolute right-[5%] top-[8%] h-[46%] w-[52%]" />
    </>
  )
}

function InspirationParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number | undefined>(undefined)
  const meteorRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const activeCanvas = canvas

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reducedMotion.matches) return

    const context = activeCanvas.getContext('2d')
    if (!context) return
    const activeContext = context

    type Particle = { x: number; y: number; size: number; speed: number; drift: number; phase: number; hue: number }
    type Meteor = { x: number; y: number; life: number; speed: number; length: number }

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let meteors: Meteor[] = []
    let lastTime = performance.now()
    let lastMeteorCycle = -1
    let running = true

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = activeCanvas.clientWidth
      height = activeCanvas.clientHeight
      activeCanvas.width = Math.floor(width * ratio)
      activeCanvas.height = Math.floor(height * ratio)
      activeContext.setTransform(ratio, 0, 0, ratio, 0, 0)
      const count = width < 720 ? 24 : 58
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.7 + Math.random() * 1.7,
        speed: 4 + Math.random() * 9,
        drift: -4 + Math.random() * 8,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.38 ? 42 : 174,
      }))
    }

    function draw(now: number) {
      if (!running) return
      const delta = Math.min(0.033, (now - lastTime) / 1000)
      lastTime = now
      activeContext.clearRect(0, 0, width, height)

      particles.forEach((particle) => {
        particle.y -= particle.speed * delta
        particle.x += Math.sin(now * 0.0004 + particle.phase) * particle.drift * delta
        if (particle.y < -8) {
          particle.y = height + 8
          particle.x = Math.random() * width
        }
        const pulse = 0.36 + Math.sin(now * 0.0015 + particle.phase) * 0.28
        const gradient = activeContext.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 6)
        gradient.addColorStop(0, `hsla(${particle.hue}, 88%, 74%, ${0.38 + pulse * 0.4})`)
        gradient.addColorStop(1, `hsla(${particle.hue}, 88%, 74%, 0)`)
        activeContext.fillStyle = gradient
        activeContext.beginPath()
        activeContext.arc(particle.x, particle.y, particle.size * 6, 0, Math.PI * 2)
        activeContext.fill()
      })

      meteorRef.current += delta
      const cycle = (now % 12000) / 1000
      const cycleIndex = Math.floor(now / 12000)
      if (cycle > 8.1 && cycle < 8.35 && lastMeteorCycle !== cycleIndex && meteors.length < 2 && width > 760) {
        meteors.push({
          x: width * (0.55 + Math.random() * 0.34),
          y: height * (0.08 + Math.random() * 0.28),
          life: 0,
          speed: 380 + Math.random() * 80,
          length: 130 + Math.random() * 70,
        })
        lastMeteorCycle = cycleIndex
        meteorRef.current = 0
      }

      meteors = meteors.filter((meteor) => {
        meteor.life += delta
        meteor.x -= meteor.speed * delta
        meteor.y += meteor.speed * 0.32 * delta
        const alpha = Math.max(0, 1 - meteor.life / 1.2)
        activeContext.save()
        activeContext.translate(meteor.x, meteor.y)
        activeContext.rotate(-0.32)
        const gradient = activeContext.createLinearGradient(0, 0, meteor.length, 0)
        gradient.addColorStop(0, `rgba(255,255,255,${0.78 * alpha})`)
        gradient.addColorStop(0.26, `rgba(250,204,21,${0.44 * alpha})`)
        gradient.addColorStop(1, 'rgba(250,204,21,0)')
        activeContext.strokeStyle = gradient
        activeContext.lineWidth = 1.4
        activeContext.beginPath()
        activeContext.moveTo(0, 0)
        activeContext.lineTo(meteor.length, 0)
        activeContext.stroke()
        activeContext.restore()
        return alpha > 0.02
      })

      frameRef.current = window.requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    frameRef.current = window.requestAnimationFrame(draw)

    return () => {
      running = false
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="hero-particle-canvas pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true" />
}

function FloatingManuscripts() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      {manuscripts.map((paper) => (
        <span key={paper.className} className={`hero-manuscript absolute rounded-sm border border-white/35 bg-white/34 shadow-[0_16px_42px_rgba(15,23,42,0.12)] backdrop-blur-sm ${paper.className}`} style={{ animationDelay: paper.delay }}>
          <span className="mx-3 mt-3 block h-px bg-slate-500/20" />
          <span className="mx-3 mt-3 block h-px w-3/4 bg-slate-500/14" />
          <span className="mx-3 mt-3 block h-px w-1/2 bg-slate-500/14" />
        </span>
      ))}
    </div>
  )
}

function InspirationTrail() {
  return (
    <svg className="hero-inspiration-trail pointer-events-none absolute inset-0 z-10 hidden h-full w-full lg:block" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="heroOrbitGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="36%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="62%" stopColor="rgba(191,224,228,0.24)" />
          <stop offset="100%" stopColor="rgba(47,127,134,0)" />
        </linearGradient>
        <radialGradient id="heroOrbitSpark" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="45%" stopColor="rgba(147,207,216,0.46)" />
          <stop offset="100%" stopColor="rgba(47,127,134,0)" />
        </radialGradient>
        <filter id="heroTrailGlow">
          <feGaussianBlur stdDeviation="2.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="hero-orbit-field">
        <ellipse className="hero-orbit-line hero-orbit-line-wide" cx="1030" cy="382" rx="360" ry="86" transform="rotate(-12 1030 382)" />
        <ellipse className="hero-orbit-line hero-orbit-line-mid" cx="1056" cy="388" rx="268" ry="58" transform="rotate(-12 1056 388)" />
        <ellipse className="hero-orbit-line hero-orbit-line-inner" cx="1084" cy="392" rx="176" ry="34" transform="rotate(-12 1084 392)" />
        <circle className="hero-orbit-spark hero-orbit-spark-a" cx="1326" cy="340" r="7" fill="url(#heroOrbitSpark)" />
        <circle className="hero-orbit-spark hero-orbit-spark-b" cx="1210" cy="432" r="5" fill="url(#heroOrbitSpark)" />
      </g>
    </svg>
  )
}

function WorkspacePreview({ onStart }: { onStart: () => void }) {
  return (
    <div className="hero-workspace-panel relative max-w-[640px] justify-self-start overflow-hidden rounded-lg border border-white/60 bg-white/66 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl xl:ml-3">
      <div className="relative z-10 flex items-center justify-between border-b border-slate-200/70 pb-4">
        <div>
          <p className="text-base font-semibold text-slate-950">今日工作区</p>
          <p className="mt-1 text-xs text-slate-500">把火星落到纸上</p>
        </div>
        <span className="rounded bg-[#e7f3f4]/90 px-2 py-1 text-xs font-semibold text-slate-600">本地优先</span>
      </div>
      <div className="relative z-10 mt-5 grid gap-4">
        <div className="hero-current-chapter rounded-md border border-white/70 bg-[#f6fbfa]/82 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="block text-base font-semibold text-slate-900">第一章：未命名章节</span>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">继续正文、生成摘要，或从当前章节生成短剧 / 互动剧情游戏设定包。</p>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">草稿</span>
          </div>
          <div className="hero-progress-track mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="hero-progress-fill h-2 w-[42%] rounded-full bg-[#2f7f86]" />
          </div>
          <button onClick={onStart} className="hero-secondary-button mt-4 inline-flex h-9 items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50">
            继续写作
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {features.map((item) => (
            <div key={item.title} className="rounded-md border border-white/50 bg-white/58 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur">
              <item.icon className="h-4 w-4 text-[#2f7f86]" />
              <div className="mt-2 text-sm font-semibold text-slate-900">{item.title}</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
