import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'

/** Разделы урока: три шага LIC и источники. */
export type LessonSection = 'learn' | 'implement' | 'confirm' | 'sources'

const SECTION_BY_TITLE: Record<string, LessonSection> = { Learn: 'learn', Implement: 'implement', Confirm: 'confirm', Источники: 'sources' }

export interface TocEntry {
  id: string
  title: string
}

export interface SplitLesson {
  sections: Record<LessonSection, ReactNode[]>
  toc: Record<LessonSection, TocEntry[]>
}

/** Текст узла React: для заголовков с `кодом` и выделением внутри. */
export function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children)
  return ''
}

/** id заголовка для оглавления и ссылок: «Как это устроено» → «как-это-устроено». */
export function headingId(text: string) {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Верхний уровень содержимого урока. MDX 3 передаёт в wrapper не готовые элементы, а компонент содержимого
 * (_createMdxContent): его вызывают, чтобы получить фрагмент с заголовками и абзацами, и раскрывают фрагменты.
 */
export function flatten(children: ReactNode): ReactNode[] {
  let list = Children.toArray(children)
  for (;;) {
    const [only] = list
    if (list.length !== 1 || !isValidElement(only)) return list
    const props = only.props as { children?: ReactNode }
    if (only.type === Fragment) list = Children.toArray(props.children)
    // Компонент содержимого MDX вызывается без children; компоненты уроков (Callout, Task) всегда с ними — их не раскрываем.
    else if (typeof only.type === 'function' && props.children === undefined) list = Children.toArray((only.type as (props: object) => ReactNode)(only.props as object))
    else return list
  }
}

/**
 * Раскладывает содержимое урока по шагам: всё между «## Learn» и «## Implement» — шаг Learn и так далее.
 * Текст до первого заголовка шага относится к Learn. Заголовки третьего уровня каждого шага — его оглавление.
 */
export function splitLesson(children: ReactNode, isH3: (element: ReactElement) => boolean): SplitLesson {
  const sections: SplitLesson['sections'] = { learn: [], implement: [], confirm: [], sources: [] }
  const toc: SplitLesson['toc'] = { learn: [], implement: [], confirm: [], sources: [] }
  let current: LessonSection = 'learn'
  for (const child of flatten(children)) {
    if (isValidElement(child)) {
      const props = child.props as { children?: ReactNode }
      const title = nodeText(props.children).trim()
      if (child.type === 'h2' && title in SECTION_BY_TITLE) {
        current = SECTION_BY_TITLE[title]
        continue
      }
      if (isH3(child)) toc[current].push({ id: headingId(title), title })
    }
    sections[current].push(child)
  }
  return { sections, toc }
}
