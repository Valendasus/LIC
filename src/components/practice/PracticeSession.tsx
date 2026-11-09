'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { reviewItem } from '@/app/(site)/review/actions'
import { isTask, KIND_LABEL, type ItemKind } from '@/lib/kinds'
import type { SessionItem, SessionMode } from '@/lib/review'
import type { Grade } from '@/lib/srs'
import { CardView } from './CardView'
import { CodeView } from './CodeView'
import { OrderView } from './OrderView'
import { OutputView } from './OutputView'
import { QuizView } from './QuizView'

const STATUS_LABEL = { new: 'Новое', learning: 'Изучение', review: 'Повторение' } as const

/** Сессия практики: карточки, квизы, «что выведет», порядок и задачи (код, типы, React) в одной перемешанной очереди. */
export function PracticeSession({
  items,
  orders,
  mode,
  backHref,
}: {
  items: SessionItem[]
  /** Правильный порядок для задач «Порядок»: шаги в items приходят перемешанными. */
  orders: Record<string, string[]>
  mode: SessionMode
  backHref: string
}) {
  const [queue, setQueue] = useState(items)
  const [done, setDone] = useState(0)
  const [right, setRight] = useState(0)
  const [byKind, setByKind] = useState<Partial<Record<ItemKind, number>>>({})
  const [error, setError] = useState('')
  /** Сколько ответов ещё сохраняется на сервере. */
  const [saving, setSaving] = useState(0)
  const shownAt = useRef(Date.now())
  /** Ключ последнего оценённого показа: второе нажатие до перерисовки не должно оценить элемент ещё раз. */
  const gradedKey = useRef('')
  const free = mode === 'free'

  const current = queue[0]
  const total = done + queue.length

  const onGrade = useCallback(
    (grade: Grade) => {
      // Оценку ставит только показанный вид задания, значит текущий элемент есть всегда.
      const entry = current!
      const key = `${entry.item.id}:${done}`
      if (gradedKey.current === key) return
      gradedKey.current = key
      const duration = Date.now() - shownAt.current
      shownAt.current = Date.now()
      setDone((value) => value + 1)
      if (grade >= 3) setRight((value) => value + 1)
      setByKind((value) => ({ ...value, [entry.item.kind]: (value[entry.item.kind] ?? 0) + 1 }))
      setQueue((value) => value.slice(1))

      if (free) {
        // Без расписания: ошибка возвращает элемент в конец сессии.
        if (grade === 1) setQueue((value) => [...value, entry])
        return
      }

      setSaving((value) => value + 1)
      reviewItem(entry.item.id, grade, duration)
        .then((result) => {
          if (result.error) {
            setError(`Ответ не сохранился: ${result.error}`)
            return
          }
          // Элемент вернётся через несколько минут — показываем его ещё раз в этой же сессии.
          if (result.intervals) {
            const intervals = result.intervals
            setQueue((value) => [...value, { ...entry, status: 'learning', intervals }])
          }
        })
        .catch(() => setError('Ответ не сохранился: нет связи с сервером. Обновите страницу и повторите.'))
        .finally(() => setSaving((value) => value - 1))
    },
    [current, done, free],
  )

  // Пока ответы сохраняются, уход со страницы потерял бы их — браузер переспросит.
  useEffect(() => {
    if (saving === 0) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [saving])

  // Очередь пуста, но ответы ещё сохраняются: ошибка может вернуть элемент в сессию, поэтому итог показываем после.
  if (!current && saving > 0) {
    return (
      <p className="mx-auto max-w-xl rounded-xl border border-line bg-surface p-6 text-center text-muted" role="status">
        Сохраняем ответы…
      </p>
    )
  }

  if (!current) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-line bg-surface p-6 text-center">
        <p className="text-2xl font-semibold">Сессия завершена</p>
        <p className="mt-2 text-muted">
          Ответов: {done} · с первого раза или верно: {right}
        </p>
        <p className="mt-1 text-sm text-muted">
          {Object.entries(byKind)
            .map(([kind, count]) => `${KIND_LABEL[kind as ItemKind]}: ${count}`)
            .join(' · ')}
        </p>
        {error && (
          <p role="alert" className="mt-4 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
            {error}
          </p>
        )}
        <Link href={backHref} className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface">
          Вернуться
        </Link>
      </div>
    )
  }

  const { item } = current
  const status = STATUS_LABEL[current.status]
  const viewKey = `${item.id}:${done}`
  const common = { intervals: current.intervals, free, onGrade, status }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center gap-3 text-sm text-muted">
        <span className="font-mono tabular-nums">
          {done + 1} / {total}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full bg-accent transition-[width]" style={{ width: `${(done / total) * 100}%` }} />
        </div>
        {free && <span className="rounded bg-accent-soft px-2 py-0.5 text-xs text-accent">без расписания</span>}
      </div>

      {item.kind === 'card' && <CardView key={viewKey} item={item} {...common} />}
      {item.kind === 'quiz' && <QuizView key={viewKey} item={item} {...common} />}
      {item.kind === 'output' && <OutputView key={viewKey} item={item} {...common} />}
      {item.kind === 'order' && <OrderView key={viewKey} item={item} correctOrder={orders[item.id] ?? []} {...common} />}
      {isTask(item) && <CodeView key={viewKey} item={item} {...common} />}

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          {error}
        </p>
      )}

      <p className="mt-6 text-center text-sm">
        <Link href={item.topicHref} className="text-muted hover:text-accent">
          Тема: {item.topicTitle}
        </Link>
      </p>
    </div>
  )
}
