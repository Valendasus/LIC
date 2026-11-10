import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { notFound } from 'next/navigation'
import RootLayout, { metadata as layoutMetadata } from '@/app/layout'
import SiteLayout from '@/app/(site)/layout'
import FocusLayout from '@/app/(focus)/layout'
import { AppShell } from '@/widgets/app-shell/ui/AppShell'
import HomePage from '@/app/(site)/page'
import { greeting, longDate } from '@/views/home/ui/HomePage'
import SpecialtyPage, { generateMetadata as specialtyMetadata } from '@/app/(site)/[specialty]/page'
import NodePage, { generateMetadata as nodeMetadata } from '@/app/(site)/[specialty]/[...path]/page'
import ReviewPage, { metadata as reviewMetadata } from '@/app/(focus)/practice/page'
import { TopicView } from '@/views/node/ui/TopicView'
import ProgressPage, { metadata as progressMetadata } from '@/app/(site)/progress/page'
import SettingsPage, { metadata as settingsMetadata } from '@/app/(site)/settings/page'
import { heatLevel } from '@/views/progress/ui/ProgressPage'
import { PaceForm } from '@/features/settings/ui/PaceForm'
import { MotionToggle } from '@/features/settings/ui/Motion'
import { getTree, leavesOf } from '@/entities/topic/api/tree'
import { PracticeSession } from '@/widgets/practice-session/ui/PracticeSession'
import { getCurrentUser } from '@/entities/user/api/user'
import { NEW_PER_DAY } from '@/entities/review/api/session'
import { db, resetDb } from '../db'
import { byType, findAll, rendered, textOf } from '../tree'

const params = <T,>(value: T) => ({ params: Promise.resolve(value) })
const search = (value: Record<string, string>) => ({ searchParams: Promise.resolve(value) })
const hrefs = (node: React.ReactNode) => findAll(node, (element) => typeof element.props.href === 'string').map((element) => element.props.href)

async function exhaustNewToday() {
  const user = await getCurrentUser()
  const later = new Date(Date.now() + 86_400_000)
  for (let i = 0; i < NEW_PER_DAY; i++) {
    await db.reviewItem.create({
      data: { userId: user.id, itemId: `other#${i}`, kind: 'card', stability: 1, stabilityFast: 1, difficulty: 5, state: 2, scheduleStatus: 'review', dueAt: later, reps: 1, lapses: 0, scheduledDays: 1, learningStep: 0 },
    })
  }
}

beforeEach(resetDb)

describe('каркас', () => {
  it('корневой макет: язык и метаданные, без шапки — она нужна не везде', () => {
    const html = RootLayout({ children: <p>контент</p> })
    expect(html.props.lang).toBe('ru')
    expect(textOf(html)).toBe('контент')
    expect(layoutMetadata).toMatchObject({ title: { default: 'LIC', template: '%s · LIC' } })
  })

  it('макет страниц платформы оборачивает их в каркас с навигацией', () => {
    const site = SiteLayout({ children: <p>контент</p> })
    expect(site.type).toBe(AppShell)
    expect(textOf(site)).toBe('контент')
  })

  it('режим фокуса — без каркаса', () => {
    const focus = FocusLayout({ children: <p>задание</p> })
    expect(focus.type).toBe('main')
    expect(textOf(focus)).toBe('задание')
  })
})

