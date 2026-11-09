'use client'

import { useEffect, useState } from 'react'
import { revealSolution, type SolutionResult } from '../api/actions'
import { RichText } from '@/shared/ui'
import { isSolved, type RunResult } from '../lib/code-runner'
import type { CodeItem } from '@/entities/practice-item'
import { LEVEL_LABEL } from '@/entities/practice-item'
import type { Grade } from '@/entities/schedule'
import { CodeEditor } from './CodeEditor'
import { checkTypesInWorker, compileReactInWorker } from '../lib/compiler'
import { runInWorker } from '../lib/run'
import { useSandbox } from '../model/useSandbox'
import { CodeBlock, Panel } from '@/shared/ui'
import type { ViewProps } from '@/entities/practice-item'

const TASK_LABEL: Record<CodeItem['kind'], string> = { code: 'Задача', types: 'Задача на типы', react: 'React-задача' }
const LANGUAGE: Record<CodeItem['kind'], 'js' | 'ts' | 'tsx'> = { code: 'js', types: 'ts', react: 'tsx' }

const draftKey = (id: string) => `lic:draft:${id}`

/** Черновик хранится только в этом браузере. Хранилище может быть недоступно (приватный режим) — тогда просто без черновика. */
function readDraft(id: string) {
  try {
    return localStorage.getItem(draftKey(id))
  } catch {
    return null
  }
}

function writeDraft(id: string, code: string | null) {
  try {
    if (code === null) localStorage.removeItem(draftKey(id))
    else localStorage.setItem(draftKey(id), code)
  } catch {
    // Без черновика тренажёр работает так же.
  }
}

/**
 * Автооценка задачи (TRAINERS.md, раздел 1.2):
 * открыто решение → «Снова»; решено с 2+ подсказками или не с первого запуска → «Трудно»; иначе «Хорошо».
 */
export function codeGrade({ gaveUp, hints, failedRuns }: { gaveUp: boolean; hints: number; failedRuns: number }): Grade {
  if (gaveUp) return 1
  return hints >= 2 || failedRuns > 0 ? 2 : 3
}

const GRADE_NOTE: Record<Grade, string> = {
  1: 'решение открыто — задача вернётся скоро',
  2: 'с подсказками или не с первого запуска — вернётся раньше обычного',
  3: 'с первого запуска',
  4: '',
}

/**
 * Задача с редактором: условие, тесты, лестница подсказок, эталон после решения.
 * code — тесты в воркере; types — компилятор TypeScript в воркере; react — сборка в воркере и тесты в iframe-песочнице.
 */
