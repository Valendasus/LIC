# Event loop в браузере

Лист: `javascript/async/event-loop`. Приоритет: 28 (32 вопроса, 5 сборников из 6). Урок уже есть: `content/frontend/javascript/async/event-loop.mdx`.

## Что обязательно знать

- **JavaScript не определяет event loop.** В ECMAScript есть только очередь заданий (Jobs) для промисов (§9.5). Цикл событий описан в **HTML Standard** (раздел Event loops), в Node — в libuv. Отвечать «event loop — часть JS» неточно.
- **Один оборот цикла в окне** (упрощённо по HTML Standard):
  1. Взять **одну задачу** из одной из очередей задач. Браузер сам выбирает очередь, поэтому задачи разных источников не упорядочены между собой.
  2. Выполнить её до конца.
  3. **Контрольная точка микрозадач:** выполнить все микрозадачи, включая добавленные во время выполнения.
  4. Если пришло время кадра — **обновить рендеринг**: события resize и scroll, медиазапросы, анимации, `requestAnimationFrame`-колбэки, стили и layout, ResizeObserver и IntersectionObserver, отрисовка.
  5. Если задач нет и время есть — `requestIdleCallback`.
- **Источники задач (macrotasks):** `setTimeout`, `setInterval`, события ввода, `MessageChannel`, сетевые колбэки, `postMessage`.
- **Микрозадачи:** реакции промисов (`then`, `catch`, `finally`, продолжение после `await`), `queueMicrotask`, колбэки `MutationObserver`.
- **Микрозадачи выполняются и между колбэками событий**, если стек пуст: при реальном клике микрозадачи из первого обработчика выполнятся до второго. При `element.click()` из кода стек не пуст — они выполнятся после всех обработчиков. Классический вопрос senior-уровня.

## Тонкие места

- **`setTimeout(fn, 0)`** — не «сразу», а «следующей задачей, не раньше чем через 0 мс». После 5 вложенных вызовов минимум — 4 мс. Во фоновых вкладках таймеры замедляются до 1 с и больше, в Chrome — интенсивное ограничение до 1 раза в минуту для цепочек.
- **Бесконечные микрозадачи блокируют рендеринг:** цикл никогда не дойдёт до шага 4. Бесконечные `setTimeout` — нет.
- **`requestAnimationFrame`** выполняется перед отрисовкой, раз в кадр, только в видимой вкладке. rAF внутри rAF — следующий кадр.
- **`await`** всегда уступает: код после `await` — микрозадача, даже если промис уже выполнен. `await` не-промиса тоже даёт один тик.
- **Длинная задача** (дольше 50 мс) блокирует ввод: от неё зависит INP. Дробить работу: `scheduler.yield()` (Chrome 129+, Firefox 142+, в Safari нет), `setTimeout`, `MessageChannel`. Связь с performance/long-tasks.
- **Порядок `then`-цепочек** двух промисов чередуется: каждое звено — отдельная микрозадача. На этом строятся задачи «что выведет».
- **Node отличается:** фазы libuv (timers, poll, check), `process.nextTick` выполняется раньше промисов, `setImmediate` — в фазе check. Порядок `setTimeout(0)` и `setImmediate` вне I/O не определён. Вопрос из сборников, но тема курса — браузер; Node упоминаем отдельным блоком.

## Что изменилось

- `scheduler.postTask` и `scheduler.yield` — Chrome и Firefox (142, 2025), Safari нет. Baseline нет.
- `requestIdleCallback` — в Safari только в Technology Preview, Baseline нет. Писать с запасным путём.
- Long Animation Frames API (`PerformanceLongAnimationFrameTiming`) — только Chromium; лучший инструмент для разбора долгих кадров.
- Модель цикла событий в HTML Standard не менялась.

## Что спрашивают

- Что такое event loop? Из чего состоит: стек вызовов, очереди задач и микрозадач?
- В каком порядке выполняются macrotasks и microtasks?
- Что выведет код с `setTimeout`, `Promise.then`, `queueMicrotask`, `async/await`?
- Чем `setTimeout(fn, 0)` отличается от `queueMicrotask(fn)`?
- Разница между `setTimeout`, `setImmediate` и `process.nextTick` (Node).
- Где в цикле `requestAnimationFrame`?
- Почему страница «замерзает»?

## Идеи для практики

Уже в уроке: 15 карточек и задачи на порядок. Добавить:

- **Задачи на вывод** (по уровням): три промиса с цепочками разной длины; `async`-функция без `await` и с `await` не-промиса; два обработчика клика — реальный клик и `el.click()`.
- **Задача с редактором:** обработать 100 000 элементов, не блокируя ввод (дробление с уступкой), тест проверяет, что между частями проходит задача.
- **Демо:** визуализатор цикла — стек, очереди задач и микрозадач, кадр. Предлагался раньше, ждёт решения.

## Источники

- HTML Standard, Event loops — https://html.spec.whatwg.org/multipage/webappapis.html#event-loops
- HTML Standard, Timers — https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers
- ECMA-262, §9.5 Jobs and Host Operations to Enqueue Jobs — https://tc39.es/ecma262/#sec-jobs
- MDN, Using microtasks — https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide
- MDN, `Scheduler.yield()` — https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield
- web.dev, Optimize long tasks — https://web.dev/articles/optimize-long-tasks
- Jake Archibald, Tasks, microtasks, queues and schedules — https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/
- Node.js, The Node.js Event Loop — https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick
