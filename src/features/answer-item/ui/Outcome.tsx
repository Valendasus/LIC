'use client'

import { useEffect, useRef } from 'react'
import type { Grade } from '@/entities/schedule'
import { RichText } from '@/shared/ui'

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
    <div className="flex animate-[rise_200ms_ease-out] flex-col gap-4" role="status">
      <div className={`rounded-card px-5 py-4 ${correct ? 'bg-good-soft' : 'bg-bad-soft'}`}>
        <p className={`mb-1 font-semibold ${correct ? 'text-good' : 'text-bad'}`}>{correct ? 'Верно' : 'Неверно'}</p>
        <RichText text={explain} className="text-[15px] leading-relaxed" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          ref={next}
          type="button"
          onClick={() => onGrade(correct ? 3 : 1)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-on-primary transition-colors duration-150 hover:bg-ink-300"
        >
          Дальше
          {!free && <span className="text-xs font-normal text-ink-700">вернётся {intervals[correct ? 3 : 1]}</span>}
        </button>
        {correct && (
          <button type="button" onClick={() => onGrade(2)} className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm transition-colors duration-150 hover:border-line-strong hover:bg-surface">
            Угадал — повторить раньше
            {!free && <span className="text-xs text-muted">{intervals[2]}</span>}
          </button>
        )}
      </div>
    </div>
  )
}
