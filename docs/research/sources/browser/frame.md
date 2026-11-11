# Кадр: requestAnimationFrame, порядок шагов, планирование задач

Лист: `browser/rendering/frame`. Новая тема, добавлена 11.11.2026. Соседние темы: event loop (javascript/async/event-loop), конвейер отрисовки (browser/rendering/pipeline), длинные задачи и INP (performance/long-tasks).

## Что обязательно знать

### Когда браузер рисует

- Отрисовка происходит только при **возможности отрисовки (rendering opportunity)**. Её задают частота экрана (60, 120, 144 Гц) и решения браузера. Спецификация приводит примеры: 60 раз в секунду, падение до 30, если страница не успевает, до 4 и меньше для невидимой страницы.
- В текущей редакции HTML Standard «обновить отрисовку» — **задача в очереди отрисовки (rendering task source)**. Когда появляется возможность отрисовки, браузер ставит эту задачу в очередь. Как любая задача, она выполняется после текущей задачи и её микрозадач. Старое описание «шаг 4 в каждом обороте цикла» — упрощение того же порядка.
- Браузер **пропускает** кадр, если документ скрыт, рендер заблокирован или рисовать нечего и нет колбэков rAF.

### Порядок шагов кадра (HTML Standard, «update the rendering»)

1. Обработка `resize` и `scroll` (события `resize`, `scroll`, `scrollend`).
2. Медиазапросы: события `change` у `matchMedia`.
3. Анимации: обновить CSS-анимации и Web Animations, разослать их события.
4. Полноэкранный режим, восстановление потерянного canvas.
5. **Колбэки `requestAnimationFrame`** — с одной меткой времени кадра для всех.
6. **Стили и layout** — в цикле вместе с **ResizeObserver**: если наблюдатель что-то изменил, стили и layout пересчитываются снова (каждый проход — только для элементов глубже в дереве; если наблюдения остались недоставленными, браузер сообщает ошибку «ResizeObserver loop completed with undelivered notifications»).
7. Исправление фокуса, если фокус оказался на невидимом элементе.
8. View Transitions.
9. **IntersectionObserver** — пересчёт пересечений.
10. Отметки paint timing (FCP и др.).
11. Отрисовка: передать кадр на компоновку и вывод.

Важные следствия:
- rAF выполняется **до** стилей и layout кадра. Чтения размеров в rAF после записи в том же rAF вызовут принудительный layout (browser/rendering/reflow).
- ResizeObserver срабатывает **после** layout, но **до** отрисовки — его изменения попадают в тот же кадр, без мигания.
- IntersectionObserver срабатывает в конце кадра и асинхронно — для «ленивых» загрузок и аналитики видимости, а не для точной анимации.

### requestAnimationFrame

- `requestAnimationFrame(cb)` — вызвать `cb(timestamp)` один раз перед следующей отрисовкой. Для анимации — вызывать снова в колбэке.
- `timestamp` — время начала кадра, одно на все колбэки кадра. Анимацию считаем по прошедшему времени, а не по числу кадров: на 120 Гц кадров вдвое больше.
- В скрытой вкладке и в невидимом iframe rAF не вызывается.
- `cancelAnimationFrame(id)`.
- Доступен и в выделенных воркерах (Baseline широко) — для `OffscreenCanvas`.

### Планирование работы

| Инструмент | Когда выполнится | Для чего | Поддержка |
|---|---|---|---|
| `queueMicrotask`, `then` | сразу после текущей задачи, до отрисовки | досогласовать состояние | везде |
| `setTimeout(fn, 0)` | следующей задачей, ≥ 4 мс при вложенности | уступить потоку | везде |
| `MessageChannel` | следующей задачей, без ограничения 4 мс | планировщики (React так делает) | везде |
| `requestAnimationFrame` | перед следующим кадром | изменения DOM и анимации | везде |
| `requestIdleCallback` | в простое, дедлайн до 50 мс | несрочное: аналитика, прогрев | Chrome, Firefox; Safari только Preview |
| `scheduler.postTask(fn, { priority })` | по приоритету `user-blocking`, `user-visible`, `background` | очередь с приоритетами и отменой (`TaskController`) | Chrome 94+, Firefox 142+; Safari нет |
| `scheduler.yield()` | уступить и продолжить с приоритетом впереди других задач | дробление длинной работы | Chrome 129+, Firefox 142+; Safari нет |

