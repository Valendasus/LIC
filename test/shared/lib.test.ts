import { describe, expect, it } from 'vitest'
import { count, plural } from '@/shared/lib'

describe('склонение по числу', () => {
  const forms: [string, string, string] = ['элемент', 'элемента', 'элементов']
  it('один, несколько, много — с исключениями 11–14', () => {
    expect([1, 21, 101].map((n) => plural(n, forms))).toEqual(['элемент', 'элемент', 'элемент'])
    expect([2, 3, 4, 22, 104].map((n) => plural(n, forms))).toEqual(Array(5).fill('элемента'))
    expect([0, 5, 11, 12, 13, 14, 20, 111, 112].map((n) => plural(n, forms))).toEqual(Array(9).fill('элементов'))
    expect(count(24, forms)).toBe('24 элемента')
  })
})
