'use client'

import { useState } from 'react'
import { RichText } from '@/shared/ui'
import type { OrderItem } from '@/entities/practice-item'
import { Panel } from '@/shared/ui'
import type { ViewProps } from '@/entities/practice-item'
import { Outcome } from './Outcome'

/**
 * «Расставьте по порядку»: шаги нажимаются в нужной последовательности.
 * Шаги приходят с сервера уже перемешанными, правильный порядок передаётся отдельно в correctOrder.
 */
export function OrderView({ item, correctOrder, intervals, free, onGrade, status }: ViewProps<OrderItem> & { correctOrder: string[]; status: string }) {
  const [picked, setPicked] = useState<number[]>([])
  const done = picked.length === item.steps.length
  const sequence = picked.map((index) => item.steps[index])
  const correct = done && sequence.every((step, i) => step === correctOrder[i])

  return (
    <Panel label="Порядок" status={status}>
      <RichText text={item.prompt} className="text-lg font-medium" />

      <ol className="mt-4 grid gap-2" aria-label="Ваш порядок">
        {picked.map((index, position) => {
          const wrong = done && item.steps[index] !== correctOrder[position]
          return (
            <li
              key={index}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${done ? (wrong ? 'border-bad bg-bad-soft' : 'border-good bg-good-soft') : 'border-accent bg-accent-soft'}`}
            >
              <span className="font-mono text-sm text-muted">{position + 1}.</span>
              <RichText text={item.steps[index]} className="min-w-0 flex-1" />
            </li>
          )
        })}
      </ol>

      {!done && (
        <>
          <p className="mt-4 mb-2 text-sm text-muted">Нажимайте шаги по порядку:</p>
          <ul className="grid gap-2">
            {item.steps.map((step, index) =>
              picked.includes(index) ? null : (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => setPicked((value) => [...value, index])}
                    className="w-full rounded-lg border border-line px-3 py-2 text-left hover:border-accent"
                  >
                    <RichText text={step} />
                  </button>
                </li>
              ),
            )}
          </ul>
          {picked.length > 0 && (
            <button type="button" onClick={() => setPicked((value) => value.slice(0, -1))} className="mt-3 text-sm text-muted underline hover:text-accent">
              Убрать последний
            </button>
          )}
        </>
      )}

      {done && (
        <div className="mt-4 space-y-3">
          {!correct && (
            <div>
              <p className="mb-1 text-xs text-muted">Правильный порядок</p>
              <ol className="list-decimal space-y-1 rounded-md border border-line bg-bg py-2 pr-3 pl-8 text-sm">
                {correctOrder.map((step) => (
                  <li key={step}>
                    <RichText text={step} />
                  </li>
                ))}
              </ol>
            </div>
          )}
          <Outcome correct={correct} explain={item.explain} onGrade={onGrade} intervals={intervals} free={free} />
        </div>
      )}
    </Panel>
  )
}
