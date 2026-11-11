import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Hints } from '@/entities/lesson'
import { KIND_LABEL, LEVEL_LABEL, LEVEL_TONE, isTask, type PracticeItem } from '@/entities/practice-item'
import { Badge, ButtonLink, CodeBlock, Eyebrow, RichText } from '@/shared/ui'

const shell = 'not-prose my-6 flex flex-col gap-3 rounded-card border border-line bg-surface p-5'

/** Шаги порядка показываются перемешанными, но одинаково при каждом рендере: сортировка по простому хешу текста. */
const hash = (text: string) => [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7)
export function shuffled(steps: string[]) {
  const mixed = [...steps].sort((a, b) => hash(a) - hash(b))
  // Если перемешивание случайно совпало с ответом — сдвигаем на один шаг.
  return mixed.every((step, index) => step === steps[index]) ? [...mixed.slice(1), mixed[0]] : mixed
}

function Head({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Eyebrow>{label}</Eyebrow>
      {children}
    </div>
  )
}

/**
 * Задание из practice.yaml прямо в уроке: <Practice id="ключ" />. Один источник — задание не копируется в текст урока.
 * «Что выведет», квиз и порядок показываются с ответом под кнопкой; задача с редактором — карточкой со ссылкой в тренажёр.
 */
export function LessonPractice({ id, item, topicId }: { id: string; item: PracticeItem | undefined; topicId: string }) {
  // Карточки в урок не встраиваются: они для повторения, а не для чтения подряд.
  if (!item || item.kind === 'card') return <p className="not-prose my-6 rounded-card border border-bad bg-bad-soft px-4 py-3 text-sm">Задание «{id}» не найдено в практике темы.</p>

  if (isTask(item)) {
    return (
      <section className={shell} aria-label={`Задача: ${item.title}`}>
        <Head label={KIND_LABEL[item.kind]}>
          <Badge tone={LEVEL_TONE[item.level]}>{LEVEL_LABEL[item.level]}</Badge>
        </Head>
        <h4 className="text-lg font-semibold">{item.title}</h4>
        <RichText text={item.prompt} className="text-[15px]" />
        <ButtonLink href={`/practice?scope=${encodeURIComponent(topicId)}&kinds=${item.kind}&mode=free`} variant="secondary" size="sm" className="self-start" iconEnd={<ArrowRight aria-hidden size={16} />}>
          Решить в редакторе
        </ButtonLink>
      </section>
    )
  }

  if (item.kind === 'output') {
    return (
      <section className={shell} aria-label="Что выведет код">
        <Head label="Что выведет" />
        <CodeBlock code={item.code} />
        <Hints hints={[]} solutionLabel="Показать ответ">
          <CodeBlock code={item.answer.join('\n')} />
          <RichText text={item.explain} />
        </Hints>
      </section>
    )
  }

  if (item.kind === 'quiz') {
    const right = item.options.filter((option) => option.correct)
    return (
      <section className={shell} aria-label="Вопрос">
        <Head label={item.multiple ? 'Вопрос · несколько ответов' : 'Вопрос'} />
        <RichText text={item.question} className="font-medium" />
        {item.code && <CodeBlock code={item.code} />}
        <ol className="flex list-[upper-alpha] flex-col gap-1.5 pl-6 text-[15px]">
          {item.options.map((option) => (
            <li key={option.text}>
              <RichText text={option.text} />
            </li>
          ))}
        </ol>
        <Hints hints={[]} solutionLabel="Показать ответ">
          <p>
            <b>{right.length > 1 ? 'Верные ответы' : 'Верный ответ'}:</b> {right.map((option) => option.text).join('; ')}
          </p>
          <RichText text={item.explain} />
          {item.options
            .filter((option) => !option.correct && option.why)
            .map((option) => (
              <p key={option.text}>
                <i>{option.text}</i> — {option.why}
              </p>
            ))}
        </Hints>
      </section>
    )
  }

  // Порядок
  return (
    <section className={shell} aria-label="Расставьте по порядку">
      <Head label="Порядок" />
      <RichText text={item.prompt} className="font-medium" />
      <ul className="flex list-disc flex-col gap-1.5 pl-6 text-[15px]">
        {shuffled(item.steps).map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
      <Hints hints={[]} solutionLabel="Показать ответ">
        <ol>
          {item.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <RichText text={item.explain} />
      </Hints>
    </section>
  )
}
