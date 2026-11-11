# Отмена и гонки запросов

Лист: `javascript/async/cancellation`. Приоритет: 155 (10 вопросов). В сборниках мало вопросов, но в работе это одна из самых частых причин багов: устаревший ответ перезаписывает свежий. Тему делаем глубоко, несмотря на низкий приоритет.

## Что обязательно знать

- **`AbortController` и `AbortSignal`** — стандарт отмены из DOM Standard, не из ECMAScript. `controller.abort(reason)` переводит `signal.aborted` в `true`, сохраняет `signal.reason` и вызывает событие `abort`.
- **Кто понимает сигнал:** `fetch(url, { signal })`, `addEventListener(type, fn, { signal })` (снимает обработчик), `ReadableStream`, `pipeTo`, Web Locks, `scheduler.postTask`, многие библиотеки (TanStack Query передаёт `signal` в `queryFn`, axios, React Router loaders).
- **Что происходит при отмене fetch:** промис отклоняется с `signal.reason`. По умолчанию это `DOMException` с именем `AbortError`. Отмену отличаем от настоящей ошибки и не показываем пользователю.
- **Готовые сигналы:**
  - `AbortSignal.timeout(ms)` — отклонение с `TimeoutError` (Baseline широко);
  - `AbortSignal.any([a, b])` — сработает при любом из сигналов (Baseline широко). Например, отмена пользователем или таймаут;
  - `AbortSignal.abort(reason)` — уже отменённый.
- **В своей функции:** проверить `signal.throwIfAborted()` между шагами, подписаться `signal.addEventListener('abort', …, { once: true })`, пробросить `signal` дальше.

## Гонки запросов

- **Проблема:** поиск по мере ввода. Запрос «re» отвечает позже, чем «react», и перезаписывает результат.
- **Решения по надёжности:**
  1. Отменить предыдущий запрос: `AbortController` на каждый запрос, `abort()` старого перед новым. Экономит сеть.
  2. Игнорировать устаревший ответ: флаг `ignore` в эффекте React или сравнение id запроса. Сеть не экономит, но работает с любым API.
  3. Отдать это библиотеке: TanStack Query, SWR, React Router и `useActionState` хранят результат по ключу и сами отбрасывают устаревшие.
- **В React:** очистка эффекта — место для `abort()` или `ignore = true`. В StrictMode эффект в разработке выполняется дважды, поэтому без очистки баг виден сразу.
- **`debounce` уменьшает число запросов, но гонку не решает.** Это частая ошибка.
- **Серверная сторона:** отменённый fetch не отменяет работу на сервере. Для мутаций отмена не означает «не произошло» — нужна идемпотентность (backend-communication/errors).

## Тонкие места

- `abort()` после завершения запроса ничего не делает. Повторно использовать отменённый контроллер нельзя — нужен новый.
- `AbortSignal.timeout` считает активное время, а не реальное: таймер встаёт на паузу, пока документ в bfcache или воркер приостановлен.
- Обработчик `abort` нужно снимать, иначе долгоживущий сигнал держит замыкания (утечка). `{ once: true }` и `{ signal }` в `addEventListener` помогают.
- Отмена через `race` с таймером не отменяет сам запрос. Это не отмена, а перестаёшь ждать.

## Что изменилось

- `AbortSignal.any` и `AbortSignal.timeout` — Baseline широко с 2024.
- `ReadableStream` асинхронно итерируем во всех браузерах с Safari 27 (осень 2026); при `break` в `for await` поток отменяется.
- В языке отмены нет, предложение «cancellation» в TC39 не развивается. Стандартом де-факто остаётся `AbortSignal`.

## Что спрашивают

- Как отменить fetch-запрос?
- Как возникает гонка при быстрых повторных запросах? Как её решить?
- Чем `debounce` отличается от `throttle`? (Смежная тема.)
- Как сделать таймаут запроса?

## Идеи для практики

- **Задачи с редактором:** `searchWithLatest(query)` — отменяет предыдущий запрос, тест с управляемыми ответами проверяет, что устаревший результат не попадает в UI; `fetchWithTimeout` через `AbortSignal.any`; своя отменяемая функция `delay(ms, { signal })`.
- **React-задача:** компонент поиска с эффектом и очисткой; тест — быстрый ввод двух запросов, ответы в обратном порядке.
- **Карточки:** три способа победить гонку; почему `debounce` не решает гонку; как отличить отмену от ошибки.

## Источники

- DOM Standard, Aborting ongoing activities — https://dom.spec.whatwg.org/#aborting-ongoing-activities
- MDN, `AbortController` — https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- MDN, `AbortSignal.any()` — https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static
- MDN, `AbortSignal.timeout()` — https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
- react.dev, Fetching data — race conditions — https://react.dev/learn/you-might-not-need-an-effect#fetching-data
- TanStack Query, Query cancellation — https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation
