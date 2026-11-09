import { readFileSync } from 'node:fs'
import path from 'node:path'
import { collectLibs } from '@/features/solve-task/server'

/**
 * Файлы стандартной библиотеки TypeScript для проверки задач на типы в браузере.
 * Собирается при сборке в статический JSON: воркер загружает его один раз, дальше браузер берёт из кеша.
 */
export const dynamic = 'force-static'

const LIB_DIR = path.join(process.cwd(), 'node_modules', 'ts6', 'lib')

export function GET() {
  const libs = collectLibs((file) => readFileSync(path.join(LIB_DIR, file), 'utf8'))
  return Response.json(libs, { headers: { 'Cache-Control': 'public, max-age=86400' } })
}
