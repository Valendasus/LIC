import { expect, test } from './fixtures'

const PAGES = [
  '/',
  '/frontend',
  '/frontend/javascript',
  '/frontend/javascript/scope/closures',
  '/frontend/javascript/async/event-loop',
  '/frontend/css/cascade/specificity',
  '/review?scope=frontend/javascript/scope/closures&mode=free&kinds=card',
  '/review?scope=frontend/javascript/async/event-loop&mode=free&kinds=output',
  '/review?scope=frontend/css/cascade/specificity&mode=free&kinds=quiz',
  '/review?scope=frontend/css/cascade/specificity&mode=free&kinds=order',
  '/review?scope=frontend/javascript/async/event-loop&mode=free&kinds=code',
  '/review?scope=frontend/typescript/type-level&mode=free',
  '/review?scope=frontend/react-patterns/accessible-components&mode=free',
]

test('на телефоне страницы не прокручиваются по горизонтали', async ({ page }) => {
  for (const url of PAGES) {
    await page.goto(url)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, url).toBeLessThanOrEqual(0)
  }
})

test('карточка переворачивается касанием', async ({ page }) => {
  await page.goto('/review?scope=frontend/javascript/scope/closures&mode=free&kinds=card')
  const card = page.getByRole('button', { name: /^Карточка:/ })
  await card.tap()
  await expect(card).toHaveAttribute('aria-label', /ответ/)
  await expect(page.locator('[data-grade]')).toHaveCount(2)
})

test('задача на код на телефоне: редактор, запуск и результат помещаются в экран', async ({ page }) => {
  await page.goto('/review?scope=frontend/css/cascade/specificity&kinds=code')
  await page.locator('.cm-content').tap()
  await page.keyboard.insertText('\nconst wide = "очень длинная строка, которая не должна растягивать страницу по горизонтали ни на телефоне, ни где-то ещё"')
  await page.getByRole('button', { name: /Запустить тесты/ }).tap()
  // Касание ставит курсор в случайное место кода — результат может быть и ошибкой синтаксиса. Важна ширина страницы.
  await expect(page.getByRole('status', { name: 'Результат запуска' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
