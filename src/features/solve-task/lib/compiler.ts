import type { RunResult } from './code-runner'
import type { CompileResult } from './react-compile'

export type CompilerRequest =
  | { id: number; op: 'types'; code: string; tests: string }
  | { id: number; op: 'react'; code: string; tests: string; preview?: string }

export type CompilerResponse =
  | { id: number; op: 'types'; result: RunResult }
  | { id: number; op: 'react'; result: CompileResult }
  | { id: number; op: 'failed'; error: string }

/** Первый запуск загружает компилятор и библиотеку — даём больше времени, чем на обычный. */
export const COMPILER_TIMEOUT_MS = 20_000

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, (response: CompilerResponse) => void>()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./compiler.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<CompilerResponse>) => {
      pending.get(event.data.id)?.(event.data)
      pending.delete(event.data.id)
    }
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault()
      reset(event.message || 'Компилятор не загрузился')
    }
  }
  return worker
}

/** Останавливает воркер и завершает все ожидающие запросы ошибкой. Следующий запрос создаст новый воркер. */
function reset(error: string) {
  worker?.terminate()
  worker = null
  for (const [id, resolve] of pending) resolve({ id, op: 'failed', error })
  pending.clear()
}

/** Запрос без id: id выдаёт клиент. Omit по каждому варианту объединения отдельно. */
type Outgoing = CompilerRequest extends infer T ? (T extends unknown ? Omit<T, 'id'> : never) : never

function request(message: Outgoing, timeoutMs: number): Promise<CompilerResponse> {
  const id = ++nextId
  return new Promise((resolve) => {
    const timer = setTimeout(() => reset(`Компилятор не ответил за ${timeoutMs / 1000} с`), timeoutMs)
    pending.set(id, (response) => {
      clearTimeout(timer)
      resolve(response)
    })
    getWorker().postMessage({ ...message, id })
  })
}

const failed = (error: string): RunResult => ({ status: 'error', tests: [], logs: [], error })

/** Проверка задачи на типы в воркере компилятора. */
export async function checkTypesInWorker(code: string, tests: string, timeoutMs = COMPILER_TIMEOUT_MS): Promise<RunResult> {
  const response = await request({ op: 'types', code, tests }, timeoutMs)
  return response.op === 'types' ? response.result : failed((response as { error: string }).error)
}

/** Сборка React-задачи в воркере компилятора: TSX → JavaScript с защитой циклов. */
export async function compileReactInWorker(code: string, tests: string, preview?: string, timeoutMs = COMPILER_TIMEOUT_MS): Promise<CompileResult> {
  const response = await request({ op: 'react', code, tests, preview }, timeoutMs)
  return response.op === 'react' ? response.result : { error: (response as { error: string }).error }
}
