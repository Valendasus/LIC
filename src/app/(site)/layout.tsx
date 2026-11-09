import Link from 'next/link'
import { ReviewBadge } from '@/components/ReviewBadge'

/** Шапка и рамка страниц платформы. Песочница React-задач (/sandbox) живёт вне этой группы — без шапки. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/" className="flex items-baseline gap-2" aria-label="LIC — на главную">
            <span className="font-mono text-lg font-bold tracking-tight">LIC</span>
            <span className="hidden text-xs text-muted sm:inline">Learn → Implement → Confirm</span>
          </Link>
          <nav className="ml-auto flex gap-4 text-sm">
            <ReviewBadge />
            <Link href="/frontend" className="hover:text-accent">
              Frontend
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  )
}
