import Link from 'next/link'
import { GRADE_LABEL, hrefOf, type Grade, type TreeNode } from '@/lib/tree'
import type { Rollup } from '@/lib/progress'

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-good" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-9 text-right font-mono text-xs text-muted tabular-nums">{percent}%</span>
    </div>
  )
}

export const GRADE_TEXT: Record<Grade, string> = {
  J: 'Нужно для первой работы (Junior).',
  M: 'Уровень Middle: углубление после основ.',
  S: 'Уровень Senior или обзор: знать, что это существует и когда применять.',
}

const GRADE_STYLE: Record<Grade, string> = {
  J: 'bg-good-soft text-good',
  M: 'bg-accent-soft text-accent',
  S: 'bg-warn-soft text-warn',
}

export function GradeBadge({ grade }: { grade?: Grade }) {
  if (!grade) return null
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${GRADE_STYLE[grade]}`}
      title={`Нужно для уровня ${GRADE_LABEL[grade]}`}
    >
      {grade}
    </span>
  )
}

export function Breadcrumbs({ trail }: { trail: TreeNode[] }) {
  return (
    <nav aria-label="Путь" className="mb-4 text-sm text-muted">
      <ol className="flex flex-wrap gap-1.5">
        {trail.map((node, index) => (
          <li key={node.id} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden>/</span>}
            {index < trail.length - 1 ? (
              <Link href={hrefOf(node)} className="hover:text-accent">
                {node.title}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {node.title}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

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

const LEVEL_NAMES = ['Не начато', 'Знаю', 'Понимаю', 'Применяю', 'Владею']
export function levelName(level: number) {
  return LEVEL_NAMES[level] ?? LEVEL_NAMES[0]
}
