import { describe, expect as vexpect, it } from 'vitest'
import { deepEqual, expect, isSolved, runCode, show, sleep, spy } from '@/lib/code-runner'

/** Ошибка проверки или undefined, если проверка прошла. */
function failure(check: () => void) {
  try {
    check()
    return undefined
  } catch (error) {
    return (error as Error).message
  }
}

async function failureAsync(check: () => Promise<void>) {
  try {
    await check()
    return undefined
  } catch (error) {
    return (error as Error).message
  }
}

describe('show — значение в тексте ошибки', () => {
  it('строки, числа, особые значения', () => {
    vexpect(show('a')).toBe('"a"')
    vexpect(show(1)).toBe('1')
    vexpect(show(undefined)).toBe('undefined')
    vexpect(show(NaN)).toBe('NaN')
    vexpect(show(Symbol('s'))).toBe('Symbol(s)')
    vexpect(show(10n)).toBe('10n')
    vexpect(show(null)).toBe('null')
  })

  it('функции, ошибки, коллекции, объекты', () => {
    vexpect(show(function named() {})).toBe('[функция named]')
    vexpect(show(() => {})).toBe('[функция без имени]')
    vexpect(show(new TypeError('плохо'))).toBe('TypeError: плохо')
    vexpect(show(/a+/g)).toBe('/a+/g')
    vexpect(show(new Map([['a', 1]]))).toBe('Map(1) [["a",1]]')
    vexpect(show(new Set([1, 2]))).toBe('Set(2) [1,2]')
    vexpect(show({ a: [1, undefined] })).toBe('{"a":[1,undefined]}')
  })

  it('циклический объект не роняет вывод', () => {
    const loop: Record<string, unknown> = {}
    loop.self = loop
    vexpect(show(loop)).toBe('[object Object]')
  })
})

