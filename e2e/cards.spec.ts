import type { Page } from '@playwright/test'
import { cards, plain } from './content'
import { expect, reviewRows, test } from './fixtures'

const SCOPE = 'frontend/javascript/scope/closures'
const card = (page: Page) => page.getByRole('button', { name: /^Карточка:/ })
const counter = (page: Page) => page.locator('main .font-mono').first()

/** Отвечает на все карточки в сессии оценкой «Хорошо» и возвращает, сколько было. */
async function answerAll(page: Page) {
  let answered = 0
  while (await card(page).count()) {
    await page.keyboard.press('Space')
    await expect(card(page)).toHaveAttribute('aria-label', /ответ/)
    await page.keyboard.press('3')
    answered++
  }
  // Итог появляется только после того, как все ответы сохранены на сервере.
  await expect(page.getByText('Сессия завершена')).toBeVisible()
  return answered
}

test('переворот карточки кликом, пробелом и Enter; на экране всегда одна сторона', async ({ page }) => {
  await page.goto(`/review?scope=${SCOPE}&kinds=card`)
  const first = cards('javascript/scope/closures')[0]
  await expect(card(page)).toContainText(first.front)
  await expect(page.locator('[data-side]')).toHaveCount(1)

  await card(page).click()
  await expect(card(page)).toContainText(plain(first.back))
  await expect(page.locator('[data-side="back"]')).toHaveCount(1)
  await expect(page.locator('[data-side="front"]')).toHaveCount(0)

  await page.keyboard.press('Space')
  await expect(page.locator('[data-side="front"]')).toHaveCount(1)
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-side="back"]')).toHaveCount(1)

  // У каждой оценки подписан срок следующего показа.
  const grades = page.locator('[data-grade]')
  await expect(grades).toHaveCount(4)
  await expect(grades.nth(0)).toContainText(/Снова.*мин/s)
  await expect(grades.nth(2)).toContainText(/Хорошо.*дн/s)
})

test('оценка сохраняется в расписании, «Снова» возвращает карточку в эту же сессию', async ({ page }) => {
  await page.goto(`/review?scope=${SCOPE}&kinds=card`)
  await expect(counter(page)).toHaveText(/^1 \/ (\d+)$/)
  const total = Number((await counter(page).innerText()).split('/')[1])

  await page.keyboard.press('Space')
  await page.keyboard.press('1')
  await expect(counter(page)).toHaveText(`2 / ${total + 1}`)

  await page.keyboard.press('Space')
  await page.keyboard.press('3')
  await expect(counter(page)).toHaveText(`3 / ${total + 1}`)

  await expect.poll(async () => (await reviewRows()).logs.map((log) => log.rating)).toEqual([1, 3])
  const { items } = await reviewRows()
  expect(items.map((item) => item.kind)).toEqual(['card', 'card'])
  // «Снова» у новой карточки — короткий шаг изучения, «Хорошо» — дни.
  const [again, good] = items
  expect(again.dueAt.getTime() - Date.now()).toBeLessThan(20 * 60_000)
  expect(good.dueAt.getTime() - Date.now()).toBeGreaterThan(24 * 3600_000)
})

test('обратные карточки появляются только после прямых, лимит и «На сегодня всё»', async ({ page }) => {
  const raw = cards('javascript/scope/closures')
  const direct = raw.length
  const reversed = raw.filter((item) => item.reverse).length

  await page.goto(`/review?scope=${SCOPE}&kinds=card`)
  expect(await answerAll(page)).toBe(direct)

  // Новый день не наступил: лимит 20 новых, прямые уже потрачены — остаток уходит на обратные.
  await page.goto(`/review?scope=${SCOPE}&kinds=card`)
  await expect(card(page)).toContainText('обратная')
  expect(await answerAll(page)).toBe(Math.min(reversed, 20 - direct))

  await page.goto(`/review?scope=${SCOPE}&kinds=card`)
  await expect(page.getByText('На сегодня всё')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Свободная тренировка' })).toBeVisible()
})

test('после «Снова» карточка не пропадает при повторном заходе: её берут заранее, а не откладывают до завтра', async ({ page }) => {
  await page.goto(`/review?scope=${SCOPE}&kinds=card`)
  const first = await card(page).innerText()
  await page.keyboard.press('Space')
  await page.keyboard.press('1')
  await expect.poll(async () => (await reviewRows()).logs.length).toBe(1)

  // Пользователь ушёл со страницы и вернулся раньше, чем через минуту.
  await page.goto(`/review?scope=${SCOPE}&kinds=card`)
  const total = Number((await counter(page).innerText()).split('/')[1])
  // Новые карточки впереди, отложенная — в конце очереди.
  for (let i = 1; i < total; i++) {
    await page.keyboard.press('Space')
    await page.keyboard.press('3')
  }
  await expect(card(page)).toContainText(first.split('\n').at(-2)!)
  await expect(page.getByText('Изучение')).toBeVisible()
})

test('свободная тренировка не меняет расписание, «Ещё раз» возвращает карточку в конец', async ({ page }) => {
  await page.goto(`/review?scope=${SCOPE}&mode=free&kinds=card`)
  await expect(page.getByText('без расписания')).toBeVisible()
  const total = Number((await counter(page).innerText()).split('/')[1])
  await page.keyboard.press('Space')
  await expect(page.locator('[data-grade]')).toHaveText([/Ещё раз/, /Помню/])
  await page.keyboard.press('1')
  await expect(counter(page)).toHaveText(`2 / ${total + 1}`)
  await page.keyboard.press('Space')
  await page.keyboard.press('2')
  await expect(counter(page)).toHaveText(`3 / ${total + 1}`)
  expect((await reviewRows()).logs).toEqual([])
})

test('счётчик повторения в шапке и блок практики на странице темы', async ({ page }) => {
  await page.goto('/frontend/javascript/scope/closures')
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Практика' }) })
  await expect(panel).toContainText('в изучении 0')
  await expect(page.getByRole('link', { name: /Повторение/ })).toContainText('20')
  await panel.getByRole('link', { name: /Учить и повторять/ }).click()
  await expect(page).toHaveURL(new RegExp(`/review\\?scope=${SCOPE.replace(/\//g, '%2F')}`))
  await page.keyboard.press('Space')
  await page.keyboard.press('3')
  await expect.poll(async () => (await reviewRows()).items.length).toBe(1)
  await page.goto('/frontend/javascript/scope/closures')
  await expect(page.locator('section', { has: page.getByRole('heading', { name: 'Практика' }) })).toContainText('в изучении 1')
  await expect(page.getByRole('link', { name: /Повторение/ })).toContainText('19')
})

test('ветка без практики', async ({ page }) => {
  await page.goto('/review?scope=frontend/nextjs')
  await expect(page.getByText('В этой ветке пока нет практики')).toBeVisible()
})
