import Link from 'next/link'
import { levelName, type Rollup } from '@/entities/progress/@x/topic'
import { ProgressBar } from '@/shared/ui'
import { hrefOf, type TreeNode } from '../api/tree'
import { GradeBadge } from './GradeBadge'

/** Строка дочернего узла в списке: название, уровень, прогресс. */
export function NodeRow({ node, stats, level }: { node: TreeNode; stats: Rollup; level?: number }) {
  const isLeaf = node.children.length === 0
  const filled = isLeaf ? node.content : undefined
  return (
    <li>
      <Link
        href={hrefOf(node)}
        className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-surface px-4 py-3 hover:border-accent sm:grid-cols-[1fr_10rem]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <GradeBadge grade={node.grade} />
          <span className="truncate font-medium">{node.title}</span>
          {isLeaf && !filled && <span className="shrink-0 text-xs text-muted">скоро</span>}
        </span>
        {isLeaf ? (
          <span className="text-right text-xs text-muted">{levelName(level ?? 0)}</span>
        ) : (
          <ProgressBar value={stats.ratio} label={`Прогресс: ${node.title}`} />
        )}
        {node.summary && <span className="col-span-2 text-sm text-muted">{node.summary}</span>}
      </Link>
    </li>
  )
}
