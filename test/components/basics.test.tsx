// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Hints } from '@/entities/lesson/ui/Hints'
import { Callout, Example, Question, Sources, Task } from '@/entities/lesson/ui/blocks'
import { RichText } from '@/shared/ui/RichText'
import { levelName } from '@/entities/progress/model/levels'
import { ProgressBar } from '@/shared/ui'
import { useMDXComponents } from '@/mdx-components'


describe('упрощённая разметка', () => {
  it('абзацы, переносы, код, жирный, списки и блоки кода', () => {
    const { container } = render(
      <RichText text={'Первая строка\nвторая с `кодом` и **жирным**\n\n- пункт `a`\n- пункт **b**\n\n```js\nconst x = 1\n```\nхвост'} className="extra" />,
    )
    expect(container.firstChild).toHaveClass('space-y-2', 'extra')
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs[0].querySelectorAll('br')).toHaveLength(1)
    expect(paragraphs[0].querySelector('code')).toHaveTextContent('кодом')
    expect(paragraphs[0].querySelector('strong')).toHaveTextContent('жирным')
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelector('pre')).toHaveTextContent('const x = 1')
    expect(paragraphs[1]).toHaveTextContent('хвост')
  })

  it('разметка в самом начале и в самом конце строки', () => {
    const { container } = render(<RichText text={'`начало` середина **конец**'} />)
    expect(container.querySelector('p')!.firstChild).toHaveTextContent('начало')
    expect(container.querySelector('p')!.lastChild).toHaveTextContent('конец')
  })

  it('незакрытый блок кода и текст без разметки, Windows-переводы строк', () => {
    const { container } = render(<RichText text={'```\nкод без конца'} />)
    expect(container.querySelector('pre')).toHaveTextContent('код без конца')
    render(<RichText text={'просто текст\r\n'} />)
    expect(screen.getByText('просто текст')).toBeInTheDocument()
  })
})

describe('элементы интерфейса', () => {
  it('полоса прогресса', () => {
    render(<ProgressBar value={0.256} label="Прогресс" />)
    expect(screen.getByRole('progressbar', { name: 'Прогресс' })).toHaveAttribute('aria-valuenow', '26')
    expect(screen.getByText('26%')).toBeInTheDocument()
  })

  it('название уровня с запасным вариантом', () => {
    expect(levelName(4)).toBe('Владею')
    expect(levelName(9)).toBe('Не начато')
  })
})

describe('блоки темы', () => {
  it('врезки всех типов и свой заголовок', () => {
    render(
      <>
        <Callout>важное</Callout>
        <Callout type="mistake">ошибка</Callout>
        <Callout type="interview" title="Свой заголовок">собес</Callout>
        <Callout type="deep">глубже</Callout>
      </>,
    )
    for (const title of ['Важно', 'Частая ошибка', 'Свой заголовок', 'Под капотом']) expect(screen.getByText(title)).toBeInTheDocument()
  })

  it('пример из реального кода без названия источника', () => {
    const { rerender } = render(<Example verdict="good" file="src/a.ts">тело</Example>)
    expect(screen.getByText('Пример из реального кода')).toBeInTheDocument()
    expect(screen.getByText('src/a.ts')).toBeInTheDocument()
    expect(screen.getByText('можно брать за образец')).toBeInTheDocument()
    rerender(<Example verdict="review">тело</Example>)
    expect(screen.getByText('разобрать критически')).toBeInTheDocument()
    expect(screen.queryByText('src/a.ts')).not.toBeInTheDocument()
  })

  it('вопрос, задача и источники', () => {
    render(
      <>
        <Question q="Вопрос?">Ответ</Question>
        <Task level="boss" title="Босс-задача">условие</Task>
        <Sources>ссылки</Sources>
      </>,
    )
    expect(screen.getByText('Вопрос?')).toBeInTheDocument()
    expect(screen.getByText('Босс')).toBeInTheDocument()
    expect(screen.getByText('Босс-задача')).toBeInTheDocument()
    expect(screen.getByText('ссылки')).toBeInTheDocument()
  })

  it('лестница подсказок по одной ступени, затем решение', async () => {
    const user = userEvent.setup()
    render(<Hints hints={['первая', 'вторая']}>решение</Hints>)
    expect(screen.queryByText('первая')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Подсказка 1 из 2' }))
    expect(screen.getByText('первая')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Подсказка 2 из 2' }))
    expect(screen.queryByRole('button', { name: /Подсказка/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Показать решение' }))
    expect(screen.getByText('решение')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Показать решение' })).not.toBeInTheDocument()
  })

  it('подсказки без решения', () => {
    render(<Hints hints={['одна']} />)
    expect(screen.queryByRole('button', { name: 'Показать решение' })).not.toBeInTheDocument()
  })

  it('компоненты, доступные в MDX', () => {
    expect(Object.keys(useMDXComponents()).sort()).toEqual(['Callout', 'Example', 'Hints', 'Question', 'Sources', 'Task', 'h3'])
  })
})
