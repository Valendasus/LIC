'use client'

import { useState } from 'react'
import { RichText } from '@/shared/ui'
import type { QuizItem } from '@/entities/practice-item'
import { CodeBlock, Panel } from '@/shared/ui'
import type { ViewProps } from '@/entities/practice-item'
import { Outcome } from './Outcome'

/**
 * Квиз: один или несколько верных ответов.
 * После проверки у каждого варианта видно, верный ли он и почему — неверные варианты обычно и есть
 * типичные заблуждения, ради которых квиз нужен.
 */
export function QuizView({ item, intervals, free, onGrade, status }: ViewProps<QuizItem> & { status: string }) {
  const [chosen, setChosen] = useState<number[]>([])
  const [checked, setChecked] = useState(false)

  const correct =
    chosen.length === item.options.filter((option) => option.correct).length &&
    chosen.every((index) => item.options[index].correct)

  // После проверки кнопки вариантов отключены (disabled), поэтому toggle вызывается только до проверки.
  function toggle(index: number) {
    if (!item.multiple) {
      setChosen([index])
      setChecked(true)
      return
    }
    setChosen((value) => (value.includes(index) ? value.filter((i) => i !== index) : [...value, index]))
  }

  return (
    <Panel label={item.multiple ? 'Квиз · несколько верных ответов' : 'Квиз'} status={status}>
      <RichText text={item.question} className="text-lg font-medium" />
      {item.code && (
        <div className="mt-3">
          <CodeBlock code={item.code} />
        </div>
      )}
      <ul className="mt-4 grid gap-2" role={item.multiple ? 'group' : 'radiogroup'} aria-label="Варианты ответа">
        {item.options.map((option, index) => {
          const picked = chosen.includes(index)
          // После проверки различаем: отмечен верно, верный, но пропущен, отмечен ошибочно, не отмечен и неверный.
          const missed = checked && option.correct && !picked
          const state = !checked
            ? picked
              ? 'border-accent bg-accent-soft'
              : 'border-line hover:border-accent'
            : option.correct
              ? missed
                ? 'border-dashed border-good'
                : 'border-good bg-good-soft'
              : picked
                ? 'border-warn bg-warn-soft'
                : 'border-line opacity-70'
          return (
            <li key={index}>
              <button
                type="button"
                role={item.multiple ? 'checkbox' : 'radio'}
                aria-checked={picked}
                onClick={() => toggle(index)}
                disabled={checked}
                className={`w-full rounded-lg border px-4 py-3 text-left transition-colors disabled:cursor-default ${state}`}
              >
                <span className="flex items-start gap-3">
                  <span aria-hidden className="mt-0.5 font-mono text-xs text-muted">
                    {checked ? (option.correct ? (picked ? '✓' : '○') : picked ? '✗' : '·') : item.multiple ? (picked ? '☑' : '☐') : String.fromCharCode(65 + index)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <RichText text={option.text} />
                    {missed && <span className="mt-1 block text-xs font-medium text-good">Верный вариант, вы его не отметили</span>}
                    {checked && option.why && (picked || option.correct) && <RichText text={option.why} className="mt-1 text-sm text-muted" />}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mt-4">
        {checked ? (
          <Outcome correct={correct} explain={item.explain} onGrade={onGrade} intervals={intervals} free={free} />
        ) : (
          item.multiple && (
            <button
              type="button"
              onClick={() => setChecked(true)}
              disabled={chosen.length === 0}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
            >
              Проверить
            </button>
          )
        )}
      </div>
    </Panel>
  )
}
