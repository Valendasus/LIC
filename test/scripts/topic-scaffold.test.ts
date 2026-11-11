import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { checkContent } from '../../scripts/content-check.mjs'
import { scaffoldTopic, sourcesFromNote } from '../../scripts/topic-scaffold.mjs'

const TREE = `# Дерево
- slug: js
  title: JS
  children:
    - slug: async
      title: Асинхронность
      children:
        - { slug: promises, title: 'Промисы', grade: J }
        - { slug: other, title: Другая, grade: M, content: true }
        - { slug: filled, title: Файл без отметки }
        - { slug: empty, title: Пустая практика }
    - { slug: solo, title: Одиночка }
- { slug: top, title: Тема на верхнем уровне }
- slug: css
  title: CSS
  children:
    - { slug: x, title: X }
`

const NOTE = `# Промисы

## Что обязательно знать

- текст — не ссылка

## Источники

- ECMA-262, Promise Objects — https://tc39.es/ecma262/#sec-promise-objects
- MDN, Promise — https://developer.mozilla.org/promise
- без ссылки

## После источников

- Чужое — https://example.com
`

let root: string
afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true })
})

/** Временный проект: content/ и docs/ с деревом, практикой соседних тем, заметкой и вопросами. */
async function project({ withResearch = true } = {}) {
  root = await mkdtemp(path.join(tmpdir(), 'lic-scaffold-'))
  const files: Record<string, string> = {
    'content/specialties.yaml': '- { slug: frontend, title: Frontend, status: active }\n',
    'content/frontend/tree.yaml': TREE,
    'content/frontend/js/async/other.mdx': "export const meta = { verified: '01.01.2026', versions: 'X' }\n",
    'content/frontend/js/async/other.practice.yaml': '- { key: t1, kind: code, title: Своя задача }\n- { key: q, kind: quiz }\n',
    'content/frontend/js/async/filled.mdx': 'старый файл',
    'content/frontend/js/async/empty.practice.yaml': '# пока пусто\n',
    'docs/research/sources/js/promises.md': NOTE,
    'docs/research/sources/css/x.md': '# X\n\nИсточников нет.\n',
  }
  if (withResearch) {
    files['docs/research/interview-questions.json'] = JSON.stringify({ leaves: [{ id: 'js/async/promises', questions: [['Что такое промис?', 'src', 1], ['Как работает then?', 'src', 0]] }] })
  }
  for (const [file, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true })
    await writeFile(path.join(root, file), text)
  }
  return { contentRoot: path.join(root, 'content'), docsRoot: path.join(root, 'docs') }
}

const read = (file: string) => readFile(path.join(root, file), 'utf8')

describe('заготовка темы', () => {
  it('источники из заметки: только раздел «Источники» и только строки со ссылкой', () => {
    expect(sourcesFromNote(NOTE)).toEqual(['- [ECMA-262, Promise Objects](https://tc39.es/ecma262/#sec-promise-objects)', '- [MDN, Promise](https://developer.mozilla.org/promise)'])
    expect(sourcesFromNote('# без раздела')).toEqual([])
  })

  it('создаёт три файла с вопросами, задачами соседей и источниками, отмечает тему в дереве', async () => {
    const roots = await project()
    const result = await scaffoldTopic({ ...roots, id: 'js/async/promises', now: new Date(2026, 10, 11) })
    expect(result.topicId).toBe('frontend/js/async/promises')
    expect(result.warnings).toEqual([])
    expect(result.files.map((file) => path.relative(root, file))).toEqual([
      'content/frontend/js/async/promises.mdx',
      'content/frontend/js/async/promises.cards.yaml',
      'content/frontend/js/async/promises.practice.yaml',
      'content/frontend/tree.yaml',
    ])

    const lesson = await read('content/frontend/js/async/promises.mdx')
    expect(lesson).toContain("verified: '11.11.2026'")
    expect(lesson).toContain('- [MDN, Promise](https://developer.mozilla.org/promise)')
    for (const section of ['## Learn', '## Implement', '## Confirm', '## Источники']) expect(lesson).toContain(section)

    expect(await read('content/frontend/js/async/promises.cards.yaml')).toContain('Норма для уровня J: не меньше 12 карточек.')
    const practice = await read('content/frontend/js/async/promises.practice.yaml')
    expect(practice).toContain('#   - Что такое промис?')
    expect(practice).toContain('#   - async/other: t1 — Своя задача')
    expect(practice).not.toContain('async/other: q')

    const tree = await read('content/frontend/tree.yaml')
    expect(tree).toContain(`        - slug: promises\n          title: 'Промисы'\n          grade: J\n          content: true\n          goals:\n            - "TODO: цель`)
    expect(tree).toContain('# Дерево')
    expect(tree).toContain('- { slug: other, title: Другая, grade: M, content: true }')

    // Проверка контента не пропускает заготовку: метки TODO и нормы состава.
    const { errors } = await checkContent(roots.contentRoot, { only: 'js/async/promises' })
    expect(errors).toEqual([
      'js/async/promises: карточек 1, нужно не меньше 12 (J)',
      'js/async/promises: быстрых заданий (квиз, «что выведет», порядок) 1, нужно не меньше 10 (J)',
      'js/async/promises: задач с кодом 0, нужно не меньше 4 (J)',
      expect.stringMatching(/^js\/async\/promises: незаполненных меток TODO — \d+$/),
    ])
  })

  it('без заметки исследования — предупреждение; без вопросов и задач соседей — пометки', async () => {
    const roots = await project({ withResearch: false })
    const solo = await scaffoldTopic({ ...roots, id: 'frontend/js/solo' })
    expect(solo.warnings).toEqual([`Нет заметки исследования ${path.join('research', 'sources', 'js', 'solo.md')} — сначала соберите её (шаг 1)`])
    expect(await read('content/frontend/js/solo.mdx')).toContain('- TODO: источники с датой проверки')
    expect(await read('content/frontend/js/solo.practice.yaml')).toContain('(в исследовании вопросов по теме нет)')

    const x = await scaffoldTopic({ ...roots, id: 'css/x' })
    expect(x.warnings).toEqual([])
    expect(await read('content/frontend/css/x.practice.yaml')).toContain('#   (пока нет)')
    expect(await read('content/frontend/css/x.cards.yaml')).toContain('Норма для уровня J')

    // Тема без раздела: соседей нет.
    await scaffoldTopic({ ...roots, id: 'top' })
    expect(await read('content/frontend/top.practice.yaml')).toContain('#   (пока нет)')
  })

  it('понятные ошибки: нет темы, это раздел, тема уже наполнена', async () => {
    const roots = await project()
    const run = (id: string) => scaffoldTopic({ ...roots, id })
    await expect(run('js/nope')).rejects.toThrow('Темы «js/nope» нет в дереве frontend/tree.yaml')
    await expect(run('js/solo/deeper')).rejects.toThrow('Темы «js/solo/deeper» нет в дереве')
    await expect(run('js/async')).rejects.toThrow('«js/async» — раздел, а не тема: у него есть вложенные темы')
    await expect(run('js/async/other')).rejects.toThrow('Тема «js/async/other» уже наполнена — правьте её файлы')
    await expect(run('js/async/filled')).rejects.toThrow('Тема «js/async/filled» уже наполнена')
    expect(await read('content/frontend/tree.yaml')).toBe(TREE)
  })
})
