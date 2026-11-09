'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/shared/api/db'
import { MAX_LEVEL } from '@/entities/progress/server'
import { getCurrentUser } from '@/entities/user/server'
import { findNode, getTree } from '@/entities/topic/server'

export interface SetLevelState {
  error?: string
  level?: number
}

/**
 * Серверная функция доступна по сети, как обычный эндпоинт,
 * поэтому всё, что пришло с клиента, проверяется заново: существует ли лист и допустим ли уровень.
 */
export async function setLevel(_prev: SetLevelState, formData: FormData): Promise<SetLevelState> {
  const nodeId = String(formData.get('nodeId') ?? '')
  const level = Number(formData.get('level'))

  if (!Number.isInteger(level) || level < 0 || level > MAX_LEVEL) {
    return { error: 'Некорректный уровень' }
  }

  const [specialty, ...slugs] = nodeId.split('/')
  const tree = await getTree(specialty)
  const found = tree && findNode(tree, slugs)
  if (!found || found.node.children.length > 0) {
    return { error: 'Такой темы нет' }
  }

  const user = await getCurrentUser()
  await db.nodeProgress.upsert({
    where: { userId_nodeId: { userId: user.id, nodeId } },
    update: { level },
    create: { userId: user.id, nodeId, level },
  })

  revalidatePath('/', 'layout')
  return { level }
}
