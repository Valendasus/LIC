/** Склеивает классы, пропуская пустые: cn('a', ok && 'b'). */
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
