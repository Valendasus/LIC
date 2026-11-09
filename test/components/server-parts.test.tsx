import { beforeEach, describe, expect, it } from 'vitest'
import { PracticePanel } from '@/widgets/practice-panel/ui/PracticePanel'
import { AppShell } from '@/widgets/app-shell/ui/AppShell'
import { CommandPalette } from '@/widgets/app-shell/ui/CommandPalette'
import { NavLinks } from '@/widgets/app-shell/ui/NavLinks'
import type { SearchEntry } from '@/widgets/app-shell/model/nav'
import { getCurrentUser } from '@/entities/user/api/user'
import { NEW_PER_DAY } from '@/entities/review/api/session'
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
      '/practice?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop',
      '/practice?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop&mode=free',
      '/practice?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop&mode=free&kinds=card',
      '/practice?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop&mode=free&kinds=quiz',
      '/practice?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop&mode=free&kinds=output',
      '/practice?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop&mode=free&kinds=order',
      '/practice?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop&mode=free&kinds=code',
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

describe('каркас', () => {
  it('навигация получает число ожидающих, поиск — темы и команды', async () => {
    const shell = await AppShell({ children: <p>контент</p> })
    const navs = findAll(shell, (element) => element.type === NavLinks)
    expect(navs.map((nav) => [nav.props.layout, nav.props.practiceCount])).toEqual([
      ['side', 20],
      ['bottom', 20],
    ])
    const palette = findAll(shell, (element) => element.type === CommandPalette)[0]
    const entries = palette.props.entries as SearchEntry[]
    expect(entries.slice(0, 3).map((entry) => entry.title)).toEqual(['Начать повторение', 'Сегодня', 'Курс Frontend'])
    expect(entries).toContainEqual({ title: 'Замыкания', href: '/frontend/javascript/scope/closures', context: 'Frontend › JavaScript › Области видимости и замыкания', kind: 'node' })
    expect(textOf(shell)).toContain('контент')
  })

  it('когда ждать нечего, счётчик ноль', async () => {
    await exhaustNewToday()
    const shell = await AppShell({ children: null })
    expect(findAll(shell, (element) => element.type === NavLinks)[0].props.practiceCount).toBe(0)
  })
})
