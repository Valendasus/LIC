'use client'

import { useEffect, useState } from 'react'
import { MOTION_KEY } from '../model/pace'

/** Хранилище браузера может быть недоступно (приватный режим) — тогда настройка просто не запоминается. */
function read() {
  try {
    return localStorage.getItem(MOTION_KEY) === '1'
  } catch {
    return false
  }
}

function apply(reduce: boolean) {
  if (reduce) document.documentElement.dataset.motion = 'reduce'
  else delete document.documentElement.dataset.motion
}

/** Применяет сохранённую настройку анимаций на любой странице. */
export function MotionPreference() {
  useEffect(() => apply(read()), [])
  return null
}

/** Переключатель «Уменьшить анимации». Системная настройка prefers-reduced-motion учитывается всегда. */
export function MotionToggle() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => setReduce(read()), [])

  function toggle() {
    const next = !reduce
    setReduce(next)
    apply(next)
    try {
      if (next) localStorage.setItem(MOTION_KEY, '1')
      else localStorage.removeItem(MOTION_KEY)
    } catch {
      // Без хранилища настройка действует до перезагрузки.
    }
  }

  return (
    <button type="button" role="switch" aria-checked={reduce} onClick={toggle} className="flex w-full items-center justify-between gap-4 rounded-card border border-line px-4 py-3 text-left hover:bg-raised">
      <span className="flex flex-col">
        <span className="font-medium">Уменьшить анимации</span>
        <span className="text-xs text-muted">Переворот карточек и появление панелей — без движения</span>
      </span>
      <span aria-hidden className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${reduce ? 'bg-accent' : 'bg-raised'}`}>
        <span className={`absolute top-1 size-4 rounded-full bg-fg transition-all ${reduce ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  )
}
