/**
 * Режим фокуса: сессия практики и задачи без навигации сайта — только задание.
 * Выход и прогресс показывает сам экран (FocusBar).
 */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-dvh">{children}</main>
}
