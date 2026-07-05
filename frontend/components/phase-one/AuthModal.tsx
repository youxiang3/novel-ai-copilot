'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Lock, MessageCircle, ShieldCheck, UserRound, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type AuthTab = 'login' | 'register'
export type AuthReason = 'login' | 'save-official'

export interface AuthPayload {
  mode: AuthTab
  username: string
  account: string
  password: string
}

export function AuthModal({
  open,
  reason,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  reason: AuthReason
  loading: boolean
  error: string
  onClose: () => void
  onSubmit: (payload: AuthPayload) => void
}) {
  const [tab, setTab] = useState<AuthTab>('login')
  const [loginAccount, setLoginAccount] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [registerName, setRegisterName] = useState('')
  const [registerContact, setRegisterContact] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirm, setRegisterConfirm] = useState('')
  const [captchaChecked, setCaptchaChecked] = useState(false)
  const [agreementChecked, setAgreementChecked] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) return
    setTab('login')
    setLocalError('')
  }, [open, reason])

  if (!open) return null

  const title = reason === 'save-official' ? '保存作品需要登录' : '登录易写'
  const subtitle = reason === 'save-official'
    ? '登录后会继续刚才的保存动作，并把本地临时草稿转为正式作品。'
    : '登录后可以同步正式作品，继续你的创作工作流。'
  const visibleError = localError || error

  function submitLogin() {
    setLocalError('')
    if (!loginAccount.trim() || !loginPassword.trim()) {
      setLocalError('请输入账号和密码。')
      return
    }
    onSubmit({ mode: 'login', username: loginAccount.trim(), account: loginAccount.trim(), password: loginPassword })
  }

  function submitRegister() {
    setLocalError('')
    if (!registerName.trim() || !registerContact.trim() || !registerPassword.trim()) {
      setLocalError('请填写用户名、邮箱或手机号和密码。')
      return
    }
    if (registerPassword !== registerConfirm) {
      setLocalError('两次输入的密码不一致。')
      return
    }
    if (!captchaChecked) {
      setLocalError('请先完成图形验证占位。')
      return
    }
    if (!agreementChecked) {
      setLocalError('请先勾选用户协议。')
      return
    }
    onSubmit({ mode: 'register', username: registerName.trim(), account: registerContact.trim(), password: registerPassword })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-sm">
      <section className="grid w-full max-w-5xl grid-cols-[0.9fr_1.1fr] overflow-hidden rounded-lg border border-white/70 bg-white shadow-2xl">
        <aside className="bg-[linear-gradient(135deg,#172554,#4f46e5_58%,#7c3aed)] p-8 text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm">
            <ShieldCheck className="h-4 w-4" />
            易写账号
          </div>
          <h2 className="mt-8 text-3xl font-semibold">{title}</h2>
          <p className="mt-4 text-sm leading-7 text-blue-50/85">{subtitle}</p>
          <div className="mt-8 space-y-4 rounded-md border border-white/16 bg-white/10 p-5 text-sm leading-6">
            <Feature text="云端保存作品，避免本地草稿丢失" />
            <Feature text="登录后继续执行刚才的保存动作" />
            <Feature text="临时草稿会转入正式作品区" />
          </div>
        </aside>

        <div className="p-7">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm text-slate-500">当前仅做轻量账号模拟，手机号或邮箱作为唯一账号标识。</p>
            </div>
            <button onClick={onClose} disabled={loading} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="关闭">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-md bg-slate-100 p-1">
            <button onClick={() => setTab('login')} className={cn('rounded px-4 py-2 text-sm font-semibold', tab === 'login' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500')}>登录</button>
            <button onClick={() => setTab('register')} className={cn('rounded px-4 py-2 text-sm font-semibold', tab === 'register' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500')}>注册</button>
          </div>

          {visibleError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{visibleError}</div>
          )}

          {tab === 'login' ? (
            <div className="mt-5 space-y-4">
              <Field icon={UserRound} value={loginAccount} onChange={setLoginAccount} placeholder="账号 / 手机号 / 邮箱" />
              <Field icon={Lock} value={loginPassword} onChange={setLoginPassword} placeholder="密码" type="password" />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                记住我
              </label>
              <button onClick={submitLogin} disabled={loading} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-violet-600 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                登录并继续
              </button>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Field icon={UserRound} value={registerName} onChange={setRegisterName} placeholder="用户名" />
              <Field icon={UserRound} value={registerContact} onChange={setRegisterContact} placeholder="邮箱或手机号" />
              <Field icon={Lock} value={registerPassword} onChange={setRegisterPassword} placeholder="密码" type="password" />
              <Field icon={Lock} value={registerConfirm} onChange={setRegisterConfirm} placeholder="确认密码" type="password" />
              <button onClick={() => setCaptchaChecked((value) => !value)} className={cn('col-span-2 flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-medium', captchaChecked ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600')}>
                <CheckCircle2 className="h-4 w-4" />
                {captchaChecked ? '图形验证已完成' : '点击完成图形验证码占位'}
              </button>
              <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
                <input checked={agreementChecked} onChange={(event) => setAgreementChecked(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                我已阅读并同意《用户协议》《隐私政策》
              </label>
              <button onClick={submitRegister} disabled={loading} className="col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-violet-600 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                注册并继续
              </button>
            </div>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            或
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <button disabled className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 opacity-70">
            <MessageCircle className="h-4 w-4" />
            微信授权登录（占位）
          </button>
        </div>
      </section>
    </div>
  )
}

function Field({
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  icon: typeof UserRound
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <label className="relative block">
      <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none ring-violet-500/15 focus:ring-4"
        placeholder={placeholder}
      />
    </label>
  )
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-blue-100" />
      <span>{text}</span>
    </div>
  )
}
