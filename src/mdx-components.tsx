import type { MDXComponents } from 'mdx/types'
import { Callout, Example, H3, Hints, Question, Sources, Task } from '@/entities/lesson'

// Компоненты, доступные в любом MDX-файле темы без импорта.
const components: MDXComponents = {
  Callout,
  Example,
  Question,
  Task,
  Hints,
  Sources,
  // Заголовки разделов получают id — для оглавления шага.
  h3: H3,
}

export function useMDXComponents(): MDXComponents {
  return components
}
