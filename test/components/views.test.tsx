// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CardView } from '@/features/answer-item/ui/CardView'
import { OrderView } from '@/features/answer-item/ui/OrderView'
import { OutputView } from '@/features/answer-item/ui/OutputView'
import { QuizView } from '@/features/answer-item/ui/QuizView'
import { Outcome } from '@/features/answer-item/ui/Outcome'
import { CodeBlock, Panel } from '@/shared/ui'
import { card, intervals, order, output, quiz } from './fixtures'

const props = (free = false) => ({ intervals: { ...intervals }, free, onGrade: vi.fn(), status: 'Новое' })

describe('карточка', () => {
  it('переворачивается кликом, на экране одна сторона; оценки с интервалами', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<CardView item={card({ front: 'Слово', example: 'пример' })} {...p} />)
    expect(screen.getByRole('button', { name: /вопрос/ })).toHaveFocus()
    expect(document.querySelectorAll('[data-side]')).toHaveLength(1)
    expect(screen.getByText('Слово')).toBeInTheDocument()
    expect(screen.getByText('Термин')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /вопрос/ }))
    expect(screen.getByText('Определение')).toBeInTheDocument()
    expect(screen.getByText('пример')).toBeInTheDocument()
    expect(document.querySelector('[data-side="front"]')).toBeNull()

    await user.click(screen.getByRole('button', { name: /Хорошо/ }))
    expect(p.onGrade).toHaveBeenCalledWith(3)
    expect(screen.getByRole('button', { name: /Снова/ })).toHaveTextContent('1 мин · 1')
  })

  it('клавиатура: пробел и Enter переворачивают, 1–4 оценивают только после переворота', () => {
    const p = props()
    render(<CardView item={card({ type: 'qa' })} {...p} />)
    fireEvent.keyDown(window, { key: '3' })
    expect(p.onGrade).not.toHaveBeenCalled()
    fireEvent.keyDown(document.body, { key: ' ' })
    expect(screen.getByRole('button', { name: /ответ/ })).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: 'x' })
    fireEvent.keyDown(document.body, { key: '4' })
    expect(p.onGrade).toHaveBeenCalledWith(4)
    fireEvent.keyDown(document.body, { key: 'Enter' })
    expect(screen.getByRole('button', { name: /вопрос/ })).toBeInTheDocument()
  })

  it('нажатия на кнопках и в полях ввода не перехватываются', () => {
    const p = props()
    render(
      <>
        <CardView item={card()} {...p} />
        <input aria-label="поле" />
      </>,
    )
    fireEvent.keyDown(screen.getByRole('button', { name: /вопрос/ }), { key: ' ' })
    expect(screen.getByRole('button', { name: /вопрос/ })).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: ' ' })
    fireEvent.keyDown(screen.getByLabelText('поле'), { key: '1' })
    expect(p.onGrade).not.toHaveBeenCalled()
  })

  it('свободный режим: «Ещё раз» и «Помню», клавиши 1 и 2', async () => {
    const user = userEvent.setup()
    const p = props(true)
    render(<CardView item={card({ reversed: true })} {...p} />)
    expect(screen.getByText(/обратная/)).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: ' ' })
    expect(screen.getAllByRole('button').filter((b) => b.hasAttribute('data-grade'))).toHaveLength(2)
    fireEvent.keyDown(document.body, { key: '1' })
    fireEvent.keyDown(document.body, { key: '2' })
    fireEvent.keyDown(document.body, { key: '3' })
    await user.click(screen.getByRole('button', { name: /Помню/ }))
    await user.click(screen.getByRole('button', { name: /Ещё раз/ }))
    expect(p.onGrade.mock.calls.map((call) => call[0])).toEqual([1, 3, 3, 1])
  })

  it('зажатая клавиша не листает и не оценивает; в редакторе кода клавиши не перехватываются', () => {
    const p = props()
    render(<CardView item={card()} {...p} />)
    fireEvent.keyDown(document.body, { key: ' ', repeat: true })
    expect(document.querySelector('[data-side="front"]')).not.toBeNull()
    fireEvent.keyDown(document.body, { key: ' ' })
    fireEvent.keyDown(document.body, { key: '3', repeat: true })
    expect(p.onGrade).not.toHaveBeenCalled()
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.append(editable)
    fireEvent.keyDown(editable, { key: '3' })
    expect(p.onGrade).not.toHaveBeenCalled()
    editable.remove()
  })

  it('событие без DOM-цели не ломает обработчик', () => {
    const p = props()
    render(<CardView item={card()} {...p} />)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    expect(screen.getByRole('button', { name: /ответ/ })).toBeInTheDocument()
  })
})