describe('«Сегодня»', () => {
  const ROW = { kind: 'card', stability: 1, stabilityFast: 1, difficulty: 5, state: 2, scheduleStatus: 'review', reps: 1, lapses: 0, scheduledDays: 1, learningStep: 0 }

  it('приветствие по времени суток и дата по-русски', () => {
    expect([3, 9, 14, 21].map((hour) => greeting(new Date(2026, 10, 9, hour)))).toEqual(['Доброй ночи', 'Доброе утро', 'Добрый день', 'Добрый вечер'])
    expect(longDate(new Date(2026, 10, 9))).toBe('Понедельник, 9 ноября')
  })

  it('первый вход: с чего начать — первая тема по пути; продолжать нечего', async () => {
    const { text, hrefs: links } = rendered(await HomePage())
    expect(text).toContain('Начните с первой темы')
    expect(text).not.toContain('Продолжить')
    expect(text).toContain('На этой неделе 0 из 7 дней')
    expect(links).toContain('/frontend/css/cascade/specificity')
    // Специальности: активная — ссылка с прогрессом, запланированные — без ссылки.
    expect(links).toContain('/frontend')
    expect(text).toContain('в планах')
    expect(text).toMatch(/Начато 0 из 231 темы/)
  })

  it('есть что повторить: число, состав, кнопка; продолжить последнюю тему; неделя', async () => {
    // Четверг: в неделе есть прошедшие дни без занятий, сегодняшний с ответом и будущие.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 12, 15))
    onTestFinished(() => {
      vi.useRealTimers()
    })
    const user = await getCurrentUser()
    const topic = 'frontend/javascript/scope/closures'
    await db.reviewItem.create({ data: { ...ROW, userId: user.id, itemId: `${topic}#closure-def`, dueAt: new Date(Date.now() - 1000) } })
    await db.reviewLog.create({ data: { userId: user.id, itemId: `${topic}#closure-def`, rating: 3, stateBefore: 0, reviewedAt: new Date() } })
    const { text, hrefs: links } = rendered(await HomePage())
    expect(text).toMatch(/\d+ элемент/)
    expect(text).toMatch(/1 повторение и \d+ новых/)
    expect(text).toContain('Начать повторение')
    expect(links).toContain('/practice')
    expect(text).toContain('Продолжить')
    expect(text).toContain('Замыкания')
    expect(text).toContain('Карточки')
    expect(text).toContain('100 %')
    expect(text).toContain('На этой неделе 1 из 7 дней')
    // Продолжаемая тема не повторяется в «Дальше по пути».
    expect(links.filter((href) => href === `/${topic}`)).toHaveLength(1)
  })

  it('на сегодня всё: предлагается свободная тренировка', async () => {
    const user = await getCurrentUser()
    await db.reviewItem.create({ data: { ...ROW, userId: user.id, itemId: 'frontend/javascript/scope/closures#closure-def', dueAt: new Date(Date.now() + 86_400_000) } })
    for (let i = 0; i < NEW_PER_DAY; i++) await db.reviewItem.create({ data: { ...ROW, userId: user.id, itemId: `other#${i}`, dueAt: new Date(Date.now() + 86_400_000) } })
    const { text, hrefs: links } = rendered(await HomePage())
    expect(text).toContain('На сегодня всё')
    expect(links).toContain('/practice?mode=free')
  })

  it('только новые — без слова «повторений»', async () => {
    const user = await getCurrentUser()
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: 'frontend/javascript/scope/closures', level: 1 } })
    const { text } = rendered(await HomePage())
    expect(text).toMatch(/20 новых/)
    expect(text).not.toMatch(/повторени[ейя] и/)
  })
})

describe('страница специальности', () => {
  it('первый вход: путь по этапам, первый этап текущий, «Начать» с первой темы по пути', async () => {
    const { text, hrefs: links } = rendered(await SpecialtyPage(params({ specialty: 'frontend' })))
    for (const stage of ['Фундамент', 'Типы и React', 'Данные и Next.js', 'Инженерия', 'Специализация и собеседования']) expect(text).toContain(stage)
    expect(text).toMatch(/Фундамент\s*текущий этап/)
    expect(text).toContain('Начать: Каскад, специфичность и наследование')
    expect(text).toMatch(/0 из 231 темы начато/)
    expect(text).toContain('5 этапов')
    expect(links).toContain('/frontend/javascript')
    expect(links.filter((href) => /^\/frontend\/[\w-]+$/.test(href))).toHaveLength(25)
    expect(text).toContain('готовится')
    expect(await specialtyMetadata(params({ specialty: 'frontend' }))).toEqual({ title: 'Frontend' })
    expect(await specialtyMetadata(params({ specialty: 'backend' }))).toEqual({ title: 'Не найдено' })
  })

  it('продолжить последнюю тему: её блок «вы здесь»; полностью освоенный этап — пройден', async () => {
    const user = await getCurrentUser()
    const tree = (await getTree('frontend'))!
    const last = tree.children.filter((block) => ['animation', 'complex-ui', 'system-design'].includes(block.slug)).flatMap((block) => leavesOf(block))
    await db.nodeProgress.createMany({ data: last.map((leaf) => ({ userId: user.id, nodeId: leaf.id, level: 4 })) })
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: 'frontend/javascript/scope/closures', level: 1 } })
    const { text } = rendered(await SpecialtyPage(params({ specialty: 'frontend' })))
    expect(text).toContain('Продолжить: Замыкания')
    expect(text).toContain('вы здесь')
    expect(text).toMatch(/Фундамент\s*текущий этап/)
    expect(text).toMatch(/Специализация и собеседования\s*пройден/)
  })

  it('несуществующая или запланированная специальность — 404', async () => {
    await expect(SpecialtyPage(params({ specialty: 'backend' }))).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })
})

