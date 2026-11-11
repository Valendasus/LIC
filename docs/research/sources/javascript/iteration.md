# Протокол итерации, spread и деструктуризация

Лист: `javascript/collections/iteration`. Приоритет: 8 (56 вопросов, 5 сборников из 6).

## Что обязательно знать

- **Итерируемый объект** — у которого есть метод `[Symbol.iterator]()`, возвращающий итератор. **Итератор** — объект с методом `next()`, который возвращает `{ value, done }`. Необязательные методы — `return()` (вызывается при досрочном выходе) и `throw()`.
- **Что потребляет протокол:** `for…of`, spread `[...x]` и `f(...x)`, деструктуризация массива, `Array.from`, `new Map(x)`, `new Set(x)`, `Promise.all(x)`, `yield*`.
- **Что итерируемо из коробки:** Array, String (по кодовым точкам), Map, Set, TypedArray, `arguments`, NodeList, генераторы. **Обычный объект — нет**: `for…of` по `{}` даёт TypeError. Для объектов — `Object.keys`, `values`, `entries`.
- **Spread объектов** `{ ...obj }` — не протокол итерации, а копирование собственных перечисляемых свойств (`CopyDataProperties`). Геттеры вычисляются, прототип не копируется.
- **Rest и spread** выглядят одинаково (`...`), но rest собирает (`function f(...args)`, `const [a, ...rest] = arr`), а spread раскладывает.
- **Деструктуризация:** значения по умолчанию срабатывают только на `undefined`, не на `null`. Переименование `{ a: x }`, вложенность, вычисляемые ключи `{ [key]: v }`. Деструктуризация `null` или `undefined` → TypeError.
- **`for…in` и `for…of`:** `for…in` перебирает перечисляемые строковые ключи, включая унаследованные, порядок — целочисленные по возрастанию, потом строки в порядке добавления. `for…of` перебирает значения итерируемого.

## Тонкие места

- **Досрочный выход** (`break`, `return`, исключение в `for…of`, деструктуризация `const [a] = gen()`) вызывает `iterator.return()`. Так генератор закрывает ресурс в `finally`.
- **Итератор одноразовый:** второй `for…of` по тому же итератору ничего не выведет. По массиву — выведет, потому что массив каждый раз создаёт новый итератор.
- `[...'😀a']` → `['😀', 'a']`, а `'😀a'.split('')` разрежет эмодзи. Для графем (флаги, семьи эмодзи) нужен `Intl.Segmenter`.
- **Порядок ключей объекта:** сначала целочисленные индексы по возрастанию, потом строки по порядку добавления, потом символы. Поэтому `{ b: 1, 2: 1, a: 1, 1: 1 }` перечисляется как `1, 2, b, a`.
- **Ленивость:** методы итераторов (ES2025) ленивые — `iter.map(f).take(3)` вызовет `f` только 3 раза. Методы массивов — жадные, создают промежуточные массивы.

## Что изменилось

- **ES2025 — методы итераторов** (Baseline недавно, 03.2025): `Iterator.from`, `.map`, `.filter`, `.take`, `.drop`, `.flatMap`, `.reduce`, `.toArray`, `.forEach`, `.some`, `.every`, `.find`. Работают на любом итераторе: `map.keys().filter(…)`, генераторы, `str[Symbol.iterator]()`.
- **ES2026 — `Iterator.concat(a, b, …)`** (Baseline недавно, 03.2026).
- **ES2027** (стадия 4, Baseline нет): `Iterator.zip` / `zipKeyed`, разбиение на части `chunks` / `windows`, `includes`, `join`. Chrome 153+ и Firefox 148+, в Safari нет.
- Асинхронные методы итераторов — пока предложение, в стандарт не вошли.

## Что спрашивают

- Какими конструкциями перебрать свойства объекта и элементы массива? Разница `for…in` и `for…of`.
- Что такое spread и rest, чем они отличаются?
- Что такое деструктуризация? Значения по умолчанию.
- Что такое итераторы и генераторы, зачем они нужны?
- Как сделать свой объект итерируемым?
- Как получить индекс в `for…of`? (`for (const [i, v] of arr.entries())`.)

## Идеи для практики

- **Задача с редактором:** `range(start, end, step)` как итерируемый объект — проверка через `for…of`, spread и повторную итерацию; ленивый `take` на генераторе; итерируемая связная очередь.
- **Задачи на вывод:** значения по умолчанию с `null` и `undefined`; порядок ключей объекта; повторный обход итератора; `return()` и `finally` при `break`.
- **Задача из работы:** заменить цепочку `filter().map().slice(0, 10)` на ленивую через методы итераторов и объяснить, когда это быстрее.
- **Карточки:** что итерируемо, а что нет; spread объекта и spread массива — разные механизмы.

## Источники

- ECMA-262, §27.1 Iteration — https://tc39.es/ecma262/#sec-iteration
- ECMA-262, §14.7.5 `for-in`, `for-of` — https://tc39.es/ecma262/#sec-for-in-and-for-of-statements
- ECMA-262, §10.1.11.1 OrdinaryOwnPropertyKeys (порядок ключей) — https://tc39.es/ecma262/#sec-ordinaryownpropertykeys
- MDN, Iteration protocols — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
- MDN, Iterator — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator
- MDN, Destructuring — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring
- Предложения: iterator helpers, iterator sequencing, joint iteration, chunking — https://github.com/tc39/proposals/blob/main/finished-proposals.md
