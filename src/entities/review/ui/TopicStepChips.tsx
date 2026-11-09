import { Check } from 'lucide-react'
import { Badge } from '@/shared/ui'
import type { TopicSteps } from '../api/today'

/** Шаги темы метками: «Learn ✓», «Implement 2 из 4», «Confirm». Статус — словом и цветом, не только цветом. */
export function TopicStepChips({ steps }: { steps: TopicSteps }) {
  const implementDone = steps.implement.total > 0 && steps.implement.done === steps.implement.total
  const confirmStarted = steps.confirm.done > 0
  return (
    <span className="flex flex-wrap gap-2" aria-label="Шаги темы">
      <Badge tone={steps.learn ? 'good' : 'neutral'} icon={steps.learn ? <Check aria-hidden size={13} strokeWidth={2.5} /> : undefined}>
        Learn{steps.learn ? '' : ' — не начат'}
      </Badge>
      <Badge tone={implementDone ? 'good' : steps.implement.done ? 'accent' : 'neutral'} icon={implementDone ? <Check aria-hidden size={13} strokeWidth={2.5} /> : undefined}>
        {steps.implement.total ? `Implement ${steps.implement.done} из ${steps.implement.total}` : 'Implement — заданий пока нет'}
      </Badge>
      <Badge tone={confirmStarted ? 'accent' : 'neutral'}>{steps.confirm.total ? `Confirm ${steps.confirm.done} из ${steps.confirm.total}` : 'Confirm — карточек пока нет'}</Badge>
    </span>
  )
}
