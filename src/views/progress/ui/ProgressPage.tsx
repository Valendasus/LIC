import { Settings } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { LEVEL_LABEL } from '@/entities/practice-item'
import { getProgressMap, rollup } from '@/entities/progress/server'
import { getActivity, getMemory, getTaskStats, getWeakTopics } from '@/entities/review/server'
import { getStages, getTree, hrefOf, leavesOf } from '@/entities/topic/server'
import { levelName } from '@/entities/progress'
import { getCurrentUser } from '@/entities/user/server'
import { cn, count } from '@/shared/lib'
import { ButtonLink, Card, Eyebrow, ProgressBar } from '@/shared/ui'

export const metadata: Metadata = { title: 'Прогресс' }

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const dayLabel = (iso: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00`))

/** Ступень тепловой карты: 0 — нет ответов, 1–4 — доля от самого активного дня. Один цвет, светлее → темнее по смыслу. */
export function heatLevel(answers: number, max: number) {
  if (answers === 0) return 0
  return Math.min(4, Math.ceil((answers / max) * 4))
}

const HEAT = ['bg-raised', 'bg-accent/30', 'bg-accent/55', 'bg-accent/80', 'bg-accent']

/**
 * «Прогресс» (docs/DESIGN.md, 4.8): видно, что знания растут, и где слабые места.
 * Активность за полгода, память и нагрузка на неделю, освоение по этапам, слабые темы, задачи по уровням.
 */
export async function ProgressPage() {
  const now = new Date()
  const user = await getCurrentUser()
  const tree = (await getTree('frontend'))!
  const [activity, memory, weak, tasks, progress, stages] = await Promise.all([
    getActivity(user.id, 182, now),
    getMemory(user.id, now),
    getWeakTopics(user.id),
    getTaskStats(user.id, 'frontend'),
    getProgressMap(user.id),
    getStages('frontend'),
  ])
  const max = Math.max(1, ...activity.map((day) => day.answers))
  const activeDays = activity.filter((day) => day.answers > 0).length
  const answers = activity.reduce((sum, day) => sum + day.answers, 0)
  // Первая колонка карты начинается с понедельника: дни до первой даты — пустые ячейки.
  const lead = (new Date(`${activity[0].date}T12:00:00`).getDay() + 6) % 7
  const forecastMax = Math.max(1, ...memory.forecast)
  const forecastLabels = memory.forecast.map((_, index) => (index === 0 ? 'сегодня' : index === 1 ? 'завтра' : WEEKDAYS[(now.getDay() + 6 + index) % 7]))

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Прогресс</h1>
        <ButtonLink href="/settings" variant="outline" size="sm" icon={<Settings aria-hidden size={16} />}>
          Настройки
        </ButtonLink>
      </header>

      <Card className="flex flex-col gap-5 p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Eyebrow>Активность за полгода</Eyebrow>
          <p className="text-sm text-muted">
            {count(activeDays, ['день', 'дня', 'дней'])} с занятиями · {count(answers, ['ответ', 'ответа', 'ответов'])}
          </p>
        </div>
        <div className="overflow-x-auto">
          <ol aria-label="Ответы по дням" className="grid w-max grid-flow-col grid-rows-7 gap-[3px]">
            {Array.from({ length: lead }, (_, index) => (
              <li key={`lead-${index}`} aria-hidden className="size-3.5" />
            ))}
            {activity.map((day) => {
              const label = `${dayLabel(day.date)}: ${count(day.answers, ['ответ', 'ответа', 'ответов'])}`
              return <li key={day.date} title={label} aria-label={label} className={cn('size-3.5 rounded-[3px]', HEAT[heatLevel(day.answers, max)])} />
            })}
          </ol>
        </div>
        <p aria-hidden className="flex items-center gap-1.5 self-end text-xs text-muted">
          меньше
          {HEAT.map((step) => (
            <span key={step} className={cn('size-3 rounded-[3px]', step)} />
          ))}
          больше
        </p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-5 p-7">
          <Eyebrow>Память</Eyebrow>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted">Выучено</dt>
              <dd className="text-3xl font-semibold">{memory.learned}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">В изучении</dt>
              <dd className="text-3xl font-semibold">{memory.learning}</dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">Повторения на неделю вперёд</p>
            <ol aria-label="Повторения по дням" className="grid h-36 grid-cols-7 items-end gap-2">
              {memory.forecast.map((value, index) => (
                <li key={index} aria-label={`${forecastLabels[index]}: ${value}`} title={`${forecastLabels[index]}: ${value}`} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <span className="font-mono text-xs text-muted">{value}</span>
                  <span className="w-full rounded-t-[4px] bg-accent" style={{ height: `${Math.max(2, (value / forecastMax) * 100)}%`, opacity: value ? 1 : 0.25 }} />
                  <span className="text-xs text-muted">{forecastLabels[index]}</span>
                </li>
              ))}
            </ol>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-7">
          <Eyebrow>Слабые места за 30 дней</Eyebrow>
          {weak.length ? (
            <ul className="flex flex-col gap-2">
              {weak.map((topic) => (
                <li key={topic.node.id} className="flex flex-wrap items-center gap-3 rounded-card bg-bg px-4 py-3">
                  <Link href={hrefOf(topic.node)} className="min-w-0 flex-1 font-medium hover:text-accent">
                    {topic.node.title}
                  </Link>
                  <span className="text-sm text-bad">{count(topic.misses, ['ошибка', 'ошибки', 'ошибок'])}</span>
                  <ButtonLink href={`/practice?scope=${encodeURIComponent(topic.node.id)}&mode=free`} variant="secondary" size="sm">
                    Тренировать
                  </ButtonLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Слабых мест пока нет: за последний месяц всё вспоминалось.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="flex flex-col gap-5 p-7">
          <Eyebrow>Освоение по этапам</Eyebrow>
          <ul className="flex flex-col gap-5">
            {stages.map((stage) => {
              const leaves = stage.blocks.flatMap((block) => leavesOf(block))
              const levels = [1, 2, 3, 4].map((level) => ({ level, count: leaves.filter((leaf) => progress.get(leaf.id) === level).length })).filter((item) => item.count > 0)
              return (
                <li key={stage.title} className="flex flex-col gap-2">
                  <p className="font-medium">{stage.title}</p>
                  <ProgressBar value={rollup({ ...tree, children: stage.blocks }, progress).ratio} label={`Освоение: ${stage.title}`} />
                  <p className="text-xs text-muted">{levels.length ? levels.map((item) => `${levelName(item.level)} ${item.count}`).join(' · ') : 'Отметок освоения пока нет'}</p>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card className="flex flex-col gap-4 p-7">
          <Eyebrow>Задачи</Eyebrow>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-2 font-normal">Уровень</th>
                <th className="pb-2 text-right font-normal">Решено</th>
                <th className="pb-2 text-right font-normal">С первого запуска</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((row) => (
                <tr key={row.level} className="border-t border-raised">
                  <td className="py-2.5">{LEVEL_LABEL[row.level]}</td>
                  <td className="py-2.5 text-right font-mono">
                    {row.solved} из {row.total}
                  </td>
                  <td className="py-2.5 text-right font-mono">{row.firstTry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
