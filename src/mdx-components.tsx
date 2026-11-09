import type { MDXComponents } from 'mdx/types'
import { Hints } from '@/components/lesson/Hints'
import { Callout, Example, Question, Sources, Task } from '@/components/lesson/blocks'

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