describe('страница узла', () => {
  it('блок: разделы модулей и тем, статусы, практика по блоку', async () => {
    const user = await getCurrentUser()
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: 'frontend/javascript/scope/closures', level: 2 } })
    const { text, hrefs: links } = rendered(await NodePage(params({ specialty: 'frontend', path: ['javascript'] })))
    expect(text).toContain('Язык целиком')
    expect(text).toContain('Области видимости и замыкания')
    expect(text).toContain('Темы')
    expect(text).toContain('Замыкания, освоена')
    expect(text).toContain('Понимаю')
    expect(text).toMatch(/Учить и повторять · \d+/)
    expect(text).not.toContain(', готовитсяготовится')
    expect(links).toContain('/practice?scope=frontend%2Fjavascript&mode=free')
    expect(links).toContain('/frontend/javascript/scope')
    const module = rendered(await NodePage(params({ specialty: 'frontend', path: ['javascript', 'scope'] }))).text
    expect(module).toMatch(/1 из 2 тем\s*начато/)
    expect(rendered(await NodePage(params({ specialty: 'frontend', path: ['typescript'] }))).text).toContain('Утилитарные типы, не начататолько практика')
  })

  it('ветка без практики — без кнопок; когда на сегодня всё — так и сказано', async () => {
    expect(rendered(await NodePage(params({ specialty: 'frontend', path: ['nextjs'] }))).text).not.toContain('Свободная тренировка')
    await exhaustNewToday()
    expect(rendered(await NodePage(params({ specialty: 'frontend', path: ['css'] }))).text).toContain('На сегодня всё')
  })

  it('наполненная тема: шаги, урок без заголовков шагов, оглавление, данные для шагов', async () => {
    const user = await getCurrentUser()
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: 'frontend/javascript/scope/closures', level: 2 } })
    const page = await NodePage(params({ specialty: 'frontend', path: ['javascript', 'scope', 'closures'] }))
    expect(page.type).toBe(TopicView)
    expect(page.props).toMatchObject({ level: 2, steps: { learn: true }, next: { id: 'frontend/javascript/this' } })
    expect(page.props.practice.tasks.map((task: { title: string }) => task.title)).toContain('once')
    expect(page.props.siblings.map((node: { id: string }) => node.id)).toContain('frontend/javascript/scope/closures')
    const { html, text } = rendered(page)
    expect(text).toContain('Суть за минуту')
    expect(text).toContain('Проверено 08.11.2026')
    expect(text).toContain('После темы вы сможете')
    expect(text).toContain('На странице')
    // Заголовки шагов «## Learn» стали вкладками, а не текстом урока; Implement ещё не открыт.
    expect(html).not.toMatch(/<h2[^>]*>Learn<\/h2>/)
    expect(text).not.toContain('Счётчик с ограничением')
    expect(html).toContain('id="суть-за-минуту"')
    expect(await nodeMetadata(params({ specialty: 'frontend', path: ['javascript', 'scope', 'closures'] }))).toEqual({ title: 'Замыкания' })
  })

  it('последняя тема курса — следующей нет', async () => {
    const tree = (await getTree('frontend'))!
    const last = leavesOf(tree).at(-1)!
    const page = await NodePage(params({ specialty: 'frontend', path: last.path }))
    expect(page.props.next).toBeNull()
  })

  it('тема без урока: урок готовится, практика есть', async () => {
    const page = await NodePage(params({ specialty: 'frontend', path: ['typescript', 'utility-types'] }))
    expect(page.props.lesson).toBeNull()
    expect(page.props.practice.tasks).toHaveLength(3)
    expect(rendered(page).text).toContain('Урок по этой теме готовится')
  })

  it('ненаполненная тема', async () => {
    const page = await NodePage(params({ specialty: 'frontend', path: ['nextjs', 'routing'] }))
    const { text } = rendered(page)
    expect(text).toContain('Урок по этой теме готовится')
    expect(text).not.toContain('Проверено')
    expect(page.props.level).toBe(0)
  })

  it('несуществующий путь — 404', async () => {
    await expect(NodePage(params({ specialty: 'frontend', path: ['nope'] }))).rejects.toThrow('NEXT_NOT_FOUND')
    expect(await nodeMetadata(params({ specialty: 'nope', path: ['x'] }))).toEqual({ title: 'Не найдено' })
  })
})

