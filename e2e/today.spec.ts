import { expect, reviewRows, test } from './fixtures'

test('первый вход: «Начните с первой темы» ведёт в первую тему по пути', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Начните с первой темы')).toBeVisible()
  await expect(page.getByText('На этой неделе 0 из 7 дней')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Продолжить' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Каскад, специфичность и наследование' }).first().click()
  await expect(page).toHaveURL(/\/frontend\/css\/cascade\/specificity$/)
})

test('после ответа: повторение одной кнопкой, «Продолжить» последнюю тему, неделя', async ({ page }) => {
  await page.goto('/practice?scope=frontend/javascript/scope/closures&kinds=card')
  await page.keyboard.press('Space')
  await page.keyboard.press('3')
  await expect.poll(async () => (await reviewRows()).logs.length).toBe(1)

  await page.goto('/')
  await expect(page.getByText('На этой неделе 1 из 7 дней')).toBeVisible()
  const cont = page.getByRole('link', { name: /Замыкания.*Продолжить/s })
  await expect(cont).toContainText('Learn')
  await expect(cont).toContainText('Confirm 1 из')
  await expect(page.getByText(/^\d+ элемент/)).toBeVisible()

  await page.getByRole('link', { name: 'Начать повторение' }).click()
  await expect(page).toHaveURL(/\/practice$/)
  await page.goBack()
  await cont.click()
  await expect(page).toHaveURL(/\/frontend\/javascript\/scope\/closures$/)
})
