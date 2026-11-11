import { ArrowLeft, ArrowRight, Check, Circle, CircleDot, Code2, ListChecks } from 'lucide-react'
import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { H3, splitLesson, type SplitLesson } from '@/entities/lesson'
import { KIND_LABEL, LEVEL_LABEL, LEVEL_TONE, type PracticeItem } from '@/entities/practice-item'
import type { TopicPractice, TopicStatus, TopicSteps } from '@/entities/review'
import type { TreeNode } from '@/entities/topic'
import { GRADE_LABEL, hrefOf } from '@/entities/topic/server'
import { LevelPicker } from '@/features/set-level'
import { cn, count } from '@/shared/lib'
import { Badge, ButtonLink, Card, EmptyState, StepTabs, type Step } from '@/shared/ui'
import { LessonPractice } from './LessonPractice'

export interface LessonModule {
  Lesson: ComponentType<{ components?: Record<string, unknown> }>
  meta: { verified: string; versions: string }
}

interface Props {
  node: TreeNode
  trail: TreeNode[]
  lesson: LessonModule | null
  steps: TopicSteps
  practice: TopicPractice
  level: number
  siblings: TreeNode[]
  statuses: Map<string, TopicStatus>
  next: TreeNode | null
  /** Задания темы — для ссылок <Practice id="…" /> в уроке. */
  items?: PracticeItem[]
}

const STATUS_ICON: Record<TopicStatus, { icon: ReactNode; label: string }> = {
  mastered: { icon: <Check aria-hidden size={15} strokeWidth={2.5} className="text-good" />, label: 'освоена' },
  started: { icon: <CircleDot aria-hidden size={15} className="text-accent" />, label: 'в процессе' },
  new: { icon: <Circle aria-hidden size={15} className="text-muted" />, label: 'не начата' },
  soon: { icon: <span aria-hidden className="block size-[15px] text-center leading-[15px] text-subtle">·</span>, label: 'готовится' },
}

/**
 * Тема — главный экран обучения (docs/DESIGN.md, 4.4): три шага вкладками, слева соседние темы модуля,
 * справа оглавление шага, внизу шага — следующее действие.
 */
export function TopicView(props: Props) {
  const { node, lesson, items = [] } = props
  if (!lesson) return <TopicLayout {...props} split={null} />
  const byKey = new Map(items.map((item) => [item.id.split('#')[1], item]))
  const Practice = ({ id }: { id: string }) => <LessonPractice id={id} item={byKey.get(id)} topicId={node.id} />
  // Урок раскладывается по шагам при рендере MDX: wrapper получает всё содержимое урока.
  const Wrapper = ({ children }: { children: ReactNode }) => <TopicLayout {...props} split={splitLesson(children, (element) => element.type === H3 || element.type === 'h3')} />
  return <lesson.Lesson key={node.id} components={{ wrapper: Wrapper, Practice }} />
}

