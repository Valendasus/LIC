'use client'

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { bracketMatching, HighlightStyle, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { EditorState, Prec } from '@codemirror/state'
import { drawSelection, EditorView, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { useEffect, useRef } from 'react'

/** Подсветка под тёмный фон — такой же, как у блоков кода на платформе. */
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword, tags.operatorKeyword], color: 'oklch(75% 0.15 300)' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: 'oklch(80% 0.13 140)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'oklch(80% 0.14 60)' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'oklch(65% 0.02 260)', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: 'oklch(80% 0.12 230)' },
  { tag: [tags.definition(tags.variableName)], color: 'oklch(90% 0.05 230)' },
  { tag: tags.propertyName, color: 'oklch(85% 0.08 200)' },
])

const theme = EditorView.theme(
  {
    '&': { backgroundColor: 'oklch(22% 0.02 260)', color: 'oklch(92% 0.01 260)', fontSize: '13px', borderRadius: '0.5rem' },
    '&.cm-focused': { outline: '2px solid var(--color-accent)', outlineOffset: '2px' },
    '.cm-content': { fontFamily: 'var(--font-mono)', padding: '12px 0', caretColor: 'oklch(92% 0.01 260)', minHeight: '12rem' },
    '.cm-gutters': { backgroundColor: 'transparent', color: 'oklch(55% 0.02 260)', border: 'none' },
    '.cm-activeLine': { backgroundColor: 'oklch(27% 0.02 260)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'oklch(80% 0.02 260)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'oklch(38% 0.06 260)' },
    '.cm-cursor': { borderLeftColor: 'oklch(92% 0.01 260)' },
  },
  { dark: true },
)

/**
 * Редактор кода на CodeMirror 6. Ctrl/⌘+Enter — запуск тестов.
 * Tab вставляет отступ; чтобы уйти из редактора с клавиатуры, нажмите Esc, затем Tab.
 */
export function CodeEditor({
  value,
  onChange,
  onRun,
  label,
  language = 'js',
}: {
  value: string
  onChange: (value: string) => void
  onRun: () => void
  label: string
  /** js — JavaScript, ts — TypeScript, tsx — TypeScript с JSX. */
  language?: 'js' | 'ts' | 'tsx'
}) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView>(null)
  // Обработчики меняются при каждом рендере, а редактор создаётся один раз: читаем их через ref.
  const handlers = useRef({ onChange, onRun })
  useEffect(() => {
    handlers.current = { onChange, onRun }
  })

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          indentUnit.of('  '),
          javascript({ typescript: language !== 'js', jsx: language === 'tsx' }),
          syntaxHighlighting(highlight),
          theme,
          Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => (handlers.current.onRun(), true) }])),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.contentAttributes.of({ 'aria-label': label }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) handlers.current.onChange(update.state.doc.toString())
          }),
        ],
      }),
    })
    view.current = editor
    return () => editor.destroy()
    // Редактор создаётся один раз; внешние изменения текста приходят через эффект ниже.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Текст поменяли снаружи (сброс к заготовке, восстановление черновика) — заменяем документ целиком.
  useEffect(() => {
    const editor = view.current!
    const current = editor.state.doc.toString()
    if (current !== value) editor.dispatch({ changes: { from: 0, to: current.length, insert: value } })
  }, [value])

  return <div ref={host} data-code-editor className="overflow-hidden rounded-lg" />
}
