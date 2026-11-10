import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getReviewCounts, getTopicPractice, getTopicStatuses, getTopicSteps } from '@/entities/review/server'
import { getProgressMap, rollup } from '@/entities/progress/server'
import { getCurrentUser } from '@/entities/user/server'
import { type TreeNode } from '@/entities/topic'
import { findNode, getTree, leavesOf } from '@/entities/topic/server'
import { BranchView } from './BranchView'
import { TopicView, type LessonModule } from './TopicView'

type Props = { params: Promise<{ specialty: string; path: string[] }> }

async function resolve(params: Props['params']) {
  const { specialty, path } = await params
  const tree = await getTree(specialty)
  return tree ? findNode(tree, path) : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await resolve(params)
  return { title: found?.node.title ?? 'Не найдено' }
}

/** Содержание листа: content/<специальность>/<путь>.mdx. Импорт по шаблону собирает все файлы темы. */
async function loadLesson(node: TreeNode) {
  const [specialty] = node.id.split('/')
  const lesson = await import(`@content/${specialty}/${node.path.join('/')}.mdx`)
  // meta обязателен: npm run content:check не пропустит тему без него.
  return { Lesson: lesson.default, meta: lesson.meta } as LessonModule
}

export async function NodePage({ params }: Props) {
  const found = await resolve(params)
  if (!found) notFound()
  const { node, trail } = found

  const user = await getCurrentUser()
  const progress = await getProgressMap(user.id)
  const isLeaf = node.children.length === 0

  if (!isLeaf) {
    const [statuses, counts] = await Promise.all([getTopicStatuses(user.id, trail[0].slug, leavesOf(node)), getReviewCounts(user.id, trail[0].slug, node.id)])
    return <BranchView node={node} trail={trail} stats={rollup(node, progress)} progress={progress} statuses={statuses} practice={{ total: counts.total, ready: counts.ready }} />
  }

  const tree = trail[0]
  const leaves = leavesOf(tree)
  const siblings = trail.at(-2)!.children
  const [lesson, steps, practice, statuses] = await Promise.all([
    node.content ? loadLesson(node) : null,
    getTopicSteps(user.id, node.id),
    getTopicPractice(user.id, node.id),
    getTopicStatuses(user.id, tree.slug, siblings),
  ])
  const next = leaves[leaves.findIndex((leaf) => leaf.id === node.id) + 1] ?? null

  return (
    <TopicView
      node={node}
      trail={trail}
      lesson={lesson}
      steps={steps}
      practice={practice}
      level={progress.get(node.id) ?? 0}
      siblings={siblings}
      statuses={statuses}
      next={next}
    />
  )
}
