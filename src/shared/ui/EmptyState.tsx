import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'

/** Пустое состояние: одна фраза о том, что здесь будет, и одно действие. */
export function EmptyState({ icon, title, children, action, className }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-panel bg-surface px-6 py-12 text-center', className)}>
      {icon && <span className="text-muted" aria-hidden>{icon}</span>}
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="max-w-md text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Заглушка на время загрузки — той же формы, что контент. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn('block animate-pulse rounded-card bg-surface', className)} />
}