- **Двойной rAF** `requestAnimationFrame(() => requestAnimationFrame(fn))` — «после того, как кадр нарисован». Часто нужен, чтобы CSS-переход стартовал из начального состояния. Современная альтернатива для появления — `@starting-style` в CSS.

## Тонкие места

- **`setTimeout` для анимации** не синхронизирован с кадрами: рывки, лишняя работа, работа в фоне.
- **rAF не значит «после отрисовки»** — наоборот, перед ней.
- **Колбэк rAF, добавленный внутри rAF**, выполнится в следующем кадре, а не в текущем.
- **Бюджет кадра** — примерно 16,7 мс на 60 Гц, 8,3 мс на 120 Гц, причём часть уходит браузеру. Работа в rAF должна быть короткой.
- **Долгая задача** откладывает задачу отрисовки — кадры пропадают, ввод задерживается (INP).
- **Резервный путь для Safari:** `globalThis.scheduler?.yield?.() ?? new Promise((r) => setTimeout(r, 0))`.
- **Тесты:** в jsdom нет настоящего кадра; rAF подменяется таймерами. Проверять порядок кадра — в браузерных тестах (Playwright).

## Что изменилось

- Модель «update the rendering как задача» — правка HTML Standard последних лет. Наблюдаемый порядок для страниц не изменился.
- `scheduler.yield` и `postTask` появились в Firefox 142 (2025). Safari пока не поддерживает.
- Long Animation Frames API — Chromium, лучший инструмент для разбора, что именно замедлило кадр.
- Событие `scrollend` — Baseline недавно с 12.2025 (Safari 26.2).

## Что спрашивают

- Что делает `requestAnimationFrame()`? Почему он лучше `setTimeout` для анимации?
- Где rAF в event loop? Что раньше — rAF или микрозадачи?
- Что такое frame budget и почему важно укладываться в 16 мс?
- Чем `requestIdleCallback` отличается от `setTimeout`?
- Как разбить длинную задачу?

## Идеи для практики

- **Задачи на порядок** (основная форма): `setTimeout`, `then`, rAF, ResizeObserver, IntersectionObserver после изменения ширины элемента — в каком порядке сработают; rAF внутри rAF.
- **Задача с редактором:** анимация по времени на rAF с паузой и отменой — тест подменяет rAF и проверяет позицию по `timestamp`, а не по числу вызовов; `yieldToMain()` с резервным путём; обработка 50 000 элементов кусками по бюджету 8 мс.
- **Карточки:** порядок шагов кадра; таблица инструментов планирования; почему ResizeObserver не мигает.
- **Демо:** временная шкала одного кадра — задачи, микрозадачи, rAF, стили, layout, наблюдатели, отрисовка; переключатель 60 и 120 Гц.

## Источники

- HTML Standard, Event loop processing model и «update the rendering» — https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model
- HTML Standard, Animation frames — https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames
- MDN, `requestAnimationFrame` — https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- MDN, Prioritized Task Scheduling API — https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API
- W3C, Resize Observer — https://drafts.csswg.org/resize-observer/
- web.dev, Optimize long tasks — https://web.dev/articles/optimize-long-tasks
- Chrome for Developers, Long Animation Frames API — https://developer.chrome.com/docs/web-platform/long-animation-frames
- MDN browser-compat-data 8.1.8 и web-features 3.45.0: scheduler, requestidlecallback, request-animation-frame-workers
