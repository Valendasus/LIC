/// <reference lib="webworker" />
// Воркер компилятора TypeScript 6: проверка задач на типы и сборка React-задач.
// Живёт между запусками: загрузка компилятора и разбор стандартной библиотеки — самое долгое, это делается один раз.
import ts from 'ts6'
import { compileReact } from './react-compile'
import { checkTypes } from './type-checker'
import type { CompilerRequest, CompilerResponse } from './compiler'

declare const self: DedicatedWorkerGlobalScope

let libs: Promise<Record<string, string>> | null = null
const cache = new Map<string, ts.SourceFile>()

self.addEventListener('message', async (event: MessageEvent<CompilerRequest>) => {
  const request = event.data
  let response: CompilerResponse
  try {
    if (request.op === 'types') {
      libs ??= fetch('/ts-lib').then((answer) => answer.json())
      response = { id: request.id, op: 'types', result: checkTypes(ts, request.code, request.tests, await libs, cache) }
    } else {
      response = { id: request.id, op: 'react', result: compileReact(ts, request.code, request.tests, request.preview) }
    }
  } catch (error) {
    // Например, не загрузилась библиотека: следующий запуск попробует снова.
    libs = null
    response = { id: request.id, op: 'failed', error: String(error) }
  }
  self.postMessage(response)
})
