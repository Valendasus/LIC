import type { Metadata } from 'next'
import { getCurrentUser } from '@/entities/user/server'
import { MotionToggle, PaceForm } from '@/features/settings'
import { Card } from '@/shared/ui'

export const metadata: Metadata = { title: 'Настройки' }

/** Настройки (docs/DESIGN.md, 4.10): темп новых элементов и движение. Только тёмная тема — выбора темы нет. */
export async function SettingsPage() {
  const user = await getCurrentUser()
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight">Настройки</h1>
      <Card className="flex flex-col gap-4 p-7">
        <div>
          <h2 className="text-lg font-semibold">Темп</h2>
          <p className="mt-1 text-sm text-muted">Сколько новых карточек и заданий можно начать за день. Повторения приходят по расписанию сверх этого числа.</p>
        </div>
        <PaceForm value={user.newPerDay} />
      </Card>
      <Card className="flex flex-col gap-4 p-7">
        <h2 className="text-lg font-semibold">Движение</h2>
        <MotionToggle />
      </Card>
    </div>
  )
}
