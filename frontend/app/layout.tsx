import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Novel AI Copilot - 小说创作工作站',
  description: 'AI-powered novel writing assistant',
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
