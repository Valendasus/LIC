import Link from 'next/link'
import { getCurrentUser } from '@/entities/user/server'
import { getReviewCounts } from '@/entities/review/server'

/** Ссылка «Повторение» в шапке со счётчиком того, что ждёт сегодня. */
export async function ReviewBadge() {
  const user = await getCurrentUser()
  const counts = await getReviewCounts(user.id, 'frontend')
  const ready = counts.ready
  return (
    <Link href="/review" className="flex items-center gap-1.5 hover:text-accent">
      Повторение
      {ready > 0 && (
        <span className="rounded-full bg-primary px-1.5 py-px font-mono text-[11px] font-semibold text-on-primary" aria-label={`${ready} карточек ждут`}>
          {ready}
        </span>
      )}
    </Link>
  )
}
