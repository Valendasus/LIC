import { beforeEach, describe, expect, it } from 'vitest'
import { PracticePanel } from '@/components/practice/PracticePanel'
import { ReviewBadge } from '@/components/ReviewBadge'
import { getCurrentUser } from '@/lib/progress'
import { NEW_PER_DAY } from '@/lib/review'
import { db, resetDb } from '../db'
import { findAll, textOf } from '../tree'

const hrefs = (node: React.ReactNode) => findAll(node, (element) => typeof element.props.href === 'string').map((element) => element.props.href as string)

async function exhaustNewToday() {
  const user = await getCurrentUser()
  for (let i = 0; i < NEW_PER_DAY; i++) {
    await db.reviewItem.create({
      data: { userId: user.id, itemId: `other#${i}`, kind: 'card', stability: 1, stabilityFast: 1, difficulty: 5, state: 2, scheduleStatus: 'review', dueAt: new Date(Date.now() + 86_400_000), reps: 1, lapses: 0, scheduledDays: 1, learningStep: 0 },
    })
  }
}

beforeEach(resetDb)

describe('блок «Практика»', () => {
  it('тема с карточками и заданиями: кнопки занятий и фильтры по видам', async () => {
    const panel = await PracticePanel({ scope: 'frontend/javascript/async/event-loop' })
    const text = textOf(panel)
    expect(text).toMatch(/\d+ элементов · в изучении 0 · к повторению 0/)
    expect(text).toMatch(/Учить и повторять \(\d+\)/)
    expect(hrefs(panel)).toEqual([
      '/review?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop',
      '/review?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop&mode=free',
      '/review?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop&mode=free&kinds=card',
      '/review?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop&mode=free&kinds=quiz',
      '/review?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop&mode=free&kinds=output',
      '/review?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop&mode=free&kinds=order',
      '/review?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop&mode=free&kinds=code',
    ])
  })

  it('всё сделано на сегодня', async () => {
    await exhaustNewToday()
    expect(textOf(await PracticePanel({ scope: 'frontend/css/cascade/specificity' }))).toContain('На сегодня всё')
  })

  it('ветка без практики — блока нет', async () => {
    expect(await PracticePanel({ scope: 'frontend/nextjs' })).toBeNull()
  })
})

describe('счётчик повторения в шапке', () => {
  it('показывает, сколько ждёт сегодня', async () => {
    const badge = await ReviewBadge()
    expect(textOf(badge)).toBe('Повторение20')
    expect(badge.props.href).toBe('/review')
  })

  it('без счётчика, когда ничего не ждёт', async () => {
    await exhaustNewToday()
    expect(textOf(await ReviewBadge())).toBe('Повторение')
  })
})
