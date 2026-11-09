import { cache } from 'react'
import { db } from '@/shared/api/db'
import { leavesOf, type TreeNode } from '@/entities/topic/@x/progress'

/** Уровни освоения: 0 не начато, 1 знаю, 2 понимаю, 3 применяю, 4 владею. */
export const MAX_LEVEL = 4

export const getProgressMap = cache(async (userId: string) => {
  const rows = await db.nodeProgress.findMany({ where: { userId }, select: { nodeId: true, level: true } })
  return new Map(rows.map((row) => [row.nodeId, row.level]))
})

export interface Rollup {
  leaves: number
  started: number
  /** Доля от максимума: сумма уровней листьев / (листья × 4). */
  ratio: number
}

/** Прогресс ветки складывается из её листьев. */
export function rollup(node: TreeNode, progress: Map<string, number>): Rollup {
  const leaves = leavesOf(node)
  let sum = 0
  let started = 0
  for (const leaf of leaves) {
    const level = progress.get(leaf.id) ?? 0
    sum += level
    if (level > 0) started++
  }
  // leavesOf всегда возвращает хотя бы один лист (узел без детей — сам лист), поэтому деления на ноль нет.
  return { leaves: leaves.length, started, ratio: sum / (leaves.length * MAX_LEVEL) }
}
