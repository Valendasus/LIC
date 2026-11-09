// @vitest-environment jsdom
// Эталоны всех React-задач курса проходят свои тесты, а заготовки — нет.
// content:check только собирает React-задачи: для тестов нужен DOM, он есть здесь (jsdom) и в e2e (браузер).
import * as dom from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import * as React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import ts from 'ts6'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { isSolved } from '@/lib/code-runner'
import { compileReact } from '@/lib/react-compile'
import { runReactTask } from '@/lib/react-runner'

interface RawTask {
  key: string
  kind: string
  tests: string
  starter: string
  solution: string
  preview?: string
}

function practiceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? practiceFiles(full) : entry.name.endsWith('.practice.yaml') ? [full] : []
  })
}

const root = path.join(process.cwd(), 'content')
const tasks = practiceFiles(root).flatMap((file) =>
  ((parse(readFileSync(file, 'utf8')) ?? []) as RawTask[]).filter((item) => item.kind === 'react').map((item) => ({ ...item, where: `${path.relative(root, file)}#${item.key}` })),
)

async function run(code: string, task: RawTask) {
  const compiled = compileReact(ts, code, task.tests, task.preview)
  expect(compiled.error).toBeUndefined()
  return runReactTask(compiled.code!, { React, createRoot, flushSync, dom, userEvent })
}

describe('React-задачи курса', () => {
  it('задачи есть', () => {
    expect(tasks.length).toBeGreaterThan(0)
  })

  for (const task of tasks) {
    it(`${task.where}: эталон проходит, заготовка — нет, предпросмотр рисуется`, async () => {
      const reference = await run(task.solution, task)
      expect(reference.result.tests.filter((test) => !test.passed), task.where).toEqual([])
      expect(isSolved(reference.result)).toBe(true)
      if (task.preview) {
        // Как в песочнице: продакшен-путь без act, синхронный рендер.
        const container = document.createElement('div')
        const root = createRoot(container)
        flushSync(() => root.render(reference.preview!() as React.ReactElement))
        expect(container.childElementCount).toBeGreaterThan(0)
        root.unmount()
      }
      expect(isSolved((await run(task.starter, task)).result)).toBe(false)
    })
  }
})
