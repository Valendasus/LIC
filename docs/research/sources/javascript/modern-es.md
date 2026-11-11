# Новое в ECMAScript 2024–2026

Лист: `javascript/modern-es`. Приоритет: 67 (17 вопросов). Сборники спрашивают в основном про ES6. Вопросы про ES2024+ почти не встречаются, и именно поэтому знание новинок выделяет кандидата.

## Как устроен выпуск языка

- **TC39** — комитет Ecma, который развивает язык. Предложение проходит стадии:
  - 0 — идея;
  - 1 — проблема признана;
  - 2 — черновик спецификации;
  - 2.7 — спецификация одобрена, нужны тесты;
  - 3 — рекомендовано к реализации;
  - 4 — готово.
- **Редакция выходит каждый июнь.** В неё входит всё, что дошло до стадии 4 к началу года. Поэтому Temporal, принятый в марте 2026, попадает в ES2027.
- **Стадия 4 — не то же, что «можно использовать».** Решает Baseline: есть ли возможность во всех основных браузерах. Пример — Temporal и `using`: они уже стандарт, но Safari их не поддерживает.
- Аббревиатура ES6 — это ES2015. После 2015 года редакции называют по году.

## Что нового: полная таблица

Таблица со статусами Baseline — в [README](README.md#что-нового-в-языке-сводка). Здесь — что из этого важно для фронтендера и где каждая новинка разобрана.

| Новинка | Зачем фронтендеру | Где разобрано |
|---|---|---|
| `toSorted`, `toSpliced`, `with` (ES2023) | обновлять состояние без мутаций | arrays, immutability |
| `Object.groupBy`, `Map.groupBy` (ES2024) | группировка без reduce | arrays, map-set |
| `Promise.withResolvers` (ES2024), `Promise.try` (ES2025) | очереди, события, единая обработка ошибок | promises |
| Методы итераторов (ES2025), `Iterator.concat` (ES2026) | ленивые цепочки без промежуточных массивов | iteration, generators |
| Методы Set (ES2025) | пересечение и разность выбранных элементов | map-set |
| Import attributes, JSON-модули (ES2025) | импорт JSON без бандлера | modules |
| `RegExp.escape`, модификаторы (ES2025) | поиск по пользовательскому вводу | regex |
| `Map.prototype.getOrInsertComputed` (ES2026) | группировка и кэш без проверок `has` | map-set |
| `Error.isError` (ES2026) | надёжная проверка ошибок (кроме Safari) | errors |
| `Math.sumPrecise` (ES2026) | точные суммы | numbers |
| `Uint8Array.fromBase64` / `toBase64` (ES2026) | base64 для бинарных данных без `atob` | numbers |
| `JSON.parse` с исходным текстом, `JSON.rawJSON` (ES2026) | большие id без потери точности | numbers, types-coercion |
| `Array.fromAsync` (ES2026) | собрать асинхронный поток в массив | async-await, generators |
| **Temporal** (ES2027) | даты и часовые пояса без библиотек | dates-intl |
| **`using`, `await using`** (ES2027) | гарантированная очистка подписок и ресурсов | errors, memory |
| `Iterator.zip`, `chunks`, `windows` (ES2027) | обход нескольких последовательностей сразу, окна | iteration |

## Что ещё в работе

Упоминать как направление, а не как то, чем можно пользоваться.

- **Стадия 3:**
  - `import defer` — отложенное выполнение модуля;
  - `import source`;
  - импорт текста;
  - `Promise.allKeyed`;
  - Error Stack Accessor;
  - урезание возможностей thenable.
- **Стадия 2.7:** декораторы (были на стадии 3, вернулись на доработку), их метаданные, ShadowRealm, неизменяемые ArrayBuffer.
- **Стадия 2:**
  - Async Context;
  - асинхронные методы итераторов;
  - оператор конвейера `|>`;
  - `Iterator.range`;
  - `Math.clamp`;
  - Composites (замена отозванных Record и Tuple).
- **Отозвано:** Record и Tuple (2025).

## Тонкие места

- **Транспиляция не всегда помогает.** Синтаксис (`using`, декораторы) TypeScript и Babel переписывают. Новые встроенные объекты и методы (`Temporal`, `Iterator.prototype.map`) нужно подключать полифилом (core-js). Иначе код упадёт в старом браузере.
- **`browserslist` и Baseline.** Цель сборки можно задать как `baseline widely available`. Тогда инструменты сами решают, что транспилировать.
- **Node и браузеры расходятся.** Node 25 (V8 14.x) не умеет `Iterator.concat`, `Math.sumPrecise`, `getOrInsert`, `Temporal`, хотя Chrome 146+ умеет. Для нашей платформы: задачи на эти API проверяются в браузерном воркере, а `content:check` в Node требует полифила.

## Что спрашивают

- Что нового в ES6? (Классика: `let`/`const`, стрелки, классы, шаблонные строки, деструктуризация, модули, промисы, `Map`/`Set`, символы, итераторы.)
- Что такое optional chaining и nullish coalescing? (ES2020.)
- Какие возможности последних версий вы используете?
- Как устроен процесс TC39?

## Идеи для практики

- **Задачи с редактором «перепиши на современный JS»:**
  - группировка через `reduce` → `Object.groupBy`;
  - сортировка копии через `slice().sort()` → `toSorted()`;
  - `new Promise` с вынесенными `resolve` → `withResolvers`;
  - пересечение массивов → методы Set;
  - заполнение Map через `has`/`set` → `getOrInsertComputed`.
- **Карточки:** стадии TC39; почему стадия 4 не значит «можно в прод»; что транспилируется, а что требует полифила.
- **Задача из работы:** выбрать цель сборки по Baseline и объяснить, какие новинки проекта тогда потребуют полифила.

## Источники

- TC39, процесс — https://tc39.es/process-document/
- Завершённые предложения — https://github.com/tc39/proposals/blob/main/finished-proposals.md
- Активные предложения — https://github.com/tc39/proposals
- web.dev, Baseline — https://web.dev/baseline
- web-features explorer — https://web-platform-dx.github.io/web-features-explorer/
- browserslist, запросы по Baseline — https://github.com/browserslist/browserslist#baseline
- V8 features — https://v8.dev/features
