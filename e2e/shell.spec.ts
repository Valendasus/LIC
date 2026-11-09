import { expect, test } from './fixtures'

test('боковая панель: разделы, активный раздел, счётчик практики; в практике навигации нет', async ({ page }) => {
  await page.goto('/frontend')
  const nav = page.getByRole('navigation', { name: 'Основная навигация' })
  await expect(nav.getByRole('link', { name: 'Курс' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: /^Практика, ждут \d+$/ })).toBeVisible()
  // На десктопе нижней панели не видно.
  await expect(page.getByRole('navigation', { name: 'Нижняя навигация' })).toBeHidden()

  await nav.getByRole('link', { name: /^Практика/ }).click()
  await expect(page).toHaveURL(/\/practice$/)
  await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toHaveCount(0)
})

test('старый адрес /review ведёт на /practice с теми же параметрами', async ({ page }) => {
  await page.goto('/review?scope=frontend/javascript/scope/closures&mode=free&kinds=card')
  await expect(page).toHaveURL(/\/practice\?scope=frontend%2Fjavascript%2Fscope%2Fclosures&mode=free&kinds=card$|\/practice\?scope=frontend\/javascript\/scope\/closures&mode=free&kinds=card$/)
  await expect(page.getByRole('button', { name: /^Карточка:/ })).toBeVisible()
})

test('поиск по ⌘K: тема находится и открывается с клавиатуры', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('ControlOrMeta+K')
  const search = page.getByRole('combobox', { name: 'Найти тему или команду' })
  await expect(search).toBeFocused()
  await search.fill('замыкан')
  await expect(page.getByRole('option').first()).toContainText('Замыкания')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/frontend\/javascript\/scope\/closures$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Замыкания' })).toBeVisible()
})

test('кнопка поиска и Esc', async ({ page }) => {
  await page.goto('/frontend')
  await page.getByRole('button', { name: 'Поиск' }).click()
  await expect(page.getByRole('dialog', { name: 'Поиск' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Поиск' })).toBeHidden()
})
