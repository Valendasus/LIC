import { db } from '@/shared/api/db'
import { getItems, inScope, isTask, type ItemKind, type PracticeItem } from '@/entities/practice-item/@x/review'
import { previewIntervals, type Grade } from '@/entities/schedule/@x/review'

/** Сколько новых элементов можно начать за день. Темп настраивается здесь, позже — в настройках. */
export const NEW_PER_DAY = 20
/** Сколько элементов в одной сессии, чтобы занятие не превращалось в марафон. */
export const SESSION_LIMIT = 60

export type SessionMode = 'review' | 'free'

export interface SessionItem {
  item: PracticeItem
  status: 'new' | 'learning' | 'review'
  intervals: Record<Grade, string>
}

function startOfToday(now: Date) {
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  return day
}

function shuffle<T>(list: T[]) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Новые вставляются через каждые три старые: чередование помогает запоминать лучше, чем блок новых подряд. */
function interleave<T>(review: T[], fresh: T[]) {
  const out: T[] = []
  let r = 0
  let f = 0
  while (r < review.length || f < fresh.length) {
    for (let k = 0; k < 3 && r < review.length; k++) out.push(review[r++])
    if (f < fresh.length) out.push(fresh[f++])
  }
  return out
}

/**
 * Порядок вариантов квиза и шагов в задаче на порядок перемешивается на сервере:
 * случайность на клиенте дала бы разную разметку при рендере на сервере и в браузере.
 */
function prepare(item: PracticeItem): PracticeItem {
  if (item.kind === 'quiz') return { ...item, options: shuffle(item.options) }
  if (item.kind === 'order') {
    let steps = shuffle(item.steps)
    // Не отдаём уже решённый порядок.
    for (let attempt = 0; attempt < 5 && steps.every((step, i) => step === item.steps[i]); attempt++) steps = shuffle(item.steps)
    return { ...item, steps }
  }
  // Эталон и разбор не отправляем в браузер заранее: их выдаёт revealSolution после решения или по запросу.
  if (isTask(item)) return { ...item, solution: '', explain: '' }
  return item
}

/** Через сколько минут подойдёт элемент на стадии изучения, чтобы его можно было взять в сессию заранее. */
export const LEARN_AHEAD_MINUTES = 20

/** Прямая карточка и её обратная — «соседи»: в одной сессии показываем только одну из них. */
const siblingOf = (id: string) => id.replace(/~r$/, '')

/**
 * План сессии повторения: что подошло, что можно взять заранее и что новое.
 * На этом же плане строятся счётчики, поэтому число на кнопке «Учить» совпадает с длиной сессии.
 */
async function planSession(userId: string, items: PracticeItem[], now: Date) {
  const [rows, introducedToday] = await Promise.all([
    db.reviewItem.findMany({ where: { userId, itemId: { in: items.map((item) => item.id) } } }),
    db.reviewItem.count({ where: { userId, createdAt: { gte: startOfToday(now) } } }),
  ])
  const byId = new Map(rows.map((row) => [row.itemId, row]))
  const aheadUntil = now.getTime() + LEARN_AHEAD_MINUTES * 60_000

  const due = shuffle(items.filter((item) => byId.has(item.id) && byId.get(item.id)!.dueAt <= now))
  // После «Снова» элемент возвращается через минуты. Если зайти снова раньше срока, он не должен пропасть
  // до завтра: такие элементы (стадия изучения, срок в ближайшие 20 минут) идут в конце сессии.
  const ahead = items
    .filter((item) => {
      const row = byId.get(item.id)
      return row && row.dueAt > now && row.state !== 2 && row.dueAt.getTime() <= aheadUntil
    })
    .sort((a, b) => byId.get(a.id)!.dueAt.getTime() - byId.get(b.id)!.dueAt.getTime())

  // Обратная карточка («определение → термин») появляется только после того, как прямая уже изучалась:
  // если показать их подряд, вторая станет подсказкой самой себе.
  const eligible = items
    .filter((item) => !byId.has(item.id))
    .filter((item) => item.kind !== 'card' || !item.reversed || byId.has(siblingOf(item.id)))

  // Новые идут по темам в порядке курса. Внутри темы задания перемежаются с карточками (на три карточки —
  // одно задание): так проверка применения идёт сразу за определениями, а не после всех карточек темы.
  const byTopic = new Map<string, { cards: PracticeItem[]; tasks: PracticeItem[] }>()
  for (const item of eligible) {
    const group = byTopic.get(item.topicId) ?? { cards: [], tasks: [] }
    ;(item.kind === 'card' ? group.cards : group.tasks).push(item)
    byTopic.set(item.topicId, group)
  }
  const freshAll = [...byTopic.values()].flatMap((group) => interleave(group.cards, group.tasks))

  // Из пары «прямая + обратная» в сессию попадает одна. Приоритет: подошедшие, затем те, что на стадии изучения,
  // и только потом новые — иначе новая обратная карточка вытеснила бы прямую, которую только что отметили «Снова».
  const seen = new Set<string>()
  const bury = (list: PracticeItem[]) =>
    list.filter((item) => {
      const key = siblingOf(item.id)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  const dueKept = bury(due)
  const aheadKept = bury(ahead)
  const fresh = bury(freshAll).slice(0, Math.max(0, NEW_PER_DAY - introducedToday))
  const ordered = [...interleave(dueKept, fresh), ...aheadKept].slice(0, SESSION_LIMIT)

  return { rows, byId, ordered, due: dueKept.length, fresh: fresh.length }
}

export async function getReviewCounts(userId: string, specialty: string, scope?: string) {
  const now = new Date()
  const items = inScope(await getItems(specialty), scope)
  const plan = await planSession(userId, items, now)
  const byKind = { card: 0, quiz: 0, output: 0, order: 0, code: 0, types: 0, react: 0 } satisfies Record<ItemKind, number>
  for (const item of items) byKind[item.kind]++
  return {
    total: items.length,
    byKind,
    studied: plan.rows.length,
    due: plan.rows.filter((row) => row.dueAt <= now).length,
    freshToday: plan.fresh,
    /** Сколько элементов будет в сессии «Учить и повторять» прямо сейчас. */
    ready: plan.ordered.length,
  }
}

export async function buildSession(userId: string, specialty: string, mode: SessionMode, scope?: string, kinds?: ItemKind[]) {
  const now = new Date()
  const items = inScope(await getItems(specialty), scope, kinds)

  if (mode === 'free') {
    return Promise.all(
      shuffle(items)
        .slice(0, SESSION_LIMIT)
        .map(async (item): Promise<SessionItem> => ({ item: prepare(item), status: 'new', intervals: await previewIntervals(null, item.id, now) })),
    )
  }

  const { byId, ordered } = await planSession(userId, items, now)
  return Promise.all(
    ordered.map(async (item): Promise<SessionItem> => {
      const row = byId.get(item.id) ?? null
      return {
        item: prepare(item),
        status: !row ? 'new' : row.state === 2 ? 'review' : 'learning',
        intervals: await previewIntervals(row, item.id, now),
      }
    }),
  )
}
