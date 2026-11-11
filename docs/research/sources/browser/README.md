# Браузер: исследование по первоисточникам

Собрано 11 ноября 2026. Формат заметок тот же, что в [JavaScript](../javascript/README.md).

## Что в фокусе

По решению владельца курса от 11.11.2026 главное — то, что происходит в браузере «под капотом» вокруг JavaScript:

- асинхронность;
- процессы и потоки;
- кадр;
- воркеры;
- iframe;
- общение между окнами;
- наблюдатели.

Базовые HTML и CSS в фокус не входят. CSS позже — только анимации, библиотеки и подходы к стилям, Tailwind.

## Заметки

Порядок — от основы к применению.

1. [process-model](process-model.md) — процессы и потоки браузера, site isolation, главный поток и компоновщик (новая тема)
2. [frame](frame.md) — кадр: порядок шагов по HTML Standard, requestAnimationFrame, планирование задач (новая тема)
3. [web-workers](web-workers.md) — виды воркеров, клонирование и transfer, когда воркер помогает
4. [shared-memory](shared-memory.md) — SharedArrayBuffer, Atomics, cross-origin isolation (новая тема, senior)
5. [cross-tab](cross-tab.md) — postMessage, MessageChannel, BroadcastChannel, Web Locks, синхронизация вкладок
6. [iframes](iframes.md) — изоляция, sandbox, Permissions Policy, clickjacking (новая тема)
7. [service-worker](service-worker.md) — жизненный цикл, стратегии кэша, обновление, PWA
8. [observers](observers.md) — Intersection, Resize, Mutation, Performance, Reporting

Связанные заметки JavaScript: [event-loop](../javascript/event-loop.md), [promises](../javascript/promises.md), [async-await](../javascript/async-await.md), [cancellation](../javascript/cancellation.md), [memory](../javascript/memory.md).

## Что ещё не исследовано

Оставшиеся листы блока: конвейер отрисовки и reflow, DOM API и события, хранилища, сеть (fetch, WebSocket и SSE), навигация и View Transitions, Web Components, безопасность, DevTools.

## Первоисточники блока

| Что | Где |
|---|---|
| HTML Standard — event loop, воркеры, сообщения, iframe, sandbox | https://html.spec.whatwg.org/multipage/ |
| DOM Standard — события, MutationObserver, AbortSignal | https://dom.spec.whatwg.org/ |
| Service Workers | https://w3c.github.io/ServiceWorker/ |
| Intersection Observer, Resize Observer, Performance Timeline | https://w3c.github.io/IntersectionObserver/, https://drafts.csswg.org/resize-observer/ |
| Chromium — модель процессов | https://chromium.googlesource.com/chromium/src/+/main/docs/process_model_and_site_isolation.md |
| Данные поддержки | web-features 3.45.0, MDN browser-compat-data 8.1.8 (02.11.2026) |
