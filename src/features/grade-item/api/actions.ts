'use server'

import { db } from '@/shared/api/db'
import { isTask } from '@/entities/practice-item'
import { getItems } from '@/entities/practice-item/server'
import { getCurrentUser } from '@/entities/user/server'
import { fromSchedulerCard, getScheduler, previewIntervals, toSchedulerCard, type Grade } from '@/entities/schedule'

export interface ReviewResult {
  error?: string
  /** Срок следующего показа. */
  dueAt?: string
  /** Если элемент вернётся в течение этой сессии — новые подписи интервалов для кнопок. */
  intervals?: Record<Grade, string>
}

/** Через сколько минут элемент ещё считается частью текущей сессии. */
const SAME_SESSION_MINUTES = 20

/**
 * Оценка элемента практики. Расписание считает сервер: клиент присылает только id, оценку и время ответа,
 * и всё это проверяется заново — серверная функция доступна по сети, как обычный эндпоинт.
 */
export async function reviewItem(itemId: string, grade: number, durationMs: number): Promise<ReviewResult> {
  if (![1, 2, 3, 4].includes(grade)) return { error: 'Некорректная оценка' }
  const [specialty] = itemId.split('/')
  const item = (await getItems(specialty)).find((candidate) => candidate.id === itemId)
  if (!item) return { error: 'Такого элемента нет' }

  const user = await getCurrentUser()
  const now = new Date()
  const scheduler = await getScheduler()
  const row = await db.reviewItem.findUnique({ where: { userId_itemId: { userId: user.id, itemId } } })
  const card = row ? toSchedulerCard(row) : scheduler.newCard({ now, cardId: itemId })
  const result = scheduler.review({ card, grade: grade as Grade, now })
  const fields = fromSchedulerCard(result.card)

  const saved = await db.$transaction(async (tx) => {
    const updated = await tx.reviewItem.upsert({
      where: { userId_itemId: { userId: user.id, itemId } },
      update: fields,
      create: { userId: user.id, itemId, kind: item.kind, ...fields },
    })
    await tx.reviewLog.create({
      data: {
        userId: user.id,
        itemId,
        rating: grade,
        stateBefore: row?.state ?? 0,
        reviewedAt: now,
        durationMs: Number.isFinite(durationMs) ? Math.min(Math.max(0, Math.round(durationMs)), 3_600_000) : null,
      },
    })
    return updated
  })

  // Страницу не перерисовываем: сессия живёт на клиенте, а счётчики обновятся при следующем переходе.
  // Перерисовка после каждой оценки заново строила бы всю сессию на сервере и замедляла сохранение.
  const soon = saved.dueAt.getTime() - now.getTime() <= SAME_SESSION_MINUTES * 60_000
  return {
    dueAt: saved.dueAt.toISOString(),
    intervals: soon ? await previewIntervals(saved, itemId, saved.dueAt) : undefined,
  }
}
