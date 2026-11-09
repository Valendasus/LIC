import { expect, progressRows, test } from './fixtures'

test('отметка освоения сохраняется, считается в ветке и сбрасывается повторным нажатием', async ({ page }) => {
  await page.goto('/frontend/javascript/scope/closures')
  const understand = page.getByRole('button', { name: /^Понимаю/ })
  await expect(understand).toHaveAttribute('aria-pressed', 'false')
  await understand.click()
  await expect(understand).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await progressRows()).map((row) => [row.nodeId, row.level])).toEqual([
    ['frontend/javascript/scope/closures', 2],
  ])

  await page.reload()
  await expect(page.getByRole('button', { name: /^Понимаю/ })).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/frontend/javascript/scope')
  await expect(page.getByRole('link', { name: /Замыкания/ })).toContainText('Понимаю')
  await page.goto('/frontend')
  await expect(page.getByText(/начато 1$/)).toBeVisible()
  // Ветка JavaScript показывает долю: 2 из 4 у одной темы из многих — больше нуля.
  await expect(page.getByRole('link', { name: /FE6 · JavaScript/ }).getByRole('progressbar')).not.toHaveAttribute('aria-valuenow', '0')

  await page.goto('/frontend/javascript/scope/closures')
  await page.getByRole('button', { name: /^Понимаю/ }).click()
  await expect(page.getByRole('button', { name: /^Понимаю/ })).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(async () => (await progressRows())[0]?.level).toBe(0)
})
