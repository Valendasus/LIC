import type { Page } from '@playwright/test'
import { practice, type RawPractice } from './content'
import { expect, reviewRows, test } from './fixtures'

const editor = (page: Page) => page.locator('.cm-content')

async function setCode(page: Page, code: string) {
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.insertText(code)
}

async function currentTask(page: Page, topic: string): Promise<RawPractice> {
  const title = await page.getByRole('heading', { level: 2 }).innerText()
  const task = practice(topic).find((item) => item.title === title)
  expect(task, `задача «${title}» есть в ${topic}`).toBeTruthy()
  return task!
}

const run = (page: Page) => page.getByRole('button', { name: /Запустить тесты/ }).click()
const result = (page: Page) => page.getByRole('status', { name: 'Результат запуска' })

test('задача на типы: компилятор в воркере, ошибки по тестам, эталон проходит', async ({ page }) => {
  const topic = 'typescript/utility-types'
  await page.goto(`/practice?scope=frontend/${topic}`)
  const task = await currentTask(page, topic)
  await expect(page.getByText(/^Задача на типы · /)).toBeVisible()

  await run(page)
  // Первый запуск загружает компилятор и стандартную библиотеку.
  await expect(result(page)).toContainText(/Тесты: \d+ из \d+/, { timeout: 30_000 })
  await expect(page.locator('[data-test-result="fail"]').first()).toBeVisible()

  await setCode(page, `${task.solution}\nconst broken: number = 'строка'`)
  await run(page)
  await expect(page.locator('[data-test-result="fail"]').first()).toContainText('Решение без ошибок типов')
  await expect(page.locator('[data-test-result="fail"]').first()).toContainText("Type 'string' is not assignable to type 'number'")

  await setCode(page, task.solution!)
  await run(page)
  await expect(page.getByText('Решено')).toBeVisible()
  await page.getByRole('button', { name: /^Дальше/ }).click()
  await expect.poll(async () => (await reviewRows()).items.map((item) => item.kind)).toEqual(['types'])
})

test('все задачи на типы решаются эталоном в браузере', async ({ page }) => {
  test.setTimeout(120_000)
  for (const topic of ['typescript/utility-types', 'typescript/type-level', 'typescript/generics']) {
    const tasks = practice(topic)
    await page.goto(`/practice?scope=frontend/${topic}&mode=free`)
    for (let i = 0; i < tasks.length; i++) {
      const task = await currentTask(page, topic)
      await setCode(page, task.solution!)
      await run(page)
      await expect(page.getByText('Решено'), `${topic}#${task.key}`).toBeVisible({ timeout: 30_000 })
      await page.getByRole('button', { name: /^Дальше/ }).click()
    }
    await expect(page.getByText('Сессия завершена')).toBeVisible()
  }
})

test('React-задача: тесты в песочнице, предпросмотр живой, эталон скрыт до решения', async ({ page }) => {
  const topic = 'react-basics/state'
  await page.goto(`/practice?scope=frontend/${topic}`)
  const task = await currentTask(page, topic)
  expect(await page.content()).not.toContain('Math.max(min, v - step)')
  await expect(page.getByText('Предпросмотр появится после запуска тестов')).toBeVisible()

  await run(page)
  await expect(result(page)).toContainText(/Тесты: 0 из 4/, { timeout: 30_000 })

  await setCode(page, task.solution!)
  await run(page)
  await expect(page.getByText('Решено')).toBeVisible({ timeout: 30_000 })

  // В предпросмотре — настоящий компонент, с ним можно работать.
  const preview = page.frameLocator('iframe[title="Предпросмотр компонента"]')
  await expect(preview.getByRole('status')).toHaveText('0')
  await preview.getByRole('button', { name: 'Увеличить' }).click()
  await expect(preview.getByRole('status')).toHaveText('2')
})

test('React-задача: синтаксическая ошибка и бесконечный цикл не вешают страницу', async ({ page }) => {
  const topic = 'react-basics/state'
  await page.goto(`/practice?scope=frontend/${topic}`)
  const task = await currentTask(page, topic)

  await setCode(page, 'function Counter( {')
  await run(page)
  await expect(page.getByText(/Код не запустился\. Синтаксическая ошибка, строка \d+/)).toBeVisible({ timeout: 30_000 })

  await setCode(page, 'function Counter() { while (true) {} }')
  await run(page)
  await expect(page.locator('[data-test-result="fail"]').first()).toContainText('похоже на бесконечный цикл', { timeout: 30_000 })

  await setCode(page, task.solution!)
  await run(page)
  await expect(page.getByText('Решено')).toBeVisible({ timeout: 30_000 })
})

test('все React-задачи решаются эталоном в браузере', async ({ page }) => {
  test.setTimeout(180_000)
  for (const topic of ['react-basics/state', 'react-basics/lists-keys', 'react-basics/forms', 'react-hooks/custom-hooks', 'react-patterns/accessible-components']) {
    await page.goto(`/practice?scope=frontend/${topic}&mode=free`)
    const task = await currentTask(page, topic)
    await setCode(page, task.solution!)
    await run(page)
    await expect(page.getByText('Решено'), `${topic}#${task.key}`).toBeVisible({ timeout: 30_000 })
    await expect(page.frameLocator('iframe[title="Предпросмотр компонента"]').locator('#preview > *').first()).toBeVisible()
  }
})
