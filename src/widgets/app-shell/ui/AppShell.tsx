import { Settings } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getReviewCounts } from '@/entities/review/server'
import { getSpecialties, getTree, type TreeNode } from '@/entities/topic/server'
import { getCurrentUser } from '@/entities/user/server'
import type { SearchEntry } from '../model/nav'
import { CommandPalette, SearchButton } from './CommandPalette'
import { NavLinks } from './NavLinks'

/** Все разделы и темы активных специальностей для поиска, плюс команды. */
export async function searchIndex(): Promise<SearchEntry[]> {
  const entries: SearchEntry[] = [
    { title: 'Начать повторение', href: '/practice', context: 'Команда', kind: 'command' },
    { title: 'Сегодня', href: '/', context: 'Команда', kind: 'command' },
    { title: 'Прогресс', href: '/progress', context: 'Команда', kind: 'command' },
    { title: 'Настройки', href: '/settings', context: 'Команда', kind: 'command' },
  ]
  for (const specialty of (await getSpecialties()).filter((item) => item.status === 'active')) {
    const tree = (await getTree(specialty.slug))!
    entries.push({ title: `Курс ${tree.title}`, href: `/${tree.id}`, context: 'Команда', kind: 'command' })
    const walk = (node: TreeNode, trail: string[]) => {
      for (const child of node.children) {
        entries.push({ title: child.title, href: `/${child.id}`, context: trail.join(' › '), kind: 'node' })
        walk(child, [...trail, child.title])
      }
    }
    walk(tree, [tree.title])
  }
  return entries
}

/**
 * Каркас страниц платформы: боковая панель на десктопе (от 1280 px с подписями, 1024–1279 — иконки),
 * верхняя строка и нижняя навигация на телефоне, поиск по ⌘K.
 */
export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  const [counts, entries] = await Promise.all([getReviewCounts(user.id, 'frontend'), searchIndex()])

  return (
    <div className="min-h-dvh lg:flex">
      <a href="#content" className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        К содержанию
      </a>
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col gap-8 border-r border-surface px-3 py-6 lg:flex lg:w-[76px] xl:w-60 xl:px-4">
        <Link href="/" aria-label="LIC — на «Сегодня»" className="flex flex-col gap-0.5 px-2 lg:items-center xl:items-start">
          <span className="font-mono text-xl font-semibold tracking-tight">LIC</span>
          <span className="hidden text-[11px] whitespace-nowrap text-muted xl:inline">Learn · Implement · Confirm</span>
        </Link>
        <nav aria-label="Основная навигация">
          <NavLinks layout="side" practiceCount={counts.ready} />
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <SearchButton />
          <Link href="/settings" className="flex h-11 items-center gap-3 rounded-xl px-3 text-muted transition-colors duration-150 hover:bg-surface hover:text-fg lg:justify-center xl:justify-start">
            <Settings aria-hidden size={19} strokeWidth={1.75} />
            <span className="lg:sr-only xl:not-sr-only">Настройки</span>
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between px-4 pt-4 lg:hidden">
          <Link href="/" aria-label="LIC — на «Сегодня»" className="font-mono text-lg font-semibold">
            LIC
          </Link>
          <SearchButton compact />
        </header>
        <main id="content" className="mx-auto w-full max-w-[1360px] px-4 pt-6 pb-28 sm:px-8 lg:px-12 lg:pt-10 lg:pb-16">
          {children}
        </main>
      </div>

      <nav aria-label="Нижняя навигация" className="fixed inset-x-0 bottom-0 z-40 border-t border-surface bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <NavLinks layout="bottom" practiceCount={counts.ready} />
      </nav>

      <CommandPalette entries={entries} />
    </div>
  )
}
