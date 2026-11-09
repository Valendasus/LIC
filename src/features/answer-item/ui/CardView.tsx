'use client'

import { useEffect, useRef, useState } from 'react'
import type { CardItem, ViewProps } from '@/entities/practice-item'
import type { Grade } from '@/entities/schedule'
import { cn } from '@/shared/lib'
import { Kbd, RichText } from '@/shared/ui'

/** Оценки словами человека, а не терминами алгоритма (docs/DESIGN.md, 4.5). Срок — словами под ними. */
const GRADE_BUTTONS: { grade: Grade; label: string; dot: string }[] = [
  { grade: 1, label: 'Не вспомнил', dot: 'bg-bad' },
  { grade: 2, label: 'С трудом', dot: 'bg-warn' },
  { grade: 3, label: 'Вспомнил', dot: 'bg-good' },
  { grade: 4, label: 'Легко', dot: 'bg-info' },
]

const TYPE_LABEL = { term: 'Термин', qa: 'Вопрос', code: 'Код' } as const

/** «завтра» → «вернётся завтра», «через 2 дня» → «вернётся через 2 дня». */
const returns = (interval: string) => `вернётся ${interval}`

/** Карточка: вопрос, переворот кликом, пробелом или Enter, затем самооценка — кнопками или клавишами 1–4. */
export function CardView({ item, intervals, free, onGrade, status }: ViewProps<CardItem> & { status: string }) {
  const [flipped, setFlipped] = useState(false)
  const cardRef = useRef<HTMLButtonElement>(null)

  useEffect(() => cardRef.current?.focus({ preventScroll: true }), [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null
      // Зажатая клавиша шлёт повторы: карточка не должна мигать, а оценка — ставиться сама.
      if (event.repeat || target?.closest('input, textarea, select, [contenteditable]')) return
      if (event.key === ' ' || event.key === 'Enter') {
        // На самой карточке и кнопках срабатывает их собственный клик — не переворачиваем дважды.
        if (target?.closest('a, button')) return
        event.preventDefault()
        setFlipped((value) => !value)
        return
      }
      if (!flipped) return
      if (free) {
        if (event.key === '1') onGrade(1)
        if (event.key === '2') onGrade(3)
        return
      }
      if (['1', '2', '3', '4'].includes(event.key)) onGrade(Number(event.key) as Grade)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, free, onGrade])

  return (
    <div className="flex flex-col gap-7">
      <button
        ref={cardRef}
        type="button"
        onClick={() => setFlipped((value) => !value)}
        aria-label={flipped ? 'Карточка: ответ. Нажмите, чтобы вернуться к вопросу' : 'Карточка: вопрос. Нажмите, чтобы увидеть ответ'}
        className="block w-full rounded-[28px] text-left focus-visible:outline-offset-4"
      >
        {/* В DOM всегда одна сторона: переворот — анимация появления, без 3D-сцены (одинаково во всех браузерах, включая Safari). */}
        <div
          key={flipped ? 'back' : 'front'}
          data-side={flipped ? 'back' : 'front'}
          className="flex min-h-[22rem] animate-[card-flip_300ms_ease-out] flex-col gap-5 rounded-[28px] bg-surface px-6 py-7 motion-reduce:animate-none sm:px-10"
        >
          <span className="flex justify-between gap-3 text-[13px] text-muted">
            <span>
              {TYPE_LABEL[item.type]}
              {item.reversed ? ' · обратная' : ''} · {item.topicTitle}
            </span>
            <span className="rounded-full bg-raised px-2.5 text-xs leading-6 text-fg">{status}</span>
          </span>
          <span className="flex flex-1 flex-col justify-center gap-6">
            <RichText text={item.front} className={cn('text-center', item.type === 'term' && !item.reversed ? 'text-[28px] leading-tight font-semibold' : 'text-xl leading-snug font-medium')} />
            {flipped ? (
              <>
                <span aria-hidden className="block h-px bg-raised" />
                <span className="flex flex-col gap-4 text-[17px] leading-relaxed">
                  <RichText text={item.back} />
                  {item.example && <RichText text={item.example} className="text-[15px] text-muted" />}
                </span>
              </>
            ) : (
              <span className="text-center text-sm text-muted">
                Вспомните ответ, затем переверните — <Kbd>Пробел</Kbd>
              </span>
            )}
          </span>
        </div>
      </button>

      {flipped ? (
        <div className="flex flex-col gap-3">
          {free ? (
            <div className="grid grid-cols-2 gap-2.5">
              <GradeButton onClick={() => onGrade(1)} label="Ещё раз" hint="покажу в конце сессии" keyHint="1" dot="bg-bad" />
              <GradeButton onClick={() => onGrade(3)} label="Помню" hint="без расписания" keyHint="2" dot="bg-good" primary />
            </div>
          ) : (
            <>
              <p id="grade-title" className="text-center text-sm text-muted">
                Насколько легко вспомнили? От ответа зависит, когда карточка вернётся.
              </p>
              <div role="group" aria-labelledby="grade-title" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {GRADE_BUTTONS.map((button) => (
                  <GradeButton key={button.grade} onClick={() => onGrade(button.grade)} label={button.label} hint={returns(intervals[button.grade])} keyHint={String(button.grade)} dot={button.dot} primary={button.grade === 3} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-muted">Сначала вспомните сами — так память закрепляется сильнее, чем при узнавании.</p>
      )}
    </div>
  )
}

function GradeButton({ onClick, label, hint, keyHint, dot, primary = false }: { onClick: () => void; label: string; hint: string; keyHint: string; dot: string; primary?: boolean }) {
  return (
    <button
      type="button"
      data-grade
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-start gap-1 rounded-[18px] px-4 pt-4 pb-3.5 text-left transition-colors duration-150',
        primary ? 'bg-primary text-on-primary hover:bg-ink-300' : 'border border-line bg-surface hover:border-line-strong hover:bg-raised',
      )}
    >
      <span className="flex items-center gap-2 text-base font-semibold">
        <span aria-hidden className={cn('size-2 rounded-full', primary ? 'bg-good-deep' : dot)} />
        {label}
      </span>
      <span className={cn('text-[13px]', primary ? 'text-ink-700' : 'text-muted')}>{hint}</span>
      <Kbd tone={primary ? 'on-primary' : 'default'} className="absolute top-3 right-3">
        {keyHint}
      </Kbd>
    </button>
  )
}
