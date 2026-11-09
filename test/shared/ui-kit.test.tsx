// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { cn } from '@/shared/lib'
import { Badge, Button, ButtonLink, buttonClass, Card, EmptyState, Eyebrow, IconButton, Kbd, ProgressBar, ProgressRing, SegmentBar, Skeleton } from '@/shared/ui'

describe('cn', () => {
  it('склеивает классы и пропускает пустые', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b')
  })
})

describe('кнопки', () => {
  it('главная по умолчанию: светлая таблетка, тип button, клавиша на светлом фоне', () => {
    const onClick = vi.fn()
    render(
      <Button kbd="⏎" icon={<i data-testid="start" />} iconEnd={<i data-testid="end" />} onClick={onClick}>
        Начать
      </Button>,
    )
    const button = screen.getByRole('button', { name: /Начать/ })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveClass('bg-primary', 'text-on-primary', 'rounded-full', 'h-11')
    expect(screen.getByText('⏎')).toHaveClass('text-ink-700')
    expect(screen.getByTestId('start')).toBeInTheDocument()
    expect(screen.getByTestId('end')).toBeInTheDocument()
    button.click()
    expect(onClick).toHaveBeenCalled()
  })

  it('варианты и размеры', () => {
    expect(buttonClass({ variant: 'secondary', size: 'sm' })).toContain('bg-raised')
    expect(buttonClass({ variant: 'outline', size: 'lg' })).toContain('border-line')
    expect(buttonClass({ variant: 'ghost' })).toContain('text-muted')
    expect(buttonClass({ variant: 'danger', className: 'extra' })).toMatch(/text-bad.*extra/)
    expect(buttonClass({})).toContain('h-11')
    render(
      <Button variant="ghost" kbd="Esc" type="submit">
        Тихая
      </Button>,
    )
    expect(screen.getByRole('button', { name: /Тихая/ })).toHaveAttribute('type', 'submit')
    expect(screen.getByText('Esc')).toHaveClass('text-muted')
  })

  it('ссылка-кнопка', () => {
    render(
      <ButtonLink href="/today" variant="secondary">
        Сегодня
      </ButtonLink>,
    )
    expect(screen.getByRole('link', { name: 'Сегодня' })).toHaveAttribute('href', '/today')
    expect(screen.getByRole('link')).toHaveClass('bg-raised')
  })

  it('кнопка-иконка подписана для скринридера', () => {
    render(
      <IconButton label="Поиск" className="x">
        <svg />
      </IconButton>,
    )
    expect(screen.getByRole('button', { name: 'Поиск' })).toHaveAttribute('title', 'Поиск')
    expect(screen.getByRole('button')).toHaveClass('x', 'size-11')
  })

  it('клавиша', () => {
    render(<Kbd className="k">⌘K</Kbd>)
    expect(screen.getByText('⌘K').tagName).toBe('KBD')
    expect(screen.getByText('⌘K')).toHaveClass('k', 'border-line')
  })
})

describe('поверхности и метки', () => {
  it('карточка обычная и интерактивная, подпись раздела', () => {
    render(
      <>
        <Card data-testid="plain">a</Card>
        <Card data-testid="active" interactive className="p-4">
          b
        </Card>
        <Eyebrow>Повторение</Eyebrow>
      </>,
    )
    expect(screen.getByTestId('plain')).toHaveClass('bg-surface', 'rounded-panel')
    expect(screen.getByTestId('plain')).not.toHaveClass('hover:bg-raised')
    expect(screen.getByTestId('active')).toHaveClass('hover:bg-raised', 'p-4')
    expect(screen.getByText('Повторение')).toHaveClass('uppercase')
  })

  it('бейдж: тона, обводка, иконка', () => {
    const tones = ['neutral', 'accent', 'good', 'warn', 'bad', 'info'] as const
    render(
      <>
        {tones.map((tone) => (
          <Badge key={tone} tone={tone}>
            {tone}
          </Badge>
        ))}
        <Badge outline icon={<i data-testid="icon" />} className="extra">
          Junior
        </Badge>
        <Badge>по умолчанию</Badge>
      </>,
    )
    expect(screen.getByText('accent')).toHaveClass('text-accent')
    expect(screen.getByText('bad')).toHaveClass('bg-bad-soft')
    expect(screen.getByText('Junior')).toHaveClass('border-line-strong', 'extra')
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('по умолчанию')).toHaveClass('bg-raised')
  })
})

describe('прогресс', () => {
  it('полоса: процент, границы, тон, без подписи', () => {
    const { rerender } = render(<ProgressBar value={0.426} label="Блок" />)
    expect(screen.getByRole('progressbar', { name: 'Блок' })).toHaveAttribute('aria-valuenow', '43')
    expect(screen.getByText('43%')).toBeInTheDocument()
    rerender(<ProgressBar value={1.5} label="Блок" tone="good" showValue={false} className="w" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByRole('progressbar').firstElementChild).toHaveClass('bg-good')
    expect(screen.queryByText('100%')).toBeNull()
    rerender(<ProgressBar value={-1} label="Блок" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('кольцо: акцент и успех, содержимое внутри', () => {
    const { rerender } = render(
      <ProgressRing value={0.12} label="Курс" size={120}>
        12%
      </ProgressRing>,
    )
    const ring = screen.getByRole('progressbar', { name: 'Курс' })
    expect(ring).toHaveAttribute('aria-valuenow', '12')
    expect(ring.getAttribute('style')).toContain('var(--color-accent) 0 12%')
    expect(screen.getByText('12%')).toBeInTheDocument()
    rerender(<ProgressRing value={2} label="Курс" tone="good" />)
    expect(screen.getByRole('progressbar').getAttribute('style')).toContain('var(--color-good) 0 100%')
    rerender(<ProgressRing value={-1} label="Курс" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('отрезки: каждый по результату, пройденные считаются', () => {
    render(<SegmentBar segments={['good', 'bad', 'warn', 'current', 'todo']} label="Сессия" className="s" />)
    const bar = screen.getByRole('progressbar', { name: 'Сессия' })
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '5')
    expect([...bar.children].map((child) => child.className.match(/bg-\S+/)![0])).toEqual(['bg-good', 'bg-bad', 'bg-warn', 'bg-fg', 'bg-surface'])
  })
})

describe('состояния', () => {
  it('пустое состояние: полное и минимальное', () => {
    const { rerender } = render(
      <EmptyState icon={<i data-testid="icon" />} title="Пусто" action={<button>Действие</button>} className="e">
        Текст
      </EmptyState>,
    )
    expect(screen.getByText('Пусто')).toBeInTheDocument()
    expect(screen.getByText('Текст')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Действие' })).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    rerender(<EmptyState title="Только заголовок" />)
    expect(screen.getByText('Только заголовок').parentElement!.children).toHaveLength(1)
  })

  it('скелетон скрыт от скринридера', () => {
    const { container } = render(<Skeleton className="h-4" />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstElementChild).toHaveClass('animate-pulse', 'h-4')
    render(<Skeleton />)
  })
})
