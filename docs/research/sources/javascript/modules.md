# Модули: ESM и CommonJS

Лист: `javascript/modules`. Приоритет: 27 (35 вопросов, 5 сборников из 6).

## Что обязательно знать

- **ES-модули (ESM)** — стандарт языка: `import` / `export`. В браузере — `<script type="module">`, в Node — `.mjs` или `"type": "module"` в `package.json`.
- **Свойства ESM:**
  - всегда строгий режим, `this` на верхнем уровне — `undefined`;
  - у каждого модуля своя область видимости;
  - модуль выполняется один раз, сколько бы раз его ни импортировали;
  - импорт **статический**: граф зависимостей известен до выполнения, поэтому работают tree-shaking и анализ;
  - **живые привязки**: импортированное имя — ссылка на переменную модуля-источника, а не копия. Присвоить ей нельзя;
  - загрузка в три фазы: построение графа (парсинг и загрузка), связывание (linking) и выполнение в порядке обхода в глубину (§16.2.1 Source Text Module Records).
- **Виды экспорта:** именованный `export const x`, по умолчанию `export default`, реэкспорт `export { x } from './a'`, `export * from`, `export * as ns from`.
- **Динамический импорт** `import('./x.js')` возвращает промис с объектом модуля. Это основа разделения кода (`React.lazy`, маршруты).
- **`import.meta`**: `import.meta.url`, `import.meta.resolve()`, в Vite — `import.meta.env`, `import.meta.glob`.
- **Top-level await** в модулях: зависимые модули ждут, пока модуль выполнится.
- **CommonJS (CJS)** — система Node до ESM: `require()` и `module.exports`. Синхронная загрузка, выполняется при вызове `require`, экспорт — копия значения на момент экспорта (для примитивов), можно вызывать условно.

## Тонкие места

| | ESM | CommonJS |
|---|---|---|
| Когда известен граф | до выполнения | во время выполнения |
| Привязки | живые | значение `module.exports` |
| Загрузка | асинхронная по стандарту | синхронная |
| Tree-shaking | надёжный | ограниченный |
| Верхний уровень | `await` разрешён | нет |
| `__dirname`, `require` | нет; есть `import.meta.dirname` (Node 20.11+) | есть |

- **Циклические зависимости.** В ESM обращение к ещё не выполненной привязке даёт ReferenceError (TDZ), а функции-объявления уже доступны. В CJS — получите недозаполненный `module.exports`. Признак плохой структуры, см. architecture/boundaries.
- **Default против именованного экспорта.** Именованный экспорт лучше для автоимпорта, переименования и tree-shaking. Default удобен для одного главного значения и нужен в некоторых соглашениях (`React.lazy`, страницы Next.js).
- **Интероп.** Импорт CJS из ESM в Node: `module.exports` становится default-экспортом, именованные распознаются эвристикой. С Node 20.19 и 22.12 работает `require()` синхронного ESM-модуля без флага (без top-level await). Это убрало главную боль «dual package».
- **Side effects.** Модуль, который при импорте что-то делает (полифил, регистрация, CSS), не выкинется tree-shaking'ом, если `package.json` не обещает `"sideEffects": false`.
- **Барель-файлы** (`index.ts` с реэкспортом всего) удобны для публичного API, но замедляют сборку и dev-сервер и могут ломать tree-shaking. В FSD публичный API слайса — это барель, но небольшой.
- **В браузере** для голых спецификаторов (`import 'react'`) нужен бандлер или import map (`<script type="importmap">`, Baseline широко).
- **AMD и UMD** — исторические форматы, на собеседовании достаточно знать, что они были и зачем.

## Что изменилось

- ES2025: **import attributes** и JSON-модули — `import data from './data.json' with { type: 'json' }`. Старый синтаксис `assert` удалён. Baseline недавно (04.2025).
- `top-level await` стал Baseline недавно только в 09.2026 (Safari 27).
- CSS-модули `with { type: 'css' }` — в Chrome и Firefox 147+, в Safari нет.
- На стадии 3: отложенное выполнение `import defer * as ns from './heavy.js'` (модуль загружается, но выполняется при первом обращении), `import source` для WebAssembly, импорт текста `with { type: 'text' }`. На стадии 2.7 — импорт байтов.
- Node: `require(esm)` без флага (20.19, 22.12), `import.meta.dirname` и `filename`.

## Что спрашивают

- Разница между CommonJS и ES-модулями.
- Что такое модуль и зачем он нужен?
- Как работают `import` и `export`? Разница default и named.
- Почему ESM удобнее для tree-shaking?
- Что такое динамический импорт и где он нужен?
- Что такое циклическая зависимость и чем она опасна?
- Что такое бандлер модулей и зачем он нужен? (Связь с tooling/bundlers.)

## Идеи для практики

- **Задачи на вывод:** порядок выполнения модулей в графе (логи из трёх модулей); живая привязка — счётчик из модуля после `increment()`; цикл между двумя модулями.
- **Карточки:** таблица ESM и CJS; что такое живая привязка; зачем `"sideEffects": false`; что делает `import defer`.
- **Задача из работы:** вынести тяжёлую библиотеку (редактор, графики) в динамический импорт и показать заглушку на время загрузки.

## Источники

- ECMA-262, §16.2 Modules — https://tc39.es/ecma262/#sec-modules
- HTML Standard, module scripts и import maps — https://html.spec.whatwg.org/multipage/webappapis.html#integration-with-the-javascript-module-system
- MDN, JavaScript modules — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- MDN, `import` with attributes — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with
- Node.js, Modules: ECMAScript modules — https://nodejs.org/api/esm.html
- Node.js, Loading ECMAScript modules using `require()` — https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require
- Предложения: Deferring Module Evaluation, Source Phase Imports, Import Text — https://github.com/tc39/proposals
