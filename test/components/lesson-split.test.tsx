// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { createElement, Fragment } from 'react'
import { describe, expect, it } from 'vitest'
import { flatten, headingId, nodeText, splitLesson } from '@/entities/lesson/model/split'
import { H3 } from '@/entities/lesson/ui/Heading'

const isH3 = (element: { type: unknown }) => element.type === H3 || element.type === 'h3'

describe('разбиение урока по шагам', () => {
  it('текст узла и id заголовка', () => {
    expect(nodeText(['Как ', createElement('code', null, 'this'), ' работает ', 42, null, false])).toBe('Как this работает 42')
    expect(headingId('Классика: цикл и таймер')).toBe('классика-цикл-и-таймер')
    expect(headingId('  Ёлка — `use()`! ')).toBe('елка-use')
  })

  it('заголовок раздела получает id', () => {
    const { container } = render(
      <H3 className="x">
        Суть <code>за</code> минуту
      </H3>,
    )
    expect(container.querySelector('h3')).toHaveAttribute('id', 'суть-за-минуту')
    expect(container.querySelector('h3')).toHaveClass('x')
  })

  it('фрагменты и компонент содержимого MDX раскрываются, компоненты уроков — нет', () => {
    const Content = () => (
      <>
        <p>a</p>
        <p>b</p>
      </>
    )
    expect(flatten(<Content />)).toHaveLength(2)
    expect(flatten(<Fragment>{[<p key="1" />]}</Fragment>)).toHaveLength(1)
    const Callout = ({ children }: { children: React.ReactNode }) => <aside>{children}</aside>
    expect(flatten(<Callout>текст</Callout>)[0]).toMatchObject({ type: Callout })
    expect(flatten('строка')).toEqual(['строка'])
    expect(flatten(<p />)).toHaveLength(1)
  })

  it('содержимое раскладывается по шагам, текст до первого шага — в Learn, оглавление по заголовкам', () => {
    const { sections, toc } = splitLesson(
      <>
        <p>Вступление</p>
        <h2>Learn</h2>
        <H3>Суть</H3>
        <p>Объяснение</p>
        <h3>Как устроено</h3>
        <h2>Implement</h2>
        <p>Задача</p>
        <h2>Другой раздел</h2>
        <h2>Confirm</h2>
        <H3>Вопросы</H3>
        <h2>Источники</h2>
        <ul />
        текст
      </>,
      isH3,
    )
    expect(sections.learn).toHaveLength(4)
    expect(sections.implement).toHaveLength(2)
    expect(sections.confirm).toHaveLength(1)
    expect(sections.sources).toHaveLength(2)
    expect(toc).toEqual({ learn: [{ id: 'суть', title: 'Суть' }, { id: 'как-устроено', title: 'Как устроено' }], implement: [], confirm: [{ id: 'вопросы', title: 'Вопросы' }], sources: [] })
  })
})
