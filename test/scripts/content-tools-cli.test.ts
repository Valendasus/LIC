import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runOutput = vi.fn()
const scaffoldTopic = vi.fn()
const text = vi.fn()
vi.mock('../../scripts/content-check.mjs', () => ({ runOutput }))
vi.mock('../../scripts/topic-scaffold.mjs', () => ({ scaffoldTopic }))
vi.mock('node:stream/consumers', () => ({ text }))

const argv = [...process.argv]
const args = (...rest: string[]) => (process.argv = [...argv.slice(0, 2), ...rest])
let dir: string | undefined

beforeEach(() => args())
afterEach(async () => {
  vi.restoreAllMocks()
  vi.resetModules()
  process.exitCode = undefined
  process.argv = argv
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = undefined
})

describe('npm run content:run', () => {
  it('запускает файл и печатает вывод и готовую строку answer', async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'lic-run-'))
    const file = path.join(dir, 'a.js')
    await writeFile(file, "console.log('a')")
    args(file)
    runOutput.mockResolvedValue(['a', 'b'])
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await import('../../scripts/run-output.mjs')
    expect(runOutput).toHaveBeenCalledWith("console.log('a')")
    expect(log.mock.calls.map(([line]) => line)).toEqual(['a\nb', '\nanswer: ["a","b"]'])
  })

  it('без файла читает код из stdin; пустой вывод — так и пишет', async () => {
    text.mockResolvedValue('1 + 1')
    runOutput.mockResolvedValue([])
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await import('../../scripts/run-output.mjs')
    expect(runOutput).toHaveBeenCalledWith('1 + 1')
    expect(log).toHaveBeenCalledWith('(ничего не выведено)')
  })

  it('код упал — сообщение и код выхода 1', async () => {
    text.mockResolvedValue('throw 1')
    runOutput.mockRejectedValue(new Error('бум'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await import('../../scripts/run-output.mjs')
    expect(error).toHaveBeenCalledWith('✗ Код упал: бум')
    expect(process.exitCode).toBe(1)
  })
})

describe('npm run new:topic', () => {
  it('без темы — подсказка, как вызвать', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await import('../../scripts/new-topic.mjs')
    expect(error).toHaveBeenCalledWith('✗ Укажите тему: npm run new:topic -- javascript/async/async-await')
    expect(process.exitCode).toBe(1)
  })

  it('создаёт заготовку и печатает файлы, предупреждения и следующий шаг', async () => {
    args('javascript/async/x')
    const root = path.resolve(import.meta.dirname, '../..')
    scaffoldTopic.mockResolvedValue({ topicId: 'frontend/javascript/async/x', files: [path.join(root, 'content/a.mdx')], warnings: ['нет заметки'] })
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await import('../../scripts/new-topic.mjs')
    expect(scaffoldTopic).toHaveBeenCalledWith({ contentRoot: path.join(root, 'content'), docsRoot: path.join(root, 'docs'), id: 'javascript/async/x' })
    expect(log.mock.calls.map(([line]) => line)).toEqual([
      '✓ Заготовка темы frontend/javascript/async/x:\n  content/a.mdx',
      '⚠ нет заметки',
      '\nДальше — по docs/LESSON-PLAYBOOK.md. Проверка: npm run content:check -- frontend/javascript/async/x',
    ])
  })

  it('ошибка генератора — сообщение и код выхода 1', async () => {
    args('nope')
    scaffoldTopic.mockRejectedValue(new Error('Темы «nope» нет в дереве'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await import('../../scripts/new-topic.mjs')
    expect(error).toHaveBeenCalledWith('✗ Темы «nope» нет в дереве')
    expect(process.exitCode).toBe(1)
  })
})
