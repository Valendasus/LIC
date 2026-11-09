'use client'

import { useState, type ReactNode } from 'react'

/**
 * Лестница подсказок: ступени открываются по одной, решение — отдельной кнопкой.
 * В MDX: <Hints hints={["направление", "приём", "каркас"]}> решение в markdown </Hints>
 */
export function Hints({ hints, children }: { hints: string[]; children?: ReactNode }) {
  const [open, setOpen] = useState(0)
  const [showSolution, setShowSolution] = useState(false)

  return (
    <div className="not-prose mt-3 space-y-2">
      {hints.slice(0, open).map((hint, index) => (
        <p key={index} className="rounded-md bg-accent-soft px-3 py-2 text-sm">
          <span className="mr-1 font-semibold">Подсказка {index + 1}.</span>
          {hint}
        </p>
      ))}
      <div className="flex flex-wrap gap-2">
        {open < hints.length && (
          <button
            type="button"
            onClick={() => setOpen(open + 1)}
            className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent"
          >
            Подсказка {open + 1} из {hints.length}
          </button>
        )}
        {children && !showSolution && (
          <button
            type="button"
            onClick={() => setShowSolution(true)}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:border-warn"
          >
            Показать решение
          </button>
        )}
      </div>
      {showSolution && (
        <div className="lesson prose prose-sm max-w-none rounded-md border border-line px-4 py-3">{children}</div>
      )}
    </div>
  )
}
