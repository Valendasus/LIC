import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib'

/** Поверхность-карточка. Глубина — светлотой поверхности, а не тенью и рамкой. */
export function Card({ className, interactive = false, ...rest }: ComponentProps<'div'> & { interactive?: boolean }) {
  return <div className={cn('rounded-panel bg-surface', interactive && 'transition-colors duration-150 hover:bg-raised', className)} {...rest} />
}

/** Подпись раздела в карточке: мелкие заглавные. */
export function Eyebrow({ className, ...rest }: ComponentProps<'p'>) {
  return <p className={cn('text-xs font-medium tracking-[0.08em] text-muted uppercase', className)} {...rest} />
}
