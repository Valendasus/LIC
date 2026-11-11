export interface ContentStats {
  leaves: number
  filled: number
  cards: number
  practice: number
}

/** Выполняет код задачи «что выведет» и возвращает реальный вывод console.log построчно. */
export function runOutput(code: string): Promise<string[]>

/** Нормы состава наполненной темы по уровню: минимум карточек, быстрых заданий и задач с кодом. */
export const NORMS: Record<'J' | 'M' | 'S', { cards: number; quick: number; tasks: number }>

/** Проверяет каталог content/ и возвращает ошибки и статистику. only — проверить только темы с этим id или префиксом. */
export function checkContent(root: string, options?: { only?: string }): Promise<{ errors: string[]; stats: ContentStats }>
