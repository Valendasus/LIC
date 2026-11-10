import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/lib'
import { Kbd } from './Kbd'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  // Главная — светлая таблетка: самый контрастный элемент экрана.
  primary: 'bg-primary text-on-primary hover:bg-ink-300 font-semibold',
  secondary: 'bg-raised text-fg hover:bg-line-strong font-medium',
  outline: 'border border-line text-fg hover:border-line-strong hover:bg-surface',
  ghost: 'text-muted hover:text-fg hover:bg-surface',
  danger: 'border border-bad/50 text-bad hover:bg-bad-soft',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-2',
  md: 'h-11 px-5 text-[15px] gap-2.5',
  lg: 'h-13 px-6 text-base gap-3',
}

interface Common {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Иконка слева от подписи. */
  icon?: ReactNode
  /** Иконка справа: стрелка «дальше». */
  iconEnd?: ReactNode
  /** Горячая клавиша, показывается меткой внутри кнопки. */
  kbd?: string
  className?: string
  children: ReactNode
}

export function buttonClass({ variant = 'primary', size = 'md', className }: Pick<Common, 'variant' | 'size' | 'className'>) {
  return cn(
    // Не шире контейнера: длинная подпись обрезается многоточием, а не растягивает страницу на телефоне.
    'inline-flex max-w-full min-w-0 items-center justify-center rounded-full whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45',
    VARIANT[variant],
    SIZE[size],
    className,
  )
}

function Content({ icon, iconEnd, kbd, children, variant = 'primary' }: Common) {
  return (
    <>
      {icon}
      <span className="min-w-0 truncate">{children}</span>
      {iconEnd}
      {kbd && <Kbd tone={variant === 'primary' ? 'on-primary' : 'default'}>{kbd}</Kbd>}
    </>
  )
}

/** Кнопка платформы. Вариант — не копия: новый вид кнопки добавляется сюда. */
export function Button({ variant, size, icon, iconEnd, kbd, className, children, type = 'button', ...rest }: Common & Omit<ComponentProps<'button'>, 'children'>) {
  return (
    <button type={type} className={buttonClass({ variant, size, className })} {...rest}>
      <Content variant={variant} icon={icon} iconEnd={iconEnd} kbd={kbd}>
        {children}
      </Content>
    </button>
  )
}

/** Ссылка, которая выглядит как кнопка. */
export function ButtonLink({ variant, size, icon, iconEnd, kbd, className, children, ...rest }: Common & Omit<ComponentProps<typeof Link>, 'children'>) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...rest}>
      <Content variant={variant} icon={icon} iconEnd={iconEnd} kbd={kbd}>
        {children}
      </Content>
    </Link>
  )
}
