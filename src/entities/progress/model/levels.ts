/** Названия уровней освоения темы: 0 — не начато, 4 — владею. */
const LEVEL_NAMES = ['Не начато', 'Знаю', 'Понимаю', 'Применяю', 'Владею']
export function levelName(level: number) {
  return LEVEL_NAMES[level] ?? LEVEL_NAMES[0]
}
