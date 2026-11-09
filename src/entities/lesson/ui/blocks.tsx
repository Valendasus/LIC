import type { ReactNode } from 'react'

const CALLOUT = {
  note: { title: 'Важно', className: 'border-accent bg-accent-soft' },
  mistake: { title: 'Частая ошибка', className: 'border-warn bg-warn-soft' },
  interview: { title: 'На собеседовании', className: 'border-good bg-good-soft' },
  deep: { title: 'Под капотом', className: 'border-line bg-surface' },
} as const

export function Callout({
  type = 'note',
  title,
  children,
}: {
  type?: keyof typeof CALLOUT
  title?: string
  children: ReactNode
}) {
  const style = CALLOUT[type]
  return (
    <aside className={`not-prose my-5 rounded-lg border-l-4 px-4 py-3 ${style.className}`}>
      <p className="mb-1 text-sm font-semibold">{title ?? style.title}</p>
      <div className="lesson prose prose-sm max-w-none">{children}</div>
    </aside>
  )
}

/**
 * Пример из реального кода с оценкой: ✅ можно брать за образец, 🔍 разобрать критически.
 * Источник примера не называется — показывается только суть и, при желании, путь к файлу.
 */
export function Example({
  file,
  verdict,
  children,
}: {
  file?: string
  verdict: 'good' | 'review'
  children: ReactNode
}) {
  return (
    <figure className="not-prose my-5 rounded-lg border border-line bg-surface">
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2 text-sm">
        <span aria-hidden>{verdict === 'good' ? '✅' : '🔍'}</span>
        <span className="font-semibold">Пример из реального кода</span>
        {file && <code className="font-mono text-xs break-all text-muted">{file}</code>}
        <span className="ml-auto text-xs text-muted">
          {verdict === 'good' ? 'можно брать за образец' : 'разобрать критически'}
        </span>
      </figcaption>
      <div className="lesson prose prose-sm max-w-none px-4 py-3">{children}</div>
    </figure>
  )
}

/** Вопрос на вспоминание: сначала ответить самому, потом открыть эталон. */
export function Question({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="not-prose group my-2 rounded-lg border border-line bg-surface">
      <summary className="cursor-pointer list-none px-4 py-3 font-medium marker:hidden">
        <span className="mr-2 text-accent group-open:hidden">+</span>
        <span className="mr-2 hidden text-accent group-open:inline">−</span>
        {q}
      </summary>
      <div className="lesson prose prose-sm max-w-none border-t border-line px-4 py-3">{children}</div>
    </details>
  )
}

const TASK_LEVEL = {
  warmup: 'Разминка',
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Тяжёлая',
  boss: 'Босс',
} as const

export function Task({
  level,
  title,
  children,
}: {
  level: keyof typeof TASK_LEVEL
  title: string
  children: ReactNode
}) {
  return (
    <section className="not-prose my-5 rounded-lg border border-line bg-surface px-4 py-4">
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">{TASK_LEVEL[level]}</span>
        <h4 className="font-semibold">{title}</h4>
      </header>
      <div className="lesson prose prose-sm max-w-none">{children}</div>
    </section>
  )
}

export function Sources({ children }: { children: ReactNode }) {
  return <div className="text-sm">{children}</div>
}
