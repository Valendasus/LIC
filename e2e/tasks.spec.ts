import type { Page } from '@playwright/test'
import { plain, practice, type RawPractice } from './content'
import { expect, reviewRows, test } from './fixtures'

const norm = (text: string) => plain(text).replace(/\s+/g, ' ')

/** Какое задание сейчас на экране — ищем его в контенте по тексту. */
async function currentQuiz(page: Page, topic: string) {
  const shown = norm(await page.locator('main .text-lg').first().innerText())
  const item = practice(topic).find((candidate) => candidate.kind === 'quiz' && norm(candidate.question!) === shown)
  expect(item, `квиз «${shown}» есть в контенте`).toBeTruthy()
  return item as RawPractice
}

async function answerQuiz(page: Page, item: RawPractice, correctly: boolean) {
  const options = item.options!
  const pick = correctly ? options.filter((option) => option.correct) : [options.find((option) => !option.correct)!]
  for (const option of pick) await page.getByRole(options.filter((o) => o.correct).length > 1 ? 'checkbox' : 'radio', { name: norm(option.text) }).click()
  const check = page.getByRole('button', { name: 'Проверить' })
  if (await check.count()) await check.click()
}

test('квиз: верный ответ, неверный ответ и объяснение вариантов', async ({ page }) => {
  const topic = 'javascript/async/event-loop'
  await page.goto(`/practice?scope=frontend/${topic}&mode=free&kinds=quiz`)

  const first = await currentQuiz(page, topic)
  await answerQuiz(page, first, true)
  await expect(page.getByRole('status')).toContainText('Верно')
  await page.getByRole('button', { name: /Дальше/ }).click()

  const second = await currentQuiz(page, topic)
  await answerQuiz(page, second, false)
  await expect(page.getByRole('status')).toContainText('Неверно')
  // У ошибочно выбранного варианта есть объяснение.
  const wrong = second.options!.find((option) => !option.correct) as { text: string; why?: string }
  if (wrong.why) await expect(page.getByText(norm(wrong.why))).toBeVisible()
})

test('квиз с несколькими ответами отмечает пропущенные верные варианты', async ({ page }) => {
  const topic = 'javascript/async/event-loop'
  const quizzes = practice(topic).filter((item) => item.kind === 'quiz')
  const index = quizzes.findIndex((item) => item.options!.filter((o) => o.correct).length > 1)
  const multi = quizzes[index]
  // В обычном режиме новые задания идут в порядке темы: пропускаем квизы до нужного.
  await page.goto(`/practice?scope=frontend/${topic}&kinds=quiz`)
  for (let i = 0; i < index; i++) {
    await answerQuiz(page, await currentQuiz(page, topic), true)
    await page.getByRole('button', { name: /^Дальше/ }).click()
  }
  expect(norm(await page.locator('main .text-lg').first().innerText())).toBe(norm(multi.question!))
  const correct = multi.options!.filter((option) => option.correct)
  await page.getByRole('checkbox', { name: norm(correct[0].text) }).click()
  await page.getByRole('button', { name: 'Проверить' }).click()
  await expect(page.getByRole('status')).toContainText('Неверно')
  await expect(page.getByText('Верный вариант, вы его не отметили')).toHaveCount(correct.length - 1)
})

test('«Что выведет»: верный и неверный ответ', async ({ page }) => {
  const topic = 'javascript/async/event-loop'
  await page.goto(`/practice?scope=frontend/${topic}&mode=free&kinds=output`)
  for (const correctly of [true, false]) {
    const code = (await page.locator('main pre').first().innerText()).trim()
    const item = practice(topic).find((candidate) => candidate.kind === 'output' && candidate.code!.trim() === code)!
    await page.getByLabel(/Вывод в консоли/).fill(correctly ? item.answer!.join('\n') : 'не то')
    await page.keyboard.press('Control+Enter')
    await expect(page.getByRole('status')).toContainText(correctly ? 'Верно' : 'Неверно')
    if (!correctly) {
      await expect(page.getByText('Ваш ответ')).toBeVisible()
      await expect(page.getByText('Правильно', { exact: true })).toBeVisible()
    }
    await page.getByRole('button', { name: /Дальше/ }).click()
  }
})

