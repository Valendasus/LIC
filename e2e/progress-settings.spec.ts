import { expect, reviewRows, test } from './fixtures'

test('«Прогресс»: из навигации; после ответа — день активности и выученное', async ({ page }) => {
  await page.goto('/practice?scope=frontend/javascript/scope/closures&kinds=card')
  await page.keyboard.press('Space')
  await page.keyboard.press('3')
  await expect.poll(async () => (await reviewRows()).logs.length).toBe(1)

  await page.goto('/')
  await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Прогресс' }).click()
  await expect(page).toHaveURL(/\/progress$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Прогресс' })).toBeVisible()
  await expect(page.getByText('1 день с занятиями · 1 ответ')).toBeVisible()
  await expect(page.getByText('В изучении')).toBeVisible()
})

test('темп из настроек меняет число новых в день; анимации запоминаются', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByRole('button', { name: /Обычно/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /Спокойно/ }).click()
  await expect(page.getByRole('button', { name: /Спокойно/ })).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/frontend')
  await expect(page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Практика, ждут 10' })).toBeVisible()

  await page.goto('/settings')
  await page.getByRole('switch', { name: /Уменьшить анимации/ }).click()
  await page.reload()
  await expect(page.getByRole('switch', { name: /Уменьшить анимации/ })).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce')
})
