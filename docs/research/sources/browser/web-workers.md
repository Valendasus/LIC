# Web Workers и transferable

Лист: `browser/workers/web-workers`. Приоритет из исследования вопросов: средний. Вопросы — «что можно в воркере, а что нет» и «почему воркеры не решают все проблемы производительности». Для нашей платформы тема практическая: задачи с кодом выполняются в воркере.

## Что обязательно знать

- **Воркер** — отдельный поток со **своим** event loop, глобальным объектом и памятью. Общается со страницей сообщениями. Виды:

| Вид | Кто может подключиться | Жизнь | Baseline |
|---|---|---|---|
| Выделенный `Worker` | только создатель | пока жив создатель или до `terminate()` | широко |
| `SharedWorker` | все окна и iframe одного origin | пока подключён хоть один | недавно с 05.2026 (пришёл в Chrome на Android) |
| `ServiceWorker` | весь scope origin | управляет браузер, просыпается по событиям | широко, см. service-worker.md |
| Worklet (Audio, Paint) | движок | крошечные, для узких задач | Audio — широко |

- **Создание:** `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`. Модульный воркер (`type: 'module'`) — Baseline широко с 2023. Бандлеры (Vite, webpack 5, Next/Turbopack) распознают именно форму `new URL(…, import.meta.url)`.
- **Что есть в воркере:** `fetch`, WebSocket, IndexedDB, Cache API, `crypto`, таймеры, `OffscreenCanvas`, `requestAnimationFrame` (в выделенном воркере), `importScripts` (в классическом), `self.postMessage`.
- **Чего нет:** DOM (`document`, `window`), `localStorage` и `sessionStorage`, синхронного доступа к странице, `alert`.
- **Передача данных** — `postMessage(data, transfer)`:
  - по умолчанию — **структурированное клонирование** (structuredClone): копия, функции и DOM-узлы нельзя (`DataCloneError`), классы теряют прототип;
  - **transferable** — передача владения без копирования: `ArrayBuffer`, `MessagePort`, `ImageBitmap`, `OffscreenCanvas`, `ReadableStream` и др. После передачи у отправителя буфер **отсоединяется** (`byteLength === 0`);
  - **общая память** — `SharedArrayBuffer` (shared-memory.md).
- **Ошибки:** событие `error` на объекте `Worker` для необработанных исключений, `messageerror` — если сообщение не удалось десериализовать. Необработанный отклонённый промис в воркере — `unhandledrejection` внутри воркера.
- **Завершение:** `worker.terminate()` снаружи (немедленно, без `finally`), `self.close()` изнутри.

## Когда воркер нужен, а когда нет

- **Нужен:** тяжёлые вычисления (парсинг больших файлов, сжатие, криптография, обработка изображений, поиск по большому индексу, подсветка синтаксиса, компиляция TypeScript), изоляция пользовательского кода с таймаутом (`terminate()` убивает бесконечный цикл), работа с `OffscreenCanvas`.
- **Не поможет:** медленный layout и paint (это главный поток), много мелких сообщений (затраты на клонирование больше выигрыша), работа, которой нужен DOM на каждом шаге.
- **Стоимость:** запуск воркера — десятки миллисекунд и мегабайты памяти. Держим пул и переиспользуем, а не создаём на каждую задачу.

## Тонкие места

- **Клонирование большого объекта** блокирует обе стороны: 50 МБ JSON-подобных данных копируются заметно. Решение — передать `ArrayBuffer` через transfer или сразу получать данные в воркере.
- **Порядок сообщений** между двумя сторонами одного канала сохраняется.
- **RPC поверх `postMessage`:** нужен id запроса и `Map` ожидающих промисов. Библиотека Comlink делает это через Proxy.
- **`MessageChannel`** даёт пару портов для прямого канала между двумя воркерами или окном и iframe.
- **Ограничения origin:** скрипт воркера — того же origin (или blob/data URL). CSP `worker-src`.
- **Тесты:** в Vitest с jsdom воркеров нет; тестируем чистую логику отдельно, а взаимодействие — в браузере (Playwright).

## Что изменилось

- `SharedWorker` стал Baseline (05.2026), модульные SharedWorker тоже.
- Модули в Service Worker — Baseline с 01.2026 (Firefox 147).
- Транслируемые потоки (`ReadableStream` в `postMessage` transfer) — Chrome и Firefox, в Safari нет.
- Асинхронная итерация `ReadableStream` — во всех браузерах с Safari 27.

## Что спрашивают

- Что такое Web Workers? Что в них можно, а что нельзя?
- Как передать данные в воркер? Что такое transferable objects?
- Как Web Workers помогают отрисовке? Почему они не решают все проблемы производительности?
- Чем SharedWorker отличается от Service Worker?
- Что такое main thread и какие задачи за него конкурируют? (process-model.md)

## Идеи для практики

- **Задачи с редактором:**
  - `createWorkerRpc(worker)` — вызов функций воркера как `await api.sum(1, 2)` с id запросов, ошибками и таймаутом (тест на фейковом объекте с `postMessage`);
  - пул воркеров с очередью задач и ограничением параллельности;
  - «выполнить пользовательский код с таймаутом» — как устроены задачи на этой платформе.
- **Задачи на вывод:** `byteLength` после transfer; что придёт в воркер, если отправить `Map`, `Date`, экземпляр класса, функцию.
- **Карточки:** таблица видов воркеров; что есть и чего нет в воркере; клонирование против передачи.

## Источники

- HTML Standard, Web workers — https://html.spec.whatwg.org/multipage/workers.html
- HTML Standard, Structured serialize and transfer — https://html.spec.whatwg.org/multipage/structured-data.html
- MDN, Using Web Workers — https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
- MDN, Transferable objects — https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
- MDN, Functions and classes available to workers — https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Functions_and_classes_available_to_workers
- Vite, Web Workers — https://vite.dev/guide/features#web-workers
- web-features 3.45.0: dedicated-workers, shared-workers, js-modules-workers, transferable-streams
