'use client'

import { ArrowRight, Check } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/shared/lib'

export interface Step {
  id: string
  /** «Learn» */
  title: string
  /** Пояснение к названию: «понять». */
  hint: string
  /** Статус словами: «Пройдено», «Решено 2 задачи из 4». */
  status: string
  state: 'done' | 'progress' | 'todo'
  /** Доля от 0 до 1 для полоски шага. */
  progress: number
  content: ReactNode
  /** Оглавление шага: заголовки разделов. */
  toc?: { id: string; title: string }[]
}

/**
 * Шаги как вкладки (шаблон Tabs из WAI-ARIA APG): кружок со статусом, название с пояснением, статус словами, полоска.
 * Выбранный шаг — в адресе (#implement), поэтому ссылка ведёт сразу на нужный шаг. Внизу шага — следующее действие.
 */
export function StepTabs({ steps, label, finalAction }: { steps: Step[]; label: string; finalAction?: ReactNode }) {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const id = useId()

  // Шаг из адреса читается после монтирования: на сервере адреса с # нет, и разметка должна совпасть.
  useEffect(() => {
    const fromHash = steps.findIndex((step) => `#${step.id}` === window.location.hash)
    if (fromHash >= 0) setActive(fromHash)
  }, [steps])

  function select(index: number, focus = false) {
    setActive(index)
    window.history.replaceState(null, '', `#${steps[index].id}`)
    if (focus) refs.current[index]!.focus()
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const last = steps.length - 1
    const next = { ArrowRight: active === last ? 0 : active + 1, ArrowLeft: active === 0 ? last : active - 1, Home: 0, End: last }[event.key]
    if (next === undefined) return
    event.preventDefault()
    select(next, true)
  }

  const step = steps[active]
  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {steps.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => {
              refs.current[index] = element
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${item.id}`}
            aria-controls={`${id}-panel`}
            aria-selected={index === active}
            tabIndex={index === active ? 0 : -1}
            onClick={() => select(index)}
            className={cn(
              'flex flex-col gap-2.5 rounded-[18px] border px-2 py-3 text-left transition-colors duration-150 sm:gap-3 sm:px-5 sm:py-3.5',
              index === active ? 'border-line bg-surface' : 'border-transparent hover:bg-surface/60',
            )}
          >
            <span className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-3 sm:text-left">
              <span
                aria-hidden
                className={cn(
                  'flex size-7 shrink-0 sm:size-8 items-center justify-center rounded-full font-mono text-sm font-semibold',
                  item.state === 'done' ? 'bg-good text-on-primary' : item.state === 'progress' ? 'border-2 border-accent text-accent' : 'border-2 border-line-strong text-muted',
                )}
              >
                {item.state === 'done' ? <Check size={16} strokeWidth={2.75} /> : index + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">
                  {item.title} <span className="hidden font-normal text-muted sm:inline">· {item.hint}</span>
                </span>
                <span className={cn('text-xs sm:text-[13px]', item.state === 'done' ? 'text-good' : item.state === 'progress' ? 'text-accent' : 'text-muted')}>{item.status}</span>
              </span>
            </span>
            <span aria-hidden className="flex h-1 overflow-hidden rounded-full bg-raised">
              <span className={cn('rounded-full', item.state === 'done' ? 'bg-good' : 'bg-accent')} style={{ width: `${Math.round(item.progress * 100)}%` }} />
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-12">
        <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${step.id}`} tabIndex={0} className="min-w-0 flex-1 animate-[rise_200ms_ease-out] focus-visible:outline-none" key={step.id}>
          {step.content}
          <div className="mt-12 flex flex-wrap items-center justify-end gap-4 border-t border-surface pt-6">
            {active < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  select(active + 1, true)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="inline-flex h-11 items-center gap-2.5 rounded-full bg-primary px-5 font-semibold text-on-primary transition-colors duration-150 hover:bg-ink-300"
              >
                Дальше: {steps[active + 1].title}
                <ArrowRight aria-hidden size={17} />
              </button>
            ) : (
              finalAction
            )}
          </div>
        </div>

        {step.toc && step.toc.length > 1 && (
          <nav aria-label="На странице" className="sticky top-10 hidden w-52 shrink-0 self-start 2xl:block">
            <p className="mb-3 text-[11px] font-medium tracking-[0.08em] text-subtle uppercase">На странице</p>
            <ul className="flex flex-col gap-2 border-l border-surface text-[13px]">
              {step.toc.map((entry) => (
                <li key={entry.id}>
                  <a href={`#${entry.id}`} className="-ml-px block border-l border-transparent pl-3 text-muted hover:border-accent hover:text-fg">
                    {entry.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  )
}
