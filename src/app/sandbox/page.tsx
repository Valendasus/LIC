import type { Metadata } from 'next'
import { SandboxRuntime } from '@/components/sandbox/SandboxRuntime'

export const metadata: Metadata = { title: 'Песочница', robots: { index: false } }

/**
 * Песочница React-задач. Открывается в iframe на странице задачи: каждый запуск — новый iframe,
 * поэтому DOM, стили и состояние прошлого запуска не влияют на следующий.
 */
export default function SandboxPage() {
  return <SandboxRuntime />
}
