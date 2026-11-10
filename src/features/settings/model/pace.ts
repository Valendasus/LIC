/** Варианты темпа: сколько новых элементов практики можно начать за день. */
export const PACE_OPTIONS = [
  { value: 10, label: 'Спокойно', hint: '10 новых в день' },
  { value: 20, label: 'Обычно', hint: '20 новых в день' },
  { value: 30, label: 'Интенсивно', hint: '30 новых в день' },
  { value: 50, label: 'Перед собесом', hint: '50 новых в день' },
] as const

/** Ключ настройки «Уменьшить анимации» в браузере. */
export const MOTION_KEY = 'lic:reduce-motion'
