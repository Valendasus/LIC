import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'

// Страницы собираются по тестовому контенту (test/fixtures/content): правки настоящего курса не ломают эти тесты.
vi.hoisted(() => {
  process.env.LIC_CONTENT_DIR = `${process.cwd()}/test/fixtures/content`
})

import { notFound } from 'next/navigation'
import RootLayout, { metadata as layoutMetadata } from '@/app/layout'
import SiteLayout from '@/app/(site)/layout'
import FocusLayout from '@/app/(focus)/layout'
import HomePage from '@/app/(site)/page'
import { greeting, longDate } from '@/views/home/ui/HomePage'
import SpecialtyPage, { generateMetadata as specialtyMetadata } from '@/app/(site)/[specialty]/page'
import NodePage, { generateMetadata as nodeMetadata } from '@/app/(site)/[specialty]/[...path]/page'
import ReviewPage, { metadata as reviewMetadata } from '@/app/(focus)/practice/page'
import ProgressPage, { metadata as progressMetadata } from '@/app/(site)/progress/page'
import SettingsPage, { metadata as settingsMetadata } from '@/app/(site)/settings/page'
import { heatLevel } from '@/views/progress/ui/ProgressPage'
import { getCurrentUser } from '@/entities/user/server'
import { NEW_PER_DAY } from '@/entities/review/server'
import { db, resetDb } from '../db'
import { rendered, textOf } from '../tree'

const params = <T,>(value: T) => ({ params: Promise.resolve(value) })
const search = (value: Record<string, string>) => ({ searchParams: Promise.resolve(value) })

const TOPIC = 'demo/block/mod/topic'
const ROW = { kind: 'card', stability: 1, stabilityFast: 1, difficulty: 5, state: 2, scheduleStatus: 'review', reps: 1, lapses: 0, scheduledDays: 1, learningStep: 0 }
const TOMORROW = () => new Date(Date.now() + 86_400_000)

/** Новых на сегодня больше не будет: лимит дня уже выбран. */
async function exhaustNewToday() {
  const user = await getCurrentUser()
  for (let i = 0; i < NEW_PER_DAY; i++) await db.reviewItem.create({ data: { ...ROW, userId: user.id, itemId: `other#${i}`, dueAt: TOMORROW() } })
}

/** Сессия практики — клиентский компонент: проверяем, с чем страница его открывает. */
type Session = { title: string; mode: string; backHref: string; items: { item: { id: string; kind: string } }[]; orders: Record<string, string[]> }
const session = (page: unknown) => (page as { props: Session }).props

beforeEach(resetDb)

describe('каркас', () => {
  it('макеты пропускают содержимое; заголовок вкладки по шаблону', () => {
    expect(textOf(RootLayout({ children: <p>контент</p> }))).toBe('контент')
    expect(textOf(SiteLayout({ children: <p>контент</p> }))).toBe('контент')
    expect(textOf(FocusLayout({ children: <p>задание</p> }))).toBe('задание')
    expect(layoutMetadata).toMatchObject({ title: { default: 'LIC', template: '%s · LIC' } })
  })
})

