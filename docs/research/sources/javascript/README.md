# JavaScript: исследование по первоисточникам

Собрано 11 ноября 2026. Основа для уроков блока JavaScript.

## Как читать

Одна заметка на один лист дерева, имя файла совпадает с листом: `types-coercion.md` → `javascript/types/types-coercion`. В каждой заметке:

- **Что обязательно знать** — суть, без которой тема не понята.
- **Тонкие места** — граничные случаи, на которых ошибаются и которые любят на собеседованиях.
- **Что изменилось** — новое в ES2024–ES2027 и статус в браузерах.
- **Что спрашивают** — частые вопросы из `docs/research/interview-questions.json`.
- **Идеи для практики** — карточки и задачи, которые проверяют понимание, а не определение.
- **Источники** — спецификация, MDN, HTML Standard, предложения TC39, данные Baseline.

Порядок заметок — по приоритету из исследования вопросов.

## Первоисточники

| Что | Где | Для чего |
|---|---|---|
| ECMAScript (живая редакция) | https://tc39.es/ecma262/ | Точная семантика языка |
| Завершённые предложения TC39 | https://github.com/tc39/proposals/blob/main/finished-proposals.md | Что и в какую редакцию вошло |
| HTML Standard — event loops | https://html.spec.whatwg.org/multipage/webappapis.html#event-loops | Задачи, микрозадачи, рендеринг |
| MDN — JavaScript | https://developer.mozilla.org/en-US/docs/Web/JavaScript | Справочник с примерами и совместимостью |
| web-features / Baseline | https://web-platform-dx.github.io/web-features-explorer/ | Статус поддержки. Данные — пакет `web-features` 3.45.0 |
| MDN browser-compat-data | https://github.com/mdn/browser-compat-data | Версии браузеров по отдельным API. Данные — 8.1.8 от 02.11.2026 |
| V8 blog | https://v8.dev/features | Объяснения новых возможностей от авторов движка |

Сборники вопросов первоисточником не считаются: их используем только как список того, о чём спрашивают.

## Что нового в языке: сводка

Год редакции взят из списка завершённых предложений TC39. Baseline: **широко** — давно во всех основных браузерах, **недавно** — во всех основных браузерах меньше 2,5 лет, **нет** — не хватает хотя бы одного браузера.

### ES2024

| Возможность | Baseline | Лист |
|---|---|---|
| `Object.groupBy`, `Map.groupBy` | широко с 09.2026 | arrays, map-set |
| `Promise.withResolvers` | широко с 09.2026 | promises |
| `ArrayBuffer.prototype.transfer`, resizable ArrayBuffer | широко с 09.2026 | memory |
| `String.prototype.isWellFormed` / `toWellFormed` | широко | types-coercion |
| Флаг `v` в RegExp (множества, свойства строк) | широко | regex |
| `Atomics.waitAsync` | недавно (11.2025) | — (воркеры) |

### ES2025

| Возможность | Baseline | Лист |
|---|---|---|
| Методы итераторов: `Iterator.prototype.map/filter/take/drop/flatMap/reduce/toArray/…`, `Iterator.from` | недавно (03.2025) | iteration, generators |
| Методы Set: `union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom` | недавно (06.2024) | map-set |
| `Promise.try` | недавно (01.2025) | promises |
| Import attributes и JSON-модули: `import data from './x.json' with { type: 'json' }` | недавно (04.2025) | modules |
| `RegExp.escape` | недавно (05.2025) | regex |
| Модификаторы RegExp `(?i:…)` | недавно: Chrome 125, Firefox 132, Safari 26 | regex |
| Одинаковые имена групп в разных ветках `(?<y>\d{4})-…\|…(?<y>\d{4})` | недавно: Chrome 125, Firefox 129, Safari 17 | regex |
| `Float16Array`, `Math.f16round` | недавно (04.2025) | numbers |

### ES2026

| Возможность | Baseline | Лист |
|---|---|---|
| `Array.fromAsync` | широко с 07.2026 | generators, async-await |
| `Error.isError` | нет: Safari | errors |
| `Math.sumPrecise` | недавно (04.2026) | numbers |
| `Uint8Array.fromBase64` / `toBase64` / `fromHex` / `toHex` | недавно (09.2025) | numbers, modern-es |
| `Iterator.concat` | недавно (03.2026) | iteration |
| `Map.prototype.getOrInsert` / `getOrInsertComputed` (и у WeakMap) | недавно (02.2026) | map-set |
| `JSON.parse` с доступом к исходному тексту, `JSON.rawJSON` | недавно (03.2025) | numbers, types-coercion |

### ES2027 (уже стадия 4)

| Возможность | Baseline | Лист |
|---|---|---|
| **Temporal** | нет: Safari. Chrome 144, Firefox 139 | dates-intl |
| **Явное управление ресурсами**: `using`, `await using`, `Symbol.dispose`, `DisposableStack` | нет: Safari. Chrome 134, Firefox 141 | errors, modern-es |
| `Iterator.zip`, `Iterator.zipKeyed` | нет | iteration |
| Разбиение итератора на части (`chunks`, `windows`) | нет | iteration |
| `Iterator.prototype.includes`, `join` | нет | iteration |
| `Atomics.pause` | недавно | — (воркеры) |

Также в 2026 году `top-level await` стал Baseline «недавно» (Safari 27, 09.2026). Раньше его считали поддержанным везде, но в Safari оставались ошибки.

**Вывод для уроков.** В продакшене без полифила сегодня можно писать всё до ES2025 включительно и большую часть ES2026. Temporal и `using` — уже стандарт, но в Safari их нет: в уроке показываем их как ближайшее будущее, с полифилом (`temporal-polyfill`, `@js-temporal/polyfill`) или транспиляцией (TypeScript ≥ 5.2 и Babel умеют `using`).

## Заметки

1. [types-coercion](types-coercion.md) — примитивы, объекты, приведение
2. [scope-hoisting](scope-hoisting.md) — области видимости, hoisting, TDZ
3. [classes](classes.md) — классы, наследование, приватные поля
4. [iteration](iteration.md) — протокол итерации, spread, деструктуризация
5. [this](this.md)
6. [arrays](arrays.md)
7. [functional](functional.md)
8. [closures](closures.md)
9. [immutability](immutability.md)
10. [modules](modules.md)
11. [event-loop](event-loop.md)
12. [promises](promises.md), [async-await](async-await.md), [combinators](combinators.md), [cancellation](cancellation.md)
13. [map-set](map-set.md)
14. [errors](errors.md)
15. [numbers](numbers.md)
16. [prototypes](prototypes.md)
17. [equality](equality.md)
18. [metaprogramming](metaprogramming.md)
19. [modern-es](modern-es.md)
20. [dates-intl](dates-intl.md)
21. [memory](memory.md)
22. [regex](regex.md)
23. [generators](generators.md)
