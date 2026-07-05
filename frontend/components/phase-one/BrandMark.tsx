import { Feather } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BrandMark({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', dark ? 'text-white' : 'text-slate-950')}>
      <span className={cn('flex items-center justify-center rounded-md', compact ? 'h-8 w-8' : 'h-10 w-10', dark ? 'bg-white/10 text-white' : 'bg-slate-800 text-white')}>
        <Feather className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
      </span>
      <div>
        <div className={cn('font-semibold tracking-normal', compact ? 'text-xl' : 'text-2xl')}>易写</div>
        {!compact && <div className={cn('text-xs', dark ? 'text-slate-100/80' : 'text-slate-500')}>长篇写作工作台</div>}
      </div>
    </div>
  )
}
