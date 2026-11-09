'use client'

import { useActionState } from 'react'
import { setLevel, type SetLevelState } from '../api/actions'

const LEVELS = [
  { value: 1, label: 'Знаю', hint: 'Прочитал, узнаю термины' },
  { value: 2, label: 'Понимаю', hint: 'Объясняю своими словами' },
  { value: 3, label: 'Применяю', hint: 'Решаю задачи без подсказок' },
  { value: 4, label: 'Владею', hint: 'Применил в проекте, объясняю компромиссы' },
]

/** Отметка освоения темы. Повторный выбор того же уровня сбрасывает его. */
export function LevelPicker({ nodeId, level }: { nodeId: string; level: number }) {
  const [state, action, pending] = useActionState<SetLevelState, FormData>(setLevel, { level })
  const current = state.level ?? level

  return (
    <form action={action} className="rounded-panel bg-surface p-6">
      <input type="hidden" name="nodeId" value={nodeId} />
      <p className="font-semibold">Насколько вы освоили тему?</p>
      <p className="mt-1 mb-4 text-sm text-muted">Самооценка помогает платформе понять, что повторять. Повторный выбор снимает отметку.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LEVELS.map((item) => {
          const active = current === item.value
          return (
            <button
              key={item.value}
              type="submit"
              name="level"
              value={active ? 0 : item.value}
              disabled={pending}
              aria-pressed={active}
              title={item.hint}
              className={`rounded-card border px-4 py-3 text-left text-sm transition-colors duration-150 disabled:opacity-60 ${
                active ? 'border-good bg-good-soft' : 'border-line hover:border-line-strong hover:bg-raised'
              }`}
            >
              <span className="block font-medium">{item.label}</span>
              <span className="block text-xs text-muted">{item.hint}</span>
            </button>
          )
        })}
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-bad">
          {state.error}
        </p>
      )}
    </form>
  )
}
