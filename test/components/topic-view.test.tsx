// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentType, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/set-level/api/actions', () => ({ setLevel: vi.fn() }))

import { H3 } from '@/entities/lesson/ui/Heading'
import type { TopicPractice, TopicStatus, TopicSteps } from '@/entities/review/api/today'
import type { TreeNode } from '@/entities/topic/api/tree'
import { TopicView, type LessonModule } from '@/views/node/ui/TopicView'

const node = (id: string, title: string, extra: Partial<TreeNode> = {}): TreeNode => ({ id, title, slug: id.split('/').at(-1)!, path: id.split('/').slice(1), children: [], ...extra })

const topic = node('f/js/scope/closures', 'Замыкания', { grade: 'J', content: true, goals: ['Объяснить замыкание'] })
const siblings = [node('f/js/scope/a', 'Освоенная'), topic, node('f/js/scope/b', 'Начатая'), node('f/js/scope/c', 'Новая'), node('f/js/scope/d', 'Готовится')]
const root = node('f', 'Frontend')
const block = node('f/js', 'JavaScript')
const module = node('f/js/scope', 'Области видимости', { children: siblings })
const statuses = new Map<string, TopicStatus>([
  ['f/js/scope/a', 'mastered'],
  ['f/js/scope/closures', 'started'],
  ['f/js/scope/b', 'started'],
  ['f/js/scope/c', 'new'],
  ['f/js/scope/d', 'soon'],
])

/** Урок как его отдаёт MDX: содержимое приходит в wrapper из components. */
const Lesson: ComponentType<{ components?: Record<string, unknown> }> = ({ components }) => {
  const Wrapper = components!.wrapper as ComponentType<{ children: ReactNode }>
  const Content = () => (
    <>
      <h2>Learn</h2>
      <H3>Суть</H3>
      <p>Объяснение замыкания</p>
      <H3>Как устроено</H3>
      <h2>Implement</h2>
      <p>Задача из урока</p>
      <h2>Confirm</h2>
      <p>Вопрос на повторение</p>
      <h2>Источники</h2>
      <p>MDN</p>
    </>
  )
  return (
    <Wrapper>
      <Content />
    </Wrapper>
  )
}
const lesson: LessonModule = { Lesson, meta: { verified: '08.11.2026', versions: 'ES2026' } }

const steps = (learn: boolean, implement: [number, number], confirm: [number, number]): TopicSteps => ({
  learn,
  implement: { done: implement[0], total: implement[1] },
  confirm: { done: confirm[0], total: confirm[1] },
})

const fullPractice: TopicPractice = {
  tasks: [
    { id: 't1', title: 'once', level: 'easy', kind: 'code', solved: true },
    { id: 't2', title: 'debounce', level: 'boss', kind: 'react', solved: false },
  ],
  questions: 2,
  cards: 3,
}

afterEach(() => window.history.replaceState(null, '', '/'))

