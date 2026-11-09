'use server'

import { isTask } from '@/entities/practice-item'
import { getItems } from '@/entities/practice-item/server'

export interface SolutionResult {
  error?: string
  solution?: string
  explain?: string
}

/**
 * Эталон и разбор задачи на код. В сессию они не входят, чтобы не лежать в браузере до решения:
 * клиент запрашивает их, когда тесты пройдены или ученик сам открыл решение.
 */
export async function revealSolution(itemId: string): Promise<SolutionResult> {
  const [specialty] = itemId.split('/')
  const item = (await getItems(specialty)).find((candidate) => candidate.id === itemId)
  if (!item || !isTask(item)) return { error: 'Такой задачи нет' }
  return { solution: item.solution, explain: item.explain }
}
