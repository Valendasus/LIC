'use client'

import { BookOpen, ChartLine, RotateCcw, Sun } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/lib'
import { activeNav, NAV_ITEMS, type NavKey } from '../model/nav'

const ICONS: Record<NavKey, typeof Sun> = { today: Sun, course: BookOpen, practice: RotateCcw, progress: ChartLine }

/**
 * Пункты навигации. layout="side" — боковая панель (от 1280 px с подписями, от 1024 — только иконки),
 * layout="bottom" — нижняя панель на телефоне.
 */
export function NavLinks({ layout, practiceCount }: { layout: 'side' | 'bottom'; practiceCount: number }) {
  const active = activeNav(usePathname())
  const side = layout === 'side'
  return (
    <ul className={side ? 'flex flex-col gap-1' : 'grid grid-cols-4'}>
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.key]
        const isActive = active === item.key
        const count = item.key === 'practice' && practiceCount > 0 ? practiceCount : null
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={count ? `${item.label}, ждут ${count}` : undefined}
              className={cn(
                'relative flex items-center transition-colors duration-150',
                side ? 'h-11 gap-3 rounded-xl px-3 lg:justify-center xl:justify-start' : 'h-16 flex-col justify-center gap-1 text-[11px]',
                isActive ? 'text-fg' : 'text-muted hover:text-fg',
                side && (isActive ? 'bg-surface font-medium' : 'hover:bg-surface'),
              )}
            >
              <Icon aria-hidden size={side ? 19 : 22} strokeWidth={1.75} className={isActive ? 'text-accent' : undefined} />
              <span className={cn(side && 'flex-1 lg:sr-only xl:not-sr-only')}>{item.label}</span>
              {count && (
                <span
                  aria-hidden
                  className={cn(
                    'rounded-full bg-raised font-mono text-[11px] leading-5 text-fg tabular-nums',
                    side ? 'px-2 lg:absolute lg:top-0.5 lg:right-0.5 lg:px-1.5 xl:static xl:px-2' : 'absolute top-1.5 left-1/2 ml-2 px-1.5',
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
