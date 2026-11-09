import type { Page } from '@playwright/test'
import { practice, type RawPractice } from './content'
import { expect, reviewRows, test } from './fixtures'

const TOPIC = 'javascript/scope/closures'
const tasks = () => practice(TOPIC).filter((item) => item.kind === 'code')

const editor = (page: Page) => page.locator('.cm-content')

/** Заменяет весь текст в редакторе. insertText — как вставка: автоскобки CodeMirror не мешают. */
async function setCode(page: Page, code: string) {
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.insertText(code)
}

/** Какая задача сейчас на экране — по заголовку. */
async function currentTask(page: Page): Promise<RawPractice> {
  const title = await page.getByRole('heading', { level: 2 }).innerText()
  const task = tasks().find((item) => item.title === title)
  expect(task, `задача «${title}» есть в контенте`).toBeTruthy()
  return task!
}

test('решение с ошибкой, подсказка, затем верное решение: тесты в воркере, эталон после решения, оценка «Трудно»', async ({ page }) => {
  await page.goto(`/practice?scope=frontend/${TOPIC}&kinds=code`)
  const task = await currentTask(page)
  // Эталон не лежит на странице до решения.
  expect(await page.content()).not.toContain(task.solution!.trim().split('\n')[1].trim())
  await expect(editor(page)).toContainText(task.starter!.split('\n')[0])

  await page.getByRole('button', { name: /Запустить тесты/ }).click()
  const result = page.getByRole('status', { name: 'Результат запуска' })
  await expect(result).toContainText(/Тесты: 0 из \d+/)
  await expect(page.locator('[data-test-result="fail"]').first()).toBeVisible()

  await page.getByRole('button', { name: /^Подсказка 1 из/ }).click()
  await expect(page.getByRole('list', { name: 'Подсказки' }).locator('li')).toHaveCount(1)

  await setCode(page, task.solution!)
  // Ctrl/⌘+Enter запускает тесты прямо из редактора.
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(page.getByText('Решено')).toBeVisible()
  await expect(page.locator('[data-test-result="fail"]')).toHaveCount(0)
  await expect(page.getByText('Эталонное решение')).toBeVisible()

  await page.getByRole('button', { name: /^Дальше/ }).click()
  await expect.poll(async () => (await reviewRows()).logs.map((log) => [log.itemId.split('#')[1], log.rating])).toEqual([[task.key, 2]])
  expect((await reviewRows()).items[0].kind).toBe('code')
})

test('с первого запуска — «Хорошо»; «Показать решение» — «Снова» и задача возвращается в сессию', async ({ page }) => {
  await page.goto(`/practice?scope=frontend/${TOPIC}&kinds=code`)
  const first = await currentTask(page)
  await setCode(page, first.solution!)
  await page.getByRole('button', { name: /Запустить тесты/ }).click()
  await expect(page.getByText('с первого запуска')).toBeVisible()
  await page.getByRole('button', { name: /^Дальше/ }).click()

  const second = await currentTask(page)
  expect(second.key).not.toBe(first.key)
  await page.getByRole('button', { name: 'Показать решение' }).click()
  await expect(page.getByText('Решение открыто', { exact: true })).toBeVisible()
  await expect(page.locator('details[open] pre')).toContainText(second.solution!.split('\n')[0])
  await page.getByRole('button', { name: /^Дальше/ }).click()

  await expect.poll(async () => (await reviewRows()).logs.map((log) => log.rating)).toEqual([3, 1])
  // После «Снова» задача вернётся через минуту — в этой же сессии, в конце очереди.
  await expect(page.locator('main .font-mono').first()).toHaveText(/^3 \/ 5$/)
})

test('бесконечный цикл останавливается, страница остаётся живой', async ({ page }) => {
  await page.goto(`/practice?scope=frontend/${TOPIC}&kinds=code`)
  const task = await currentTask(page)
  await setCode(page, `${task.starter}\nwhile (true) {}`)
  await page.getByRole('button', { name: /Запустить тесты/ }).click()
  await expect(page.getByRole('button', { name: /Проверяем…/ })).toBeDisabled()
  await expect(page.getByText(/Остановлено по времени/)).toBeVisible({ timeout: 10_000 })

  // Основной поток не был заблокирован: подсказка открывается, следующий запуск работает.
  await page.getByRole('button', { name: /^Подсказка 1 из/ }).click()
  await setCode(page, task.solution!)
  await page.getByRole('button', { name: /Запустить тесты/ }).click()
  await expect(page.getByText('Решено')).toBeVisible()
})

test('черновик переживает перезагрузку и сбрасывается к заготовке', async ({ page }) => {
  await page.goto(`/practice?scope=frontend/${TOPIC}&kinds=code&mode=free`)
  const task = await currentTask(page)
  await setCode(page, '// мой черновик')
  await page.reload()
  // В свободной тренировке порядок случайный — ищем ту же задачу.
  for (let i = 0; i < 8 && (await currentTask(page)).key !== task.key; i++) await page.reload()
  await expect(editor(page)).toHaveText('// мой черновик')
  await page.getByRole('button', { name: 'Сбросить к заготовке' }).click()
  await expect(editor(page)).toContainText(task.starter!.split('\n')[0])
})

test('ошибки решения видны: синтаксис, исключение, console.log', async ({ page }) => {
  await page.goto(`/practice?scope=frontend/${TOPIC}&kinds=code`)
  await setCode(page, 'function (')
  await page.getByRole('button', { name: /Запустить тесты/ }).click()
  await expect(page.getByText(/Код не запустился\. Синтаксическая ошибка/)).toBeVisible()

  await setCode(page, "console.log('привет', { a: 1 })")
  await page.getByRole('button', { name: /Запустить тесты/ }).click()
  await expect(page.getByText('Вывод console.log')).toBeVisible()
  await expect(page.getByText('привет {"a":1}')).toBeVisible()
  await expect(page.locator('[data-test-result="fail"]').first()).toContainText(/is not defined/)
})

test('все задачи всех тем решаются своим эталоном в настоящем браузере', async ({ page }) => {
  test.setTimeout(120_000)
  for (const topic of ['javascript/scope/closures', 'javascript/async/event-loop', 'css/cascade/specificity']) {
    const keys = practice(topic).filter((item) => item.kind === 'code')
    await page.goto(`/practice?scope=frontend/${topic}&kinds=code&mode=free`)
    for (let i = 0; i < keys.length; i++) {
      const title = await page.getByRole('heading', { level: 2 }).innerText()
      const task = keys.find((item) => item.title === title)!
      await setCode(page, task.solution!)
      await page.getByRole('button', { name: /Запустить тесты/ }).click()
      await expect(page.getByText('Решено'), `${topic}: ${task.key}`).toBeVisible({ timeout: 10_000 })
      await page.getByRole('button', { name: /^Дальше/ }).click()
    }
    await expect(page.getByText('Сессия завершена')).toBeVisible()
  }
})
