export interface ContentStats {
  leaves: number
  filled: number
  cards: number
  practice: number
}

/** Выполняет код задачи «что выведет» и возвращает реальный вывод console.log построчно. */
export function runOutput(code: string): Promise<string[]>

/** Проверяет каталог content/ и возвращает ошибки и статистику. */
export function checkContent(root: string): Promise<{ errors: string[]; stats: ContentStats }>
