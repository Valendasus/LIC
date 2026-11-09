import type { RunResult } from '../lib/code-runner'

/** Сообщения между страницей задачи и песочницей. */
export type SandboxMessage =
  | { type: 'lic-sandbox-ready' }
  | { type: 'lic-sandbox-run'; id: number; code: string }
  | { type: 'lic-sandbox-result'; id: number; result: RunResult }
