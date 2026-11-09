import { cn } from '@/shared/lib'
import type { Tone } from './Badge'

const FILL: Record<Exclude<Tone, 'neutral'>, string> = { accent: 'bg-accent', good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad', info: 'bg-info' }

/** Полоса прогресса. value — доля от 0 до 1. */
export function ProgressBar({ value, label, tone = 'accent', showValue = true, className }: { value: number; label: string; tone?: Exclude<Tone, 'neutral'>; showValue?: boolean; className?: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className={cn('h-full rounded-full transition-[width] duration-300', FILL[tone])} style={{ width: `${percent}%` }} />
      </div>
      {showValue && <span className="w-10 text-right font-mono text-xs text-muted tabular-nums">{percent}%</span>}
    </div>
  )
}

/** Кольцо прогресса: блоки курса и общий прогресс. */
export function ProgressRing({ value, label, size = 44, tone = 'accent', children }: { value: number; label: string; size?: number; tone?: 'accent' | 'good'; children?: React.ReactNode }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  const color = tone === 'good' ? 'var(--color-good)' : 'var(--color-accent)'
  const inner = Math.round(size * 0.78)
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="relative inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: `conic-gradient(${color} 0 ${percent}%, var(--color-raised) ${percent}% 100%)` }}
    >
      <span className="flex items-center justify-center rounded-full bg-surface" style={{ width: inner, height: inner }}>
        {children}
      </span>
    </span>
  )
}

export type Segment = 'good' | 'warn' | 'bad' | 'current' | 'todo'

const SEGMENT: Record<Segment, string> = { good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad', current: 'bg-fg', todo: 'bg-surface' }

/** Прогресс отрезками: каждый элемент сессии — свой отрезок, окрашенный по результату. */
export function SegmentBar({ segments, label, className }: { segments: Segment[]; label: string; className?: string }) {
  const done = segments.filter((segment) => segment !== 'todo' && segment !== 'current').length
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={segments.length} aria-valuenow={done} className={cn('flex gap-[3px]', className)}>
      {segments.map((segment, index) => (
        <span key={index} className={cn('h-1.5 min-w-0.5 flex-1 rounded-full transition-colors duration-200', SEGMENT[segment])} />
      ))}
    </div>
  )
}
