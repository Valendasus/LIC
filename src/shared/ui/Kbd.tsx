import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'

/** Клавиша: подсказка о горячих клавишах. */
export function Kbd({ children, tone = 'default', className }: { children: ReactNode; tone?: 'default' | 'on-primary'; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-md border px-1.5 font-mono text-[11px] leading-5 font-normal',
        tone === 'on-primary' ? 'border-ink-500 text-ink-700' : 'border-line text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
