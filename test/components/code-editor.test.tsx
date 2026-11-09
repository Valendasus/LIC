// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { EditorView } from '@codemirror/view'
import { describe, expect, it, vi } from 'vitest'
import { CodeEditor } from '@/components/practice/code/CodeEditor'

const viewOf = (container: HTMLElement) => EditorView.findFromDOM(container.querySelector('.cm-editor') as HTMLElement)!

describe('редактор кода', () => {
  it('показывает текст, сообщает об изменениях и подписан для скринридера', () => {
    const onChange = vi.fn()
    const { container } = render(<CodeEditor value="let a = 1" onChange={onChange} onRun={vi.fn()} label="Решение" />)
    expect(container.querySelector('[data-code-editor] .cm-content')).toHaveAttribute('aria-label', 'Решение')
    const view = viewOf(container)
    expect(view.state.doc.toString()).toBe('let a = 1')

    view.dispatch({ changes: { from: 9, insert: '0' } })
    expect(onChange).toHaveBeenLastCalledWith('let a = 10')
    // Смена выделения без изменения текста — не изменение.
    view.dispatch({ selection: { anchor: 0 } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  // В jsdom платформа не Mac, поэтому Mod — это Ctrl.
  it('Ctrl/⌘+Enter запускает тесты последним обработчиком', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { container, rerender } = render(<CodeEditor value="" onChange={vi.fn()} onRun={first} label="Решение" />)
    rerender(<CodeEditor value="" onChange={vi.fn()} onRun={second} label="Решение" />)
    const content = container.querySelector('.cm-content')!
    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, ctrlKey: true, bubbles: true, cancelable: true }))
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })

  it('текст, заменённый снаружи, попадает в редактор; тот же текст не трогается', () => {
    const onChange = vi.fn()
    const { container, rerender } = render(<CodeEditor value="старое" onChange={onChange} onRun={vi.fn()} label="Решение" />)
    rerender(<CodeEditor value="новое" onChange={onChange} onRun={vi.fn()} label="Решение" />)
    expect(viewOf(container).state.doc.toString()).toBe('новое')
    onChange.mockClear()
    rerender(<CodeEditor value="новое" onChange={onChange} onRun={vi.fn()} label="Решение" />)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('при размонтировании редактор уничтожается', () => {
    const { container, unmount } = render(<CodeEditor value="" onChange={vi.fn()} onRun={vi.fn()} label="Решение" />)
    const view = viewOf(container)
    const destroy = vi.spyOn(view, 'destroy')
    unmount()
    expect(destroy).toHaveBeenCalled()
  })

  it('режимы TypeScript и TSX: разметка JSX разбирается без ошибок', () => {
    for (const language of ['ts', 'tsx'] as const) {
      const { container, unmount } = render(<CodeEditor value="const a: number = <b />" onChange={vi.fn()} onRun={vi.fn()} label="Решение" language={language} />)
      expect(viewOf(container).state.doc.toString()).toBe('const a: number = <b />')
      unmount()
    }
  })
})
