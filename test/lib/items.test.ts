import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.LIC_CONTENT_DIR = `${process.cwd()}/test/fixtures/content`
})

import { getItems, inScope, isTask, type CodeItem, type QuizItem } from '@/entities/practice-item/api/items'
import { isTaskKind, ITEM_KINDS, KIND_LABEL, LEVEL_LABEL, TASK_KINDS, TASK_LEVELS } from '@/entities/practice-item/model/kinds'

describe('элементы практики', () => {
  it('собирает карточки, обратные карточки и задания темы', async () => {
    const items = await getItems('demo')
    expect(items.map((item) => [item.id.split('#')[1], item.kind])).toEqual([
      ['term-a', 'card'],
      ['term-a~r', 'card'],
      ['qa-b', 'card'],
      ['code-c', 'card'],
      ['qa-d', 'card'],
      ['quiz-one', 'quiz'],
      ['quiz-many', 'quiz'],
      ['out', 'output'],
      ['ord', 'order'],
      ['sum', 'code'],
      ['bare', 'code'],
      ['view', 'react'],
    ])
    const [direct, reverse] = items
    expect(direct).toMatchObject({ front: 'Термин А', back: 'Определение А', example: 'Пример А', reversed: false, topicTitle: 'Тема', topicHref: '/demo/block/mod/topic' })
    expect(reverse).toMatchObject({ front: 'Определение А', back: 'Термин А', reversed: true })
  })

  it('квиз знает, один у него верный ответ или несколько', async () => {
    const items = await getItems('demo')
    const one = items.find((item) => item.id.endsWith('#quiz-one')) as QuizItem
    const many = items.find((item) => item.id.endsWith('#quiz-many')) as QuizItem
    expect(one).toMatchObject({ multiple: false, code: 'let x = 1' })
    expect(one.options).toEqual([
      { text: 'Да', correct: true, why: undefined },
      { text: 'Нет', correct: false, why: 'Потому что.' },
    ])
    expect(many.multiple).toBe(true)
  })

  it('задача на код: условие, заготовка, тесты, подсказки; эталон хранится, но не теряется', async () => {
    const items = await getItems('demo')
    const task = items.find((item) => item.id.endsWith('#sum')) as CodeItem
    expect(task).toMatchObject({
      id: 'demo/other/solo#sum',
      title: 'Сумма',
      level: 'easy',
      prompt: 'Напишите `sum(a, b)`.',
      starter: 'function sum(a, b) {}\n',
      hints: ['Оператор `+`.'],
      explain: 'Разбор суммы.',
    })
    expect(task.tests).toContain("test('складывает'")
    expect(task.solution).toContain('return a + b')
  })

  it('React-задача с предпросмотром; у остальных предпросмотра нет; isTask', async () => {
    const items = await getItems('demo')
    const view = items.find((item) => item.id.endsWith('#view')) as CodeItem
    expect(view).toMatchObject({ kind: 'react', preview: '<Hi />' })
    expect('preview' in items.find((item) => item.id.endsWith('#sum'))!).toBe(false)
    expect(items.filter(isTask).map((item) => item.kind)).toEqual(['code', 'code', 'react'])
  })

  it('задача без подсказок — пустой список', async () => {
    const items = await getItems('demo')
    expect((items.find((item) => item.id.endsWith('#bare')) as CodeItem).hints).toEqual([])
  })

  it('темы без файлов практики не дают элементов, а у неактивной специальности их нет', async () => {
    const items = await getItems('demo')
    expect(new Set(items.map((item) => item.topicId))).toEqual(new Set(['demo/block/mod/topic', 'demo/other/solo']))
    expect(await getItems('later')).toEqual([])
  })

  it('пустой файл заданий — просто нет элементов', async () => {
    const items = await getItems('demo')
    expect(items.some((item) => item.topicId === 'demo/block/mod/empty')).toBe(false)
  })

  it('ошибка в YAML не глотается', async () => {
    await expect(getItems('broken')).rejects.toThrow()
  })

  it('фильтрует по ветке и по видам', async () => {
    const items = await getItems('demo')
    expect(inScope(items)).toHaveLength(items.length)
    expect(inScope(items, 'demo/block')).toHaveLength(items.length - 3)
    expect(inScope(items, 'demo/block/mod/topic')).toHaveLength(items.length - 3)
    expect(inScope(items, 'demo/other').map((item) => item.id)).toEqual(['demo/other/solo#sum', 'demo/other/solo#bare', 'demo/other/solo#view'])
    // Префикс должен совпадать по сегментам, а не по началу строки.
    expect(inScope(items, 'demo/bl')).toEqual([])
    expect(inScope(items, undefined, ['quiz']).map((item) => item.kind)).toEqual(['quiz', 'quiz'])
    expect(inScope(items, undefined, [])).toHaveLength(items.length)
  })

  it('подписи видов', () => {
    expect(ITEM_KINDS).toEqual(['card', 'quiz', 'output', 'order', 'code', 'types', 'react'])
    expect(KIND_LABEL.output).toBe('Что выведет')
    expect(KIND_LABEL.code).toBe('Задачи на код')
    expect(TASK_KINDS).toEqual(['code', 'types', 'react'])
    expect(isTaskKind('card')).toBe(false)
    expect(isTaskKind('types')).toBe(true)
    expect(TASK_LEVELS.map((level) => LEVEL_LABEL[level])).toEqual(['Разминка', 'Лёгкая', 'Средняя', 'Тяжёлая', 'Босс'])
  })
})
