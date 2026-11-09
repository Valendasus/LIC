import Link from 'next/link'
import { ITEM_KINDS, KIND_LABEL } from '@/lib/kinds'
import { getCurrentUser } from '@/lib/progress'
import { getReviewCounts } from '@/lib/review'

/** Блок «Практика» на странице темы или ветки: что есть, что ждёт, кнопки занятий. */
export async function PracticePanel({ scope }: { scope: string }) {
  const user = await getCurrentUser()
  const counts = await getReviewCounts(user.id, scope.split('/')[0], scope)
  if (counts.total === 0) return null
  const query = encodeURIComponent(scope)
  const ready = counts.ready
  const kinds = ITEM_KINDS.filter((kind) => counts.byKind[kind] > 0)

  return (
    <section className="rounded-lg border border-line bg-surface p-4" aria-labelledby="practice-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="practice-title" className="font-semibold">
          Практика
        </h2>
        <p className="text-sm text-muted">
          {counts.total} элементов · в изучении {counts.studied} · к повторению {counts.due}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/review?scope=${query}`}
          className={`rounded-md px-4 py-2 text-sm font-medium ${ready ? 'bg-accent text-surface' : 'border border-line text-muted'}`}
        >
          {ready ? `Учить и повторять (${ready})` : 'На сегодня всё'}
        </Link>
        <Link href={`/review?scope=${query}&mode=free`} className="rounded-md border border-line px-4 py-2 text-sm hover:border-accent">
          Свободная тренировка
        </Link>
      </div>
      {kinds.length > 1 && (
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span>Только:</span>
          {kinds.map((kind) => (
            <Link key={kind} href={`/review?scope=${query}&mode=free&kinds=${kind}`} className="underline-offset-2 hover:text-accent hover:underline">
              {KIND_LABEL[kind]} ({counts.byKind[kind]})
            </Link>
          ))}
        </p>
      )}
    </section>
  )
}
