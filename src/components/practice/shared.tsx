'use client'

import { useEffect, useRef } from 'react'
import { RichText } from '@/components/RichText'
import type { Grade } from '@/lib/srs'

export interface ViewProps<T> {
  item: T
  intervals: Record<Grade, string>
  free: boolean
  onGrade: (grade: Grade) => void
}

/**
 * Итог автопроверки. Оценку FSRS выводит платформа:
 * неверно → «Снова», верно → «Хорошо». Если ответ угадан, честнее отметить «Трудно» — элемент вернётся раньше.
 */
export function Outcome({
  correct,
  explain,
  onGrade,
  intervals,
  free,
}: {
  correct: boolean
  explain: string
  onGrade: (grade: Grade) => void
  intervals: Record<Grade, string>
  free: boolean
}) {
  const next = useRef<HTMLButtonElement>(null)
  useEffect(() => next.current?.focus({ preventScroll: true }), [])

  return (
    <div className="space-y-3" role="status">
      <div className={`rounded-lg px-4 py-3 ${correct ? 'bg-good-soft' : 'bg-warn-soft'}`}>
        <p className={`mb-1 font-semibold ${correct ? 'text-good' : 'text-warn'}`}>{correct ? 'Верно' : 'Неверно'}</p>
        <RichText text={explain} className="text-sm" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          ref={next}
          type="button"
          onClick={() => onGrade(correct ? 3 : 1)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface"
        >
          Дальше
          {!free && <span className="ml-2 font-mono text-xs opacity-80">{intervals[correct ? 3 : 1]}</span>}
        </button>
        {correct && (
          <button type="button" onClick={() => onGrade(2)} className="rounded-lg border border-line px-4 py-2 text-sm hover:border-accent">
            Угадал — повторить раньше
            {!free && <span className="ml-2 font-mono text-xs text-muted">{intervals[2]}</span>}
          </button>
        )}
      </div>
    </div>
  )
}

export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-[oklch(22%_0.02_260)] p-3 font-mono text-[13px] leading-relaxed text-[oklch(92%_0.01_260)]">
      <code>{code.replace(/\n$/, '')}</code>
    </pre>
  )
}

export function Panel({ label, status, children }: { label: string; status: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex justify-between gap-3 text-xs text-muted">
        <span>{label}</span>
        <span className="truncate">{status}</span>
      </div>
      {children}
    </div>
  )
}
