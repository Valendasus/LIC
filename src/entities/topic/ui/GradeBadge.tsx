import { GRADE_LABEL, type Grade } from '../api/tree'

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
