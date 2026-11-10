import { ChevronRight, Check, Circle, CircleDot } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { levelName, type Rollup } from '@/entities/progress'
import type { TopicStatus } from '@/entities/review'
import { GRADE_LABEL, hrefOf, leavesOf, type TreeNode } from '@/entities/topic/server'
import { cn, count } from '@/shared/lib'
import { Badge, ButtonLink, ProgressRing } from '@/shared/ui'

interface Props {
  node: TreeNode
  trail: TreeNode[]
  stats: Rollup
  progress: Map<string, number>
  statuses: Map<string, TopicStatus>
  practice: { total: number; ready: number }
}

const STATUS: Record<TopicStatus, { icon: ReactNode; label: string }> = {
  mastered: { icon: <Check aria-hidden size={16} strokeWidth={2.5} className="text-good" />, label: 'освоена' },
  started: { icon: <CircleDot aria-hidden size={16} className="text-accent" />, label: 'в процессе' },
  new: { icon: <Circle aria-hidden size={16} className="text-muted" />, label: 'не начата' },
  soon: { icon: <span aria-hidden className="block size-4 text-center leading-4 text-subtle">·</span>, label: 'готовится' },
}

/** Блок или модуль (docs/DESIGN.md, 4.3): выбрать тему. Модули — разделы, темы — строки со статусом. */
export function BranchView({ node, trail, stats, progress, statuses, practice }: Props) {
  // Подряд идущие темы без модуля собираются в один раздел, модули — каждый в свой.
  const sections: { title: string | null; node: TreeNode | null; topics: TreeNode[] }[] = []
  for (const child of node.children) {
    if (child.children.length) sections.push({ title: child.title, node: child, topics: leavesOf(child) })
    else if (sections.at(-1)?.node === null) sections.at(-1)!.topics.push(child)
    else sections.push({ title: null, node: null, topics: [child] })
  }
  const scope = encodeURIComponent(node.id)

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex max-w-3xl min-w-0 flex-1 basis-96 flex-col gap-3">
          <nav aria-label="Путь" className="text-sm text-muted">
            <ol className="flex flex-wrap gap-1.5">
              {trail.slice(0, -1).map((crumb, index) => (
                <li key={crumb.id} className="flex items-center gap-1.5">
                  {index > 0 && <span aria-hidden>›</span>}
                  <Link href={hrefOf(crumb)} className="hover:text-fg">
                    {crumb.title}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
          <h1 className="text-[34px] leading-tight font-semibold tracking-tight">{node.title}</h1>
          {node.summary && <p className="text-muted">{node.summary}</p>}
          {practice.total > 0 && (
            <div className="mt-2 flex flex-wrap gap-3">
              {practice.ready > 0 ? (
                <ButtonLink href={`/practice?scope=${scope}`}>Учить и повторять · {practice.ready}</ButtonLink>
              ) : (
                <Badge tone="good">На сегодня всё</Badge>
              )}
              <ButtonLink href={`/practice?scope=${scope}&mode=free`} variant="outline">
                Свободная тренировка
              </ButtonLink>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <ProgressRing value={stats.ratio} label={`Прогресс: ${node.title}`} size={88}>
            <span className="font-mono text-lg">{Math.round(stats.ratio * 100)}%</span>
          </ProgressRing>
          <p className="text-sm text-muted">
            <b className="font-semibold text-fg">{[...statuses.values()].filter((status) => status === 'started' || status === 'mastered').length}</b> из {count(stats.leaves, ['темы', 'тем', 'тем'])}
            <br />
            начато
          </p>
        </div>
      </header>

      {sections.map((section, index) => {
        const started = section.topics.filter((topic) => statuses.get(topic.id) === 'started' || statuses.get(topic.id) === 'mastered').length
        return (
          <section key={section.node?.id ?? `topics-${index}`} aria-labelledby={`section-${index}`} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id={`section-${index}`} className="text-lg font-semibold">
                {section.node ? (
                  <Link href={hrefOf(section.node)} className="hover:text-accent">
                    {section.title}
                  </Link>
                ) : (
                  'Темы'
                )}
              </h2>
              <span className="text-sm text-muted">
                {started} из {section.topics.length}
              </span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {section.topics.map((topic) => {
                const status = statuses.get(topic.id)!
                const level = progress.get(topic.id) ?? 0
                return (
                  <li key={topic.id}>
                    <Link
                      href={hrefOf(topic)}
                      className={cn('group flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card bg-surface px-4 py-3.5 transition-colors duration-150 hover:bg-raised', status === 'soon' && 'bg-surface/50')}
                    >
                      {STATUS[status].icon}
                      <span className={cn('min-w-0 flex-1 font-medium', status === 'soon' && 'text-muted')}>
                        {topic.title}
                        {status !== 'soon' && <span className="sr-only">, {STATUS[status].label}</span>}
                      </span>
                      {level > 0 && <span className="text-xs text-good">{levelName(level)}</span>}
                      <span className="text-xs text-muted">{topic.content ? 'урок' : status === 'soon' ? 'готовится' : 'только практика'}</span>
                      {topic.grade && <Badge outline>{GRADE_LABEL[topic.grade]}</Badge>}
                      <ChevronRight aria-hidden size={16} className="text-subtle group-hover:text-fg" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
