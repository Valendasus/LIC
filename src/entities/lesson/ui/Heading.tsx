import type { ComponentProps } from 'react'
import { headingId, nodeText } from '../model/split'

/** Заголовок раздела урока с id: на него ссылается оглавление шага. */
export function H3({ children, ...rest }: ComponentProps<'h3'>) {
  return (
    <h3 id={headingId(nodeText(children))} {...rest}>
      {children}
    </h3>
  )
}
