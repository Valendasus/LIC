// @vitest-environment jsdom
import * as dom from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import ts from 'ts6'
import { describe, expect, it } from 'vitest'
import { compileReact } from '@/features/solve-task/lib/react-compile'
import { createTestingApi, runReactTask } from '@/features/solve-task/lib/react-runner'

const deps = { React, createRoot, flushSync, dom, userEvent }

async function run(code: string, tests: string, preview?: string, overrides = {}) {
  const compiled = compileReact(ts, code, tests, preview)
  return runReactTask(compiled.code!, { ...deps, ...overrides })
}

describe('React-задача: выполнение', () => {
  it('хуки, render, screen и userEvent доступны без импорта; предпросмотр возвращается', async () => {
    const { result, preview } = await run(
      'function Hello({ name }) { const [n, setN] = useState(0); return <button onClick={() => setN(n + 1)}>{name} {n}</button> }',
      "test('клик', async () => { const user = userEvent.setup(); render(<Hello name='Аня' />); await user.click(screen.getByRole('button')); expect(screen.getByRole('button')).toHaveTextContent('Аня 1') })",
      "<Hello name='Предпросмотр' />",
    )
    expect(result.tests).toEqual([{ name: 'клик', passed: true }])
    expect(preview).toBeTypeOf('function')
    expect(document.body.innerHTML).toBe('')
  })

  it('импорты из react, Testing Library и user-event работают; чужой модуль — понятная ошибка', async () => {
    const { result } = await run(
      "import { useState as useS } from 'react'\nimport { render as r, screen as s } from '@testing-library/react'\nimport { within } from '@testing-library/dom'\nimport ue from '@testing-library/user-event'\nfunction A() { const [v] = useS('ok'); return <p>{v}</p> }",
      "test('импорты', () => { r(<A />); expect(within(document.body).getByText('ok')).toBeInTheDocument(); expect(typeof ue.setup).toBe('function') })\ntest('чужой модуль', () => { require('lodash') })",
    )
    expect(result.tests[0]).toEqual({ name: 'импорты', passed: true })
    expect(result.tests[1].error).toBe('Error: Модуль «lodash» в задаче недоступен. Доступны: react, @testing-library/react, @testing-library/dom, @testing-library/user-event')
  })

  it('без предпросмотра его нет; user-event без default тоже подходит', async () => {
    const { result, preview } = await run('const a = 1', "test('t', () => expect(typeof userEvent.setup).toBe('function'))", undefined, { userEvent: { setup: () => {} } })
    expect(result.tests[0].passed).toBe(true)
    expect(preview).toBeUndefined()
  })

  it('ошибка рендера падает из render с настоящей причиной; бесконечный цикл останавливается', async () => {
    const { result } = await run(
      'function Broken() { return missing } \nfunction Loop() { while (true) {} return null }',
      "test('ошибка', () => render(<Broken />))\ntest('цикл', () => render(<Loop />))",
    )
    expect(result.tests[0].error).toBe('ReferenceError: missing is not defined')
    expect(result.tests[1].error).toMatch(/похоже на бесконечный цикл/)
  })
})

describe('render и renderHook без act', () => {
  const api = () => createTestingApi(deps, React.createElement as never)

  it('render, rerender и unmount', () => {
    const { render, cleanup } = api()
    const view = render(<p>один</p>)
    expect(view.container.textContent).toBe('один')
    view.rerender(<p>два</p>)
    expect(document.body.textContent).toBe('два')
    view.unmount()
    expect(document.body.innerHTML).toBe('')
    cleanup()
  })

  it('ошибка при повторном рендере тоже бросается', () => {
    const { render, cleanup } = api()
    const Boom = () => {
      throw new Error('бум')
    }
    const view = render(<p />)
    expect(() => view.rerender(<Boom />)).toThrow('бум')
    // После ошибки render снова работает.
    view.rerender(<p>снова</p>)
    expect(view.container.textContent).toBe('снова')
    cleanup()
  })

  it('renderHook: текущее значение, новые пропсы, размонтирование', () => {
    const { renderHook, cleanup } = api()
    const { result, rerender, unmount } = renderHook(({ x }: { x: number }) => x * 2, { initialProps: { x: 2 } })
    expect(result.current).toBe(4)
    rerender({ x: 5 })
    expect(result.current).toBe(10)
    unmount()
    const empty = renderHook(() => 'без пропсов')
    expect(empty.result.current).toBe('без пропсов')
    cleanup()
    expect(document.body.innerHTML).toBe('')
  })

  it('act применяет обновление и ждёт эффекты', async () => {
    const { render, act, cleanup } = api()
    let set!: (value: number) => void
    function Effects() {
      const [n, setN] = React.useState(0)
      const [seen, setSeen] = React.useState(0)
      set = setN
      React.useEffect(() => setSeen(n), [n])
      return <p>{seen}</p>
    }
    render(<Effects />)
    await act(() => set(3))
    expect(document.body.textContent).toBe('3')
    await act(async () => set(4))
    expect(document.body.textContent).toBe('4')
    cleanup()
  })
})
