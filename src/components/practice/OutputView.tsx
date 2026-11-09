'use client'

import { useState } from 'react'
import type { OutputItem } from '@/lib/items'
import { CodeBlock, Outcome, Panel, type ViewProps } from './shared'

/** Строки ответа сравниваются без лишних пробелов по краям; пустые строки в конце не считаются. */
function normalize(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((line) => line.trim().replace(/\s+/g, ' '))
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  return lines
}

/** «Что выведет»: напишите вывод построчно. Ожидаемый вывод проверен реальным запуском кода. */
export function OutputView({ item, intervals, free, onGrade, status }: ViewProps<OutputItem> & { status: string }) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const given = normalize(value)
  const correct = given.length === item.answer.length && given.every((line, i) => line === item.answer[i])

  return (
    <Panel label="Что выведет" status={status}>
      <CodeBlock code={item.code} />
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (given.length) setChecked(true)
        }}
      >
        <label htmlFor="output-answer" className="block text-sm font-medium">
          Вывод в консоли, по одной строке на каждый <code className="font-mono">console.log</code>
        </label>
        <textarea
          id="output-answer"
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              if (given.length) setChecked(true)
            }
          }}
          readOnly={checked}
          rows={Math.max(2, item.answer.length)}
          spellCheck={false}
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-sm"
        />
        {!checked && (
          <button type="submit" disabled={!given.length} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface disabled:opacity-50">
            Проверить <span className="ml-1 font-mono text-xs opacity-80">Ctrl/⌘ + Enter</span>
          </button>
        )}
      </form>
      {checked && (
        <div className="mt-4 space-y-3">
          {!correct && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Lines title="Ваш ответ" lines={given} compare={item.answer} />
              <Lines title="Правильно" lines={item.answer} />
            </div>
          )}
          <Outcome correct={correct} explain={item.explain} onGrade={onGrade} intervals={intervals} free={free} />
        </div>
      )}
    </Panel>
  )
}

function Lines({ title, lines, compare }: { title: string; lines: string[]; compare?: string[] }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted">{title}</p>
      <ol className="rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm">
        {lines.map((line, i) => (
          <li key={i} className={compare && compare[i] !== line ? 'text-warn' : ''}>
            {line || ' '}
          </li>
        ))}
      </ol>
    </div>
  )
}
