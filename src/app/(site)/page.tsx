import Link from 'next/link'
import { ProgressBar } from '@/components/ui'
import { getCurrentUser, getProgressMap, rollup } from '@/lib/progress'
import { getSpecialties, getTree } from '@/lib/tree'

const STEPS = [
  { letter: 'L', title: 'Learn', text: 'Понять: объяснение в три слоя, примеры из реального кода, частые ошибки.' },
  { letter: 'I', title: 'Implement', text: 'Сделать руками: задачи от разминки до «босса» с лестницей подсказок.' },
  { letter: 'C', title: 'Confirm', text: 'Подтвердить: вопросы своими словами, повторение по расписанию, пробные собесы.' },
]

export default async function HomePage() {
  const [specialties, user] = await Promise.all([getSpecialties(), getCurrentUser()])
  const progress = await getProgressMap(user.id)
  const trees = await Promise.all(specialties.map((item) => getTree(item.slug)))

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Learn → Implement → Confirm</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Каждая тема проходит три шага. Прогресс ветки складывается из освоенных тем.
        </p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.letter} className="rounded-lg border border-line bg-surface p-4">
              <p className="font-mono text-sm font-bold text-accent">
                {step.letter} · {step.title}
              </p>
              <p className="mt-1 text-sm">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Специальности</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {specialties.map((item, index) => {
            const tree = trees[index]
            const stats = tree ? rollup(tree, progress) : null
            const body = (
              <>
                <p className="flex items-center justify-between gap-2 font-semibold">
                  {item.title}
                  {item.status === 'planned' && <span className="text-xs font-normal text-muted">в планах</span>}
                </p>
                <p className="mt-1 mb-3 text-sm text-muted">{item.summary}</p>
                {stats && (
                  <>
                    <ProgressBar value={stats.ratio} label={`Прогресс: ${item.title}`} />
                    <p className="mt-1 text-xs text-muted">
                      Начато тем: {stats.started} из {stats.leaves}
                    </p>
                  </>
                )}
              </>
            )
            return (
              <li key={item.slug}>
                {tree ? (
                  <Link href={`/${item.slug}`} className="block h-full rounded-lg border border-line bg-surface p-4 hover:border-accent">
                    {body}
                  </Link>
                ) : (
                  <div className="h-full rounded-lg border border-dashed border-line p-4 opacity-70">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
