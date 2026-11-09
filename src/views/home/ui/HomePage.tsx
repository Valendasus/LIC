import { ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { rollup, getProgressMap } from '@/entities/progress/server'
import { TopicStepChips, type TopicRef, type WeekActivity } from '@/entities/review'
import { getLastTopic, getNextTopics, getReviewCounts, getTopicSteps, getWeekActivity } from '@/entities/review/server'
import { GRADE_LABEL, getSpecialties, getTree, hrefOf } from '@/entities/topic/server'
import { getCurrentUser } from '@/entities/user/server'
import { cn, count } from '@/shared/lib'
import { Badge, ButtonLink, Card, Eyebrow, ProgressBar } from '@/shared/ui'

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

/** Приветствие по времени суток. */
export function greeting(now: Date) {
  const hour = now.getHours()
  if (hour < 6) return 'Доброй ночи'
  if (hour < 12) return 'Доброе утро'
  if (hour < 18) return 'Добрый день'
  return 'Добрый вечер'
}

/** «Понедельник, 9 ноября». */
export function longDate(now: Date) {
  const text = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
  return text[0].toUpperCase() + text.slice(1)
}

/**
 * «Сегодня» — главный экран: за три секунды понять, чем заняться, и начать одной кнопкой (docs/DESIGN.md, 4.1).
 * Повторение → продолжить тему → следующие темы по пути.
 */
export async function HomePage() {
  const now = new Date()
  const user = await getCurrentUser()
  const [counts, week, last, specialties, progress] = await Promise.all([
    getReviewCounts(user.id, 'frontend'),
    getWeekActivity(user.id, now),
    getLastTopic(user.id),
    getSpecialties(),
    getProgressMap(user.id),
  ])
  const [steps, next, trees] = await Promise.all([
    last ? getTopicSteps(user.id, last.node.id) : null,
    getNextTopics(user.id, 'frontend', { skip: last?.node.id }),
    Promise.all(specialties.map((item) => getTree(item.slug))),
  ])
  const firstVisit = counts.studied === 0 && !last

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{longDate(now)}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{greeting(now)}</h1>
        </div>
        <p className="text-sm text-muted">На этой неделе {week.activeDays} из 7 дней</p>
      </header>

      <section aria-label="На сегодня" className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <ReviewCard counts={counts} firstVisit={firstVisit} firstTopic={next[0]} />
        <WeekCard week={week} />
      </section>

      {last && steps && (
        <section aria-labelledby="continue" className="flex flex-col gap-4">
          <h2 id="continue" className="text-lg font-semibold">
            Продолжить
          </h2>
          <Link href={hrefOf(last.node)} className="group flex flex-wrap items-center gap-6 rounded-panel bg-surface px-7 py-6 transition-colors duration-150 hover:bg-raised">
            <span className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
              <span className="text-sm text-muted">{last.trail.join(' › ')}</span>
              <span className="text-xl font-semibold">{last.node.title}</span>
            </span>
            <TopicStepChips steps={steps} />
            <span className="inline-flex h-11 items-center gap-2 rounded-full bg-raised px-5 font-medium group-hover:bg-line-strong">
              Продолжить
              <ArrowRight aria-hidden size={17} />
            </span>
          </Link>
        </section>
      )}

      {next.length > 0 && (
        <section aria-labelledby="next" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="next" className="text-lg font-semibold">
              Дальше по пути
            </h2>
            <Link href="/frontend" className="text-sm text-accent hover:text-fg">
              Весь курс
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {next.map((topic) => (
              <li key={topic.node.id}>
                <Link href={hrefOf(topic.node)} className="flex h-full flex-col gap-2.5 rounded-card bg-surface p-5 transition-colors duration-150 hover:bg-raised">
                  <span className="text-xs text-muted">{topic.trail[0]}</span>
                  <span className="font-semibold">{topic.node.title}</span>
                  {topic.node.grade && (
                    <span>
                      <Badge outline>{GRADE_LABEL[topic.node.grade]}</Badge>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="specialties" className="flex flex-col gap-4">
        <h2 id="specialties" className="text-lg font-semibold">
          Специальности
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {specialties.map((item, index) => {
            const tree = trees[index]
            if (!tree) {
              return (
                <li key={item.slug} className="flex flex-col gap-1 rounded-card border border-surface p-5">
                  <span className="flex items-center justify-between gap-2 font-medium text-muted">
                    {item.title}
                    <Badge>в планах</Badge>
                  </span>
                  <span className="text-sm text-subtle">{item.summary}</span>
                </li>
              )
            }
            const stats = rollup(tree, progress)
            return (
              <li key={item.slug}>
                <Link href={`/${item.slug}`} className="flex h-full flex-col gap-3 rounded-card bg-surface p-5 transition-colors duration-150 hover:bg-raised">
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-sm text-muted">{item.summary}</span>
                  <ProgressBar value={stats.ratio} label={`Прогресс: ${item.title}`} />
                  <span className="text-xs text-muted">
                    Начато {stats.started} из {count(stats.leaves, ['темы', 'тем', 'тем'])}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

type Counts = Awaited<ReturnType<typeof getReviewCounts>>

function ReviewCard({ counts, firstVisit, firstTopic }: { counts: Counts; firstVisit: boolean; firstTopic?: TopicRef }) {
  if (firstVisit) {
    return (
      <Card className="flex flex-col gap-5 p-8">
        <Eyebrow>С чего начать</Eyebrow>
        <div>
          <p className="text-2xl font-semibold">Начните с первой темы</p>
          <p className="mt-2 max-w-xl text-muted">
            Каждая тема — три шага: <b className="font-medium text-fg">Learn</b> — понять, <b className="font-medium text-fg">Implement</b> — решить задачи,{' '}
            <b className="font-medium text-fg">Confirm</b> — закрепить карточками. Дальше платформа сама напомнит, что повторить.
          </p>
        </div>
        {firstTopic && (
          <ButtonLink href={hrefOf(firstTopic.node)} iconEnd={<ArrowRight aria-hidden size={17} />} className="self-start">
            {firstTopic.node.title}
          </ButtonLink>
        )}
      </Card>
    )
  }
  if (counts.ready === 0) {
    return (
      <Card className="flex flex-col gap-5 p-8">
        <Eyebrow>Повторение</Eyebrow>
        <div>
          <p className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles aria-hidden size={22} className="text-good" />
            На сегодня всё
          </p>
          <p className="mt-2 text-muted">Остальное вернётся по расписанию — тогда, когда вы начнёте забывать. Если хочется ещё, свободная тренировка не меняет расписание.</p>
        </div>
        <ButtonLink href="/practice?mode=free" variant="secondary" className="self-start">
          Свободная тренировка
        </ButtonLink>
      </Card>
    )
  }
  const reviews = counts.ready - counts.readyFresh
  const groups = [
    { label: 'Карточки', value: counts.readyByGroup.cards },
    { label: 'Вопросы', value: counts.readyByGroup.questions },
    { label: 'Задачи', value: counts.readyByGroup.tasks },
  ].filter((group) => group.value > 0)
  return (
    <Card className="flex flex-col gap-6 p-8">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <Eyebrow>Повторение</Eyebrow>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{count(counts.ready, ['элемент', 'элемента', 'элементов'])}</p>
          <p className="mt-1 text-muted">
            {[reviews && count(reviews, ['повторение', 'повторения', 'повторений']), counts.readyFresh && count(counts.readyFresh, ['новый', 'новых', 'новых'])].filter(Boolean).join(' и ')}
          </p>
        </div>
        <span className="flex flex-wrap content-start gap-1.5" aria-label="Состав">
          {groups.map((group) => (
            <Badge key={group.label}>
              {group.label} {group.value}
            </Badge>
          ))}
        </span>
      </div>
      {/* Пропорция: повторения (серое) и новое (акцент). */}
      <div aria-hidden className="flex gap-[3px]">
        {reviews > 0 && <span className="h-1.5 rounded-full bg-line-strong" style={{ flex: reviews }} />}
        {counts.readyFresh > 0 && <span className="h-1.5 rounded-full bg-accent" style={{ flex: counts.readyFresh }} />}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <ButtonLink href="/practice" size="lg">
          Начать повторение
        </ButtonLink>
        <span className="text-sm text-muted">Сначала то, что вы рискуете забыть</span>
      </div>
    </Card>
  )
}

function WeekCard({ week }: { week: WeekActivity }) {
  const max = Math.max(1, ...week.days)
  return (
    <Card className="flex flex-col gap-5 p-7">
      <Eyebrow>Эта неделя</Eyebrow>
      <ol className="grid grid-cols-7 gap-2" aria-label={`Дней с занятиями: ${week.activeDays} из 7`}>
        {week.days.map((answers, index) => (
          <li key={WEEKDAYS[index]} className="flex flex-col items-center gap-1.5 text-xs text-muted">
            <span
              aria-label={`${WEEKDAYS[index]}: ${count(answers, ['ответ', 'ответа', 'ответов'])}`}
              className={cn(
                'block h-14 w-full rounded-[10px]',
                answers > 0 ? 'bg-accent' : index === week.today ? 'border border-dashed border-line-strong' : index > week.today ? 'bg-bg' : 'bg-raised',
              )}
              style={answers > 0 ? { opacity: 0.35 + 0.65 * (answers / max) } : undefined}
            />
            <span className={cn(index === week.today && 'font-semibold text-fg')}>{WEEKDAYS[index]}</span>
          </li>
        ))}
      </ol>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Вспомнили</dt>
          <dd className="font-mono text-good">{week.accuracy === null ? '—' : `${Math.round(week.accuracy * 100)} %`}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Ответов за неделю</dt>
          <dd className="font-mono">{week.answers}</dd>
        </div>
      </dl>
    </Card>
  )
}
