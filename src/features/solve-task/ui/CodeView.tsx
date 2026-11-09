'use client'

import { useEffect, useState } from 'react'
import { revealSolution, type SolutionResult } from '../api/actions'
import { ArrowRight } from 'lucide-react'
import { cn, count } from '@/shared/lib'
import { Badge, Button, CodeBlock, RichText, SegmentBar } from '@/shared/ui'
import { isSolved, type RunResult } from '../lib/code-runner'
import type { CodeItem } from '@/entities/practice-item'
import { LEVEL_LABEL } from '@/entities/practice-item'
import type { Grade } from '@/entities/schedule'
import { CodeEditor } from './CodeEditor'
import { checkTypesInWorker, compileReactInWorker } from '../lib/compiler'
import { runInWorker } from '../lib/run'
import { useSandbox } from '../model/useSandbox'
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
  /** «Сдаться» сначала переспрашивает: открытое решение вернёт задачу на повторение скоро. */
  const [confirming, setConfirming] = useState(false)
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
  const failedTests = result?.tests.filter((test) => !test.passed) ?? []
  const passedTests = result?.tests.filter((test) => test.passed) ?? []

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm text-muted">{TASK_LABEL[item.kind]} · {LEVEL_LABEL[item.level]}</span>
        <h2 className="text-xl font-semibold">{item.title}</h2>
        <Badge>{status}</Badge>
        {code !== item.starter && !finished && (
          <span className="ml-auto inline-flex items-center gap-2 text-[13px] text-muted">
            <span aria-hidden className="size-1.5 rounded-full bg-good" />
            Черновик сохранён
          </span>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-label="Условие" className="flex flex-col gap-5 rounded-panel bg-surface p-6">
          <RichText text={item.prompt} className="text-[15px] leading-relaxed" />

          {item.hints.length > 0 && !finished && (
            <div className="flex flex-col gap-3 rounded-card bg-bg p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Подсказки</span>
                <span className="flex gap-1" aria-label={`Открыто ${hints} из ${item.hints.length}`}>
                  {item.hints.map((_, index) => (
                    <span key={index} aria-hidden className={cn('h-1 w-4 rounded-full', index < hints ? 'bg-accent' : 'bg-raised')} />
                  ))}
                </span>
              </div>
              {hints > 0 && (
                <ol className="flex flex-col gap-2" aria-label="Подсказки">
                  {item.hints.slice(0, hints).map((hint, index) => (
                    <li key={index} className="rounded-[10px] bg-surface px-3.5 py-2.5 text-sm">
                      <span className="mr-2 font-semibold text-accent">Подсказка {index + 1}.</span>
                      <RichText text={hint} className="inline" />
                    </li>
                  ))}
                </ol>
              )}
              {hints < item.hints.length && (
                <Button variant="outline" size="sm" onClick={() => setHints((value) => value + 1)} className="self-start">
                  Подсказка {hints + 1} из {item.hints.length}
                </Button>
              )}
              <p className="text-xs text-muted">Подсказки не наказывают: с двумя и больше задача просто вернётся на повторение раньше.</p>
            </div>
          )}

          {finished && (
            <div className="flex animate-[rise_300ms_ease-out] flex-col gap-4">
              <div className={cn('rounded-card px-4 py-3', solved && !gaveUp ? 'bg-good-soft' : 'bg-warn-soft')}>
                <p className={cn('font-semibold', solved && !gaveUp ? 'text-good' : 'text-warn')}>{solved && !gaveUp ? 'Решено' : 'Решение открыто'}</p>
                <p className="text-sm text-muted">{GRADE_NOTE[grade]}</p>
              </div>
              {reference && (
                <>
                  <RichText text={reference.explain} className="text-[15px] leading-relaxed" />
                  <details open={gaveUp} className="rounded-card bg-bg px-4 py-3">
                    <summary className="cursor-pointer text-sm font-medium">Эталонное решение</summary>
                    <div className="mt-3">
                      <CodeBlock code={reference.solution} />
                    </div>
                  </details>
                </>
              )}
            </div>
          )}
        </section>

        <section aria-label="Решение" className="flex min-w-0 flex-col gap-3">
          <CodeEditor value={code} onChange={edit} onRun={run} label={`Решение задачи «${item.title}»`} language={LANGUAGE[item.kind]} />

          {result && (
            <div className="flex flex-col gap-3 rounded-panel bg-surface p-5" role="status" aria-label="Результат запуска">
              {result.status === 'ok' ? (
                <div className="flex flex-wrap items-center gap-3">
                  <SegmentBar segments={result.tests.map((test) => (test.passed ? 'good' : 'bad'))} label="Тесты" className="w-32" />
                  <p className={cn('font-semibold', passed === result.tests.length ? 'text-good' : 'text-bad')}>
                    Тесты: {passed} из {result.tests.length}
                  </p>
                </div>
              ) : (
                <p className="rounded-card bg-bad-soft px-3 py-2 text-sm text-bad">
                  {result.status === 'timeout' ? 'Остановлено по времени. ' : 'Код не запустился. '}
                  {result.error}
                </p>
              )}
              {failedTests.length > 0 && (
                <ul className="flex flex-col gap-2 text-sm">
                  {failedTests.map((test, index) => (
                    <li key={index} data-test-result="fail" className="flex gap-3 rounded-card bg-bad-soft px-3.5 py-2.5">
                      <span aria-hidden className="font-semibold text-bad">✗</span>
                      <span className="min-w-0">
                        {test.name}
                        <span className="block font-mono text-xs break-words whitespace-pre-wrap text-bad">{test.error}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {passedTests.length > 0 && (
                <details open={failedTests.length === 0 && passedTests.length <= 3}>
                  <summary className="cursor-pointer text-sm text-muted">
                    <span aria-hidden className="text-good">✓</span> {count(passedTests.length, ['тест пройден', 'теста пройдено', 'тестов пройдено'])}
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {passedTests.map((test, index) => (
                      <li key={index} data-test-result="pass" className="flex gap-3 px-3.5">
                        <span aria-hidden className="text-good">✓</span>
                        {test.name}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {result.logs.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-muted">Вывод console.log</p>
                  <CodeBlock code={result.logs.join('\n')} />
                </div>
              )}
            </div>
          )}

          {item.kind === 'react' && (
            <section className="flex flex-col gap-2" aria-label="Предпросмотр">
              <p className="text-xs text-muted">{sandbox.frame ? 'Предпросмотр — с компонентом можно взаимодействовать' : 'Предпросмотр появится после запуска тестов'}</p>
              {sandbox.frame}
            </section>
          )}
        </section>
      </div>

      {error && (
        <p role="alert" className="rounded-card bg-bad-soft px-4 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      <footer className="flex flex-wrap items-center gap-3 border-t border-surface pt-4">
        <Button onClick={run} disabled={running} variant={finished ? 'secondary' : 'primary'} kbd="Ctrl/⌘+Enter">
          {running ? 'Проверяем…' : 'Запустить тесты'}
        </Button>
        {code !== item.starter && !finished && (
          <Button variant="ghost" onClick={() => edit(item.starter)}>
            Сбросить к заготовке
          </Button>
        )}
        <span className="flex-1" />
        {!finished &&
          (confirming ? (
            <span className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted">Задача вернётся на повторение скоро. Открыть решение?</span>
              <Button variant="danger" size="sm" onClick={giveUp}>
                Показать решение
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Не сейчас
              </Button>
            </span>
          ) : (
            <Button variant="outline" onClick={() => setConfirming(true)}>
              Сдаться и посмотреть решение
            </Button>
          ))}
        {finished && (
          <Button onClick={next} iconEnd={<ArrowRight aria-hidden size={17} />}>
            Дальше
            {!free && <span className="ml-2 text-xs font-normal text-ink-700">вернётся {intervals[grade]}</span>}
          </Button>
        )}
      </footer>
    </div>
  )
}
