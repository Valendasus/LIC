/** Разделы основной навигации. Иконки и активность — в NavLinks. */
export type NavKey = 'today' | 'course' | 'practice'

export interface NavItem {
  key: NavKey
  label: string
  href: string
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'today', label: 'Сегодня', href: '/' },
  { key: 'course', label: 'Курс', href: '/frontend' },
  { key: 'practice', label: 'Практика', href: '/practice' },
]

/** Какой раздел активен на этом адресе. */
export function activeNav(pathname: string): NavKey | null {
  if (pathname === '/') return 'today'
  if (pathname.startsWith('/practice')) return 'practice'
  if (pathname.startsWith('/frontend')) return 'course'
  return null
}

/** Пункт поиска: тема, блок, модуль или команда. */
export interface SearchEntry {
  title: string
  href: string
  /** Где находится: «Frontend › JavaScript». Для команд — «Команда». */
  context: string
  kind: 'command' | 'node'
}

const norm = (text: string) => text.toLowerCase().replace(/ё/g, 'е')

/**
 * Простой и предсказуемый поиск: все слова запроса есть в названии или контексте, без учёта регистра и «ё».
 * Совпадение в начале названия — выше. Пустой запрос показывает команды.
 */
export function searchEntries(entries: SearchEntry[], query: string, limit = 8) {
  const words = norm(query).split(/\s+/).filter(Boolean)
  if (!words.length) return entries.filter((entry) => entry.kind === 'command').slice(0, limit)
  return entries
    .map((entry) => {
      const title = norm(entry.title)
      if (!words.every((word) => `${title} ${norm(entry.context)}`.includes(word))) return null
      const score = title.startsWith(words[0]) ? 0 : title.includes(words[0]) ? 1 : 2
      return { entry, score }
    })
    .filter((item) => item !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((item) => item.entry)
}
