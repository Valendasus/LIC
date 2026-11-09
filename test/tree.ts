import { renderToStaticMarkup } from 'react-dom/server'
import { isValidElement, type ReactElement, type ReactNode } from 'react'

type AnyElement = ReactElement<Record<string, unknown>>

/** Все элементы дерева JSX (без вызова компонентов), удовлетворяющие условию. */
export function findAll(node: ReactNode, match: (element: AnyElement) => boolean): AnyElement[] {
  const out: AnyElement[] = []
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit)
    if (!isValidElement(value)) return
    const element = value as AnyElement
    if (match(element)) out.push(element)
    visit(element.props.children)
  }
  visit(node)
  return out
}

/** Элементы определённого компонента. */
export const byType = (node: ReactNode, type: unknown) => findAll(node, (element) => element.type === type)

/** Весь текст дерева JSX, включая строки внутри компонентов. */
export function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}

/** Полный рендер синхронного дерева (после await серверной страницы): текст и ссылки вложенных компонентов. */
export function rendered(node: ReactNode) {
  const html = renderToStaticMarkup(node as ReactElement)
  const text = html
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1].replace(/&amp;/g, '&'))
  return { html, text, hrefs }
}