export function CodeView({ item, intervals, free, onGrade, status }: ViewProps<CodeItem> & { status: string }) {
  const [code, setCode] = useState(item.starter)
  const [result, setResult] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [failedRuns, setFailedRuns] = useState(0)
  const [hints, setHints] = useState(0)
  const [solved, setSolved] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)
  const [reference, setReference] = useState<{ solution: string; explain: string } | null>(null)
  const [error, setError] = useState('')
  const sandbox = useSandbox()

  // Черновик читаем после монтирования: на сервере localStorage нет, и разметка должна совпасть.
  useEffect(() => {
    const draft = readDraft(item.id)
    if (draft !== null) setCode(draft)
  }, [item.id])

  function edit(next: string) {
    setCode(next)
    writeDraft(item.id, next === item.starter ? null : next)
  }

  async function loadReference() {
    const answer: SolutionResult = await revealSolution(item.id).catch(() => ({ error: 'нет связи с сервером' }))
    if (answer.solution !== undefined) setReference({ solution: answer.solution, explain: answer.explain! })
    else setError(`Не удалось загрузить решение: ${answer.error}`)
  }

  async function execute(source: string): Promise<RunResult> {
    if (item.kind === 'code') return runInWorker(source, item.tests)
    if (item.kind === 'types') return checkTypesInWorker(source, item.tests)
    const compiled = await compileReactInWorker(source, item.tests, item.preview)
    if (compiled.code === undefined) return { status: 'error', tests: [], logs: [], error: compiled.error }
    return sandbox.run(compiled.code)
  }

  async function run() {
    if (running) return
    setRunning(true)
    const outcome = await execute(code)
    setRunning(false)
    setResult(outcome)
    if (isSolved(outcome)) {
      if (!solved) {
        setSolved(true)
        if (!reference) await loadReference()
      }
    } else if (!solved) {
      setFailedRuns((value) => value + 1)
    }
  }

  async function giveUp() {
    // Кнопка видна, только пока задача не завершена, — значит, эталон ещё не загружен.
    setGaveUp(true)
    await loadReference()
  }

  function next() {
    writeDraft(item.id, null)
    onGrade(codeGrade({ gaveUp, hints, failedRuns }))
  }

  const finished = solved || gaveUp
  const grade = codeGrade({ gaveUp, hints, failedRuns })
  const passed = result?.tests.filter((test) => test.passed).length ?? 0

  return (
    <Panel label={`${TASK_LABEL[item.kind]} · ${LEVEL_LABEL[item.level]}`} status={status}>
      <h2 className="mb-2 text-lg font-semibold">{item.title}</h2>
      <RichText text={item.prompt} className="mb-4 text-[15px]" />

      <CodeEditor value={code} onChange={edit} onRun={run} label={`Решение задачи «${item.title}»`} language={LANGUAGE[item.kind]} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={run} disabled={running} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface disabled:opacity-60">
          {running ? 'Проверяем…' : 'Запустить тесты'}
          <span className="ml-2 font-mono text-xs opacity-80">Ctrl/⌘+Enter</span>
        </button>
        {hints < item.hints.length && !finished && (
          <button type="button" onClick={() => setHints((value) => value + 1)} className="rounded-lg border border-line px-3 py-2 text-sm hover:border-accent">
            Подсказка {hints + 1} из {item.hints.length}
          </button>
        )}
        {code !== item.starter && !finished && (
          <button type="button" onClick={() => edit(item.starter)} className="rounded-lg px-3 py-2 text-sm text-muted hover:text-accent">
            Сбросить к заготовке
          </button>
        )}
        {!finished && (
          <button type="button" onClick={giveUp} className="ml-auto rounded-lg px-3 py-2 text-sm text-muted hover:text-warn">
            Показать решение
          </button>
        )}
      </div>

      {hints > 0 && (
        <ol className="mt-4 space-y-2" aria-label="Подсказки">
          {item.hints.slice(0, hints).map((hint, index) => (
            <li key={index} className="rounded-md bg-accent-soft px-3 py-2 text-sm">
              <span className="mr-2 font-semibold">Подсказка {index + 1}.</span>
              <RichText text={hint} className="inline" />
            </li>
          ))}
        </ol>
      )}

      {result && (
        <div className="mt-4 space-y-2" role="status" aria-label="Результат запуска">
          {result.status === 'ok' ? (
            <p className={`font-semibold ${passed === result.tests.length ? 'text-good' : 'text-warn'}`}>
              Тесты: {passed} из {result.tests.length}
            </p>
          ) : (
            <p className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
              {result.status === 'timeout' ? 'Остановлено по времени. ' : 'Код не запустился. '}
              {result.error}
            </p>
          )}
          {result.tests.length > 0 && (
            <ul className="space-y-1 text-sm">
              {result.tests.map((test, index) => (
                <li key={index} data-test-result={test.passed ? 'pass' : 'fail'} className="flex gap-2">
                  <span aria-hidden className={test.passed ? 'text-good' : 'text-warn'}>
                    {test.passed ? '✓' : '✗'}
                  </span>
                  <span>
                    {test.name}
                    {test.error && <span className="block font-mono text-xs text-warn">{test.error}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {result.logs.length > 0 && (
            <div>
              <p className="text-xs text-muted">Вывод console.log</p>
              <CodeBlock code={result.logs.join('\n')} />
            </div>
          )}
        </div>
      )}

      {item.kind === 'react' && (
        <section className="mt-4" aria-label="Предпросмотр">
          <p className="mb-1 text-xs text-muted">{sandbox.frame ? 'Предпросмотр — с компонентом можно взаимодействовать' : 'Предпросмотр появится после запуска тестов'}</p>
          {sandbox.frame}
        </section>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          {error}
        </p>
      )}

      {finished && (
        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <div className={`rounded-lg px-4 py-3 ${solved && !gaveUp ? 'bg-good-soft' : 'bg-warn-soft'}`}>
            <p className={`font-semibold ${solved && !gaveUp ? 'text-good' : 'text-warn'}`}>{solved && !gaveUp ? 'Решено' : 'Решение открыто'}</p>
            <p className="text-sm text-muted">{GRADE_NOTE[grade]}</p>
          </div>
          {reference && (
            <>
              <details open={gaveUp}>
                <summary className="cursor-pointer text-sm font-medium">Эталонное решение</summary>
                <div className="mt-2">
                  <CodeBlock code={reference.solution} />
                </div>
              </details>
              <RichText text={reference.explain} className="text-sm" />
            </>
          )}
          <button type="button" onClick={next} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface">
            Дальше
            {!free && <span className="ml-2 font-mono text-xs opacity-80">{intervals[grade]}</span>}
          </button>
        </div>
      )}
    </Panel>
  )
}
