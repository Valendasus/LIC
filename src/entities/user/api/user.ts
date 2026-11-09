import { connection } from 'next/server'
import { cache } from 'react'
import { db } from '@/shared/api/db'

/**
 * Пока платформа для одного человека, пользователь один — «me».
 * Всё остальное уже работает с userId, поэтому вход добавится заменой этой функции.
 */
export const getCurrentUser = cache(async () => {
  // Прогресс у каждого пользователя свой и меняется со временем:
  // такие страницы нельзя отрендерить заранее при сборке.
  await connection()
  return db.user.upsert({
    where: { handle: 'me' },
    update: {},
    create: { handle: 'me', name: 'Ученик' },
  })
})
