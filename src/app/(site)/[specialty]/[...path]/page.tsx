import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PracticePanel } from '@/components/practice/PracticePanel'
import { LevelPicker } from '@/components/LevelPicker'
import { Breadcrumbs, GradeBadge, GRADE_TEXT, NodeRow } from '@/components/ui'
import { getCurrentUser, getProgressMap, rollup } from '@/lib/progress'
import { findNode, getTree, type TreeNode } from '@/lib/tree'

type Props = { params: Promise<{ specialty: string; path: string[] }> }

interface LessonMeta {
  verified: string
  versions: string
}

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
  return { Lesson: lesson.default as React.ComponentType, meta: lesson.meta as LessonMeta }
}

export default async function NodePage({ params }: Props) {
  const found = await resolve(params)
  if (!found) notFound()
  const { node, trail } = found

  const user = await getCurrentUser()
  const progress = await getProgressMap(user.id)
  const isLeaf = node.children.length === 0

  if (!isLeaf) {
    const stats = rollup(node, progress)
    return (
      <div>
        <Breadcrumbs trail={trail} />
        <header className="mb-6">
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            {node.title} <GradeBadge grade={node.grade} />
          </h1>
          {node.summary && <p className="mt-2 max-w-3xl text-muted">{node.summary}</p>}
          <p className="mt-2 text-sm text-muted">
            {stats.leaves} тем · начато {stats.started}
          </p>
        </header>
        <div className="mb-6">
          <PracticePanel scope={node.id} />
        </div>
        <ul className="grid gap-2">
          {node.children.map((child) => (
            <NodeRow key={child.id} node={child} stats={rollup(child, progress)} level={progress.get(child.id)} />
          ))}
        </ul>
      </div>
    )
  }

  const lesson = node.content ? await loadLesson(node) : null

  return (
    <article className="mx-auto max-w-3xl">
      <Breadcrumbs trail={trail} />
      <header className="mb-6 space-y-3">
        <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight text-balance">
          {node.title} <GradeBadge grade={node.grade} />
        </h1>
        {node.grade && <p className="text-sm text-muted">{GRADE_TEXT[node.grade]}</p>}
        {lesson && (
          <p className="text-xs text-muted">
            Проверено {lesson.meta.verified} · {lesson.meta.versions}
          </p>
        )}
        {node.goals && (
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="mb-2 text-sm font-semibold">После темы вы сможете</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {node.goals.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <div className="mb-8">
        <PracticePanel scope={node.id} />
      </div>

      {lesson ? (
        <div className="lesson prose max-w-none prose-headings:scroll-mt-20 prose-pre:text-sm">
          <lesson.Lesson />
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-line p-6 text-muted">
          Тема ещё не наполнена. Она есть в плане курса и появится по мере работы над блоком.
        </p>
      )}

      <div className="mt-10">
        <LevelPicker nodeId={node.id} level={progress.get(node.id) ?? 0} />
      </div>
    </article>
  )
}
