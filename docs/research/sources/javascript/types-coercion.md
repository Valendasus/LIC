# Примитивы, объекты и приведение типов

Лист: `javascript/types/types-coercion`. Приоритет: 2 из 231 (263 вопроса, 5 сборников из 6).

## Что обязательно знать

- **Восемь типов** языка: семь примитивов — Undefined, Null, Boolean, Number, BigInt, String, Symbol — и Object. Функции и массивы — объекты. (ECMA-262, §6.1 ECMAScript Language Types.)
- **Примитив неизменяем и сравнивается по значению.** Методы у строки работают через временную обёртку (`ToObject`), поэтому `'abc'.length` работает, а `str.foo = 1` молча теряется (в строгом режиме — TypeError).
- **`typeof`**: возвращает одно из `'undefined' | 'boolean' | 'number' | 'bigint' | 'string' | 'symbol' | 'function' | 'object'`. Ловушки: `typeof null === 'object'` (историческая ошибка, исправлять не будут), `typeof function(){} === 'function'`, у необъявленной переменной `typeof x === 'undefined'` без ReferenceError — но в TDZ (`let x` ниже) будет ReferenceError.
- **Абстрактные операции приведения** (§7.1): `ToPrimitive`, `ToNumber`, `ToString`, `ToBoolean`, `ToPropertyKey`. Неявное приведение — это всегда одна из них.
- **ToPrimitive(obj, hint)**: сначала `obj[Symbol.toPrimitive](hint)`, если есть. Иначе для hint `'string'` — `toString`, потом `valueOf`; для `'number'` и `'default'` — наоборот. Date — исключение: для `'default'` берёт строку.
- **Falsy-значения** ровно такие: `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN` и `document.all`. Всё остальное truthy, включая `'0'`, `'false'`, `[]`, `{}`, `new Boolean(false)`.
- **Оператор `+`**: если после ToPrimitive хотя бы один операнд — строка, это конкатенация. Иначе числовое сложение. Остальные арифметические операторы всегда приводят к числу.
- **Явное приведение**: `Number(x)`, `String(x)`, `Boolean(x)` или `!!x`. `parseInt` и `parseFloat` разбирают строку до первого неподходящего символа, `Number` — требует всю строку.

## Тонкие места

| Выражение | Результат | Почему |
|---|---|---|
| `[] + []` | `''` | оба массива → `''` |
| `[] + {}` | `'[object Object]'` | |
| `1 + '2'` / `'3' - 1` | `'12'` / `2` | `+` склеивает, `-` считает |
| `+[]` / `+{}` / `+[5]` / `+[1,2]` | `0` / `NaN` / `5` / `NaN` | через ToPrimitive → строку → число |
| `Number('')` / `Number(' 12 ')` / `Number('12px')` | `0` / `12` / `NaN` | пробелы обрезаются, пустая строка → 0 |
| `parseInt('12px')` / `parseInt(0.0000005)` | `12` / `5` | второе — число: `String(0.0000005) === '5e-7'`. Со строкой `'0.0000005'` будет `0` |
| `Number(null)` / `Number(undefined)` | `0` / `NaN` | |
| `1n + 1` | TypeError | BigInt и Number не смешиваются |
| `String(Symbol('a'))` / `` `${Symbol('a')}` `` | `'Symbol(a)'` / TypeError | неявно символ в строку не приводится |
| `[10, 1, 2].sort()` | `[1, 10, 2]` | сортировка по строкам |

- **Обёртки** `new Number(0)`, `new String('')` — объекты, а значит truthy. Писать `new` с ними не нужно никогда. Функции `Number(x)` и `String(x)` без `new` возвращают примитив.
- **null и undefined.** `undefined` — «значения нет, никто не присваивал». `null` — «значения нет намеренно». JSON знает только `null`: `JSON.stringify({a: undefined})` даёт `'{}'`, а в массиве `undefined` становится `null`.
- **«Undeclared»** (вопрос из сборников) — переменная, которая не объявлена вовсе. Чтение даёт ReferenceError, присваивание вне строгого режима создаёт глобальное свойство.
- **Строки — последовательности UTF-16.** `'😀'.length === 2`. Перебор `for…of` и `[...str]` идёт по кодовым точкам. `isWellFormed()` и `toWellFormed()` (ES2024) находят и чинят одиночные суррогаты, которые ломают `encodeURIComponent`.
- **JSON.** `JSON.stringify` пропускает функции, символы и `undefined` в объектах, вызывает `toJSON`, падает на циклических ссылках и на BigInt. Даты превращаются в ISO-строки и обратно сами не разбираются.

## Что изменилось

- `String.prototype.isWellFormed` / `toWellFormed` — ES2024, Baseline широко.
- `JSON.parse` с доступом к исходному тексту (ES2026): `reviver` получает третий аргумент `{ source }`, а `JSON.rawJSON('12345678901234567890')` позволяет сериализовать большое число без потери точности. Baseline недавно (03.2025).
- Приведение типов не менялось. Меняется только набор встроенных типов.

## Что спрашивают

- Какие типы данных есть в JavaScript? Чем примитив отличается от объекта?
- Разница между `null`, `undefined` и необъявленной переменной.
- Почему `typeof null === 'object'`?
- Что выведет `[] + {}`, `'5' - 2`, `'5' + 2`, `true + 1`?
- Какие значения falsy?
- Передача по значению и по ссылке. Правильный ответ: в JavaScript всё передаётся по значению. У объекта значение — ссылка, поэтому мутация видна снаружи, а переприсваивание параметра — нет.
- Способы создать объект: литерал, `new`, `Object.create`, класс.

## Идеи для практики

- **Карточки:** список falsy; порядок ToPrimitive для `+`; `typeof null`; почему `0.1 + 0.2` — это другая тема (numbers); «передача по ссылке» — ловушка формулировки.
- **Задачи на вывод:** 8–10 выражений с `+`, `-`, `==`, `[]`, `{}` — объяснение обязательно со ссылкой на ToPrimitive.
- **Задача с редактором:** `isPlainObject(value)`, `typeOf(value)`, которая различает `null`, массив, дату и т. п. Подсказка — `Object.prototype.toString.call`.
- **Задача из работы:** нормализовать значения из query-строки и формы (`'0'`, `''`, `'false'`), не потеряв `0`. Ловушка — `value || default` против `value ?? default`.

## Источники

- ECMA-262, §6.1 ECMAScript Language Types — https://tc39.es/ecma262/#sec-ecmascript-language-types
- ECMA-262, §7.1 Type Conversion — https://tc39.es/ecma262/#sec-type-conversion
- MDN, JavaScript data types and data structures — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures
- MDN, Type coercion — https://developer.mozilla.org/en-US/docs/Glossary/Type_coercion
- MDN, Falsy — https://developer.mozilla.org/en-US/docs/Glossary/Falsy
- MDN, `Symbol.toPrimitive` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toPrimitive
- Предложение JSON.parse source text access — https://github.com/tc39/proposal-json-parse-with-source
