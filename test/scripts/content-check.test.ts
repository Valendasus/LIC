import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { checkContent, runOutput } from '../../scripts/content-check.mjs'

let root: string
afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true })
})

/** Собирает временный каталог content из пар «путь → текст». */
async function content(files: Record<string, string>) {
  root = await mkdtemp(path.join(tmpdir(), 'lic-content-'))
  const all = { 'specialties.yaml': '- slug: s\n  title: S\n  status: active\n- slug: p\n  title: P\n  status: planned\n', ...files }
  for (const [file, text] of Object.entries(all)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true })
    await writeFile(path.join(root, file), text)
  }
  return checkContent(root)
}

const META = "export const meta = { verified: '01.01.2026', versions: 'X' }\n"

describe('проверка контента', () => {
  it('корректный контент проходит и даёт статистику', async () => {
    const result = await content({
      's/tree.yaml': '- slug: a\n  title: A\n  grade: J\n  children:\n    - { slug: b, title: B, content: true }\n    - { slug: c, title: C }\n',
      's/a/b.mdx': META,
      's/a/b.cards.yaml': '- { key: k1, type: term, front: F, back: B, reverse: true }\n- { key: k2, type: qa, front: F, back: B }\n',
      's/a/b.practice.yaml': [
        '- { key: q, kind: quiz, question: Q, explain: E, options: [{ text: A, correct: true }, { text: B }] }',
        "- { key: o, kind: output, code: \"console.log(1, 'x')\", answer: ['1 x'], explain: E }",
        '- { key: r, kind: order, prompt: P, steps: [a, b, c], explain: E }',
      ].join('\n'),
    })
    expect(result.errors).toEqual([])
    expect(result.stats).toEqual({ leaves: 2, filled: 1, cards: 3, practice: 3 })
  })

  it('ошибки дерева', async () => {
    const { errors } = await content({
      's/tree.yaml': [
        '- { slug: Bad Slug, title: X }',
        '- { slug: dup }',
        '- { slug: dup, title: Y, grade: Z }',
        '- slug: parent',
        '  title: P',
        '  content: true',
        '  children: [{ slug: kid, title: K, content: true }]',
        '- { title: Без слага }',
      ].join('\n'),
    })
    expect(errors).toEqual([
      'Bad Slug: slug должен быть из латиницы, цифр и дефисов',
      'dup: нет title',
      'dup: повторяется slug среди соседей',
      'dup: grade должен быть J, M или S',
      'parent: у узла с детьми не может быть content',
      'parent/kid: content: true, но нет файла s/parent/kid.mdx',
      '?: slug должен быть из латиницы, цифр и дефисов',
    ])
  })

  it('урок без meta и лишние файлы', async () => {
    const { errors } = await content({
      's/tree.yaml': '- { slug: a, title: A, content: true }\n- { slug: b, title: B }\n',
      's/a.mdx': '# без meta\n',
      's/b.mdx': META,
      's/zzz.cards.yaml': '[]',
      's/ignored.txt': 'не контент',
    })
    expect(errors).toEqual([
      'a.mdx: нет export const meta с verified и versions',
      's/b.mdx: файл есть, но в дереве нет такой темы (или у неё нет content: true)',
      's/zzz.cards.yaml: файл есть, но в дереве нет такой темы (или у неё нет content: true)',
    ])
  })

  it('ошибки карточек', async () => {
    const { errors } = await content({
      's/tree.yaml': '- { slug: a, title: A }\n- { slug: y, title: Y }\n',
      's/a.cards.yaml': [
        '- { key: Bad, type: term, front: F, back: B }',
        '- { key: k, type: nope, front: "", back: "  " }',
        '- { key: k, type: qa, front: F, back: B, reverse: true }',
      ].join('\n'),
      's/y.cards.yaml': 'front: a: b',
    })
    expect(errors).toEqual([
      'a.cards.yaml #1: key из латиницы, цифр и дефисов',
      'a.cards.yaml #2: type должен быть term, qa, code',
      'a.cards.yaml #2: пустой front',
      'a.cards.yaml #2: пустой back',
      'a.cards.yaml #3: повторяется key «k»',
      'a.cards.yaml #3: reverse бывает только у term',
      expect.stringMatching(/^y\.cards\.yaml: ошибка YAML — /),
    ])
  })

  it('пустой файл карточек — не ошибка', async () => {
    const { errors, stats } = await content({ 's/tree.yaml': '- { slug: a, title: A }\n', 's/a.cards.yaml': '' })
    expect(errors).toEqual([])
    expect(stats.cards).toBe(0)
  })

  it('ошибки заданий, включая неверный ответ «что выведет» и упавший код', async () => {
    const { errors } = await content({
      's/tree.yaml': '- { slug: a, title: A }\n',
      's/a.cards.yaml': '- { key: dup, type: qa, front: F, back: B }\n',
      's/a.practice.yaml': [
        '- { key: dup, kind: quiz, explain: E, options: [{ text: A }] }',
        '- { kind: weird }',
        '- { key: q2, kind: quiz, question: Q, explain: E, options: "нет", }',
        '- { key: q3, kind: quiz, question: Q, explain: E, options: [{ text: "", correct: true }, { text: B }] }',
        '- { key: r1, kind: order, explain: E, steps: [a, b] }',
        '- { key: r2, kind: order, prompt: P, explain: E, steps: [a, a, b] }',
        '- { key: o1, kind: output, explain: E, code: x }',
        "- { key: o2, kind: output, explain: E, code: \"console.log('a')\", answer: [b] }",
        '- { key: o3, kind: output, explain: E, code: "throw new Error(\'бум\')", answer: [] }',
      ].join('\n'),
    })
    expect(errors).toEqual([
      'a.practice.yaml #1 (dup): key «dup» уже занят в этой теме',
      'a.practice.yaml #1 (dup): нет question',
      'a.practice.yaml #1 (dup): нужно хотя бы 2 варианта',
      'a.practice.yaml #1 (dup): нет верного варианта',
      'a.practice.yaml #2 (без ключа): key из латиницы, цифр и дефисов',
      'a.practice.yaml #2 (без ключа): kind должен быть quiz, output, order, code, types, react',
      'a.practice.yaml #2 (без ключа): нет explain',
      'a.practice.yaml #3 (q2): нужно хотя бы 2 варианта',
      'a.practice.yaml #3 (q2): нет верного варианта',
      'a.practice.yaml #4 (q3): пустой текст варианта',
      'a.practice.yaml #5 (r1): нет prompt',
      'a.practice.yaml #5 (r1): нужно хотя бы 3 шага',
      'a.practice.yaml #6 (r2): шаги должны различаться',
      'a.practice.yaml #7 (o1): нужны code и answer (список строк)',
      'a.practice.yaml #8 (o2): ответ не совпадает с реальным выводом. Указано ["b"], выводится ["a"]',
      'a.practice.yaml #9 (o3): код упал при запуске — бум',
    ])
  })

  it('битый YAML заданий', async () => {
    const { errors } = await content({ 's/tree.yaml': '- { slug: a, title: A }\n', 's/a.practice.yaml': 'kind: a: b' })
    expect(errors).toEqual([expect.stringMatching(/^a\.practice\.yaml: ошибка YAML — /)])
  })

  it('«что выведет» ждёт асинхронный вывод', async () => {
    expect(await runOutput("setTimeout(() => console.log('t')); Promise.resolve().then(() => console.log('p')); console.log('s')")).toEqual(['s', 'p', 't'])
  })

  it('задачи на код: поля, уровень, подсказки, эталон проходит тесты, заготовка — нет', async () => {
    const task = (key: string, fields: string) => `- key: ${key}\n  kind: code\n  explain: E\n${fields}`
    const ok = "  title: T\n  prompt: P\n  tests: |\n    test('t1', () => expect(one()).toBe(1))\n    test('t2', () => expect(two()).toBe(2))\n"
    const { errors, stats } = await content({
      's/tree.yaml': '- { slug: a, title: A }\n',
      's/a.practice.yaml': [
        // Хороший: заготовка оставляет отклонённый промис без обработчика — проверка не падает.
        task('good', `${ok}  level: easy\n  hints: [h]\n  starter: "Promise.reject(new Error('x')); function one() {}"\n  solution: "const one = () => 1, two = () => 2"\n`),
        task('empty', '  level: nope\n  starter: 1\n'),
        task('hints', `${ok}  level: hard\n  hints: [a]\n  starter: ''\n  solution: "const one = () => 1, two = () => 2"\n`),
        task('bad-hints', `${ok}  level: easy\n  hints: [a, '']\n  starter: ''\n  solution: "const one = () => 1, two = () => 2"\n`),
        task('wrong', `${ok}  level: warmup\n  starter: ''\n  solution: "const one = () => 1, two = () => 1"\n`),
        task('broken', `${ok}  level: warmup\n  starter: ''\n  solution: "const one = ("\n`),
        task('weak', `${ok}  level: warmup\n  starter: "const one = () => 1, two = () => 2"\n  solution: "const one = () => 1, two = () => 2"\n`),
        task('no-tests', "  title: T\n  prompt: P\n  tests: '// пусто'\n  level: warmup\n  starter: ''\n  solution: 'const a = 1'\n"),
        task('no-solution', "  title: T\n  prompt: P\n  tests: x\n  level: warmup\n  starter: ''\n"),
      ].join('\n'),
    })
    expect(errors).toEqual([
      'a.practice.yaml #2 (empty): нет title',
      'a.practice.yaml #2 (empty): нет prompt',
      'a.practice.yaml #2 (empty): нет tests',
      'a.practice.yaml #2 (empty): нет solution',
      'a.practice.yaml #2 (empty): нет starter (может быть пустой строкой)',
      'a.practice.yaml #2 (empty): level должен быть warmup, easy, medium, hard, boss',
      'a.practice.yaml #3 (hints): для уровня hard нужно подсказок не меньше 3',
      'a.practice.yaml #4 (bad-hints): hints — список непустых строк',
      'a.practice.yaml #5 (wrong): эталон не проходит тесты — t2: Ожидалось 2, получено 1',
      expect.stringMatching(/^a\.practice\.yaml #6 \(broken\): эталон не проходит тесты — Синтаксическая ошибка: /),
      'a.practice.yaml #7 (weak): заготовка уже проходит все тесты — тесты ничего не проверяют',
      'a.practice.yaml #8 (no-tests): эталон не проходит тесты — тестов нет',
      'a.practice.yaml #9 (no-solution): нет solution',
    ])
    expect(stats.practice).toBe(9)
  })

  it('задачи на типы проверяются компилятором, React-задачи — сборкой', async () => {
    const task = (key: string, kind: string, fields: string) => `- key: ${key}\n  kind: ${kind}\n  level: warmup\n  title: T\n  prompt: P\n  explain: E\n${fields}`
    const typeTests = "  tests: 'type cases = [Expect<Equal<X, 1>>]'\n"
    const { errors } = await content({
      's/tree.yaml': '- { slug: a, title: A }\n',
      's/a.practice.yaml': [
        task('types-good', 'types', `${typeTests}  starter: 'type X = 2'\n  solution: 'type X = 1'\n`),
        task('types-wrong', 'types', `${typeTests}  starter: 'type X = 2'\n  solution: 'type X = 3'\n`),
        task('types-weak', 'types', `${typeTests}  starter: 'type X = 1'\n  solution: 'type X = 1'\n`),
        task('react-good', 'react', "  tests: \"test('t', () => render(<A />))\"\n  starter: 'function A() { return null }'\n  solution: 'function A() { return <p /> }'\n  preview: '<A />'\n"),
        task('react-broken', 'react', "  tests: \"test('t', () => {})\"\n  starter: 'function A( {'\n  solution: 'const a = <p>'\n"),
      ].join('\n'),
    })
    expect(errors).toEqual([
      "a.practice.yaml #2 (types-wrong): эталон не проходит тесты — type cases = [Expect<Equal<X, 1>>]: Type 'false' does not satisfy the constraint 'true'.",
      'a.practice.yaml #3 (types-weak): заготовка уже проходит все тесты — тесты ничего не проверяют',
      expect.stringMatching(/^a\.practice\.yaml #5 \(react-broken\): solution не собирается — Синтаксическая ошибка, строка \d+: /),
      expect.stringMatching(/^a\.practice\.yaml #5 \(react-broken\): starter не собирается — Синтаксическая ошибка, строка \d+: /),
    ])
  })
})
