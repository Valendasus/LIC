import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.LIC_CONTENT_DIR = `${process.cwd()}/test/fixtures/content`
})

import { connection } from 'next/server'
import { getProgressMap, MAX_LEVEL, rollup } from '@/entities/progress/api/progress'
import { getCurrentUser } from '@/entities/user/api/user'
import { getTree } from '@/entities/topic/api/tree'
import { db, resetDb } from '../db'

beforeEach(resetDb)

describe('прогресс', () => {
  it('пользователь «me» создаётся один раз, а страница с ним не пререндерится', async () => {
    const first = await getCurrentUser()
    const second = await getCurrentUser()
    expect(first.id).toBe(second.id)
    expect(first).toMatchObject({ handle: 'me', name: 'Ученик' })
    expect(await db.user.count()).toBe(1)
    expect(connection).toHaveBeenCalled()
  })

  it('карта прогресса пользователя', async () => {
    const user = await getCurrentUser()
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: 'demo/block/mod/topic', level: 3 } })
    expect(await getProgressMap(user.id)).toEqual(new Map([['demo/block/mod/topic', 3]]))
  })

  it('прогресс ветки складывается из листьев', async () => {
    const tree = (await getTree('demo'))!
    const progress = new Map([
      ['demo/block/mod/topic', MAX_LEVEL],
      ['demo/block/mod/empty', 0],
    ])
    expect(rollup(tree, progress)).toEqual({ leaves: 3, started: 1, ratio: 4 / 12 })
    expect(rollup(tree.children[0], progress)).toEqual({ leaves: 2, started: 1, ratio: 0.5 })
    expect(rollup(tree.children[1], new Map())).toEqual({ leaves: 1, started: 0, ratio: 0 })
  })

  it('пустая ветка даёт ноль, а не деление на ноль', () => {
    const empty = { id: 'x', slug: 'x', title: 'x', path: [], children: [] }
    // Узел без детей сам считается листом.
    expect(rollup(empty, new Map())).toEqual({ leaves: 1, started: 0, ratio: 0 })
  })
})