describe('deepEqual', () => {
  it('примитивы и NaN', () => {
    vexpect(deepEqual(1, 1)).toBe(true)
    vexpect(deepEqual(NaN, NaN)).toBe(true)
    vexpect(deepEqual(1, '1')).toBe(false)
    vexpect(deepEqual(null, {})).toBe(false)
    vexpect(deepEqual({}, null)).toBe(false)
  })

  it('массивы и объекты', () => {
    vexpect(deepEqual([1, { a: 2 }], [1, { a: 2 }])).toBe(true)
    vexpect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    vexpect(deepEqual({ a: 1 }, { b: 1 })).toBe(false)
    vexpect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    vexpect(deepEqual([1], { 0: 1 })).toBe(false)
  })

  it('даты, Map, Set', () => {
    vexpect(deepEqual(new Date(1), new Date(1))).toBe(true)
    vexpect(deepEqual(new Date(1), new Date(2))).toBe(false)
    vexpect(deepEqual(new Map([['a', [1]]]), new Map([['a', [1]]]))).toBe(true)
    vexpect(deepEqual(new Map([['a', 1]]), new Map([['b', 1]]))).toBe(false)
    vexpect(deepEqual(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false)
    vexpect(deepEqual(new Map(), new Map([['a', 1]]))).toBe(false)
    vexpect(deepEqual(new Set([1, 2]), new Set([2, 1]))).toBe(true)
    vexpect(deepEqual(new Set([1]), new Set([2]))).toBe(false)
    vexpect(deepEqual(new Set([1]), new Set([1, 2]))).toBe(false)
  })
})

describe('expect — проверки в тестах задач', () => {
  it('каждая проверка: проходит, не проходит, и наоборот через not', () => {
    class Point {}
    const cases: [string, () => void, () => void, string][] = [
      ['toBe', () => expect(1).toBe(1), () => expect(1).toBe(2), 'Ожидалось 2, получено 1'],
      ['toEqual', () => expect([1]).toEqual([1]), () => expect([1]).toEqual([2]), 'Ожидалось [2], получено [1]'],
      ['toBeTruthy', () => expect(1).toBeTruthy(), () => expect(0).toBeTruthy(), 'Ожидалось истинное значение, получено 0'],
      ['toBeFalsy', () => expect('').toBeFalsy(), () => expect('x').toBeFalsy(), 'Ожидалось ложное значение, получено "x"'],
      ['toBeUndefined', () => expect(undefined).toBeUndefined(), () => expect(1).toBeUndefined(), 'Ожидалось undefined, получено 1'],
      ['toBeNull', () => expect(null).toBeNull(), () => expect(0).toBeNull(), 'Ожидалось null, получено 0'],
      ['toContain строка', () => expect('abc').toContain('b'), () => expect('abc').toContain('z'), 'Ожидалось, что "abc" содержит "z"'],
      ['toContain массив', () => expect([1, 2]).toContain(2), () => expect({}).toContain(1), 'Ожидалось, что {} содержит 1'],
      ['toHaveLength', () => expect([1, 2]).toHaveLength(2), () => expect(null).toHaveLength(1), 'Ожидалась длина 1, получено undefined'],
      ['toBeGreaterThan', () => expect(2).toBeGreaterThan(1), () => expect(1).toBeGreaterThan(1), 'Ожидалось больше 1, получено 1'],
      ['toBeLessThan', () => expect(1).toBeLessThan(2), () => expect(3).toBeLessThan(2), 'Ожидалось меньше 2, получено 3'],
      ['toBeCloseTo', () => expect(0.1 + 0.2).toBeCloseTo(0.3), () => expect(0.31).toBeCloseTo(0.3, 3), 'Ожидалось примерно 0.3, получено 0.31'],
      ['toBeInstanceOf', () => expect(new Point()).toBeInstanceOf(Point), () => expect({}).toBeInstanceOf(Point), 'Ожидался экземпляр Point, получено {}'],
      ['toThrow', () => expect(() => { throw new Error('бум') }).toThrow('бу'), () => expect(() => 1).toThrow(), 'Ожидалась ошибка, но код выполнился без неё'],
    ]
    for (const [name, pass, fail, message] of cases) {
      vexpect(failure(pass), name).toBeUndefined()
      vexpect(failure(fail), name).toBe(message)
    }
  })

  it('not переворачивает проверку и даёт свой текст', () => {
    const negated: [() => void, string][] = [
      [() => expect(1).not.toBe(1), 'Ожидалось значение, отличное от 1'],
      [() => expect([1]).not.toEqual([1]), 'Ожидалось значение, не равное [1]'],
      [() => expect(1).not.toBeTruthy(), 'Ожидалось ложное значение, получено 1'],
      [() => expect(0).not.toBeFalsy(), 'Ожидалось истинное значение, получено 0'],
      [() => expect(undefined).not.toBeUndefined(), 'Ожидалось значение, отличное от undefined'],
      [() => expect(null).not.toBeNull(), 'Ожидалось значение, отличное от null'],
      [() => expect('ab').not.toContain('a'), 'Ожидалось, что "ab" не содержит "a"'],
      [() => expect([]).not.toHaveLength(0), 'Ожидалась длина, отличная от 0'],
      [() => expect(2).not.toBeGreaterThan(1), 'Ожидалось не больше 1, получено 2'],
      [() => expect(1).not.toBeLessThan(2), 'Ожидалось не меньше 2, получено 1'],
      [() => expect(0.3).not.toBeCloseTo(0.3), 'Ожидалось значение, не близкое к 0.3'],
      [() => expect(new Date()).not.toBeInstanceOf(Date), 'Ожидалось, что значение не экземпляр Date'],
      [() => expect(() => { throw new Error('x') }).not.toThrow(), 'Ошибки не ожидалось, получена "x"'],
    ]
    for (const [check, message] of negated) vexpect(failure(check)).toBe(message)
    vexpect(failure(() => expect(1).not.toBe(2))).toBeUndefined()
    vexpect(failure(() => expect(() => 1).not.toThrow())).toBeUndefined()
  })

  it('toThrow: текст, регулярное выражение, не Error, не функция', () => {
    vexpect(failure(() => expect(() => { throw new Error('сеть') }).toThrow(/се/))).toBeUndefined()
    vexpect(failure(() => expect(() => { throw new Error('сеть') }).toThrow('диск'))).toBe('Ожидалась ошибка "диск", получена "сеть"')
    vexpect(failure(() => expect(() => { throw 'строка' }).toThrow('стр'))).toBeUndefined()
    vexpect(failure(() => expect(5).toThrow())).toBe('toThrow ожидает функцию: expect(() => код).toThrow()')
    vexpect(failure(() => expect(5).not.toThrow())).toBeUndefined()
  })

  it('resolves и rejects', async () => {
    vexpect(await failureAsync(() => expect(Promise.resolve(2)).resolves.toBe(2))).toBeUndefined()
    vexpect(await failureAsync(() => expect(Promise.resolve(2)).resolves.toBe(3))).toBe('Ожидалось 3, получено 2')
    vexpect(await failureAsync(() => expect(Promise.reject(new Error('нет'))).resolves.toBe(1))).toBe('Ожидалось успешное выполнение, промис отклонён: Error: нет')
    vexpect(await failureAsync(() => expect(Promise.reject(new Error('нет'))).rejects.toThrow('не'))).toBeUndefined()
    vexpect(await failureAsync(() => expect(Promise.reject(new Error('нет'))).rejects.toThrow('да'))).toBe('Ожидалась ошибка "да", получена "нет"')
    vexpect(await failureAsync(() => expect(Promise.reject(7)).rejects.toBe(7))).toBeUndefined()
    vexpect(await failureAsync(() => expect(Promise.resolve(1)).rejects.toThrow())).toBe('Ожидалось отклонение промиса, он выполнился со значением 1')
  })
})

describe('spy и sleep', () => {
  it('spy запоминает вызовы и возвращает результат реализации', () => {
    const double = spy((x: number) => x * 2)
    vexpect(double(2)).toBe(4)
    vexpect(double.calls).toEqual([[2]])
    const empty = spy()
    vexpect(empty()).toBeUndefined()
    vexpect(empty.calls).toEqual([[]])
  })

  it('sleep ждёт', async () => {
    const start = Date.now()
    await sleep(15)
    vexpect(Date.now() - start).toBeGreaterThanOrEqual(10)
  })
})

describe('runCode', () => {
  it('код и тесты в одной области видимости, результаты по тестам, вывод console', async () => {
    const result = await runCode(
      'function add(a, b) { console.log("add", a, b); console.warn({ x: 1 }); return a + b }',
      "test('верно', () => expect(add(1, 2)).toBe(3))\ntest('неверно', () => expect(add(1, 1)).toBe(3))\ntest('асинхронно', async () => { await sleep(1); expect(1).toBe(1) })",
    )
    vexpect(result).toEqual({
      status: 'ok',
      tests: [
        { name: 'верно', passed: true },
        { name: 'неверно', passed: false, error: 'Ожидалось 3, получено 2' },
        { name: 'асинхронно', passed: true },
      ],
      logs: ['add 1 2', '{"x":1}', 'add 1 1', '{"x":1}'],
    })
    vexpect(isSolved(result)).toBe(false)
  })

  it('export в решении убирается: код можно писать как модуль', async () => {
    const result = await runCode('export function a() { return 1 }\nexport default async function b() { return 2 }\nexport const c = 3', "test('t', async () => expect(a() + (await b()) + c).toBe(6))")
    vexpect(isSolved(result)).toBe(true)
  })

  it('синтаксическая ошибка и ошибка при запуске', async () => {
    const syntax = await runCode('function (', '')
    vexpect(syntax.status).toBe('error')
    vexpect(syntax.error).toMatch(/^Синтаксическая ошибка: /)

    const thrown = await runCode('console.log("до"); throw new RangeError("бум")', "test('t', () => {})")
    vexpect(thrown).toEqual({ status: 'error', tests: [], logs: ['до'], error: 'RangeError: бум' })
    vexpect(isSolved(thrown)).toBe(false)
  })

  it('исключение в тесте, которое не ошибка проверки, показывается как есть', async () => {
    const result = await runCode('', "test('t', () => { null.x })")
    vexpect(result.tests[0].error).toMatch(/^TypeError: /)
  })

  it('тест, который не завершается, останавливается по времени', async () => {
    const result = await runCode('', "test('вечный', () => new Promise(() => {}))", { testTimeoutMs: 20 })
    vexpect(result.tests).toEqual([{ name: 'вечный', passed: false, error: 'Тест не завершился за 0.02 с: промис так и не выполнился?' }])
  })

  it('без тестов задача не считается решённой', async () => {
    vexpect(isSolved(await runCode('const a = 1', ''))).toBe(false)
  })

  it('глобальные имена и уборка после каждого теста; ошибка уборки не мешает следующему тесту', async () => {
    let cleaned = 0
    const result = await runCode('', "test('a', () => expect(answer).toBe(42))\ntest('b', () => {})", {
      globals: { answer: 42 },
      afterEach: () => {
        cleaned++
        if (cleaned === 1) throw new Error('не убралось')
      },
    })
    vexpect(result.tests.every((item) => item.passed)).toBe(true)
    vexpect(cleaned).toBe(2)
    vexpect(result.logs).toEqual(['Ошибка при уборке после теста «a»: Error: не убралось'])
  })

  it('решение может объявить имя, совпадающее с глобальным', async () => {
    const result = await runCode('function render() { return 1 }\nconst test2 = 1', "test('t', () => expect(render()).toBe(1))", { globals: { render: () => 2 } })
    vexpect(isSolved(result)).toBe(true)
  })
})

describe('проверки элементов DOM', () => {
  /** Похожий на элемент объект: проверки смотрят только на свойства. */
  const el = (props: Record<string, unknown> = {}) => ({
    tagName: 'BUTTON',
    textContent: '  Отправить   форму ',
    isConnected: true,
    getAttribute: (name: string) => (({ 'aria-pressed': 'true' }) as Record<string, string>)[name] ?? null,
    ...props,
  })

  it('проходят и не проходят с понятным текстом', () => {
    const focused = el()
    ;(focused as Record<string, unknown>).ownerDocument = { activeElement: focused }
    const cases: [() => void, () => void, string][] = [
      [() => expect(el()).toBeInTheDocument(), () => expect(el({ isConnected: false })).toBeInTheDocument(), 'Ожидалось, что элемент есть на странице, получено <button> «Отправить   форму»'],
      [() => expect(el()).toHaveTextContent('Отправить форму'), () => expect(el()).toHaveTextContent(/нет/), 'Ожидался текст /нет/, на элементе "Отправить форму"'],
      [() => expect(el({ value: 'x' })).toHaveValue('x'), () => expect(el({ value: 'x' })).toHaveValue('y'), 'Ожидалось значение "y", у поля "x"'],
      [() => expect(el()).toHaveAttribute('aria-pressed', 'true'), () => expect(el()).toHaveAttribute('aria-pressed', 'false'), 'Ожидался атрибут aria-pressed="false", получено "true"'],
      [() => expect(el()).toHaveAttribute('aria-pressed'), () => expect(el()).toHaveAttribute('hidden'), 'Ожидался атрибут hidden, получено нет атрибута'],
      [() => expect(el({ disabled: true })).toBeDisabled(), () => expect(el({ textContent: '' })).toBeDisabled(), 'Ожидалось, что элемент недоступен: <button>'],
      [() => expect(el({ checked: true })).toBeChecked(), () => expect(el()).toBeChecked(), 'Ожидалось, что элемент отмечен: <button> «Отправить   форму»'],
      [() => expect(focused).toHaveFocus(), () => expect(el()).toHaveFocus(), 'Ожидался фокус на <button> «Отправить   форму»'],
    ]
    for (const [pass, fail, message] of cases) {
      vexpect(failure(pass)).toBeUndefined()
      vexpect(failure(fail)).toBe(message)
    }
  })

  it('null вместо элемента и not', () => {
    vexpect(failure(() => expect(null).toBeInTheDocument())).toBe('Ожидалось, что элемент есть на странице, получено null')
    vexpect(failure(() => expect(null).toHaveTextContent('a'))).toBe('Ожидался текст "a", на элементе ""')
    vexpect(failure(() => expect(null).toHaveValue(''))).toBe('Ожидалось значение "", у поля undefined')
    vexpect(failure(() => expect(null).toHaveAttribute('a'))).toBe('Ожидался атрибут a, получено нет атрибута')
    vexpect(failure(() => expect(null).toBeDisabled())).toBe('Ожидалось, что элемент недоступен: null')
    vexpect(failure(() => expect(null).toBeChecked())).toBe('Ожидалось, что элемент отмечен: null')
    vexpect(failure(() => expect(null).toHaveFocus())).toBe('Ожидался фокус на null')
    vexpect(failure(() => expect({ tagName: 'P' }).toHaveFocus())).toBe('Ожидался фокус на <p>')
    const negated: [() => void, string][] = [
      [() => expect(el()).not.toBeInTheDocument(), 'Ожидалось, что элемента нет на странице: <button> «Отправить   форму»'],
      [() => expect(el()).not.toHaveTextContent('Отправить'), 'Не ожидался текст "Отправить", на элементе "Отправить форму"'],
      [() => expect(el({ value: 1 })).not.toHaveValue(1), 'Ожидалось значение, отличное от 1'],
      [() => expect(el()).not.toHaveAttribute('aria-pressed'), 'Не ожидался атрибут aria-pressed'],
      [() => expect(el({ disabled: true })).not.toBeDisabled(), 'Ожидалось, что элемент доступен: <button> «Отправить   форму»'],
      [() => expect(el({ checked: true })).not.toBeChecked(), 'Ожидалось, что элемент не отмечен: <button> «Отправить   форму»'],
    ]
    for (const [check, message] of negated) vexpect(failure(check)).toBe(message)
    const self = el()
    ;(self as Record<string, unknown>).ownerDocument = { activeElement: self }
    vexpect(failure(() => expect(self).not.toHaveFocus())).toBe('Не ожидался фокус на <button> «Отправить   форму»')
  })
})
