// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentType, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/set-level/api/actions', () => ({ setLevel: vi.fn() }))

import type { PracticeItem } from '@/entities/practice-item/api/items'
import type { TreeNode } from '@/entities/topic/api/tree'
import { LessonPractice, shuffled } from '@/views/node/ui/LessonPractice'
import { TopicView } from '@/views/node/ui/TopicView'

const base = { topicId: 'frontend/js/p', topicTitle: 'Промисы', topicHref: '/frontend/js/p' }
const output: PracticeItem = { ...base, id: 'frontend/js/p#out', kind: 'output', code: "console.log('a')", answer: ['a', 'b'], explain: 'Сначала **синхронно**.' }
const quiz: PracticeItem = {
  ...base,
  id: 'frontend/js/p#quiz',
  kind: 'quiz',
  question: 'Что вернёт `then`?',
  code: 'p.then(f)',
  multiple: true,
  options: [
    { text: 'Новый промис', correct: true },
    { text: 'Тот же промис', correct: true },
    { text: 'undefined', correct: false, why: 'then всегда возвращает промис' },
    { text: 'Ошибку', correct: false },
  ],
  explain: 'Всегда новый.',
}
const single: PracticeItem = { ...base, id: 'frontend/js/p#one', kind: 'quiz', question: 'Один ответ?', multiple: false, options: [{ text: 'Да', correct: true }, { text: 'Нет', correct: false }], explain: 'Да.' }
const order: PracticeItem = { ...base, id: 'frontend/js/p#ord', kind: 'order', prompt: 'Расставьте', steps: ['Первый', 'Второй', 'Третий'], explain: 'По порядку.' }
const task: PracticeItem = { ...base, id: 'frontend/js/p#task', kind: 'code', title: 'promisify', level: 'easy', prompt: 'Напишите `promisify`.', starter: '', tests: '', solution: '', hints: [], explain: '' }
const card: PracticeItem = { ...base, id: 'frontend/js/p#card', kind: 'card', type: 'term', front: 'F', back: 'B', reversed: false }

const show = async (name: RegExp | string = 'Показать ответ') => userEvent.click(screen.getByRole('button', { name }))

describe('задание в уроке: <Practice id="…" />', () => {
  it('«что выведет»: код, ответ построчно и объяснение под кнопкой', async () => {
    render(<LessonPractice id="out" item={output} topicId={base.topicId} />)
    const block = screen.getByRole('region', { name: 'Что выведет код' })
    expect(within(block).getByText("console.log('a')")).toBeInTheDocument()
    expect(within(block).queryByText('синхронно')).not.toBeInTheDocument()
    await show()
    expect(within(block).getByText((_, element) => element?.tagName === 'CODE' && element.textContent === 'a\nb')).toBeInTheDocument()
    expect(within(block).getByText('синхронно')).toBeInTheDocument()
  })

  it('квиз с несколькими ответами: варианты, верные ответы и почему неверные', async () => {
    render(<LessonPractice id="quiz" item={quiz} topicId={base.topicId} />)
    const block = screen.getByRole('region', { name: 'Вопрос' })
    expect(within(block).getByText('Вопрос · несколько ответов')).toBeInTheDocument()
    expect(within(block).getByText('p.then(f)')).toBeInTheDocument()
    expect(within(block).getAllByRole('listitem')).toHaveLength(4)
    await show()
    expect(within(block).getByText('Верные ответы:')).toBeInTheDocument()
    expect(within(block).getByText(/Новый промис; Тот же промис/)).toBeInTheDocument()
    expect(within(block).getByText(/then всегда возвращает промис/)).toBeInTheDocument()
  })

  it('квиз с одним ответом и без кода', async () => {
    render(<LessonPractice id="one" item={single} topicId={base.topicId} />)
    expect(screen.getByText('Вопрос')).toBeInTheDocument()
    await show()
    expect(screen.getByText('Верный ответ:')).toBeInTheDocument()
  })

  it('порядок: шаги перемешаны, верный порядок — под кнопкой', async () => {
    render(<LessonPractice id="ord" item={order} topicId={base.topicId} />)
    const block = screen.getByRole('region', { name: 'Расставьте по порядку' })
    const shown = within(block).getAllByRole('listitem').map((item) => item.textContent)
    expect(shown).not.toEqual(order.kind === 'order' && order.steps)
    await show()
    expect(within(block).getAllByRole('listitem').slice(3).map((item) => item.textContent)).toEqual(['Первый', 'Второй', 'Третий'])
  })

  it('перемешивание детерминированное и никогда не совпадает с ответом', () => {
    const steps = ['Первый', 'Второй', 'Третий']
    const mixed = shuffled(steps)
    expect(shuffled(steps)).toEqual(mixed)
    // Порядок, совпадающий с «перемешанным», сдвигается на шаг.
    expect(shuffled(mixed)).not.toEqual(mixed)
    expect([...shuffled(mixed)].sort()).toEqual([...steps].sort())
  })

  it('задача с кодом — карточка со ссылкой в тренажёр', () => {
    render(<LessonPractice id="task" item={task} topicId={base.topicId} />)
    const block = screen.getByRole('region', { name: 'Задача: promisify' })
    expect(within(block).getByText('Лёгкая')).toBeInTheDocument()
    expect(within(block).getByRole('link', { name: /Решить в редакторе/ })).toHaveAttribute('href', '/practice?scope=frontend%2Fjs%2Fp&kinds=code&mode=free')
  })

  it('нет такого задания или это карточка — заметная ошибка вместо пустоты', () => {
    const { rerender } = render(<LessonPractice id="nope" item={undefined} topicId={base.topicId} />)
    expect(screen.getByText('Задание «nope» не найдено в практике темы.')).toBeInTheDocument()
    rerender(<LessonPractice id="card" item={card} topicId={base.topicId} />)
    expect(screen.getByText('Задание «card» не найдено в практике темы.')).toBeInTheDocument()
  })

  it('TopicView подставляет в урок компонент Practice с заданиями темы', () => {
    const node: TreeNode = { id: 'frontend/js/p', title: 'Промисы', slug: 'p', path: ['js', 'p'], children: [], content: true }
    const Lesson: ComponentType<{ components?: Record<string, unknown> }> = ({ components }) => {
      const Wrapper = components!.wrapper as ComponentType<{ children: ReactNode }>
      const Practice = components!.Practice as ComponentType<{ id: string }>
      return (
        <Wrapper>
          <h2>Learn</h2>
          <Practice id="out" />
          <Practice id="nope" />
        </Wrapper>
      )
    }
    render(
      <TopicView
        node={node}
        trail={[{ ...node, id: 'frontend', title: 'Frontend' }, node]}
        lesson={{ Lesson, meta: { verified: '11.11.2026', versions: 'ES2026' } }}
        steps={{ learn: false, implement: { done: 0, total: 0 }, confirm: { done: 0, total: 0 } }}
        practice={{ tasks: [], questions: 1, cards: 0 }}
        level={0}
        siblings={[node]}
        statuses={new Map([[node.id, 'new']])}
        next={null}
        items={[output]}
      />,
    )
    expect(screen.getByRole('region', { name: 'Что выведет код' })).toBeInTheDocument()
    expect(screen.getByText('Задание «nope» не найдено в практике темы.')).toBeInTheDocument()
  })
})
