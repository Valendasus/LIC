import { ArrowRight, Check } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProgressMap, rollup } from '@/entities/progress/server'
import { getLastTopic, getNextTopics, getReviewCounts, getTopicStatuses } from '@/entities/review/server'
import { getStages, getTree, hrefOf, leavesOf, type TreeNode } from '@/entities/topic/server'
import { getCurrentUser } from '@/entities/user/server'
import { cn, count, plural } from '@/shared/lib'
import { Badge, ButtonLink, Card, Eyebrow, ProgressRing } from '@/shared/ui'

type Props = { params: Promise<{ specialty: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tree = await getTree((await params).specialty)
  return { title: tree?.title ?? 'Не найдено' }
}

type StageState = 'done' | 'current' | 'todo'

/**
 * Курс — путь по этапам (docs/DESIGN.md, 4.2): где я, сколько пройдено, что дальше.
 * Текущий этап — тот, где последняя тема; если её нет — первый незавершённый.
 */
export async function SpecialtyPage({ params }: Props) {
  const { specialty } = await params
  const tree = await getTree(specialty)
  if (!tree) notFound()

  const user = await getCurrentUser()
  const [progress, stages, last, counts, statuses] = await Promise.all([
    getProgressMap(user.id),
    getStages(specialty),
    getLastTopic(user.id),
    getReviewCounts(user.id, specialty),
    getTopicStatuses(user.id, specialty, leavesOf(tree)),
  ])
  // «Начато» — по статусам тем: отметка освоения или ответы в практике. Так же, как значки в списках тем.
  const startedIn = (node: TreeNode) => leavesOf(node).filter((leaf) => ['started', 'mastered'].includes(statuses.get(leaf.id)!)).length
  const total = rollup(tree, progress)
  const continueTo = last?.node ?? (await getNextTopics(user.id, specialty, { limit: 1 }))[0]?.node
  const currentBlock = last ? last.node.id.split('/').slice(0, 2).join('/') : null

  const ratios = stages.map((stage) => rollup({ ...tree, children: stage.blocks }, progress).ratio)
  const withLast = stages.findIndex((stage) => stage.blocks.some((block) => block.id === currentBlock))
  const currentIndex = withLast >= 0 ? withLast : ratios.findIndex((ratio) => ratio < 1)
  const states: StageState[] = ratios.map((ratio, index) => (ratio === 1 ? 'done' : index === currentIndex ? 'current' : 'todo'))

  return (
    <div className="flex flex-col gap-10">
      <Card className="flex flex-wrap items-center justify-between gap-8 p-8">
        <div className="flex max-w-2xl min-w-0 flex-1 basis-96 flex-col gap-3">
          <Eyebrow>Специальность</Eyebrow>
          <h1 className="text-[34px] leading-tight font-semibold tracking-tight">{tree.title}</h1>
          {tree.summary && <p className="text-muted">{tree.summary}</p>}
          {continueTo && (
            <ButtonLink href={hrefOf(continueTo)} className="mt-2 self-start" iconEnd={<ArrowRight aria-hidden size={17} />}>
              {last ? 'Продолжить' : 'Начать'}: {continueTo.title}
            </ButtonLink>
          )}
        </div>
        <div className="flex items-center gap-5">
          <ProgressRing value={total.ratio} label={`Прогресс: ${tree.title}`} size={120}>
            <span className="font-mono text-2xl">{Math.round(total.ratio * 100)}%</span>
          </ProgressRing>
          <dl className="flex flex-col gap-1 text-sm text-muted">
            <div>
              <dt className="sr-only">Начато</dt>
              <dd>
                <b className="font-semibold text-fg">{startedIn(tree)}</b> из {count(total.leaves, ['темы', 'тем', 'тем'])} начато
              </dd>
            </div>
            <div>
              <dt className="sr-only">Этапы</dt>
              <dd>
                <b className="font-semibold text-fg">{stages.length}</b> {plural(stages.length, ['этап', 'этапа', 'этапов'])}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Практика</dt>
              <dd>
                <b className="font-semibold text-fg">{counts.total}</b> {plural(counts.total, ['упражнение', 'упражнения', 'упражнений'])}
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      <ol aria-label="Путь по этапам" className="flex flex-col">
        {stages.map((stage, index) => {
          const stats = rollup({ ...tree, children: stage.blocks }, progress)
          const state = states[index]
          const last = index === stages.length - 1
          return (
            <li key={stage.title} className="flex gap-6">
              <div aria-hidden className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold',
                    state === 'done' ? 'bg-good text-on-primary' : state === 'current' ? 'bg-accent text-on-primary' : 'border-2 border-line-strong text-muted',
                  )}
                >
                  {state === 'done' ? <Check size={16} strokeWidth={2.75} /> : index + 1}
                </span>
                {!last && <span className={cn('w-0.5 flex-1', state === 'todo' ? 'bg-surface' : 'bg-raised')} />}
              </div>
              <section aria-labelledby={`stage-${index}`} className={cn('flex min-w-0 flex-1 flex-col gap-4', !last && 'pb-10')}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 id={`stage-${index}`} className={cn('text-xl font-semibold', state === 'todo' && 'text-muted')}>
                      {stage.title}
                      {state === 'current' && <span className="ml-3 text-sm font-medium text-accent">текущий этап</span>}
                      {state === 'done' && <span className="ml-3 text-sm font-medium text-good">пройден</span>}
                    </h2>
                    {stage.summary && <p className="mt-0.5 text-sm text-muted">{stage.summary}</p>}
                  </div>
                  <span className="font-mono text-sm text-muted">
                    {Math.round(stats.ratio * 100)}% · {stage.blocks.reduce((sum, block) => sum + startedIn(block), 0)} из {stats.leaves}
                  </span>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {stage.blocks.map((block) => (
                    <BlockCard key={block.id} block={block} progress={progress} started={startedIn(block)} here={block.id === currentBlock} />
                  ))}
                </ul>
              </section>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function BlockCard({ block, progress, started, here }: { block: TreeNode; progress: Map<string, number>; started: number; here: boolean }) {
  const stats = rollup(block, progress)
  const filled = leavesOf(block).filter((leaf) => leaf.content).length
  return (
    <li>
      <Link href={hrefOf(block)} className={cn('flex h-full items-center gap-4 rounded-card bg-surface p-4 transition-colors duration-150 hover:bg-raised', here && 'ring-1 ring-line-strong')}>
        <ProgressRing value={stats.ratio} label={`Прогресс: ${block.title}`} tone={stats.ratio === 1 ? 'good' : 'accent'} />
        <span className="flex min-w-0 flex-col">
          {here && <span className="text-xs text-accent">вы здесь</span>}
          <span className="font-semibold">{block.title}</span>
          <span className="text-xs text-muted">
            {started} из {count(stats.leaves, ['темы', 'тем', 'тем'])}
            {filled === 0 ? ' · готовится' : ` · уроков ${filled}`}
          </span>
        </span>
        {stats.ratio === 1 && <Badge tone="good">пройден</Badge>}
      </Link>
    </li>
  )
}
