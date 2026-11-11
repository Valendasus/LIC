import type { CodeItem, PracticeItem } from '../api/items'

/**
 * Подписи видов практики. Отдельный модуль без серверных зависимостей,
 * чтобы его можно было импортировать в клиентские компоненты.
 */
export type ItemKind = 'card' | 'quiz' | 'output' | 'order' | 'code' | 'types' | 'react'

export const ITEM_KINDS: ItemKind[] = ['card', 'quiz', 'output', 'order', 'code', 'types', 'react']

export const KIND_LABEL: Record<ItemKind, string> = {
  card: 'Карточки',
  quiz: 'Квизы',
  output: 'Что выведет',
  order: 'Порядок',
  code: 'Задачи на код',
  types: 'Задачи на типы',
  react: 'React-задачи',
}

/** Уровни задач: от разминки на пару минут до «босса» на полдня. */
export type TaskLevel = 'warmup' | 'easy' | 'medium' | 'hard' | 'boss'

export const TASK_LEVELS: TaskLevel[] = ['warmup', 'easy', 'medium', 'hard', 'boss']

/** Цвет значка уровня: от нейтральной разминки до «босса». */
export const LEVEL_TONE = { warmup: 'neutral', easy: 'good', medium: 'info', hard: 'warn', boss: 'bad' } as const satisfies Record<TaskLevel, string>

export const LEVEL_LABEL: Record<TaskLevel, string> = {
  warmup: 'Разминка',
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Тяжёлая',
  boss: 'Босс',
}

/** Задачи с редактором и тестами: на JavaScript, на типы TypeScript и React-компоненты. */
export type TaskKind = 'code' | 'types' | 'react'

export const TASK_KINDS: TaskKind[] = ['code', 'types', 'react']

export const isTaskKind = (kind: ItemKind): kind is TaskKind => (TASK_KINDS as ItemKind[]).includes(kind)

/** Элемент — задача с редактором (код, типы или React). */
export const isTask = (item: PracticeItem): item is CodeItem => isTaskKind(item.kind)
