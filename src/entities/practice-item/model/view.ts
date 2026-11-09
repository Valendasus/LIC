import type { Grade } from '@/entities/schedule/@x/practice-item'

/** Общие пропсы экрана элемента практики: что показать, сроки, режим, оценка. */
export interface ViewProps<T> {
  item: T
  intervals: Record<Grade, string>
  free: boolean
  onGrade: (grade: Grade) => void
}