describe('«Сегодня»', () => {
  it('приветствие по времени суток и дата по-русски', () => {
    expect([3, 9, 14, 21].map((hour) => greeting(new Date(2026, 10, 9, hour)))).toEqual(['Доброй ночи', 'Доброе утро', 'Добрый день', 'Добрый вечер'])
    expect(longDate(new Date(2026, 10, 9))).toBe('Понедельник, 9 ноября')
  })

  it('первый вход: начать с первой темы по пути; продолжать нечего; специальности', async () => {
    const { text, hrefs } = rendered(await HomePage())
    expect(text).toContain('Начните с первой темы')
    expect(text).not.toContain('Продолжить')
    expect(text).toContain('На этой неделе 0 из 7 дней')
    expect(hrefs).toContain(`/${TOPIC}`)
    expect(hrefs).toContain('/demo')
    expect(text).toContain('в планах')
    expect(text).toContain('Начато 0 из 4 тем')
  })

  it('есть что повторить: число и состав, кнопка; продолжить последнюю тему; неделя', async () => {
    // Четверг: в неделе есть прошедшие дни без занятий, сегодняшний с ответом и будущие.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 12, 15))
    onTestFinished(() => {
      vi.useRealTimers()
    })
    const user = await getCurrentUser()
    await db.reviewItem.create({ data: { ...ROW, userId: user.id, itemId: `${TOPIC}#term-a`, dueAt: new Date(Date.now() - 1000) } })
    await db.reviewLog.create({ data: { userId: user.id, itemId: `${TOPIC}#term-a`, rating: 3, stateBefore: 0, reviewedAt: new Date() } })
    const { text, hrefs } = rendered(await HomePage())
    expect(text).toMatch(/1 повторение и \d+ новых/)
    expect(text).toContain('Начать повторение')
    expect(hrefs).toContain('/practice')
    expect(text).toContain('Продолжить')
    expect(text).toContain('На этой неделе 1 из 7 дней')
    // Продолжаемая тема не повторяется в «Дальше по пути».
    expect(hrefs.filter((href) => href === `/${TOPIC}`)).toHaveLength(1)
  })

  it('на сегодня всё: предлагается свободная тренировка', async () => {
    const user = await getCurrentUser()
    await db.reviewItem.create({ data: { ...ROW, userId: user.id, itemId: `${TOPIC}#term-a`, dueAt: TOMORROW() } })
    await exhaustNewToday()
    const { text, hrefs } = rendered(await HomePage())
    expect(text).toContain('На сегодня всё')
    expect(hrefs).toContain('/practice?mode=free')
  })

  it('только новые — без слова «повторений»', async () => {
    const user = await getCurrentUser()
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: TOPIC, level: 1 } })
    const { text } = rendered(await HomePage())
    expect(text).toMatch(/\d+ новых/)
    expect(text).not.toMatch(/повторени[ейя] и/)
  })
})

describe('страница специальности', () => {
  it('первый вход: путь по этапам, первый этап текущий, «Начать» с первой темы по пути', async () => {
    const { text, hrefs } = rendered(await SpecialtyPage(params({ specialty: 'demo' })))
    expect(text).toMatch(/Первый\s*текущий этап/)
    expect(text).toContain('Описание этапа')
    expect(text).toContain('Начать: Тема')
    expect(text).toContain('0 из 4 тем начато')
    expect(text).toContain('2 этапа')
    expect(text).toContain('уроков 1')
    expect(text).toContain('готовится')
    expect(hrefs).toEqual(expect.arrayContaining([`/${TOPIC}`, '/demo/block', '/demo/other']))
    expect(await specialtyMetadata(params({ specialty: 'demo' }))).toEqual({ title: 'Демо' })
    expect(await specialtyMetadata(params({ specialty: 'later' }))).toEqual({ title: 'Не найдено' })
  })

  it('продолжить последнюю тему: её блок «вы здесь»; полностью освоенный этап — пройден', async () => {
    const user = await getCurrentUser()
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: 'demo/other/solo', level: 4 } })
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: TOPIC, level: 1 } })
    const { text } = rendered(await SpecialtyPage(params({ specialty: 'demo' })))
    expect(text).toContain('Продолжить: Тема')
    expect(text).toContain('вы здесь')
    expect(text).toMatch(/Первый\s*текущий этап/)
    expect(text).toMatch(/Второй\s*пройден/)
  })

  it('последняя тема на дальнем этапе: текущий — он, хотя предыдущий не пройден', async () => {
    const user = await getCurrentUser()
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: 'demo/other/solo', level: 1 } })
    const { text } = rendered(await SpecialtyPage(params({ specialty: 'demo' })))
    expect(text).toMatch(/Второй\s*текущий этап/)
    expect(text).not.toMatch(/Первый\s*(текущий этап|пройден)/)
  })

  it('несуществующая или запланированная специальность — 404', async () => {
    await expect(SpecialtyPage(params({ specialty: 'later' }))).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(SpecialtyPage(params({ specialty: 'nope' }))).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })
})

