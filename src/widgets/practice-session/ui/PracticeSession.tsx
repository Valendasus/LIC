'use client'

import { ArrowRight, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isTask, KIND_LABEL, type ItemKind } from '@/entities/practice-item'
import type { SessionItem, SessionMode } from '@/entities/review'
import type { Grade } from '@/entities/schedule'
import { CardView, OrderView, OutputView, QuizView } from '@/features/answer-item'
import { reviewItem } from '@/features/grade-item'
import { CodeView } from '@/features/solve-task'
import { cn, count } from '@/shared/lib'
import { Badge, ButtonLink, Kbd, SegmentBar, type Segment } from '@/shared/ui'

const STATUS_LABEL = { new: 'Новое', learning: 'Изучение', review: 'Повторение' } as const

interface Result {
  grade: Grade
  topicTitle: string
  topicHref: string
  /** Когда элемент вернётся по расписанию — приходит с сервера после сохранения. */
  dueAt?: string
}

const SEGMENT_OF: Record<Grade, Segment> = { 1: 'bad', 2: 'warn', 3: 'good', 4: 'good' }

/** Когда вернутся ответы: сегодня, завтра, на неделе, позже. */
export function returnsSummary(dueDates: string[], now = new Date()) {
  const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = (iso: string) => Math.round((startOf(new Date(iso)) - startOf(now)) / 86_400_000)
  const groups = [
    { label: 'сегодня', count: dueDates.filter((iso) => days(iso) <= 0).length },
    { label: 'завтра', count: dueDates.filter((iso) => days(iso) === 1).length },
    { label: 'на неделе', count: dueDates.filter((iso) => days(iso) >= 2 && days(iso) <= 7).length },
    { label: 'позже', count: dueDates.filter((iso) => days(iso) > 7).length },
  ]
  return groups.filter((group) => group.count > 0)
}

/**
 * Сессия практики в режиме фокуса (docs/DESIGN.md, 4.5): сверху выход по Esc, результаты отрезками и счётчик,
 * в центре одно задание, в конце — итог. Карточки, вопросы и задачи идут в одной перемешанной очереди.
 */
