'use client'

import { useActionState } from 'react'
import { cn } from '@/shared/lib'
import { setPace, type PaceState } from '../api/actions'
import { PACE_OPTIONS } from '../model/pace'

/** Выбор темпа: четыре варианта, выбранный отмечен. */
export function PaceForm({ value }: { value: number }) {
  const [state, action, pending] = useActionState<PaceState, FormData>(setPace, { value })
  const current = state.value ?? value
  return (
    <form action={action} className="flex flex-col gap-3">
      <div role="group" aria-label="Новых элементов в день" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PACE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="submit"
            name="value"
            value={option.value}
            disabled={pending}
            aria-pressed={current === option.value}
            className={cn(
              'flex flex-col items-start gap-0.5 rounded-card border px-4 py-3 text-left transition-colors duration-150 disabled:opacity-60',
              current === option.value ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong hover:bg-raised',
            )}
          >
            <span className="font-medium">{option.label}</span>
            <span className="text-xs text-muted">{option.hint}</span>
          </button>
        ))}
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      )}
    </form>
  )
}
