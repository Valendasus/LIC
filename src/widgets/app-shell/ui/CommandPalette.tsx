'use client'

import { CornerDownLeft, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/shared/lib'
import { Kbd } from '@/shared/ui'
import { searchEntries, type SearchEntry } from '../model/nav'

/** Событие, которым кнопки поиска открывают палитру. */
export const OPEN_SEARCH_EVENT = 'lic:open-search'

/** Кнопка поиска: в боковой панели — с подписью и ⌘K, в верхней строке телефона — иконкой. */
export function SearchButton({ compact = false }: { compact?: boolean }) {
  const open = () => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))
  if (compact) {
    return (
      <button type="button" onClick={open} aria-label="Поиск" className="inline-flex size-11 items-center justify-center rounded-xl bg-surface text-muted hover:text-fg">
        <Search aria-hidden size={20} strokeWidth={1.75} />
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Поиск"
      className="flex h-11 w-full items-center gap-3 rounded-xl border border-surface px-3 text-muted transition-colors duration-150 hover:border-line hover:text-fg lg:justify-center xl:justify-start"
    >
      <Search aria-hidden size={19} strokeWidth={1.75} />
      <span aria-hidden className="flex-1 text-left lg:hidden xl:inline">
        Поиск
      </span>
      <Kbd className="lg:hidden xl:inline-flex">⌘K</Kbd>
    </button>
  )
}

/**
 * Палитра команд по ⌘K / Ctrl+K: темы, блоки, команды. Стрелки выбирают, Enter открывает, Esc закрывает.
 * Шаблон combobox из WAI-ARIA APG: фокус остаётся в поле, выбранный пункт — aria-activedescendant.
 */
export function CommandPalette({ entries }: { entries: SearchEntry[] }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const id = useId()
  const results = searchEntries(entries, query)

  useEffect(() => {
    const show = () => setOpen(true)
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    window.addEventListener(OPEN_SEARCH_EVENT, show)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, show)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (open) input.current!.focus()
  }, [open])

  if (!open) return null

  function close() {
    setOpen(false)
    setQuery('')
    setActive(0)
  }

  function go(entry: SearchEntry) {
    close()
    router.push(entry.href)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const count = results.length
    if (event.key === 'Escape') close()
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault()
      setActive((value) => (value + 1) % count)
    }
    if (event.key === 'ArrowUp' && count) {
      event.preventDefault()
      setActive((value) => (value - 1 + count) % count)
    }
    if (event.key === 'Enter' && results[active]) go(results[active])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink-900/70 px-4 pt-[12vh]" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label="Поиск" className="w-full max-w-xl animate-[rise_200ms_ease-out] overflow-hidden rounded-panel border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search aria-hidden size={18} className="text-muted" />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={results[active] ? `${id}-${active}` : undefined}
            aria-label="Найти тему или команду"
            placeholder="Тема, блок или команда"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-subtle focus-visible:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul id={`${id}-list`} role="listbox" aria-label="Результаты" className="max-h-[50vh] overflow-y-auto p-2">
          {results.map((entry, index) => (
            <li
              key={entry.href + entry.title}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => go(entry)}
              className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5', index === active && 'bg-raised')}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{entry.title}</span>
                <span className="truncate text-xs text-muted">{entry.context}</span>
              </span>
              {index === active && <CornerDownLeft aria-hidden size={16} className="text-muted" />}
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-6 text-center text-muted">Ничего не нашлось. Попробуйте другое слово.</li>}
        </ul>
      </div>
    </div>
  )
}