describe('страница практики', () => {
  const session = (page: React.ReactNode) => byType(page, PracticeSession)[0]

  it('ежедневное повторение без ветки', async () => {
    const page = await ReviewPage(search({}))
    expect(session(page).props.title).toBe('Повторение на сегодня')
    expect(session(page).props.mode).toBe('review')
    expect(session(page).props.backHref).toBe('/')
    expect(reviewMetadata).toEqual({ title: 'Практика' })
  })

  it('ветка, виды и свободный режим; правильный порядок передаётся отдельно', async () => {
    const page = await ReviewPage(search({ scope: 'frontend/css/cascade/specificity', mode: 'free', kinds: 'order,bogus' }))
    expect(session(page).props.title).toBe('Свободная тренировка · Каскад, специфичность и наследование · порядок')
    const props = session(page).props as { mode: string; items: { item: { kind: string } }[]; orders: Record<string, string[]>; backHref: string }
    expect(props.mode).toBe('free')
    expect(props.backHref).toBe('/frontend/css/cascade/specificity')
    expect(props.items.every((entry) => entry.item.kind === 'order')).toBe(true)
    expect(Object.keys(props.orders)).toEqual([
      'frontend/css/cascade/specificity#order-cascade',
      'frontend/css/cascade/specificity#order-specificity',
    ])
  })

  it('практика ветки в обычном режиме', async () => {
    const page = await ReviewPage(search({ scope: 'frontend/javascript' }))
    expect(session(page).props.title).toBe('JavaScript')
    expect(session(page).props.mode).toBe('review')
  })

  it('ветка без практики', async () => {
    const page = await ReviewPage(search({ scope: 'frontend/nextjs' }))
    const { text, hrefs: links } = rendered(page)
    expect(text).toContain('В этой ветке пока нет практики')
    expect(links).toEqual(['/frontend/nextjs', '/frontend/nextjs'])
  })

  it('всё на сегодня сделано: предлагается свободная тренировка с сохранением ветки', async () => {
    await exhaustNewToday()
    const scoped = await ReviewPage(search({ scope: 'frontend/javascript' }))
    expect(rendered(scoped).text).toContain('На сегодня всё')
    expect(rendered(scoped).hrefs).toContain('/practice?mode=free&scope=frontend%2Fjavascript')
    const daily = await ReviewPage(search({}))
    expect(rendered(daily).hrefs).toContain('/practice?mode=free')
  })

  it('неизвестная ветка или специальность — 404', async () => {
    await expect(ReviewPage(search({ scope: 'frontend/nope' }))).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(ReviewPage(search({ scope: 'backend/x' }))).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('прогресс и настройки', () => {
  it('прогресс без занятий: пустая активность, нет слабых мест, задачи по уровням', async () => {
    const { text } = rendered(await ProgressPage())
    expect(text).toContain('0 дней с занятиями · 0 ответов')
    expect(text).toContain('Слабых мест пока нет')
    expect(text).toContain('Отметок освоения пока нет')
    expect(text).toContain('Разминка')
    expect(text).toContain('сегодня')
    expect(progressMetadata).toEqual({ title: 'Прогресс' })
  })

  it('прогресс с занятиями: дни и ответы, слабая тема с тренировкой, уровни освоения по этапу', async () => {
    const user = await getCurrentUser()
    const topic = 'frontend/javascript/scope/closures'
    await db.reviewLog.createMany({ data: [1, 1, 3].map((rating) => ({ userId: user.id, itemId: `${topic}#closure-def`, rating, stateBefore: 0, reviewedAt: new Date() })) })
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: topic, level: 3 } })
    await db.reviewItem.create({ data: { userId: user.id, itemId: `${topic}#closure-def`, kind: 'card', stability: 1, stabilityFast: 1, difficulty: 5, state: 2, scheduleStatus: 'review', dueAt: new Date(Date.now() + 86_400_000), reps: 1, lapses: 0, scheduledDays: 1, learningStep: 0 } })
    const { text, hrefs: links, html } = rendered(await ProgressPage())
    expect(html).toContain('aria-label="завтра: 1"')
    expect(text).toContain('1 день с занятиями · 3 ответа')
    expect(text).toContain('Замыкания')
    expect(text).toContain('2 ошибки')
    expect(links).toContain(`/practice?scope=${encodeURIComponent(topic)}&mode=free`)
    expect(text).toContain('Применяю 1')
    expect(html).toContain('bg-accent')
  })

  it('ступени тепловой карты', () => {
    expect([0, 1, 2, 3, 4, 8].map((answers) => heatLevel(answers, 8))).toEqual([0, 1, 1, 2, 2, 4])
  })

  it('настройки: текущий темп и переключатель анимаций', async () => {
    const page = await SettingsPage()
    expect(byType(page, PaceForm)[0].props.value).toBe(20)
    expect(byType(page, MotionToggle)).toHaveLength(1)
    expect(settingsMetadata).toEqual({ title: 'Настройки' })
  })
})