describe('экран темы', () => {
  it('урок по шагам: Learn с источниками и датой проверки, Implement — задачи, Confirm — карточки и самооценка', async () => {
    const user = userEvent.setup()
    render(
      <TopicView
        node={topic}
        trail={[root, block, module, topic]}
        lesson={lesson}
        steps={steps(true, [4, 4], [3, 3])}
        practice={fullPractice}
        level={2}
        siblings={siblings}
        statuses={statuses}
        next={node('f/js/this', 'this')}
      />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Замыкания' })).toBeInTheDocument()
    expect(screen.getByText('Junior')).toBeInTheDocument()
    expect(screen.getByText('Объяснить замыкание')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Путь' })).getAllByRole('link').map((link) => link.textContent)).toEqual(['Frontend', 'JavaScript', 'Области видимости'])

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Learn · понятьПройдено', 'Implement · применитьРешено 4 из 4', 'Confirm · закрепитьНачато 3 из 3'])
    const panel = () => screen.getByRole('tabpanel')
    expect(panel()).toHaveTextContent('Объяснение замыкания')
    expect(panel()).toHaveTextContent('MDN')
    expect(panel()).toHaveTextContent('Проверено 08.11.2026 · ES2026')
    expect(panel()).not.toHaveTextContent('Задача из урока')
    expect(screen.getByRole('navigation', { name: 'На странице' })).toHaveTextContent('СутьКак устроено')

    await user.click(tabs[1])
    expect(panel()).toHaveTextContent('Задачи темы')
    expect(panel()).toHaveTextContent('Решено 4 из 4')
    expect(screen.getByLabelText('решена')).toBeInTheDocument()
    expect(screen.getByLabelText('не решена')).toBeInTheDocument()
    expect(panel()).toHaveTextContent('Босс')
    expect(panel()).toHaveTextContent('React-задачи')
    expect(screen.getByRole('link', { name: /Решать задачи/ })).toHaveAttribute('href', '/practice?scope=f%2Fjs%2Fscope%2Fclosures&kinds=code,types,react')
    expect(screen.getByRole('link', { name: /Вопросы на понимание · 2/ })).toHaveAttribute('href', '/practice?scope=f%2Fjs%2Fscope%2Fclosures&kinds=quiz,output,order')
    expect(panel()).toHaveTextContent('Задача из урока')

    await user.click(tabs[2])
    expect(panel()).toHaveTextContent('3 карточки на термины')
    expect(screen.getByRole('link', { name: 'Повторить карточки' })).toHaveAttribute('href', '/practice?scope=f%2Fjs%2Fscope%2Fclosures&kinds=card')
    expect(screen.getByRole('link', { name: 'Свободная тренировка' })).toHaveAttribute('href', '/practice?scope=f%2Fjs%2Fscope%2Fclosures&mode=free')
    expect(panel()).toHaveTextContent('Вопрос на повторение')
    expect(screen.getByText('Насколько вы освоили тему?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Понимаю/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: /Следующая тема: this/ })).toHaveAttribute('href', '/f/js/this')
  })

  it('темы модуля со статусами; текущая отмечена', () => {
    render(<TopicView node={topic} trail={[root, block, module, topic]} lesson={lesson} steps={steps(false, [0, 0], [0, 0])} practice={{ tasks: [], questions: 0, cards: 0 }} level={0} siblings={siblings} statuses={statuses} next={null} />)
    const aside = screen.getByRole('complementary', { name: 'Темы модуля' })
    expect(within(aside).getByRole('link', { name: /JavaScript/ })).toHaveAttribute('href', '/f/js')
    expect(within(aside).getByText('5 тем')).toBeInTheDocument()
    expect(within(aside).getByRole('link', { name: 'Освоенная, освоена' })).toBeInTheDocument()
    expect(within(aside).getByRole('link', { name: 'Замыкания, в процессе' })).toHaveAttribute('aria-current', 'page')
    expect(within(aside).getByRole('link', { name: 'Новая, не начата' })).toBeInTheDocument()
    expect(within(aside).getByRole('link', { name: 'Готовится, готовится' })).toHaveClass('text-subtle')
  })

  it('без урока и практики: урок готовится, заданий и карточек нет, в конце — к курсу', async () => {
    const user = userEvent.setup()
    const bare = node('f/js/this', 'this')
    render(<TopicView node={bare} trail={[root, block, bare]} lesson={null} steps={steps(false, [0, 0], [0, 0])} practice={{ tasks: [], questions: 0, cards: 0 }} level={0} siblings={[bare]} statuses={new Map([['f/js/this', 'soon']])} next={null} />)
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['1Learn · понятьУрок готовится', '2Implement · применитьЗаданий пока нет', '3Confirm · закрепитьКарточек пока нет'])
    expect(screen.getByText('Урок по этой теме готовится')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'На странице' })).toBeNull()
    // Лист прямо в блоке: модуль — сам блок, назад — к специальности.
    expect(within(screen.getByRole('complementary', { name: 'Темы модуля' })).getByRole('link', { name: /Frontend/ })).toHaveAttribute('href', '/f')
    await user.click(screen.getAllByRole('tab')[1])
    expect(screen.getByText('Задач по этой теме пока нет.')).toBeInTheDocument()
    await user.click(screen.getAllByRole('tab')[2])
    expect(screen.getByText('Карточек по этой теме пока нет.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'К курсу' })).toHaveAttribute('href', '/f')
  })

  it('тема прямо в корне специальности: назад — к самой специальности', () => {
    const bare = node('f/intro', 'Введение')
    render(<TopicView node={bare} trail={[root, bare]} lesson={null} steps={steps(false, [0, 0], [0, 0])} practice={{ tasks: [], questions: 0, cards: 0 }} level={0} siblings={[bare]} statuses={new Map([['f/intro', 'new']])} next={null} />)
    expect(within(screen.getByRole('complementary', { name: 'Темы модуля' })).getByRole('link', { name: /Frontend/ })).toHaveAttribute('href', '/f')
  })

  it('в процессе: часть заданий решена, карточки начаты; только задачи или только вопросы', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <TopicView node={topic} trail={[root, block, module, topic]} lesson={null} steps={steps(true, [1, 2], [1, 3])} practice={{ tasks: [fullPractice.tasks[1]], questions: 1, cards: 3 }} level={1} siblings={siblings} statuses={statuses} next={null} />,
    )
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Learn · понятьПройдено', '2Implement · применитьРешено 1 из 2', '3Confirm · закрепитьНачато 1 из 3'])
    rerender(<TopicView node={topic} trail={[root, block, module, topic]} lesson={null} steps={steps(false, [0, 2], [0, 3])} practice={{ tasks: fullPractice.tasks, questions: 0, cards: 3 }} level={0} siblings={siblings} statuses={statuses} next={null} />)
    expect(screen.getAllByRole('tab')[2]).toHaveTextContent('3 карточки')
    await user.click(screen.getAllByRole('tab')[1])
    expect(screen.queryByRole('link', { name: /Вопросы на понимание/ })).toBeNull()
    rerender(<TopicView node={topic} trail={[root, block, module, topic]} lesson={null} steps={steps(false, [0, 2], [0, 3])} practice={{ tasks: [], questions: 2, cards: 3 }} level={0} siblings={siblings} statuses={statuses} next={null} />)
    expect(screen.queryByRole('link', { name: /Решать задачи/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Вопросы на понимание · 2/ })).toBeInTheDocument()
  })
})