function TopicLayout({ node, trail, lesson, steps, practice, level, siblings, statuses, next, split }: Props & { split: SplitLesson | null }) {
  const module = trail.at(-2)!
  const scope = encodeURIComponent(node.id)
  const questionsAndTasks = practice.tasks.length + practice.questions
  const implementDone = steps.implement.done

  const learnContent = split ? (
    <div className="lesson prose max-w-[68ch] prose-headings:scroll-mt-10 prose-headings:font-semibold prose-h3:text-[22px]">
      {split.sections.learn}
      {split.sections.sources.length > 0 && (
        <>
          <h3 id="sources">Источники</h3>
          {split.sections.sources}
        </>
      )}
      <p className="mt-10 text-xs text-subtle not-prose">
        Проверено {lesson!.meta.verified} · {lesson!.meta.versions}
      </p>
    </div>
  ) : (
    <EmptyState title="Урок по этой теме готовится">Задачи и карточки, если они уже есть, можно решать и повторять — в следующих шагах.</EmptyState>
  )

  const implementContent = (
    <div className="flex flex-col gap-8">
      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold">Задачи темы</h3>
          {questionsAndTasks > 0 && <span className="text-sm text-muted">Решено {implementDone} из {questionsAndTasks}</span>}
        </div>
        {practice.tasks.length > 0 && (
          <ul className="flex flex-col gap-2">
            {practice.tasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center gap-3 rounded-card bg-bg px-4 py-3">
                <span aria-label={task.solved ? 'решена' : 'не решена'}>{task.solved ? <Check aria-hidden size={16} strokeWidth={2.5} className="text-good" /> : <Code2 aria-hidden size={16} className="text-muted" />}</span>
                <span className="min-w-0 flex-1 font-medium">{task.title}</span>
                <span className="text-xs text-muted">{KIND_LABEL[task.kind]}</span>
                <Badge tone={LEVEL_TONE[task.level]}>{LEVEL_LABEL[task.level]}</Badge>
              </li>
            ))}
          </ul>
        )}
        {questionsAndTasks > 0 ? (
          <div className="flex flex-wrap gap-3">
            {practice.tasks.length > 0 && (
              <ButtonLink href={`/practice?scope=${scope}&kinds=code,types,react`} icon={<Code2 aria-hidden size={17} />}>
                Решать задачи
              </ButtonLink>
            )}
            {practice.questions > 0 && (
              <ButtonLink href={`/practice?scope=${scope}&kinds=quiz,output,order`} variant="secondary" icon={<ListChecks aria-hidden size={17} />}>
                Вопросы на понимание · {practice.questions}
              </ButtonLink>
            )}
          </div>
        ) : (
          <p className="text-muted">Задач по этой теме пока нет.</p>
        )}
      </Card>
      {split && split.sections.implement.length > 0 && (
        <div className="lesson prose max-w-[68ch] prose-headings:font-semibold">
          <h3>Задачи с разбором</h3>
          {split.sections.implement}
        </div>
      )}
    </div>
  )

  const confirmContent = (
    <div className="flex flex-col gap-8">
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="text-lg font-semibold">Закрепить</h3>
        {practice.cards > 0 ? (
          <>
            <p className="text-muted">
              {count(practice.cards, ['карточка', 'карточки', 'карточек'])} на термины и короткие ответы. Дальше платформа сама напомнит их повторить — тогда, когда вы начнёте забывать.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={`/practice?scope=${scope}&kinds=card`}>Повторить карточки</ButtonLink>
              <ButtonLink href={`/practice?scope=${scope}&mode=free`} variant="outline">
                Свободная тренировка
              </ButtonLink>
            </div>
          </>
        ) : (
          <p className="text-muted">Карточек по этой теме пока нет.</p>
        )}
      </Card>
      {split && split.sections.confirm.length > 0 && (
        <div className="lesson prose max-w-[68ch] prose-headings:font-semibold">
          <h3>Проверьте себя</h3>
          {split.sections.confirm}
        </div>
      )}
      <LevelPicker nodeId={node.id} level={level} />
    </div>
  )

  const tabs: Step[] = [
    {
      id: 'learn',
      title: 'Learn',
      hint: 'понять',
      status: steps.learn ? 'Пройдено' : lesson ? 'Прочитайте объяснение' : 'Урок готовится',
      state: steps.learn ? 'done' : 'todo',
      progress: steps.learn ? 1 : 0,
      content: learnContent,
      toc: split?.toc.learn,
    },
    {
      id: 'implement',
      title: 'Implement',
      hint: 'применить',
      status: questionsAndTasks ? `Решено ${implementDone} из ${questionsAndTasks}` : 'Заданий пока нет',
      state: questionsAndTasks > 0 && implementDone === questionsAndTasks ? 'done' : implementDone > 0 ? 'progress' : 'todo',
      progress: questionsAndTasks ? implementDone / questionsAndTasks : 0,
      content: implementContent,
      toc: split?.toc.implement,
    },
    {
      id: 'confirm',
      title: 'Confirm',
      hint: 'закрепить',
      status: steps.confirm.total ? (steps.confirm.done ? `Начато ${steps.confirm.done} из ${steps.confirm.total}` : count(steps.confirm.total, ['карточка', 'карточки', 'карточек'])) : 'Карточек пока нет',
      state: level >= 2 ? 'done' : steps.confirm.done > 0 ? 'progress' : 'todo',
      progress: level >= 2 ? 1 : steps.confirm.total ? steps.confirm.done / steps.confirm.total : 0,
      content: confirmContent,
      toc: split?.toc.confirm,
    },
  ]

  return (
    <div className="flex gap-10">
      <aside aria-label="Темы модуля" className="hidden w-56 shrink-0 flex-col gap-4 xl:flex">
        <Link href={hrefOf(trail.at(-3) ?? module)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft aria-hidden size={15} />
          {(trail.at(-3) ?? module).title}
        </Link>
        <div>
          <p className="font-semibold">{module.title}</p>
          <p className="text-[13px] text-muted">{count(siblings.length, ['тема', 'темы', 'тем'])}</p>
        </div>
        <ol className="flex flex-col gap-0.5 text-sm">
          {siblings.map((sibling) => {
            const status = statuses.get(sibling.id)!
            const current = sibling.id === node.id
            return (
              <li key={sibling.id}>
                <Link
                  href={hrefOf(sibling)}
                  aria-current={current ? 'page' : undefined}
                  className={cn('flex items-center gap-2.5 rounded-[10px] px-2.5 py-2', current ? 'bg-surface font-medium text-fg' : status === 'soon' ? 'text-subtle hover:text-muted' : 'text-muted hover:bg-surface hover:text-fg')}
                >
                  {STATUS_ICON[status].icon}
                  <span className="min-w-0 flex-1">{sibling.title}</span>
                  <span className="sr-only">, {STATUS_ICON[status].label}</span>
                </Link>
              </li>
            )
          })}
        </ol>
      </aside>

      <article className="min-w-0 flex-1">
        <header className="mb-8 flex flex-col gap-3">
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
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[34px] leading-tight font-semibold tracking-tight text-balance">{node.title}</h1>
            {node.grade && <Badge outline>{GRADE_LABEL[node.grade]}</Badge>}
          </div>
          {node.goals && (
            <details className="group mt-2 rounded-card bg-surface px-5 py-4">
              <summary className="cursor-pointer font-medium">После темы вы сможете</summary>
              <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-muted">
                {node.goals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            </details>
          )}
        </header>

        <StepTabs
          label="Шаги темы"
          steps={tabs}
          finalAction={
            next ? (
              <ButtonLink href={hrefOf(next)} iconEnd={<ArrowRight aria-hidden size={17} />}>
                Следующая тема: {next.title}
              </ButtonLink>
            ) : (
              <ButtonLink href={`/${node.id.split('/')[0]}`} variant="secondary">
                К курсу
              </ButtonLink>
            )
          }
        />
      </article>
    </div>
  )
}
