import { beforeEach, describe, expect, it } from 'vitest'
import { revalidatePath } from 'next/cache'
import { setLevel } from '@/features/set-level/api/actions'
import { reviewItem } from '@/features/grade-item/api/actions'
import { revealSolution } from '@/features/solve-task/api/actions'
import { db, resetDb } from '../db'

const form = (values: Record<string, string>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}

const TOPIC = 'frontend/javascript/scope/closures'

beforeEach(resetDb)

describe('отметка освоения темы', () => {
  it('сохраняет уровень и обновляет страницы', async () => {
    expect(await setLevel({}, form({ nodeId: TOPIC, level: '3' }))).toEqual({ level: 3 })
    expect(await setLevel({}, form({ nodeId: TOPIC, level: '1' }))).toEqual({ level: 1 })
    const rows = await db.nodeProgress.findMany()
    expect(rows.map((row) => [row.nodeId, row.level])).toEqual([[TOPIC, 1]])
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('не верит клиенту: уровень и тема проверяются заново', async () => {
    for (const level of ['-1', '5', '2.5', 'abc']) {
      expect(await setLevel({}, form({ nodeId: TOPIC, level }))).toEqual({ error: 'Некорректный уровень' })
    }
    expect(await setLevel({}, form({ level: '1' }))).toEqual({ error: 'Такой темы нет' })
    expect(await setLevel({}, form({ nodeId: 'frontend/nope', level: '1' }))).toEqual({ error: 'Такой темы нет' })
    expect(await setLevel({}, form({ nodeId: 'nope/x', level: '1' }))).toEqual({ error: 'Такой темы нет' })
    // Ветку отметить нельзя: её прогресс считается из листьев.
    expect(await setLevel({}, form({ nodeId: 'frontend/javascript', level: '1' }))).toEqual({ error: 'Такой темы нет' })
    expect(await db.nodeProgress.count()).toBe(0)
  })
})

describe('оценка элемента практики', () => {
  it('новый элемент: расписание, журнал, повтор в этой же сессии после «Снова»', async () => {
    const result = await reviewItem(`${TOPIC}#closure-def`, 1, 1234.4)
    expect(result.error).toBeUndefined()
    // «Снова» на новой карточке — повтор через минуту, поэтому приходят интервалы для повторного показа.
    expect(result.intervals).toBeDefined()
    expect(new Date(result.dueAt!).getTime() - Date.now()).toBeLessThan(20 * 60_000)

    const item = await db.reviewItem.findFirstOrThrow()
    expect(item).toMatchObject({ itemId: `${TOPIC}#closure-def`, kind: 'card', reps: 1 })
    const log = await db.reviewLog.findFirstOrThrow()
    expect(log).toMatchObject({ rating: 1, stateBefore: 0, durationMs: 1234 })
  })

  it('уже изученный элемент: «Хорошо» уводит в дни, интервалы не нужны; вид задания сохраняется', async () => {
    const quiz = `${TOPIC}#quiz-what-captured`
    await reviewItem(quiz, 3, 1000)
    const second = await reviewItem(quiz, 3, Number.NaN)
    expect(second.intervals).toBeUndefined()
    expect(new Date(second.dueAt!).getTime() - Date.now()).toBeGreaterThan(86_400_000)
    expect((await db.reviewItem.findFirstOrThrow()).kind).toBe('quiz')
    const logs = await db.reviewLog.findMany({ orderBy: { reviewedAt: 'asc' } })
    expect(logs.map((log) => [log.stateBefore, log.durationMs])).toEqual([
      [0, 1000],
      [2, null],
    ])
  })

  it('время ответа ограничено часом и не бывает отрицательным', async () => {
    await reviewItem(`${TOPIC}#lexical-scope`, 3, 10 * 3_600_000)
    await reviewItem(`${TOPIC}#reference-not-copy`, 3, -50)
    const logs = await db.reviewLog.findMany({ orderBy: { reviewedAt: 'asc' } })
    expect(logs.map((log) => log.durationMs)).toEqual([3_600_000, 0])
  })

  it('не верит клиенту: оценка и элемент проверяются', async () => {
    for (const grade of [0, 5, 2.5]) expect(await reviewItem(`${TOPIC}#closure-def`, grade, 0)).toEqual({ error: 'Некорректная оценка' })
    expect(await reviewItem(`${TOPIC}#nope`, 3, 0)).toEqual({ error: 'Такого элемента нет' })
    expect(await reviewItem('nope/x#y', 3, 0)).toEqual({ error: 'Такого элемента нет' })
    expect(await db.reviewItem.count()).toBe(0)
  })
})

describe('эталон задачи на код', () => {
  it('отдаёт решение и разбор только для задачи на код', async () => {
    const answer = await revealSolution('frontend/javascript/scope/closures#code-once')
    expect(answer.solution).toContain('function once(fn)')
    expect(answer.explain).toContain('called')
    expect(await revealSolution('frontend/javascript/scope/closures#quiz-what-captured')).toEqual({ error: 'Такой задачи нет' })
    expect(await revealSolution('frontend/javascript/scope/closures#nope')).toEqual({ error: 'Такой задачи нет' })
  })
})