export function PracticeSession({
  items,
  orders,
  mode,
  backHref,
  title,
}: {
  items: SessionItem[]
  /** Правильный порядок для задач «Порядок»: шаги в items приходят перемешанными. */
  orders: Record<string, string[]>
  mode: SessionMode
  backHref: string
  /** «Повторение на сегодня», «Замыкания · карточки». */
  title: string
}) {
  const [queue, setQueue] = useState(items)
  const [results, setResults] = useState<Result[]>([])
  const [byKind, setByKind] = useState<Partial<Record<ItemKind, number>>>({})
  const [error, setError] = useState('')
  /** Сколько ответов ещё сохраняется на сервере. */
  const [saving, setSaving] = useState(0)
  const shownAt = useRef(Date.now())
  /** Ключ последнего оценённого показа: второе нажатие до перерисовки не должно оценить элемент ещё раз. */
  const gradedKey = useRef('')
  const router = useRouter()
  const free = mode === 'free'

  const done = results.length
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
      const index = done
      setResults((value) => [...value, { grade, topicTitle: entry.item.topicTitle, topicHref: entry.item.topicHref }])
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
          setResults((value) => value.map((item, i) => (i === index ? { ...item, dueAt: result.dueAt } : item)))
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

  // Esc — выйти из сессии. В редакторе кода Esc нужен самому редактору, а пока ответы сохраняются — уходить рано.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (event.key !== 'Escape' || saving > 0 || target?.closest('.cm-editor, input, textarea')) return
      router.push(backHref)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [backHref, router, saving])

  const segments: Segment[] = [...results.map((result) => SEGMENT_OF[result.grade]), ...queue.map((_, index): Segment => (index === 0 ? 'current' : 'todo'))]
  const wide = current ? isTask(current.item) : false

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-5 gap-y-2 bg-bg/95 px-4 py-3 backdrop-blur sm:px-8">
        <Link href={backHref} aria-label="Выйти из сессии" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
          <X aria-hidden size={18} />
          <Kbd>Esc</Kbd>
        </Link>
        <p className="hidden text-sm text-muted md:block">{title}</p>
        <SegmentBar segments={segments} label="Прогресс сессии" className="min-w-40 flex-1" />
        <span className="font-mono text-sm text-muted tabular-nums" data-counter>
          {current ? `${done + 1} / ${total}` : `${done} / ${done}`}
        </span>
        {free && <Badge tone="accent">без расписания</Badge>}
      </header>

      <div className={cn('mx-auto flex w-full flex-1 flex-col justify-center px-4 pt-6 pb-16 sm:px-8', wide ? 'max-w-[1400px]' : 'max-w-2xl')}>
        {current ? (
          <Exercise entry={current} viewKey={`${current.item.id}:${done}`} orders={orders} free={free} onGrade={onGrade} />
        ) : saving > 0 ? (
          // Очередь пуста, но ответы ещё сохраняются: ошибка может вернуть элемент в сессию, поэтому итог показываем после.
          <p className="rounded-panel bg-surface p-8 text-center text-muted" role="status">
            Сохраняем ответы…
          </p>
        ) : (
          <Summary results={results} byKind={byKind} free={free} backHref={backHref} />
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-card bg-bad-soft px-4 py-3 text-sm text-bad">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

function Exercise({ entry, viewKey, orders, free, onGrade }: { entry: SessionItem; viewKey: string; orders: Record<string, string[]>; free: boolean; onGrade: (grade: Grade) => void }) {
  const { item } = entry
  const common = { intervals: entry.intervals, free, onGrade, status: STATUS_LABEL[entry.status] }
  return (
    <>
      {item.kind === 'card' && <CardView key={viewKey} item={item} {...common} />}
      {item.kind === 'quiz' && <QuizView key={viewKey} item={item} {...common} />}
      {item.kind === 'output' && <OutputView key={viewKey} item={item} {...common} />}
      {item.kind === 'order' && <OrderView key={viewKey} item={item} correctOrder={orders[item.id] ?? []} {...common} />}
      {isTask(item) && <CodeView key={viewKey} item={item} {...common} />}
      <p className="mt-8 text-center text-sm">
        <a href={item.topicHref} target="_blank" rel="noreferrer" className="text-muted hover:text-fg">
          Тема: {item.topicTitle} <span className="sr-only">(откроется в новой вкладке)</span>
        </a>
      </p>
    </>
  )
}

function Summary({ results, byKind, free, backHref }: { results: Result[]; byKind: Partial<Record<ItemKind, number>>; free: boolean; backHref: string }) {
  const right = results.filter((result) => result.grade >= 3).length
  // Итог показывается только после хотя бы одного ответа.
  const percent = Math.round((right / results.length) * 100)
  const returns = returnsSummary(results.map((result) => result.dueAt).filter((value): value is string => Boolean(value)))
  // Тема с наибольшим числом «не вспомнил».
  const misses = new Map<string, { title: string; href: string; count: number }>()
  for (const result of results.filter((item) => item.grade === 1)) {
    const entry = misses.get(result.topicHref) ?? { title: result.topicTitle, href: result.topicHref, count: 0 }
    misses.set(result.topicHref, { ...entry, count: entry.count + 1 })
  }
  const hardest = [...misses.values()].sort((a, b) => b.count - a.count)[0]

  return (
    <section aria-labelledby="summary" className="flex animate-[rise_300ms_ease-out] flex-col gap-6 rounded-panel bg-surface p-8">
      <div>
        <h1 id="summary" className="text-2xl font-semibold">
          Готово · {count(results.length, ['ответ', 'ответа', 'ответов'])}
        </h1>
        <p className="mt-1 text-muted">
          {Object.entries(byKind)
            .map(([kind, value]) => `${KIND_LABEL[kind as ItemKind]}: ${value}`)
            .join(' · ')}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="flex justify-between text-sm">
          <span className="text-muted">Вспомнили</span>
          <span className="font-mono">
            {right} из {results.length} · {percent} %
          </span>
        </p>
        <SegmentBar segments={results.map((result) => SEGMENT_OF[result.grade])} label="Результаты сессии" />
      </div>
      {!free && returns.length > 0 && <p className="text-sm text-muted">Что вернётся: {returns.map((group) => `${group.label} ${group.count}`).join(' · ')}</p>}
      {hardest && (
        <p className="text-sm">
          <span className="text-muted">Сложнее всего: </span>
          <Link href={hardest.href} className="text-accent hover:text-fg">
            {hardest.title}
          </Link>
          <span className="text-muted"> — {count(hardest.count, ['ошибка', 'ошибки', 'ошибок'])}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={backHref} iconEnd={<ArrowRight aria-hidden size={17} />}>
          {backHref === '/' ? 'На «Сегодня»' : 'Вернуться к теме'}
        </ButtonLink>
        {backHref !== '/' && (
          <ButtonLink href="/" variant="secondary">
            На «Сегодня»
          </ButtonLink>
        )}
      </div>
    </section>
  )
}
