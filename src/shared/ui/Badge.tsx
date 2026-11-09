import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'

export type Tone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad' | 'info'

const SOFT: Record<Tone, string> = {
  neutral: 'bg-raised text-fg',
  accent: 'bg-accent-soft text-accent',
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  info: 'bg-info-soft text-info',
}

/** Метка-таблетка: уровень, сложность, статус. Статус никогда не передаётся одним цветом — в метке всегда есть слово. */
export function Badge({ children, tone = 'neutral', outline = false, icon, className }: { children: ReactNode; tone?: Tone; outline?: boolean; icon?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs leading-5 font-medium whitespace-nowrap',
        outline ? 'border border-line-strong text-fg' : SOFT[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
