'use client'

import { useEffect, useRef, useState } from 'react'
import type { SandboxMessage } from '@/components/sandbox/protocol'
import type { RunResult } from '@/lib/code-runner'

/** Сколько ждать загрузку песочницы и тесты. Бесконечные циклы останавливает защита в собранном коде. */
export const SANDBOX_TIMEOUT_MS = 15_000

interface Pending {
  id: number
  code: string
  /** Код уже отправлен. Песочница может сообщить о готовности дважды (StrictMode в разработке) — второй раз не шлём. */
  sent: boolean
  resolve: (result: RunResult) => void
  timer: ReturnType<typeof setTimeout>
}

/**
 * Песочница React-задачи: iframe со страницей /sandbox. Каждый запуск создаёт новый iframe —
 * чистый DOM без следов прошлого решения. Результат тестов приходит сообщением, предпросмотр остаётся в iframe.
 */
export function useSandbox(timeoutMs = SANDBOX_TIMEOUT_MS) {
  const [generation, setGeneration] = useState(0)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const pending = useRef<Pending | null>(null)
  const nextId = useRef(0)

  useEffect(() => {
    function onMessage(event: MessageEvent<SandboxMessage>) {
      const job = pending.current
      if (!job || event.source !== frameRef.current?.contentWindow || event.origin !== window.location.origin) return
      if (event.data.type === 'lic-sandbox-ready' && !job.sent) {
        job.sent = true
        frameRef.current!.contentWindow!.postMessage({ type: 'lic-sandbox-run', id: job.id, code: job.code } satisfies SandboxMessage, window.location.origin)
      }
      if (event.data.type === 'lic-sandbox-result' && event.data.id === job.id) {
        clearTimeout(job.timer)
        pending.current = null
        job.resolve(event.data.result)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  function run(code: string) {
    return new Promise<RunResult>((resolve) => {
      const id = ++nextId.current
      const timer = setTimeout(() => {
        pending.current = null
        resolve({ status: 'timeout', tests: [], logs: [], error: `Песочница не ответила за ${timeoutMs / 1000} с.` })
      }, timeoutMs)
      pending.current = { id, code, sent: false, resolve, timer }
      setGeneration((value) => value + 1)
    })
  }

  const frame =
    generation > 0 ? (
      <iframe
        key={generation}
        ref={frameRef}
        src="/sandbox"
        title="Предпросмотр компонента"
        sandbox="allow-scripts allow-same-origin allow-forms"
        className="h-64 w-full resize-y rounded-lg border border-line bg-surface"
      />
    ) : null

  return { frame, run }
}
