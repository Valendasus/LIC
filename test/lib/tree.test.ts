import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.LIC_CONTENT_DIR = `${process.cwd()}/test/fixtures/content`
})

import { findNode, getSpecialties, getTree, GRADE_LABEL, hrefOf, leavesOf } from '@/lib/tree'

describe('дерево тем', () => {
  it('читает список специальностей', async () => {
    const list = await getSpecialties()
    expect(list.map((item) => [item.slug, item.status])).toEqual([
      ['demo', 'active'],
      ['later', 'planned'],
      ['broken', 'active'],
    ])
  })

  it('строит дерево с id и путями от корня специальности', async () => {
    const tree = await getTree('demo')
    expect(tree).toMatchObject({ slug: 'demo', title: 'Демо', id: 'demo', path: [] })
    const topic = tree!.children[0].children[0].children[0]
    expect(topic).toMatchObject({ id: 'demo/block/mod/topic', path: ['block', 'mod', 'topic'], grade: 'J', content: true })
    // У листа без children в YAML — пустой массив детей.
    expect(tree!.children[1].children[0].children).toEqual([])
  })

  it('не отдаёт запланированные и несуществующие специальности', async () => {
    expect(await getTree('later')).toBeNull()
    expect(await getTree('nope')).toBeNull()
  })

  it('находит узел по пути и собирает цепочку предков', async () => {
    const tree = (await getTree('demo'))!
    const found = findNode(tree, ['block', 'mod', 'topic'])
    expect(found!.node.id).toBe('demo/block/mod/topic')
    expect(found!.trail.map((node) => node.id)).toEqual(['demo', 'demo/block', 'demo/block/mod', 'demo/block/mod/topic'])
    expect(findNode(tree, [])!.node).toBe(tree)
    expect(findNode(tree, ['block', 'nope'])).toBeNull()
  })

  it('листья — узлы без детей', async () => {
    const tree = (await getTree('demo'))!
    expect(leavesOf(tree).map((node) => node.id)).toEqual(['demo/block/mod/topic', 'demo/block/mod/empty', 'demo/other/solo'])
    const solo = findNode(tree, ['other', 'solo'])!.node
    expect(leavesOf(solo)).toEqual([solo])
  })

  it('ссылка на узел и подписи уровней', async () => {
    const tree = (await getTree('demo'))!
    expect(hrefOf(tree.children[0])).toBe('/demo/block')
    expect(GRADE_LABEL).toEqual({ J: 'Junior', M: 'Middle', S: 'Senior' })
  })
})
