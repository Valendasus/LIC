/// <reference lib="webworker" />
// Воркер тренажёра задач на код: выполняет решение и тесты вне основного потока.
// Бесконечный цикл в решении блокирует только воркер — страница его останавливает по таймеру.
import { runCode } from '@/lib/code-runner'

declare const self: DedicatedWorkerGlobalScope

// Решение может оставить отклонённый промис без обработчика — это ошибка решения, а не воркера.
self.addEventListener('unhandledrejection', (event) => event.preventDefault())

self.addEventListener('message', async (event: MessageEvent<{ code: string; tests: string }>) => {
  self.postMessage(await runCode(event.data.code, event.data.tests))
})
