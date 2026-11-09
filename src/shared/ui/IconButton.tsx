import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/lib'

/** Кнопка-иконка. Подпись обязательна: у иконки нет текста для скринридера. */
export function IconButton({ label, children, className, type = 'button', ...rest }: { label: string; children: ReactNode } & Omit<ComponentProps<'button'>, 'children' | 'aria-label'>) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn('inline-flex size-11 items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-surface hover:text-fg', className)}
      {...rest}
    >
      {children}
    </button>
  )
}
