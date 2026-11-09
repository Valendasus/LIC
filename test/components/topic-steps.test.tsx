// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TopicStepChips } from '@/entities/review/ui/TopicStepChips'

const steps = (learn: boolean, implement: [number, number], confirm: [number, number]) => ({
  learn,
  implement: { done: implement[0], total: implement[1] },
  confirm: { done: confirm[0], total: confirm[1] },
})

describe('метки шагов темы', () => {
  it('ничего не начато: всё нейтрально, статус словами', () => {
    render(<TopicStepChips steps={steps(false, [0, 4], [0, 19])} />)
    expect(screen.getByText('Learn — не начат')).toHaveClass('bg-raised')
    expect(screen.getByText('Implement 0 из 4')).toHaveClass('bg-raised')
    expect(screen.getByText('Confirm 0 из 19')).toHaveClass('bg-raised')
  })

  it('в процессе: Learn пройден, задачи решаются, карточки начаты', () => {
    render(<TopicStepChips steps={steps(true, [2, 4], [5, 19])} />)
    expect(screen.getByText('Learn')).toHaveClass('bg-good-soft')
    expect(screen.getByText('Implement 2 из 4')).toHaveClass('bg-accent-soft')
    expect(screen.getByText('Confirm 5 из 19')).toHaveClass('bg-accent-soft')
  })

  it('все задачи решены; в теме нет заданий или карточек', () => {
    const { rerender } = render(<TopicStepChips steps={steps(true, [4, 4], [0, 0])} />)
    expect(screen.getByText('Implement 4 из 4')).toHaveClass('bg-good-soft')
    expect(screen.getByText('Confirm — карточек пока нет')).toBeInTheDocument()
    rerender(<TopicStepChips steps={steps(false, [0, 0], [1, 2])} />)
    expect(screen.getByText('Implement — заданий пока нет')).toHaveClass('bg-raised')
  })
})
