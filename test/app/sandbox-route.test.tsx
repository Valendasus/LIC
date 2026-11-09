import { describe, expect, it } from 'vitest'
import SandboxPage, { metadata } from '@/app/sandbox/page'
import { dynamic, GET } from '@/app/ts-lib/route'
import { SandboxRuntime } from '@/features/solve-task/ui/SandboxRuntime'

describe('песочница и библиотека TypeScript', () => {
  it('страница песочницы — только среда выполнения, без индексации', () => {
    expect(SandboxPage().type).toBe(SandboxRuntime)
    expect(metadata).toEqual({ title: 'Песочница', robots: { index: false } })
  })

  it('файлы библиотеки отдаются одним статическим JSON с кешированием', async () => {
    expect(dynamic).toBe('force-static')
    const response = GET()
    expect(response.headers.get('cache-control')).toBe('public, max-age=86400')
    const libs = (await response.json()) as Record<string, string>
    expect(Object.keys(libs)).toEqual(expect.arrayContaining(['lib.es2023.d.ts', 'lib.es5.d.ts', 'lib.dom.d.ts']))
    expect(libs['lib.es5.d.ts']).toContain('interface Array<T>')
  })
})
