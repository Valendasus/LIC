import { afterEach, describe, expect, it, vi } from 'vitest'

const original = { url: process.env.DATABASE_URL, env: process.env.NODE_ENV }

afterEach(() => {
  process.env.DATABASE_URL = original.url
  vi.stubEnv('NODE_ENV', original.env)
  delete (globalThis as { prisma?: unknown }).prisma
  vi.resetModules()
})

describe('подключение к базе', () => {
  it('без DATABASE_URL — понятная ошибка', async () => {
    delete process.env.DATABASE_URL
    delete (globalThis as { prisma?: unknown }).prisma
    vi.resetModules()
    await expect(import('@/lib/db')).rejects.toThrow('Не задан DATABASE_URL')
  })

  it('в разработке клиент один на процесс', async () => {
    delete (globalThis as { prisma?: unknown }).prisma
    vi.resetModules()
    const first = (await import('@/lib/db')).db
    vi.resetModules()
    const second = (await import('@/lib/db')).db
    expect(second).toBe(first)
  })

  it('в продакшене клиент не кладётся в глобальный объект', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete (globalThis as { prisma?: unknown }).prisma
    vi.resetModules()
    await import('@/lib/db')
    expect((globalThis as { prisma?: unknown }).prisma).toBeUndefined()
  })
})