describe('квиз', () => {
  it('один ответ: проверка сразу, пояснение выбранного неверного варианта', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<QuizView item={quiz({ code: 'let a = 1' })} {...p} />)
    expect(screen.getByText('let a = 1')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Ошибочный/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Неверно')
    expect(screen.getByText('Типичное заблуждение.')).toBeInTheDocument()
    expect(screen.getByText('Потому что верный.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Верный/ })).toBeDisabled()
    // После ответа выбор не меняется.
    await user.click(screen.getByRole('radio', { name: /Верный/ }))
    await user.click(screen.getByRole('button', { name: /Дальше/ }))
    expect(p.onGrade).toHaveBeenCalledWith(1)
  })

  it('один ответ: верно', async () => {
    const user = userEvent.setup()
    render(<QuizView item={quiz()} {...props()} />)
    await user.click(screen.getByRole('radio', { name: /Верный/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Верно')
  })

  it('несколько ответов: выбор, снятие, проверка, пропущенные верные', async () => {
    const user = userEvent.setup()
    const item = quiz({
      multiple: true,
      options: [
        { text: 'А', correct: true },
        { text: 'Б', correct: true },
        { text: 'В', correct: false },
      ],
    })
    render(<QuizView item={item} {...props()} />)
    expect(screen.getByText('Квиз · несколько верных ответов')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Проверить' })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /В/ }))
    await user.click(screen.getByRole('checkbox', { name: /В/ }))
    expect(screen.getByRole('checkbox', { name: /В/ })).toHaveAttribute('aria-checked', 'false')
    await user.click(screen.getByRole('checkbox', { name: /А/ }))
    await user.click(screen.getByRole('button', { name: 'Проверить' }))
    expect(screen.getByRole('status')).toHaveTextContent('Неверно')
    expect(screen.getAllByText('Верный вариант, вы его не отметили')).toHaveLength(1)
  })

  it('несколько ответов: все верные отмечены', async () => {
    const user = userEvent.setup()
    const item = quiz({ multiple: true, options: [{ text: 'А', correct: true }, { text: 'Б', correct: true }, { text: 'В', correct: false }] })
    render(<QuizView item={item} {...props()} />)
    await user.click(screen.getByRole('checkbox', { name: /А/ }))
    await user.click(screen.getByRole('checkbox', { name: /Б/ }))
    await user.click(screen.getByRole('button', { name: 'Проверить' }))
    expect(screen.getByRole('status')).toHaveTextContent('Верно')
  })
})

describe('«Что выведет»', () => {
  it('верный ответ по кнопке, лишние пробелы и пустые строки в конце не мешают', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<OutputView item={output()} {...p} />)
    expect(screen.getByRole('button', { name: /Проверить/ })).toBeDisabled()
    await user.type(screen.getByLabelText(/Вывод в консоли/), '  a  {enter}b{enter}{enter}')
    await user.click(screen.getByRole('button', { name: /Проверить/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Верно')
    expect(screen.queryByText('Ваш ответ')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Вывод в консоли/)).toHaveAttribute('readonly')
  })

  it('ошибка через Ctrl+Enter: ответ и правильный вариант рядом, расхождение подсвечено', async () => {
    const user = userEvent.setup()
    render(<OutputView item={output()} {...props()} />)
    const field = screen.getByLabelText(/Вывод в консоли/)
    await user.type(field, 'a{enter}x')
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    expect(screen.getByRole('status')).toHaveTextContent('Неверно')
    expect(screen.getByText('Ваш ответ')).toBeInTheDocument()
    expect(screen.getByText('x')).toHaveClass('text-warn')
  })

  it('пустой ответ не отправляется ни кнопкой, ни клавишами; пустая строка в ответе показывается', async () => {
    const user = userEvent.setup()
    render(<OutputView item={output({ answer: ['', 'b'] })} {...props()} />)
    const field = screen.getByLabelText(/Вывод в консоли/)
    await user.click(field)
    await user.keyboard('{Control>}{Enter}{/Control}')
    fireEvent.submit(field.closest('form')!)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await user.type(field, 'z')
    await user.keyboard('{Enter}')
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(screen.getByRole('status')).toHaveTextContent('Неверно')
  })
})

describe('«Порядок»', () => {
  const correctOrder = ['Один', 'Два', 'Три']

  it('верная последовательность', async () => {
    const user = userEvent.setup()
    render(<OrderView item={order()} correctOrder={correctOrder} {...props()} />)
    for (const step of correctOrder) await user.click(screen.getByRole('button', { name: step }))
    expect(screen.getByRole('status')).toHaveTextContent('Верно')
    expect(screen.queryByText('Правильный порядок')).not.toBeInTheDocument()
  })

  it('неверная последовательность показывает правильный порядок; последний шаг можно убрать', async () => {
    const user = userEvent.setup()
    render(<OrderView item={order()} correctOrder={correctOrder} {...props()} />)
    expect(screen.queryByRole('button', { name: 'Убрать последний' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Два' }))
    await user.click(screen.getByRole('button', { name: 'Убрать последний' }))
    expect(screen.getByRole('button', { name: 'Два' })).toBeInTheDocument()
    for (const step of ['Три', 'Один', 'Два']) await user.click(screen.getByRole('button', { name: step }))
    expect(screen.getByRole('status')).toHaveTextContent('Неверно')
    expect(screen.getByText('Правильный порядок')).toBeInTheDocument()
  })
})

describe('общие части', () => {
  it('итог проверки: интервалы скрыты в свободном режиме, «Угадал» только при верном ответе', async () => {
    const user = userEvent.setup()
    const onGrade = vi.fn()
    const { rerender } = render(<Outcome correct explain="ok" onGrade={onGrade} intervals={{ ...intervals }} free={false} />)
    expect(screen.getByRole('button', { name: /Дальше/ })).toHaveTextContent('3 дн.')
    expect(screen.getByRole('button', { name: /Дальше/ })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: /Угадал/ }))
    expect(onGrade).toHaveBeenLastCalledWith(2)
    rerender(<Outcome correct={false} explain="нет" onGrade={onGrade} intervals={{ ...intervals }} free />)
    expect(screen.queryByRole('button', { name: /Угадал/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Дальше/ })).toHaveTextContent(/^Дальше$/)
    await user.click(screen.getByRole('button', { name: /Дальше/ }))
    expect(onGrade).toHaveBeenLastCalledWith(1)
  })

  it('угадал в свободном режиме — без интервала', () => {
    render(<Outcome correct explain="ok" onGrade={vi.fn()} intervals={{ ...intervals }} free />)
    expect(screen.getByRole('button', { name: /Угадал/ })).toHaveTextContent(/^Угадал — повторить раньше$/)
  })

  it('блок кода убирает последний перевод строки, панель показывает подписи', () => {
    render(
      <Panel label="Метка" status="Статус">
        <CodeBlock code={'a\n'} />
      </Panel>,
    )
    expect(screen.getByText('Метка')).toBeInTheDocument()
    expect(screen.getByText('Статус')).toBeInTheDocument()
    expect(document.querySelector('code')!.textContent).toBe('a')
  })
})
