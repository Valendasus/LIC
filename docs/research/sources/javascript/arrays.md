# Массивы и их методы

Лист: `javascript/collections/arrays`. Приоритет: 15 (56 вопросов, 5 сборников из 6).

## Что обязательно знать

- **Массив — объект** с целочисленными ключами и особым свойством `length`. Запись по индексу ≥ `length` увеличивает `length`, а уменьшение `length` удаляет элементы (§10.4.2 Array Exotic Objects).
- **Мутирующие и немутирующие методы** — главное деление:

| Мутируют | Не мутируют (возвращают новое) |
|---|---|
| `push`, `pop`, `shift`, `unshift` | `concat`, `slice`, `map`, `filter`, `flat`, `flatMap` |
| `splice` | `toSpliced` (ES2023) |
| `sort`, `reverse` | `toSorted`, `toReversed` (ES2023) |
| `fill`, `copyWithin` | `with(index, value)` (ES2023) |

- **Поиск:** `indexOf` / `lastIndexOf` (строгое равенство), `includes` (SameValueZero, находит `NaN`), `find` / `findIndex`, `findLast` / `findLastIndex` (ES2023), `some` / `every`.
- **`at(-1)`** (ES2022) — последний элемент без `arr[arr.length - 1]`.
- **Группировка:** `Object.groupBy(items, fn)` и `Map.groupBy(items, fn)` (ES2024, Baseline широко с 09.2026). `Object.groupBy` возвращает объект без прототипа.
- **Создание:** `Array.from(iterable, mapFn)`, `Array.from({ length: n }, (_, i) => i)`, `Array.of`. `Array(3)` создаёт массив с тремя дырами, а не `[3]`.
- **`sort`** без компаратора сортирует по строкам. С ES2019 сортировка гарантированно стабильная. Компаратор возвращает число: `(a, b) => a - b`. Для строк с учётом языка — `a.localeCompare(b)` или `Intl.Collator`.
- **`reduce`** без начального значения на пустом массиве → TypeError. Начальное значение лучше указывать всегда.
- **Проверка:** `Array.isArray(x)` — работает и для массивов из другого realm, в отличие от `instanceof Array`.

## Тонкие места

- **Дыры (sparse arrays).** `[1, , 3]`, `new Array(3)`, `delete arr[1]`. `forEach`, `map`, `filter`, `reduce` пропускают дыры. `for…of`, spread, `Array.from`, `find`, `includes` и новые методы ES2023 видят их как `undefined`. Писать с дырами не нужно, но вопрос задают.
- **`map(parseInt)`** — `['1', '2', '3'].map(parseInt)` даёт `[1, NaN, NaN]`: `map` передаёт индекс вторым аргументом, а `parseInt` принимает его как основание.
- **Копия массива** `[...arr]`, `arr.slice()`, `Array.from(arr)` — поверхностные. Глубокая — `structuredClone`. Связь с immutability.md.
- **Очистка массива:** `arr.length = 0` мутирует (видно по всем ссылкам), `arr = []` создаёт новый.
- **`forEach` нельзя прервать** и он не ждёт промисов: `arr.forEach(async …)` запускает всё параллельно и не возвращает промис. Для последовательного ожидания — `for…of` с `await`, для параллельного — `Promise.all(arr.map(…))`.
- **Производительность.** `shift` и `unshift` — O(n). `includes` в цикле по большому массиву — O(n²), лучше `Set`. Цепочка `filter().map()` создаёт промежуточный массив; на десятках тысяч элементов это заметно.
- **Изменение массива во время перебора:** `forEach` и `map` берут `length` в начале. Добавленные элементы не обработаются, удалённые дадут пропуски.
- **Массивоподобные объекты** (`arguments`, `NodeList`, `HTMLCollection`) не массивы. `Array.from` их превращает. `NodeList` из `querySelectorAll` статичный и умеет `forEach`, `HTMLCollection` — живой.

## Что изменилось

- ES2022: `at`. ES2023: `findLast`, `findLastIndex`, `toSorted`, `toReversed`, `toSpliced`, `with` (Baseline широко с 01.2026).
- ES2024: `Object.groupBy`, `Map.groupBy`.
- ES2026: `Array.fromAsync` (Baseline широко с 07.2026) — собирает массив из асинхронного итерируемого.
- Для React важно: немутирующие методы ES2023 закрывают типичную ошибку `state.sort()`.

## Что спрашивают

- Как добавить, удалить, изменить элементы? Какие методы мутируют массив?
- Разница между `slice` и `splice`.
- Разница между `forEach` и `map`.
- Как работает `reduce`? Пример.
- Как проверить, что значение — массив?
- Как удалить дубли? (`[...new Set(arr)]`.)
- Как скопировать массив? Поверхностная и глубокая копия.
- Что такое разреженный массив?
- Почему `[10, 1, 2].sort()` даёт `[1, 10, 2]`?

## Идеи для практики

- **Карточки:** таблица мутирующих методов и их неизменяемых пар; что пропускает дыры; почему `map(parseInt)` ломается.
- **Задачи с редактором** (по нарастанию): `chunk`, `uniqBy`, `groupBy` без `Object.groupBy`, `flatten(depth)`, своя реализация `reduce` и `map` с поддержкой дыр, `sortBy` по нескольким ключам со стабильностью.
- **Задача на вывод:** `map(parseInt)`, `sort()` чисел, `forEach` с `async`.
- **Задача из работы:** обновление списка в состоянии React без мутаций — удалить, переставить, изменить элемент через `toSpliced`, `with`, `toSorted`.

## Источники

- ECMA-262, §23.1 Array Objects — https://tc39.es/ecma262/#sec-array-objects
- MDN, Array — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
- MDN, Sparse arrays — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections#sparse_arrays
- MDN, `Object.groupBy` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy
- MDN, `Array.fromAsync` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fromAsync
- web-features: array-by-copy, array-group, array-fromasync — https://web-platform-dx.github.io/web-features-explorer/
