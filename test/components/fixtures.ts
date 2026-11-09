import type { CardItem, CodeItem, OrderItem, OutputItem, QuizItem } from '@/entities/practice-item/api/items'
import type { SessionItem } from '@/entities/review/api/session'

const topic = { topicId: 'f/t', topicTitle: 'Тема', topicHref: '/f/t' }
export const intervals = { 1: '1 мин', 2: '1 дн.', 3: '3 дн.', 4: '9 дн.' } as const

export const card = (overrides: Partial<CardItem> = {}): CardItem => ({
  ...topic, id: 'f/t#card', kind: 'card', type: 'term', front: 'Термин', back: 'Определение', reversed: false, ...overrides,
})

export const quiz = (overrides: Partial<QuizItem> = {}): QuizItem => ({
  ...topic,
  id: 'f/t#quiz',
  kind: 'quiz',
  question: 'Вопрос?',
  multiple: false,
  options: [
    { text: 'Верный', correct: true, why: 'Потому что верный.' },
    { text: 'Ошибочный', correct: false, why: 'Типичное заблуждение.' },
    { text: 'Без пояснения', correct: false },
  ],
  explain: 'Итог.',
  ...overrides,
})

export const output = (overrides: Partial<OutputItem> = {}): OutputItem => ({
  ...topic, id: 'f/t#out', kind: 'output', code: "console.log('a')\n", answer: ['a', 'b'], explain: 'Разбор.', ...overrides,
})

export const order = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  ...topic, id: 'f/t#ord', kind: 'order', prompt: 'По порядку', steps: ['Три', 'Один', 'Два'], explain: 'Так.', ...overrides,
})

export const entry = (item: SessionItem['item'], status: SessionItem['status'] = 'new'): SessionItem => ({ item, status, intervals: { ...intervals } })

export const code = (overrides: Partial<CodeItem> = {}): CodeItem => ({
  ...topic,
  id: 'f/t#code',
  kind: 'code',
  title: 'Сумма',
  level: 'easy',
  prompt: 'Напишите `sum`.',
  starter: 'function sum() {}',
  tests: "test('t', () => {})",
  hints: ['Первая подсказка', 'Вторая подсказка'],
  solution: '',
  explain: '',
  ...overrides,
})
