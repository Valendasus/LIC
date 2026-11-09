import type { RunResult } from './code-runner'

/** Сколько ждать весь запуск. Дольше — почти наверняка бесконечный цикл. */
export const RUN_TIMEOUT_MS = 5000

/** Запускает решение с тестами в отдельном воркере. Каждый запуск — новый воркер, поэтому прошлый код не влияет на следующий. */
export function runInWorker(code: string, tests: string, timeoutMs = RUN_TIMEOUT_MS): Promise<RunResult> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./runner.worker.ts', import.meta.url), { type: 'module' })
    const finish = (result: RunResult) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(result)
    }
    const timer = setTimeout(
      () => finish({ status: 'timeout', tests: [], logs: [], error: `Код выполнялся дольше ${timeoutMs / 1000} с и был остановлен. Проверьте циклы и условия выхода из рекурсии.` }),
      timeoutMs,
    )
    worker.onmessage = (event: MessageEvent<RunResult>) => finish(event.data)
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault()
      finish({ status: 'error', tests: [], logs: [], error: event.message || 'Не удалось запустить проверку' })
    }
    worker.postMessage({ code, tests })
  })
}
