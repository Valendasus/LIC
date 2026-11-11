import { expect, test } from './fixtures'

test('«Сегодня»: специальности, открытые и запланированные', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: /^(Доброе утро|Добрый день|Добрый вечер|Доброй ночи)$/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Frontend.*JavaScript и браузер/ })).toBeVisible()
  // Запланированная специальность видна, но не кликабельна.
  await expect(page.getByText('Backend на Node.js')).toBeVisible()
  await expect(page.getByRole('link', { name: /Backend на Node\.js/ })).toHaveCount(0)
  await expect(page.getByText('в планах').first()).toBeVisible()
})

test('дерево: специальность → блок → модуль → тема', async ({ page }) => {
  await page.goto('/frontend')
  await expect(page.getByRole('heading', { level: 1, name: 'Frontend' })).toBeVisible()
  // Курс — путь по этапам, первый этап текущий.
  const path = page.getByRole('list', { name: 'Путь по этапам' })
  for (const stage of ['Фундамент', 'Типы и React', 'Данные и Next.js', 'Инженерия', 'Вёрстка и стили', 'Специализация и собеседования']) {
    await expect(path.getByRole('heading', { level: 2, name: new RegExp(stage) })).toBeVisible()
  }
  await expect(path.getByRole('heading', { level: 2, name: /Фундамент/ })).toContainText('текущий этап')

  await page.getByRole('link', { name: /JavaScript.*из \d+ тем/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'JavaScript' })).toBeVisible()
  await page.getByRole('link', { name: 'Области видимости и замыкания', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Области видимости и замыкания' })).toBeVisible()
  await page.getByRole('link', { name: /^Замыкания/ }).click()

  await expect(page).toHaveURL('/frontend/javascript/scope/closures')
  await expect(page.getByRole('heading', { level: 1, name: /Замыкания/ })).toBeVisible()
  await expect(page.getByText('Junior', { exact: true })).toBeVisible()
  await expect(page.getByText('После темы вы сможете')).toBeVisible()
  // Тема — три шага-вкладки; открыт Learn: объяснение, источники и дата проверки, без заголовков шагов в тексте.
  await expect(page.getByRole('tab')).toHaveText([/Learn · понять/, /Implement · применить/, /Confirm · закрепить/])
  await expect(page.getByRole('tab', { selected: true })).toContainText('Learn')
  await expect(page.getByRole('heading', { level: 3, name: 'Суть за минуту' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Источники' })).toBeVisible()
  await expect(page.getByText(/Проверено 08\.11\.2026/)).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Learn' })).toHaveCount(0)

  // «Дальше» переключает шаг и запоминает его в адресе.
  await page.getByRole('button', { name: 'Дальше: Implement' }).click()
  await expect(page).toHaveURL(/#implement$/)
  await expect(page.getByRole('tabpanel')).toContainText('Задачи темы')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { selected: true })).toContainText('Confirm')
  await expect(page.getByRole('link', { name: /Следующая тема:/ })).toBeVisible()

  // Хлебные крошки ведут обратно.
  await page.getByRole('navigation', { name: 'Путь' }).getByRole('link', { name: 'JavaScript', exact: true }).click()
  await expect(page).toHaveURL('/frontend/javascript')
})

test('лестница подсказок открывается по одной ступени, решение — отдельно', async ({ page }) => {
  await page.goto('/frontend/javascript/async/promises#implement')
  const task = page.locator('section', { hasText: 'Спроектировать загрузку с повтором' })
  await expect(task.getByText('Подсказка 1.')).toHaveCount(0)
  await task.getByRole('button', { name: 'Подсказка 1 из 4' }).click()
  await expect(task.getByText('Подсказка 1.')).toBeVisible()
  await task.getByRole('button', { name: 'Подсказка 2 из 4' }).click()
  await task.getByRole('button', { name: 'Подсказка 3 из 4' }).click()
  await task.getByRole('button', { name: 'Подсказка 4 из 4' }).click()
  await expect(task.getByRole('button', { name: /Подсказка \d из 4/ })).toHaveCount(0)
  await expect(task.locator('pre')).toHaveCount(0)
  await task.getByRole('button', { name: 'Показать решение' }).click()
  await expect(task.locator('pre').first()).toContainText('async function submitOrder')
  await expect(task.getByRole('button', { name: 'Показать решение' })).toHaveCount(0)
})

test('задания из практики прямо в уроке: ответ под кнопкой, задача — ссылкой в редактор', async ({ page }) => {
  await page.goto('/frontend/javascript/async/event-loop#implement')
  const output = page.getByRole('region', { name: 'Что выведет код' }).first()
  await expect(output.locator('pre')).toHaveCount(1)
  await output.getByRole('button', { name: 'Показать ответ' }).click()
  await expect(output.locator('pre').nth(1)).toHaveText('D\nB\nC\nA')
  const quiz = page.getByRole('region', { name: 'Вопрос' })
  await quiz.getByRole('button', { name: 'Показать ответ' }).click()
  await expect(quiz.getByText('Верный ответ:')).toBeVisible()
  const task = page.getByRole('region', { name: 'Задача: Промис с таймаутом' })
  await task.getByRole('link', { name: /Решить в редакторе/ }).click()
  await expect(page).toHaveURL(/\/practice\?scope=frontend%2Fjavascript%2Fasync%2Fevent-loop&kinds=code&mode=free/)
  await expect(page.getByRole('button', { name: /Запустить тесты/ })).toBeVisible()
})

test('вопрос на вспоминание раскрывается по клику', async ({ page }) => {
  await page.goto('/frontend/javascript/async/event-loop#confirm')
  const question = page.locator('details', { hasText: 'Опишите один оборот цикла событий' })
  await expect(question.getByText(/Взять одну задачу/)).toBeHidden()
  await question.locator('summary').click()
  await expect(question.getByText(/Взять одну задачу/)).toBeVisible()
})

test('ненаполненная тема и страницы, которых нет', async ({ page, pageErrors }) => {
  await page.goto('/frontend/nextjs/routing')
  await expect(page.getByText('Урок по этой теме готовится')).toBeVisible()

  for (const url of ['/frontend/nope', '/frontend/javascript/nope/deeper', '/backend', '/practice?scope=frontend/nope']) {
    const response = await page.goto(url)
    expect(response?.status(), url).toBe(404)
  }
  // Браузер пишет в консоль о каждом ответе 404 — здесь это ожидаемо, остальные ошибки должны отсутствовать.
  const unexpected = pageErrors.filter((message) => !/status of 404/.test(message))
  pageErrors.length = 0
  pageErrors.push(...unexpected)
})
