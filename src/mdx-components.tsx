import type { MDXComponents } from 'mdx/types'
import { Hints } from '@/entities/lesson'
import { Callout, Example, Question, Sources, Task } from '@/entities/lesson'

// Компоненты, доступные в любом MDX-файле темы без импорта.
const components: MDXComponents = {
  Callout,
  Example,
  Question,
  Task,
  Hints,
  Sources,
}

export function useMDXComponents(): MDXComponents {
  return components
}
