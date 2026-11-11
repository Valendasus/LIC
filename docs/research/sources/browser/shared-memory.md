# SharedArrayBuffer, Atomics и cross-origin isolation

Лист: `browser/workers/shared-memory`. Новая тема уровня senior, добавлена 11.11.2026. Вопросов в сборниках мало (6), но они про реальную боль: почему `SharedArrayBuffer` «не определён» и что такое COOP и COEP.

## Что обязательно знать

- **`SharedArrayBuffer` (SAB)** — буфер памяти, который видят сразу несколько агентов (окно и воркеры) без копирования. `postMessage(sab)` передаёт не копию, а доступ к той же памяти.
- **Гонки данных:** два потока пишут в одну ячейку одновременно — результат непредсказуем. Для этого — **`Atomics`**: атомарные `load`, `store`, `add`, `sub`, `compareExchange`, `exchange` над целочисленными типизированными массивами поверх SAB. Модель памяти описана в ECMA-262 (§29 Memory Model).
- **Ожидание и пробуждение:** `Atomics.wait(arr, index, value)` — блокирует поток, пока значение не изменится (в главном потоке окна запрещено — бросит ошибку). `Atomics.notify` будит ждущих. `Atomics.waitAsync` (Baseline недавно, 11.2025) — неблокирующий вариант с промисом, работает и в главном потоке.
- **`Atomics.pause()`** (ES2027, Baseline недавно) — подсказка процессору в цикле активного ожидания.

### Cross-origin isolation

- После атак Spectre (2018) браузеры отключили SAB: общая память позволяла собрать точный таймер и читать чужие данные в процессе.
- Вернули при условии **cross-origin isolation**: документ гарантирует, что в его процессе нет чужих незащищённых ресурсов. Нужны два заголовка на документе:
  - `Cross-Origin-Opener-Policy: same-origin` — разрыв связи с окнами других origin (`window.opener`);
  - `Cross-Origin-Embedder-Policy: require-corp` — каждый вложенный ресурс должен явно разрешить встраивание (`Cross-Origin-Resource-Policy` или CORS). Либо `credentialless` — чужие ресурсы загружаются без cookie (Chrome 96, Firefox 119, в Safari нет).
- Проверка — `self.crossOriginIsolated === true`. Только тогда есть `SharedArrayBuffer`, точный `performance.now()`, `performance.measureUserAgentSpecificMemory()`.
- **Цена:** чужие картинки, видео, iframe, виджеты и скрипты без CORP или CORS перестают грузиться. Окна оплаты или OAuth в попапах теряют связь с `opener`. На реальном сайте включение изоляции — проект, а не строчка.

## Где это используется

- WebAssembly-потоки: ffmpeg.wasm, SQLite в браузере (официальная сборка с OPFS), редакторы изображений и видео, движки игр.
- Быстрые очереди между воркерами без копирования (кольцевой буфер на SAB и Atomics).
- Обычному веб-приложению это почти не нужно — достаточно `postMessage` и transfer.

## Тонкие места

- **`SharedArrayBuffer is not defined`** — первая встреча с темой. Причина почти всегда — отсутствие изоляции, а не поддержка браузера (SAB есть в Chrome 68, Firefox 79, Safari 15.2).
- **Atomics только для целочисленных типов** (`Int32Array`, `BigInt64Array` и др.), `wait` — только для `Int32Array` и `BigInt64Array`.
- **Обычное чтение и запись** в SAB без Atomics допустимы, но порядок видимости изменений другим потокам не гарантирован.
- **Заголовки ставятся на сервере или в dev-сервере**: Vite — `server.headers`, Next.js — `headers()` в конфиге. Без них локально работает, а в проде нет (или наоборот).
- **`Document-Isolation-Policy`** (Chrome 137, только Chromium) — изоляция для отдельного документа без COOP на весь сайт.

## Что изменилось

- `Atomics.waitAsync` — Baseline недавно (11.2025, Firefox 145).
- `Atomics.pause` — ES2027.
- `COEP: credentialless` — нет в Safari; `Document-Isolation-Policy` — только Chromium.
- На стадии 2: Structs и примитивы синхронизации (общие структуры и мьютексы).

## Что спрашивают

- Что такое Atomics и SharedArrayBuffer? Чем SAB отличается от ArrayBuffer?
- Что такое COOP, COEP и CORP? Для чего нужна cross-origin isolation?
- Как cross-origin isolation влияет на безопасность и Web API?
- Когда стоит использовать Atomics?

## Идеи для практики

- **Карточки:** два заголовка изоляции и что каждый разрешает; что ломается при включении; почему `Atomics.wait` запрещён в главном потоке.
- **Задача с редактором:** счётчик, который увеличивают 4 «потока» — с `+=` результат неверный, с `Atomics.add` верный (в тестах — эмуляция через чередование, в браузере — реальные воркеры).
- **Задача из работы:** включить изоляцию на странице с картинкой со стороннего CDN и попапом оплаты — что сломается и как исправить (CORP, `crossorigin`, `credentialless`).

## Источники

- ECMA-262, §25.2 SharedArrayBuffer Objects, §25.4 The Atomics Object, §29 Memory Model — https://tc39.es/ecma262/#sec-sharedarraybuffer-objects
- HTML Standard, Cross-origin opener policies — https://html.spec.whatwg.org/multipage/browsers.html#cross-origin-opener-policies
- HTML Standard, Cross-origin embedder policies — https://html.spec.whatwg.org/multipage/browsers.html#coep
- MDN, SharedArrayBuffer — security requirements — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements
- MDN, `crossOriginIsolated` — https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated
- web.dev, Making your website "cross-origin isolated" using COOP and COEP — https://web.dev/articles/coop-coep
- web.dev, Why you need "cross-origin isolated" for powerful features — https://web.dev/articles/why-coop-coep
- MDN browser-compat-data 8.1.8: SharedArrayBuffer, COEP credentialless, Document-Isolation-Policy
