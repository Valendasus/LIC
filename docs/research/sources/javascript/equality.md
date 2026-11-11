# Сравнение: ==, === и Object.is

Лист: `javascript/types/equality`. Приоритет: 66 (18 вопросов). Вопрос почти всегда идёт вместе с приведением типов.

## Что обязательно знать

В языке четыре алгоритма равенства (ECMA-262, §7.2):

| Алгоритм | Где используется | NaN = NaN | +0 = −0 |
|---|---|---|---|
| IsLooselyEqual (`==`) | `==`, `!=` | нет | да |
| IsStrictlyEqual (`===`) | `===`, `!==`, `indexOf`, `lastIndexOf`, `case` в `switch` | нет | да |
| SameValueZero | `includes`, `Map`, `Set`, `TypedArray#includes` | **да** | да |
| SameValue | `Object.is`, `Object.defineProperty` для неконфигурируемых свойств | **да** | **нет** |

- **`==` с разными типами:** `null == undefined` — true, и больше ни с чем они не равны. Число и строка → строку приводят к числу. Boolean → сначала к числу. Объект и примитив → объект через ToPrimitive. BigInt и строка → строку в BigInt.
- **Объекты сравниваются по ссылке** во всех четырёх алгоритмах. Глубокого сравнения в языке нет.
- **Правило в коде:** везде `===`. Единственный общепринятый `==` — `x == null`, он проверяет сразу `null` и `undefined`. С появлением `??` нужен ещё реже.

## Тонкие места

- `[1,2].includes(NaN)` → false, `[NaN].includes(NaN)` → true, `[NaN].indexOf(NaN)` → −1.
- `new Set([0, -0]).size` → 1, `Object.is(0, -0)` → false.
- `[] == ![]` → true: `![]` → false → 0, `[]` → `''` → 0.
- `'' == 0`, `'0' == 0` → true, но `'' == '0'` → false: `==` не транзитивно.
- `null >= 0` → true, хотя `null == 0` → false: сравнение `>=` приводит к числу, а `==` для `null` особый.
- `NaN !== NaN` — единственное значение, не равное себе. Проверка: `Number.isNaN(x)`. Глобальный `isNaN('abc')` → true, потому что сначала приводит к числу.
- React сравнивает состояние и зависимости хуков через `Object.is`. Поэтому `setState(NaN)` при текущем `NaN` не перерисует компонент, а новый массив с тем же содержимым — перерисует.

## Что изменилось

Ничего. Алгоритмы стабильны с ES2015, тогда добавили `Object.is` и SameValueZero.

## Что спрашивают

- Разница между `==` и `===`.
- Что такое `Object.is` и чем он отличается от `===`?
- Почему `NaN !== NaN` и как проверить NaN?
- Что выведет `null == 0`, `null >= 0`, `[] == false`?
- Как сравнить два объекта?

## Идеи для практики

- **Карточка-таблица:** четыре алгоритма × NaN / ±0 → где какой используется.
- **Задача на вывод:** 8 сравнений, включая нетранзитивность.
- **Задача с редактором:** `shallowEqual(a, b)` как в React (`Object.is` по ключам), затем `deepEqual` с массивами, датами и циклами.

## Источники

- ECMA-262, §7.2 Testing and Comparison Operations — https://tc39.es/ecma262/#sec-testing-and-comparison-operations
- MDN, Equality comparisons and sameness — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness
- react.dev, `useState` — сравнение через `Object.is` — https://react.dev/reference/react/useState#setstate
