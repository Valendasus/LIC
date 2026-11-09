import { expect, test } from './fixtures'

test('главная: специальности, открытые и запланированные', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Learn → Implement → Confirm' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Frontend.*HTML, CSS/ })).toBeVisible()
  // Запланированная специальность видна, но не кликабельна.
  await expect(page.getByText('Backend на Node.js')).toBeVisible()
  await expect(page.getByRole('link', { name: /Backend на Node\.js/ })).toHaveCount(0)
  await expect(page.getByText('в планах').first()).toBeVisible()
})

test('дерево: специальность → блок → модуль → тема', async ({ page }) => {
  await page.goto('/frontend')
  await expect(page.getByRole('heading', { level: 1, name: 'Frontend' })).toBeVisible()
  await expect(page.getByText(/25 блоков · \d+ тем · начато 0/)).toBeVisible()
  for (const group of ['Платформа', 'Языки', 'React', 'Next.js', 'Инженерия', 'Специализации']) {
    await expect(page.getByRole('heading', { level: 2, name: group })).toBeVisible()
  }

  await page.getByRole('link', { name: /FE6 · JavaScript/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /FE6 · JavaScript/ })).toBeVisible()
  await page.getByRole('link', { name: /Области видимости и замыкания/ }).click()
  await page.getByRole('link', { name: /Замыкания/ }).click()

  await expect(page).toHaveURL('/frontend/javascript/scope/closures')
  await expect(page.getByRole('heading', { level: 1, name: /Замыкания/ })).toBeVisible()
  await expect(page.getByText('Нужно для первой работы (Junior).')).toBeVisible()
  await expect(page.getByText(/Проверено 08\.11\.2026/)).toBeVisible()
  await expect(page.getByText('После темы вы сможете')).toBeVisible()
  for (const section of ['Learn', 'Implement', 'Confirm', 'Источники']) {
    await expect(page.getByRole('heading', { level: 2, name: section })).toBeVisible()
  }

  // Хлебные крошки ведут обратно.
  await page.getByRole('navigation', { name: 'Путь' }).getByRole('link', { name: 'FE6 · JavaScript' }).click()
  await expect(page).toHaveURL('/frontend/javascript')
})

test('лестница подсказок открывается по одной ступени, решение — отдельно', async ({ page }) => {
  await page.goto('/frontend/javascript/scope/closures')
  const task = page.locator('section', { hasText: 'debounce с cancel и flush' })
  await expect(task.getByText('Подсказка 1.')).toHaveCount(0)
  await task.getByRole('button', { name: 'Подсказка 1 из 4' }).click()
  await expect(task.getByText('Подсказка 1.')).toBeVisible()
  await task.getByRole('button', { name: 'Подсказка 2 из 4' }).click()
  await task.getByRole('button', { name: 'Подсказка 3 из 4' }).click()
  await task.getByRole('button', { name: 'Подсказка 4 из 4' }).click()
  await expect(task.getByRole('button', { name: /Подсказка \d из 4/ })).toHaveCount(0)
  await expect(task.locator('pre')).toHaveCount(0)
  await task.getByRole('button', { name: 'Показать решение' }).click()
  await expect(task.locator('pre').first()).toContainText('function debounce')
  await expect(task.getByRole('button', { name: 'Показать решение' })).toHaveCount(0)
})

test('вопрос на вспоминание раскрывается по клику', async ({ page }) => {
  await page.goto('/frontend/javascript/async/event-loop')
  const question = page.locator('details', { hasText: 'Опишите один оборот цикла событий' })
  await expect(question.getByText(/Взять одну задачу/)).toBeHidden()
  await question.locator('summary').click()
  await expect(question.getByText(/Взять одну задачу/)).toBeVisible()
})

test('ненаполненная тема и страницы, которых нет', async ({ page, pageErrors }) => {
  await page.goto('/frontend/nextjs/routing')
  await expect(page.getByText('Тема ещё не наполнена.', { exact: false })).toBeVisible()

  for (const url of ['/frontend/nope', '/frontend/javascript/nope/deeper', '/backend', '/review?scope=frontend/nope']) {
    const response = await page.goto(url)
    expect(response?.status(), url).toBe(404)
  }
  // Браузер пишет в консоль о каждом ответе 404 — здесь это ожидаемо, остальные ошибки должны отсутствовать.
  const unexpected = pageErrors.filter((message) => !/status of 404/.test(message))
  pageErrors.length = 0
  pageErrors.push(...unexpected)
})
