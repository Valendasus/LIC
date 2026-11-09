import type { Metadata } from 'next'
import { Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PracticeSession } from '@/widgets/practice-session'
import { ButtonLink, EmptyState } from '@/shared/ui'
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
  const base = mode === 'free' ? 'Свободная тренировка' : scope ? found.node.title : 'Повторение на сегодня'
  const title = (mode === 'free' && scope ? `${base} · ${found.node.title}` : base) + kindNote

  if (items.length > 0) {
    return <PracticeSession key={`${mode}:${scope ?? ''}:${kinds.join(',')}`} items={items} orders={orders} mode={mode} backHref={backHref} title={title} />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-4 px-4 py-3 sm:px-8">
        <Link href={backHref} aria-label="Выйти из сессии" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
          <X aria-hidden size={18} />
          {found.node.title}
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 pb-16">
        <EmptyState
          icon={<Sparkles size={28} />}
          title={counts.total === 0 ? 'В этой ветке пока нет практики' : 'На сегодня всё'}
          action={
            counts.total > 0 ? (
              <ButtonLink href={`/practice?mode=free${scope ? `&scope=${encodeURIComponent(scope)}` : ''}`} variant="secondary">
                Свободная тренировка
              </ButtonLink>
            ) : (
              <ButtonLink href={backHref} variant="secondary">
                Вернуться
              </ButtonLink>
            )
          }
        >
          {counts.total === 0
            ? 'Карточки и задания появляются по мере наполнения тем.'
            : 'Остальное вернётся по расписанию — тогда, когда вы начнёте забывать. Свободная тренировка не меняет расписание.'}
        </EmptyState>
      </div>
    </div>
  )
}
