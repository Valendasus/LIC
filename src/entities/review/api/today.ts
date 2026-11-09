import { db } from '@/shared/api/db'
import { getItems } from '@/entities/practice-item/@x/review'
import { getProgressMap } from '@/entities/progress/@x/review'
import { findNode, getTree, leavesOf, type TreeNode } from '@/entities/topic/@x/review'

/** Понедельник текущей недели, 00:00 по местному времени. */
export function startOfWeek(now: Date) {
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
  return day
}

/** Номер дня недели с понедельника: пн = 0, вс = 6. */
export const weekdayIndex = (date: Date) => (date.getDay() + 6) % 7

export interface WeekActivity {
  /** Сколько ответов в каждый день недели, с понедельника. */
  days: number[]
  today: number
  activeDays: number
  answers: number
  /** Доля ответов «вспомнил» и «легко» (оценка 3–4). null — ответов ещё не было. */
  accuracy: number | null
}

/**
 * Регулярность за неделю вместо серии дней подряд (docs/DESIGN.md, раздел 11):
 * пропуск дня не обнуляет прогресс, а просто остаётся пустым днём.
 */
export async function getWeekActivity(userId: string, now = new Date()): Promise<WeekActivity> {
  const logs = await db.reviewLog.findMany({ where: { userId, reviewedAt: { gte: startOfWeek(now), lte: now } }, select: { reviewedAt: true, rating: true } })
  const days = Array.from({ length: 7 }, () => 0)
  for (const log of logs) days[weekdayIndex(log.reviewedAt)]++
  return {
    days,
    today: weekdayIndex(now),
    activeDays: days.filter((count) => count > 0).length,
    answers: logs.length,
    accuracy: logs.length ? logs.filter((log) => log.rating >= 3).length / logs.length : null,
  }
}

export interface TopicSteps {
  /** Learn пройден: тема отмечена хотя бы «знаю» или по ней уже есть ответы. */
  learn: boolean
  /** Implement: решено задач (хотя бы раз с оценкой не «снова») из всех заданий темы. */
  implement: { done: number; total: number }
  /** Confirm: начато карточек из всех карточек темы. */
  confirm: { done: number; total: number }
}

/** Прогресс темы по шагам Learn · Implement · Confirm. */
export async function getTopicSteps(userId: string, topicId: string): Promise<TopicSteps> {
  const [specialty] = topicId.split('/')
  const items = (await getItems(specialty)).filter((item) => item.topicId === topicId)
  const tasks = items.filter((item) => item.kind !== 'card')
  const cards = items.filter((item) => item.kind === 'card')
  const ids = items.map((item) => item.id)
  const [rows, solved, progress] = await Promise.all([
    db.reviewItem.findMany({ where: { userId, itemId: { in: ids } }, select: { itemId: true } }),
    db.reviewLog.findMany({ where: { userId, itemId: { in: tasks.map((item) => item.id) }, rating: { gte: 2 } }, select: { itemId: true }, distinct: ['itemId'] }),
    getProgressMap(userId),
  ])
  const started = new Set(rows.map((row) => row.itemId))
  return {
    learn: (progress.get(topicId) ?? 0) > 0 || started.size > 0,
    implement: { done: solved.length, total: tasks.length },
    confirm: { done: cards.filter((item) => started.has(item.id)).length, total: cards.length },
  }
}

export interface TopicRef {
  node: TreeNode
  /** Блок и модуль: «JavaScript › Области видимости и замыкания». */
  trail: string[]
}

async function refOf(topicId: string): Promise<TopicRef | null> {
  const [specialty, ...path] = topicId.split('/')
  const tree = await getTree(specialty)
  const found = tree && findNode(tree, path)
  if (!found) return null
  return { node: found.node, trail: found.trail.slice(1, -1).map((node) => node.title) }
}

/** Тема, с которой работали последней: по последнему ответу или последней отметке освоения. */
export async function getLastTopic(userId: string): Promise<TopicRef | null> {
  const [log, mark] = await Promise.all([
    db.reviewLog.findFirst({ where: { userId }, orderBy: { reviewedAt: 'desc' }, select: { itemId: true, reviewedAt: true } }),
    db.nodeProgress.findFirst({ where: { userId, level: { gt: 0 } }, orderBy: { updatedAt: 'desc' }, select: { nodeId: true, updatedAt: true } }),
  ])
  const fromLog = log && { id: log.itemId.split('#')[0], at: log.reviewedAt }
  const fromMark = mark && { id: mark.nodeId, at: mark.updatedAt }
  const latest = [fromLog, fromMark].filter((value) => value !== null).sort((a, b) => b.at.getTime() - a.at.getTime())[0]
  return latest ? refOf(latest.id) : null
}

/**
 * Следующие темы по пути: в порядке курса, где есть урок или практика и ещё ничего не начато.
 * Тему, которую продолжают, не повторяем.
 */
export async function getNextTopics(userId: string, specialty: string, { limit = 3, skip }: { limit?: number; skip?: string } = {}): Promise<TopicRef[]> {
  const tree = await getTree(specialty)
  if (!tree) return []
  const [items, progress, rows] = await Promise.all([getItems(specialty), getProgressMap(userId), db.reviewItem.findMany({ where: { userId }, select: { itemId: true } })])
  const withPractice = new Set(items.map((item) => item.topicId))
  const started = new Set(rows.map((row) => row.itemId.split('#')[0]))
  const next = leavesOf(tree).filter((leaf) => leaf.id !== skip && (leaf.content || withPractice.has(leaf.id)) && !started.has(leaf.id) && !(progress.get(leaf.id) ?? 0))
  const refs = await Promise.all(next.slice(0, limit).map((leaf) => refOf(leaf.id)))
  return refs.filter((ref) => ref !== null)
}
