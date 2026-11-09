'use client'

import * as dom from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { useEffect, useRef, useState } from 'react'
import { show } from '../lib/code-runner'
import { runReactTask } from '../lib/react-runner'
import type { SandboxMessage } from '../model/protocol'

/**
 * Выполняет собранную задачу по запросу родительской страницы и показывает предпросмотр.
 * Сообщения принимаются только от родителя с того же адреса.
 */
export function SandboxRuntime() {
  const previewRef = useRef<HTMLDivElement>(null)
  /** Корень предпросмотра создаётся один раз: повторный createRoot на том же элементе — ошибка. */
  const previewRoot = useRef<ReturnType<typeof createRoot>>(null)
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle')
  const [previewError, setPreviewError] = useState('')

  useEffect(() => {
    async function onMessage(event: MessageEvent<SandboxMessage>) {
      if (event.source !== window.parent || event.origin !== window.location.origin || event.data?.type !== 'lic-sandbox-run') return
      const { id, code } = event.data
      setState('running')
      const { result, preview } = await runReactTask(code, { React, createRoot, flushSync, dom, userEvent })
      // Предпросмотр рендерится отдельно от тестов: в свой корень, после того как тесты убрали за собой.
      if (preview) {
        previewRoot.current ??= createRoot(previewRef.current!, { onUncaughtError: (error) => setPreviewError(show(error)) })
        previewRoot.current.render(preview() as React.ReactNode)
      }
      setState('done')
      window.parent.postMessage({ type: 'lic-sandbox-result', id, result } satisfies SandboxMessage, window.location.origin)
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'lic-sandbox-ready' } satisfies SandboxMessage, window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <div className="p-4" data-sandbox={state}>
      {state === 'running' && <p className="text-sm text-muted">Выполняем тесты…</p>}
      {previewError && (
        <p role="alert" className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          Предпросмотр упал: {previewError}
        </p>
      )}
      <div ref={previewRef} id="preview" />
    </div>
  )
}