describe('страница ветки', () => {
  it('блок: модули и темы, статусы, практика по блоку', async () => {
    const user = await getCurrentUser()
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: TOPIC, level: 2 } })
    const { text, hrefs } = rendered(await NodePage(params({ specialty: 'demo', path: ['block'] })))
    expect(text).toContain('Описание блока.')
    expect(text).toContain('Модуль')
    expect(text).toContain('Тема, освоена')
    expect(text).toContain('Пустая темаготовится')
    expect(text).toMatch(/Учить и повторять · \d+/)
    expect(hrefs).toEqual(expect.arrayContaining(['/practice?scope=demo%2Fblock&mode=free', '/demo/block/mod']))
    expect(rendered(await NodePage(params({ specialty: 'demo', path: ['block', 'mod'] }))).text).toMatch(/1 из 2 тем\s*начато/)
  })

  it('тема без урока, но с практикой — «только практика»', async () => {
    expect(rendered(await NodePage(params({ specialty: 'demo', path: ['other'] }))).text).toContain('Одиночная, не начататолько практика')
  })

  it('ветка без практики — без кнопок; когда на сегодня всё — так и сказано', async () => {
    expect(rendered(await NodePage(params({ specialty: 'demo', path: ['soon'] }))).text).not.toContain('Свободная тренировка')
    await exhaustNewToday()
    expect(rendered(await NodePage(params({ specialty: 'demo', path: ['block'] }))).text).toContain('На сегодня всё')
  })

  it('несуществующий путь — 404', async () => {
    await expect(NodePage(params({ specialty: 'demo', path: ['nope'] }))).rejects.toThrow('NEXT_NOT_FOUND')
    expect(await nodeMetadata(params({ specialty: 'nope', path: ['x'] }))).toEqual({ title: 'Не найдено' })
  })
})

describe('страница темы', () => {
  it('наполненная тема: цели, урок без заголовков шагов, дата проверки, шаги', async () => {
    const { html, text } = rendered(await NodePage(params({ specialty: 'demo', path: ['block', 'mod', 'topic'] })))
    expect(text).toContain('После темы вы сможете')
    expect(text).toContain('Первая цель')
    expect(text).toContain('Текст темы.')
    expect(text).toContain('Проверено 01.01.2026 · Тест')
    expect(text).toContain('Решено 0 из 4')
    expect(text).toContain('5 карточек')
    // Заголовок шага «## Learn» стал вкладкой, а не текстом урока.
    expect(html).not.toMatch(/<h2[^>]*>Learn<\/h2>/)
    expect(await nodeMetadata(params({ specialty: 'demo', path: ['block', 'mod', 'topic'] }))).toEqual({ title: 'Тема' })
  })

  it('тема без урока: урок готовится, практика есть', async () => {
    const { text } = rendered(await NodePage(params({ specialty: 'demo', path: ['other', 'solo'] })))
    expect(text).toContain('Урок по этой теме готовится')
    expect(text).not.toContain('Заданий пока нет')
    expect(text).not.toContain('Проверено')
  })

  it('пустая тема: ни урока, ни практики', async () => {
    const { text } = rendered(await NodePage(params({ specialty: 'demo', path: ['block', 'mod', 'empty'] })))
    expect(text).toContain('Урок по этой теме готовится')
    expect(text).toContain('Заданий пока нет')
    expect(text).toContain('Карточек пока нет')
  })

  it('следующая тема по курсу; у последней её нет', async () => {
    const next = (path: string[]) => (NodePage(params({ specialty: 'demo', path })) as Promise<{ props: { next: { id: string } | null } }>).then((page) => page.props.next)
    expect(await next(['block', 'mod', 'topic'])).toMatchObject({ id: 'demo/block/mod/empty' })
    expect(await next(['soon', 'idea'])).toBeNull()
  })
})

