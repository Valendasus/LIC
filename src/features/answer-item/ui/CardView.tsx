'use client'

import { useEffect, useRef, useState } from 'react'
import { RichText } from '@/shared/ui'
import type { CardItem } from '@/entities/practice-item'
import type { Grade } from '@/entities/schedule'
import type { ViewProps } from '@/entities/practice-item'

const GRADE_BUTTONS: { grade: Grade; label: string; style: string }[] = [
  { grade: 1, label: 'Снова', style: 'border-bad/60 hover:bg-bad-soft' },
  { grade: 2, label: 'Трудно', style: 'border-line hover:bg-accent-soft' },
  { grade: 3, label: 'Хорошо', style: 'border-good/60 hover:bg-good-soft' },
  { grade: 4, label: 'Легко', style: 'border-line hover:bg-good-soft' },
]

const TYPE_LABEL = { term: 'Термин', qa: 'Вопрос', code: 'Код' } as const

/** Карточка с переворотом. Оценка — самооценка: клавиши 1–4 или кнопки. */
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
    <div>
      {/*
        В DOM всегда одна сторона. Переворот — анимация появления новой стороны (поворот от ребра),
        без 3D-сцены и backface-visibility: так карточка одинаково работает во всех браузерах,
        включая Safari, где обратная сторона 3D-карточки может просвечивать или отражаться зеркально.
      */}
      <button
        ref={cardRef}
        type="button"
        onClick={() => setFlipped((value) => !value)}
        aria-label={flipped ? 'Карточка: ответ. Нажмите, чтобы вернуться к вопросу' : 'Карточка: вопрос. Нажмите, чтобы увидеть ответ'}
        className="block w-full rounded-xl text-left focus-visible:outline-offset-4"
      >
        {flipped ? (
          <Face key="back" side="back" meta="Ответ" status={item.topicTitle}>
            <RichText text={item.back} className="text-lg" />
            {item.example && <RichText text={item.example} className="mt-4 text-sm" />}
          </Face>
        ) : (
          <Face key="front" side="front" meta={`${TYPE_LABEL[item.type]}${item.reversed ? ' · обратная' : ''}`} status={status}>
            <RichText text={item.front} className={item.type === 'term' && !item.reversed ? 'text-center text-2xl font-semibold' : 'text-lg'} />
            <p className="mt-6 text-center text-xs text-muted">Ответьте мысленно, затем переверните: клик, пробел или Enter</p>
          </Face>
        )}
      </button>

      <div className="mt-4 min-h-24">
        {flipped ? (
          free ? (
            <div className="grid grid-cols-2 gap-2">
              <GradeButton onClick={() => onGrade(1)} style={GRADE_BUTTONS[0].style} label="Ещё раз" hint="вернётся в конец · 1" />
              <GradeButton onClick={() => onGrade(3)} style={GRADE_BUTTONS[2].style} label="Помню" hint="2" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADE_BUTTONS.map((button) => (
                <GradeButton
                  key={button.grade}
                  onClick={() => onGrade(button.grade)}
                  style={button.style}
                  label={button.label}
                  hint={`${intervals[button.grade]} · ${button.grade}`}
                />
              ))}
            </div>
          )
        ) : (
          <p className="text-center text-sm text-muted">Сначала вспомните ответ сами — так память закрепляется сильнее, чем при узнавании.</p>
        )}
      </div>
    </div>
  )
}

function Face({ side, meta, status, children }: { side: 'front' | 'back'; meta: string; status: string; children: React.ReactNode }) {
  return (
    <div
      data-side={side}
      className={`flex min-h-72 animate-[card-flip_300ms_ease-out] flex-col rounded-xl border bg-surface p-6 shadow-sm motion-reduce:animate-none ${
        side === 'back' ? 'border-accent/50' : 'border-line'
      }`}
    >
      <div className="mb-4 flex justify-between gap-3 text-xs text-muted">
        <span>{meta}</span>
        <span className="truncate">{status}</span>
      </div>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
    </div>
  )
}

function GradeButton({ onClick, style, label, hint }: { onClick: () => void; style: string; label: string; hint: string }) {
  return (
    <button type="button" data-grade onClick={onClick} className={`rounded-lg border px-3 py-2.5 text-center transition-colors ${style}`}>
      <span className="block font-medium">{label}</span>
      <span className="block font-mono text-xs text-muted">{hint}</span>
    </button>
  )
}