test('«Порядок»: верная и неверная последовательность', async ({ page }) => {
  const topic = 'css/cascade/specificity'
  for (const correctly of [true, false]) {
    await page.goto(`/practice?scope=frontend/${topic}&mode=free&kinds=order`)
    const prompt = norm(await page.locator('main .text-lg').first().innerText())
    const item = practice(topic).find((candidate) => candidate.kind === 'order' && norm(candidate.prompt!) === prompt)!
    const steps = correctly ? item.steps! : [...item.steps!].reverse()
    for (const step of steps) await page.getByRole('button', { name: norm(step), exact: true }).click()
    await expect(page.getByRole('status')).toContainText(correctly ? 'Верно' : 'Неверно')
    if (!correctly) await expect(page.getByText('Правильный порядок')).toBeVisible()
  }
})

test('«Порядок»: последний шаг можно убрать', async ({ page }) => {
  await page.goto('/practice?scope=frontend/css/cascade/specificity&mode=free&kinds=order')
  const firstStep = page.locator('main ul button').first()
  const text = await firstStep.innerText()
  await firstStep.click()
  await expect(page.getByRole('list', { name: 'Ваш порядок' })).toContainText(text)
  await page.getByRole('button', { name: 'Убрать последний' }).click()
  await expect(page.getByRole('list', { name: 'Ваш порядок' })).not.toContainText(text)
})

test('автооценка заданий записывается в расписание: верно, «угадал» и ошибка', async ({ page }) => {
  const topic = 'javascript/scope/closures'
  await page.goto(`/practice?scope=frontend/${topic}&kinds=quiz`)
  const counter = page.locator('[data-counter]')
  const total = Number((await counter.innerText()).split('/')[1])

  await answerQuiz(page, await currentQuiz(page, topic), true)
  await page.getByRole('button', { name: /^Дальше/ }).click()

  await answerQuiz(page, await currentQuiz(page, topic), true)
  await page.getByRole('button', { name: /Угадал/ }).click()

  await answerQuiz(page, await currentQuiz(page, topic), false)
  await page.getByRole('button', { name: /^Дальше/ }).click()
  // Ошибка возвращает задание в эту же сессию.
  await expect(counter).toHaveText(`4 / ${total + 1}`)

  await expect.poll(async () => (await reviewRows()).logs.map((log) => log.rating)).toEqual([3, 2, 1])
  expect((await reviewRows()).items.every((item) => item.kind === 'quiz')).toBe(true)
})

test('в смешанной сессии задания перемежаются с карточками', async ({ page }) => {
  await page.goto('/practice?scope=frontend/javascript/scope/closures')
  const kinds: string[] = []
  for (let i = 0; i < 8; i++) {
    if (await page.getByRole('button', { name: /^Карточка:/ }).count()) {
      kinds.push('card')
      await page.keyboard.press('Space')
      await page.keyboard.press('3')
      continue
    }
    kinds.push('task')
    // Любой ответ, затем «Дальше»: здесь проверяется только порядок.
    const options = page.locator('[role=radio], [role=checkbox]')
    if (await options.count()) {
      await options.first().click()
      const check = page.getByRole('button', { name: 'Проверить' })
      if (await check.count()) await check.click()
    } else if (await page.getByLabel(/Вывод в консоли/).count()) {
      await page.getByLabel(/Вывод в консоли/).fill('x')
      await page.keyboard.press('Control+Enter')
    }
    await page.getByRole('button', { name: /^Дальше/ }).click()
  }
  expect(kinds).toEqual(['card', 'card', 'card', 'task', 'card', 'card', 'card', 'task'])
})
