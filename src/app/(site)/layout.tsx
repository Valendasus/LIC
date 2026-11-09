import { AppShell } from '@/widgets/app-shell/server'

/** Страницы платформы — в каркасе с навигацией. Практика (/practice) — в режиме фокуса, без него. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
