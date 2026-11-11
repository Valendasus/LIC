# Неизменяемость и копирование

Лист: `javascript/immutability`. Приоритет: 24 (31 вопрос, 5 сборников из 6). Вопросы чаще middle-уровня: 8 из 9 размеченных.

## Что обязательно знать

- **Неизменяемость привязки и значения — разные вещи.** `const` запрещает переприсвоить переменную, но объект под ней можно менять.
- **Уровни защиты объекта:**

| | Добавить свойство | Удалить | Изменить значение | Изменить дескриптор |
|---|---|---|---|---|
| `Object.preventExtensions` | нет | да | да | да |
| `Object.seal` | нет | нет | да | нет |
| `Object.freeze` | нет | нет | нет | нет |

  Все три поверхностные: вложенные объекты остаются изменяемыми. В строгом режиме нарушение → TypeError, иначе тихо игнорируется. Проверки: `Object.isExtensible`, `isSealed`, `isFrozen`.
- **Поверхностная копия:** `{ ...obj }`, `Object.assign({}, obj)`, `[...arr]`, `arr.slice()`. Вложенные объекты общие.
- **Глубокая копия:** `structuredClone(value)` (Baseline широко). Копирует Date, Map, Set, RegExp, ArrayBuffer, Blob, File, ошибки, циклические ссылки. **Не копирует** функции, DOM-узлы, символы как ключи, геттеры (вычисляет их в значения) и прототипы: экземпляр класса станет обычным объектом. На функции бросает `DataCloneError`.
- **`JSON.parse(JSON.stringify(x))`** — старый способ с потерями: теряет `undefined`, функции, символы, превращает Date в строку, Map и Set — в `{}`, падает на циклах и BigInt. `NaN` и `Infinity` → `null`.
- **Неизменяемые обновления** — основа состояния в React и Redux: новое значение на каждое изменение, чтобы сравнение по ссылке (`Object.is`) находило изменения. Структурное разделение: копируем только путь к изменённому месту, остальное переиспользуем.

## Тонкие места

- `Object.freeze` на массиве запрещает `push` (TypeError в строгом режиме), но не `map` — он возвращает новый массив.
- Замороженный объект в прототипе мешает наследнику создать одноимённое свойство присваиванием (см. prototypes.md).
- `{ ...obj }` копирует только собственные перечисляемые свойства и вычисляет геттеры. Прототип и неперечисляемые свойства теряются.
- `structuredClone` медленнее спреда и не сохраняет классы. Для состояния обычно нужен не глубокий клон, а точечное обновление.
- **Immer** и подобные библиотеки дают писать «мутирующий» код на черновике и получать неизменяемый результат через Proxy. Redux Toolkit использует Immer внутри редьюсеров.
- **Record и Tuple** (`#{}`, `#[]`) — предложение отозвано в апреле 2025 года, его поглотило более скромное предложение Composites (стадия 2). Неизменяемых составных примитивов с синтаксисом `#{}` в языке не будет. На собеседовании это можно упомянуть как «было и закрыли».

## Что изменилось

- ES2023: немутирующие методы массивов `toSorted`, `toReversed`, `toSpliced`, `with` (Baseline широко с 01.2026).
- `structuredClone` — Baseline широко с 09.2024 (часть HTML Standard, не ECMAScript).
- Record & Tuple отозваны.

## Что спрашивают

- Разница между изменяемыми и неизменяемыми объектами.
- Поверхностная и глубокая копия — разница и способы.
- Что делает `Object.freeze`? Чем отличается от `seal` и `preventExtensions`?
- Почему `JSON.parse(JSON.stringify())` — плохой способ клонирования?
- Зачем неизменяемость в React и Redux?

## Идеи для практики

- **Карточки:** таблица freeze / seal / preventExtensions; что теряет JSON-клон и `structuredClone`.
- **Задачи с редактором:** `deepFreeze`; `deepClone` с циклами, Date, Map и Set (сравнить со `structuredClone`); `setIn(obj, path, value)` со структурным разделением — тест проверяет, что нетронутые ветки сохраняют ссылку.
- **Задача на ошибку:** редьюсер, мутирующий состояние, из-за чего не перерисовывается список.

## Источники

- ECMA-262, §20.1.2 `Object.freeze`, `seal`, `preventExtensions` — https://tc39.es/ecma262/#sec-object.freeze
- HTML Standard, structured clone — https://html.spec.whatwg.org/multipage/structured-data.html#dom-structuredclone
- MDN, `structuredClone` — https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone
- MDN, The structured clone algorithm — https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
- MDN, Shallow copy, Deep copy — https://developer.mozilla.org/en-US/docs/Glossary/Shallow_copy
- react.dev, Updating Objects in State — https://react.dev/learn/updating-objects-in-state
- Предложение Record & Tuple (withdrawn) — https://github.com/tc39/proposal-record-tuple
