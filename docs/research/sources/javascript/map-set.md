# Map, Set, WeakMap, WeakRef

Лист: `javascript/collections/map-set`. Приоритет: 39 (33 вопроса, 4 сборника).

## Что обязательно знать

- **`Map`** — словарь с ключами **любого типа**, в том числе объектами. Сравнение ключей — SameValueZero (`NaN` равен `NaN`, `+0` равен `−0`). Порядок перебора — порядок вставки. `size` за O(1). Итерируем напрямую.
- **Map против объекта:**

| | Object | Map |
|---|---|---|
| Ключи | строки и символы | любые значения |
| Порядок | целочисленные первыми, затем вставки | порядок вставки |
| Размер | `Object.keys(o).length` | `map.size` |
| Унаследованные ключи | есть (`toString`, `__proto__`) | нет |
| Частые добавления и удаления | медленнее | оптимизирован |
| JSON | нативно | нужно `Object.fromEntries` |

- **`Set`** — множество уникальных значений (SameValueZero). Удаление дублей: `[...new Set(arr)]`. Проверка `has` — O(1), в отличие от `includes`.
- **`WeakMap` и `WeakSet`** держат ключи **слабо**: если на объект-ключ больше нет ссылок, запись исчезает вместе с ним. Ключи — только объекты и не зарегистрированные символы (ES2023). Нет перебора и `size` — иначе было бы видно работу сборщика мусора.
- **Применения WeakMap:** приватные данные объекта (до `#field`), кэш результатов для объекта, метаданные DOM-узлов без утечек.
- **`WeakRef`** и **`FinalizationRegistry`** (ES2021) — слабая ссылка на объект и колбэк после его сборки. Поведение недетерминированно; спецификация прямо советует избегать их без нужды.

## Тонкие места

- **Ключ-объект сравнивается по ссылке:** `map.set({ id: 1 }, …)` и `map.get({ id: 1 })` → `undefined`.
- **`map[key] = value`** не кладёт в Map, а создаёт свойство объекта Map — частая ошибка.
- **`JSON.stringify(new Map())`** → `'{}'`. Сериализация: `Object.fromEntries(map)` или `[...map]`.
- **Изменение при переборе** допустимо: удалённые ещё не пройденные записи пропускаются, добавленные — будут пройдены.
- **WeakMap — не кэш с вытеснением.** Запись живёт, пока жив ключ. Для LRU нужен `Map` с ручным удалением старых (Map хранит порядок вставки — удобно для LRU).
- **В React состоянии Map и Set** нужно копировать: `new Map(prev).set(k, v)`. Мутация `prev.set` не вызовет перерисовку.

## Что изменилось

- **ES2025 — методы Set** (Baseline недавно, 06.2024): `union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`. Аргумент — любой «set-like» объект с `size`, `has`, `keys`, в том числе Map.
- **ES2024 — `Map.groupBy(items, fn)`**: группировка в Map, когда ключи — объекты или важен порядок.
- **ES2026 — upsert**: `map.getOrInsert(key, default)` и `map.getOrInsertComputed(key, fn)`, у WeakMap — так же. Baseline недавно (02.2026). Заменяет шаблон `if (!m.has(k)) m.set(k, []); m.get(k).push(x)`.
- ES2023: символы как ключи WeakMap.

## Что спрашивают

- Разница между Map и обычным объектом. Когда что использовать?
- Разница между Map/Set и WeakMap/WeakSet.
- Как превратить Set в массив? Как убрать дубли?
- Когда Set лучше массива?
- Зачем нужны WeakRef и FinalizationRegistry?

## Идеи для практики

- **Задачи с редактором:** `LRUCache(capacity)` на Map (уровень «средне»); `memoizeByObject` на WeakMap; пересечение и разность списков — сначала вручную, потом методами Set; группировка с `getOrInsertComputed`.
- **Карточки:** таблица Map и Object; почему у WeakMap нет `size`; ловушка `map[key] = value`.
- **Задача из работы:** выбранные строки таблицы как Set id в состоянии React — добавить, снять, выбрать все, без мутаций.

## Источники

- ECMA-262, §24.1 Map Objects, §24.2 Set Objects, §24.3 WeakMap — https://tc39.es/ecma262/#sec-keyed-collections
- ECMA-262, §26.1 WeakRef, §26.2 FinalizationRegistry — https://tc39.es/ecma262/#sec-managing-memory
- MDN, Map — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
- MDN, Set — методы композиции — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set#set_composition
- MDN, `Map.prototype.getOrInsertComputed` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/getOrInsertComputed
- Предложение Upsert — https://github.com/tc39/proposal-upsert
