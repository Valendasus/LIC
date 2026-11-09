'use client'

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { bracketMatching, HighlightStyle, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { EditorState, Prec } from '@codemirror/state'
import { drawSelection, EditorView, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { useEffect, useRef } from 'react'

/** Подсветка из палитры платформы: те же цвета, что в макетах и блоках кода. */
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword, tags.operatorKeyword], color: 'var(--color-accent)' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: 'var(--color-good)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--color-warn)' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--color-subtle)', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: 'var(--color-info)' },
  { tag: [tags.definition(tags.variableName), tags.propertyName], color: 'var(--color-fg)' },
])

const theme = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--color-bg)', color: 'var(--color-fg)', fontSize: '14px', borderRadius: 'var(--radius-card)' },
    '&.cm-focused': { outline: '2px solid var(--color-accent)', outlineOffset: '2px' },
    '.cm-content': { fontFamily: 'var(--font-mono)', padding: '14px 0', caretColor: 'var(--color-fg)', minHeight: '12rem', lineHeight: '1.75' },
    '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--color-subtle)', border: 'none', paddingLeft: '8px' },
    '.cm-activeLine': { backgroundColor: 'rgb(41 37 49 / 0.6)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--color-muted)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'var(--color-raised)' },
    '.cm-cursor': { borderLeftColor: 'var(--color-fg)' },
    '.cm-matchingBracket': { backgroundColor: 'var(--color-accent-soft)', outline: 'none' },
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
