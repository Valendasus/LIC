import { db } from '@/shared/api/db'
import { getItems, isTask, type TaskLevel } from '@/entities/practice-item/@x/review'
import { findNode, getTree, type TreeNode } from '@/entities/topic/@x/review'

const DAY = 86_400_000
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export interface ActivityDay {
  /** «2026-11-11» */
  date: string
  answers: number
}

/** Ответы по дням за последние `days` дней, включая сегодня, — для тепловой карты. */
export async function getActivity(userId: string, days = 182, now = new Date()): Promise<ActivityDay[]> {
  const from = new Date(dayStart(now).getTime() - (days - 1) * DAY)
  const logs = await db.reviewLog.findMany({ where: { userId, reviewedAt: { gte: from, lte: now } }, select: { reviewedAt: true } })
  const byDay = new Map<string, number>()
  for (const log of logs) byDay.set(dayKey(log.reviewedAt), (byDay.get(dayKey(log.reviewedAt)) ?? 0) + 1)
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + index)
    return { date: dayKey(date), answers: byDay.get(dayKey(date)) ?? 0 }
  })
}

export interface Memory {
  /** Выучено: элемент вышел из изучения (стадия повторения). */
  learned: number
  /** В изучении: новые ответы и «не вспомнил». */
  learning: number
  /** Сколько элементов подойдёт к повторению в каждый из ближайших 7 дней; [0] — сегодня, включая просроченные. */
  forecast: number[]
}

/** Состояние памяти и нагрузка на неделю вперёд. */
export async function getMemory(userId: string, now = new Date()): Promise<Memory> {
  const rows = await db.reviewItem.findMany({ where: { userId }, select: { state: true, dueAt: true } })
  const today = dayStart(now).getTime()
  const forecast = Array.from({ length: 7 }, () => 0)
  for (const row of rows) {
    const offset = Math.max(0, Math.floor((row.dueAt.getTime() - today) / DAY))
    if (offset < 7) forecast[offset]++
  }
  return { learned: rows.filter((row) => row.state === 2).length, learning: rows.filter((row) => row.state !== 2).length, forecast }
}

export interface WeakTopic {
  node: TreeNode
  misses: number
}

/** Слабые места: темы с наибольшим числом «не вспомнил» за последние 30 дней. */
export async function getWeakTopics(userId: string, limit = 5, now = new Date()): Promise<WeakTopic[]> {
  const logs = await db.reviewLog.findMany({ where: { userId, rating: 1, reviewedAt: { gte: new Date(now.getTime() - 30 * DAY) } }, select: { itemId: true } })
  const misses = new Map<string, number>()
  for (const log of logs) {
    const topic = log.itemId.split('#')[0]
    misses.set(topic, (misses.get(topic) ?? 0) + 1)
  }
  const ranked = [...misses.entries()].sort((a, b) => b[1] - a[1])
  const found = await Promise.all(
    ranked.map(async ([topicId, count]) => {
      const [specialty, ...path] = topicId.split('/')
      const tree = await getTree(specialty)
      const node = tree && findNode(tree, path)?.node
      return node ? { node, misses: count } : null
    }),
  )
  return found.filter((item) => item !== null).slice(0, limit)
}

export interface TaskStats {
  level: TaskLevel
  total: number
  solved: number
  /** Решено с первого запуска: первая оценка — «вспомнил» или «легко». */
  firstTry: number
}

/** Задачи с редактором по уровням: сколько всего, решено, с первого запуска. */
export async function getTaskStats(userId: string, specialty: string): Promise<TaskStats[]> {
  const tasks = (await getItems(specialty)).filter(isTask)
  const logs = await db.reviewLog.findMany({ where: { userId, itemId: { in: tasks.map((task) => task.id) } }, orderBy: { reviewedAt: 'asc' }, select: { itemId: true, rating: true } })
  const first = new Map<string, number>()
  const solved = new Set<string>()
  for (const log of logs) {
    if (!first.has(log.itemId)) first.set(log.itemId, log.rating)
    if (log.rating >= 2) solved.add(log.itemId)
  }
  const levels: TaskLevel[] = ['warmup', 'easy', 'medium', 'hard', 'boss']
  return levels
    .map((level) => {
      const ofLevel = tasks.filter((task) => task.level === level)
      return {
        level,
        total: ofLevel.length,
        solved: ofLevel.filter((task) => solved.has(task.id)).length,
        firstTry: ofLevel.filter((task) => (first.get(task.id) ?? 0) >= 3).length,
      }
    })
    .filter((stats) => stats.total > 0)
}
