import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PracticeSession } from '@/widgets/practice-session'
import { type OrderItem } from '@/entities/practice-item'
import { getItems, inScope } from '@/entities/practice-item/server'
import { ITEM_KINDS, KIND_LABEL, type ItemKind } from '@/entities/practice-item'
import { getCurrentUser } from '@/entities/user/server'
import { type SessionMode } from '@/entities/review'
import { buildSession, getReviewCounts } from '@/entities/review/server'
import { findNode, getTree } from '@/entities/topic/server'

export const metadata: Metadata = { title: 'Практика' }

type Props = { searchParams: Promise<{ scope?: string; mode?: string; kinds?: string }> }

export async function ReviewPage({ searchParams }: Props) {
  const params = await searchParams
  const mode: SessionMode = params.mode === 'free' ? 'free' : 'review'
  const scope = params.scope || undefined
  const kinds = (params.kinds?.split(',') ?? []).filter((kind): kind is ItemKind => ITEM_KINDS.includes(kind as ItemKind))
  const specialty = scope?.split('/')[0] ?? 'frontend'

  const tree = await getTree(specialty)
  if (!tree) notFound()
  const found = scope ? findNode(tree, scope.split('/').slice(1)) : { node: tree, trail: [tree] }
  if (!found) notFound()

  const user = await getCurrentUser()
  const [items, counts, all] = await Promise.all([
    buildSession(user.id, specialty, mode, scope, kinds),
    getReviewCounts(user.id, specialty, scope),
    getItems(specialty),
  ])

  // Правильный порядок шагов: в сессии они перемешаны.
  const orders = Object.fromEntries(inScope(all, scope, ['order']).map((item) => [item.id, (item as OrderItem).steps]))

  const backHref = scope ? `/${scope}` : '/'
  const kindNote = kinds.length ? ` · ${kinds.map((kind) => KIND_LABEL[kind].toLowerCase()).join(', ')}` : ''
  const title = (mode === 'free' ? 'Свободная тренировка' : scope ? 'Практика' : 'Повторение на сегодня') + kindNote

  return (
    <div className="space-y-6">
      <header className="mx-auto max-w-2xl">
        <p className="text-sm text-muted">
          <Link href={backHref} className="hover:text-accent">
            {found.node.title}
          </Link>
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted">
          Элементов в ветке: {counts.total} · в изучении: {counts.studied} · к повторению сейчас: {counts.due} · новых на сегодня: {counts.freshToday}
        </p>
      </header>

      {items.length > 0 ? (
        <PracticeSession key={`${mode}:${scope ?? ''}:${kinds.join(',')}`} items={items} orders={orders} mode={mode} backHref={backHref} />
      ) : (
        <div className="mx-auto max-w-2xl rounded-xl border border-line bg-surface p-6">
          <p className="text-lg font-semibold">{counts.total === 0 ? 'В этой ветке пока нет практики' : 'На сегодня всё'}</p>
          <p className="mt-1 text-muted">
            {counts.total === 0
              ? 'Карточки и задания появляются по мере наполнения тем.'
              : 'Элементы, срок которых не наступил, вернутся сами. Если хочется ещё — свободная тренировка не меняет расписание.'}
          </p>
          {counts.total > 0 && (
            <Link
              href={`/practice?mode=free${scope ? `&scope=${encodeURIComponent(scope)}` : ''}`}
              className="mt-4 inline-block rounded-md border border-line px-4 py-2 text-sm hover:border-accent"
            >
              Свободная тренировка
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