describe('страница практики', () => {
  it('ежедневное повторение без ветки — по главной специальности', async () => {
    const page = session(await ReviewPage(search({})))
    expect(page).toMatchObject({ title: 'Повторение на сегодня', mode: 'review', backHref: '/' })
    expect(page.items.every((entry) => entry.item.id.startsWith('demo/'))).toBe(true)
    expect(reviewMetadata).toEqual({ title: 'Практика' })
  })

  it('ветка, виды и свободный режим; правильный порядок передаётся отдельно', async () => {
    const page = session(await ReviewPage(search({ scope: TOPIC, mode: 'free', kinds: 'order,bogus' })))
    expect(page).toMatchObject({ title: 'Свободная тренировка · Тема · порядок', mode: 'free', backHref: `/${TOPIC}` })
    expect(page.items.map((entry) => entry.item.kind)).toEqual(['order'])
    expect(page.orders).toEqual({ [`${TOPIC}#ord`]: ['Один', 'Два', 'Три'] })
  })

  it('практика ветки в обычном режиме — с названием ветки', async () => {
    expect(session(await ReviewPage(search({ scope: 'demo/block' })))).toMatchObject({ title: 'Блок', mode: 'review' })
  })

  it('ветка без практики — вернуться назад', async () => {
    const { text, hrefs } = rendered(await ReviewPage(search({ scope: 'demo/soon' })))
    expect(text).toContain('В этой ветке пока нет практики')
    expect(hrefs).toEqual(['/demo/soon', '/demo/soon'])
  })

  it('всё на сегодня сделано: свободная тренировка с сохранением ветки', async () => {
    await exhaustNewToday()
    expect(rendered(await ReviewPage(search({ scope: 'demo/block' }))).hrefs).toContain('/practice?mode=free&scope=demo%2Fblock')
    const daily = rendered(await ReviewPage(search({})))
    expect(daily.text).toContain('На сегодня всё')
    expect(daily.hrefs).toContain('/practice?mode=free')
  })

  it('неизвестная ветка или специальность — 404', async () => {
    await expect(ReviewPage(search({ scope: 'demo/nope' }))).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(ReviewPage(search({ scope: 'later/x' }))).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('прогресс и настройки', () => {
  it('прогресс без занятий: пустая активность, нет слабых мест, задачи по уровням', async () => {
    const { text } = rendered(await ProgressPage())
    expect(text).toContain('0 дней с занятиями · 0 ответов')
    expect(text).toContain('Слабых мест пока нет')
    expect(text).toContain('Отметок освоения пока нет')
    expect(text).toContain('Разминка0 из 1')
    expect(progressMetadata).toEqual({ title: 'Прогресс' })
  })

  it('прогресс с занятиями: дни и ответы, слабая тема с тренировкой, уровни освоения по этапу', async () => {
    const user = await getCurrentUser()
    await db.reviewLog.createMany({ data: [1, 1, 3].map((rating) => ({ userId: user.id, itemId: `${TOPIC}#term-a`, rating, stateBefore: 0, reviewedAt: new Date() })) })
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: TOPIC, level: 3 } })
    await db.reviewItem.create({ data: { ...ROW, userId: user.id, itemId: `${TOPIC}#term-a`, dueAt: TOMORROW() } })
    const { text, hrefs, html } = rendered(await ProgressPage())
    expect(html).toContain('aria-label="завтра: 1"')
    expect(text).toContain('1 день с занятиями · 3 ответа')
    expect(text).toContain('2 ошибки')
    expect(hrefs).toContain(`/practice?scope=${encodeURIComponent(TOPIC)}&mode=free`)
    expect(text).toContain('Применяю 1')
  })

  it('ступени тепловой карты', () => {
    expect([0, 1, 2, 3, 4, 8].map((answers) => heatLevel(answers, 8))).toEqual([0, 1, 1, 2, 2, 4])
  })

  it('настройки: текущий темп и переключатель анимаций', async () => {
    const { html, text } = rendered(await SettingsPage())
    expect(html).toContain('value="20"')
    expect(text).toContain('Переворот карточек и появление панелей')
    expect(settingsMetadata).toEqual({ title: 'Настройки' })
  })
})
