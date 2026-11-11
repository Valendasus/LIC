# Память, сборка мусора, утечки

Лист: `javascript/memory`. Приоритет: 104 (22 вопроса, в основном middle и senior).

## Что обязательно знать

- **Управление памятью автоматическое.** Спецификация не описывает сборщик мусора, только гарантирует, что недостижимое можно собрать. Обнаруживается это только через WeakRef и FinalizationRegistry.
- **Достижимость:** объект живёт, пока до него есть путь от корней — глобальный объект, текущий стек вызовов, активные замыкания, обработчики событий, таймеры, DOM-дерево. Подсчёт ссылок не используется, поэтому циклы между объектами не мешают сборке.
- **В V8 сборщик поколений:** молодое поколение (частая быстрая сборка Scavenger) и старое (Mark-Compact, инкрементально и параллельно — проект Orinoco). Объекты, пережившие пару сборок, переезжают в старое.
- **Стек и куча:** примитивы в локальных переменных и ссылки — на стеке (упрощённо), объекты — в куче.

## Типичные утечки во фронтенде

1. **Забытые обработчики и подписки:** `addEventListener` на `window` без снятия, подписка на стор, WebSocket, `setInterval`. В React — эффект без очистки.
2. **Отсоединённые DOM-узлы (detached):** узел удалён из документа, но на него ссылается переменная, массив или замыкание.
3. **Растущие кэши:** `Map` как кэш без ограничения; глобальные массивы логов.
4. **Замыкания, держащие больше нужного** (closures.md): одно окружение на все внутренние функции.
5. **Незакрытые ресурсы:** `URL.createObjectURL` без `revokeObjectURL`, `ImageBitmap` без `close()`, незавершённые запросы, `ResizeObserver` без `disconnect`.
6. **Консоль:** залогированный объект держится DevTools, пока открыта консоль.

## Как искать

- **DevTools → Memory:** снимок кучи (Heap snapshot), сравнение двух снимков, фильтр «Detached» для отсоединённых узлов, «Retainers» — путь удержания. Allocation timeline — кто выделяет.
- **Performance monitor:** график JS heap и числа DOM-узлов. Признак утечки — «пила», нижняя точка которой растёт после повторения сценария.
- **Сценарий проверки:** открыть и закрыть экран 10 раз, вызвать сборку (кнопка в Memory), сравнить снимки.
- `performance.measureUserAgentSpecificMemory()` — только Chromium с cross-origin isolation.

## Тонкие места

- **WeakMap, WeakSet, WeakRef** — инструменты против утечек: метаданные к объекту, которые исчезают вместе с ним.
- **`AbortSignal` для обработчиков:** `addEventListener(type, fn, { signal })` и один `abort()` снимают все обработчики разом.
- **SPA живёт долго:** то, что не заметно на сайте из страниц, в SPA копится часами.
- **ArrayBuffer и transfer:** `buffer.transfer()` (ES2024) передаёт владение без копирования, старый буфер становится отсоединённым. При `postMessage(buf, [buf])` в воркер — то же самое.
- Утечка памяти и высокое потребление — разные вещи: большой, но стабильный кэш — не утечка.

## Что изменилось

- ES2024: `ArrayBuffer.prototype.transfer`, resizable ArrayBuffer (Baseline широко с 09.2026).
- ES2027: `using` и `DisposableStack` — гарантированное освобождение ресурсов в конце блока, меньше забытых очисток (Safari пока нет).
- На стадии 2.7 — неизменяемые ArrayBuffer.

## Что спрашивают

- Как работает сборка мусора в JavaScript?
- Что такое утечка памяти? Какие бывают во фронтенде?
- Как найти утечку памяти?
- Какие проблемы бывают из-за замыканий?
- Зачем нужны WeakMap и WeakRef?

## Идеи для практики

- **Задача на ошибку:** компонент с подпиской на `resize` без очистки; список, который хранит удалённые узлы; кэш без лимита.
- **Задача с редактором:** `createSubscriptions()` на `AbortController` — тест проверяет, что после `dispose()` обработчики не вызываются.
- **Практическая работа в DevTools** (не автоматическая): найти отсоединённые узлы в учебной странице по инструкции. Отмечается вручную.
- **Карточки:** что такое корни; список типичных утечек; почему циклические ссылки не утекают.

## Источники

- MDN, Memory management — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management
- V8, Trash talk: the Orinoco garbage collector — https://v8.dev/blog/trash-talk
- Chrome DevTools, Fix memory problems — https://developer.chrome.com/docs/devtools/memory-problems
- Chrome DevTools, Record heap snapshots — https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots
- ECMA-262, §9.10 Processing Model of WeakRef and FinalizationRegistry Targets — https://tc39.es/ecma262/#sec-weakref-processing-model
- MDN, `ArrayBuffer.prototype.transfer` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/transfer
