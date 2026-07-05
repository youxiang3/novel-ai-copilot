import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '易写 - AI 写作工作台',
  description: '专为中文创作者打造的 AI 写作工作台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  )
}
