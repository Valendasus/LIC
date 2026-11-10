'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/entities/user/server'
import { db } from '@/shared/api/db'
import { PACE_OPTIONS } from '../model/pace'

export interface PaceState {
  value?: number
  error?: string
}

/** Сохраняет темп. Серверная функция доступна по сети — значение проверяется заново. */
export async function setPace(_previous: PaceState, form: FormData): Promise<PaceState> {
  const value = Number(form.get('value'))
  if (!PACE_OPTIONS.some((option) => option.value === value)) return { error: 'Такого темпа нет' }
  const user = await getCurrentUser()
  await db.user.update({ where: { id: user.id }, data: { newPerDay: value } })
  // Число новых на сегодня меняется на всех экранах: в навигации, на «Сегодня», в курсе.
  revalidatePath('/', 'layout')
  return { value }
}
