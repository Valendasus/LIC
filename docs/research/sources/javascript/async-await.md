# async/await и обработка ошибок

Лист: `javascript/async/async-await`. Приоритет: 49 (22 вопроса).

## Что обязательно знать

- **`async`-функция всегда возвращает промис.** `return x` → выполненный промис, `throw e` → отклонённый. Синхронная часть до первого `await` выполняется сразу при вызове.
- **`await x`** приостанавливает функцию до выполнения `x`, продолжение — микрозадача. `x` может быть любым значением: не-промис оборачивается в `Promise.resolve`.
- **Ошибки — через `try/catch`.** Отклонённый промис под `await` бросает исключение в месте `await`.
- **`await` на верхнем уровне** — только в ES-модулях.
- **`for await…of`** перебирает асинхронные итерируемые (потоки, пагинация, `ReadableStream` — асинхронно итерируем в Chrome 124+, Firefox 110+ и с осени 2026 в Safari 27).
- `async` бывает у функций, стрелок, методов, генераторов (`async function*`).

## Тонкие места

- **Последовательно вместо параллельно.** `const a = await f(); const b = await g();` ждёт по очереди. Если `g` не зависит от `a` — `await Promise.all([f(), g()])`.
- **`return await` внутри `try`** нужен, чтобы ошибка поймалась в этом `catch`. `return promise` без `await` вернёт промис мимо `try`. Вне `try` разницы в поведении нет.
- **`forEach(async …)`** не ждёт и не ловит ошибки. Нужен `for…of` (последовательно) или `Promise.all(map)` (параллельно).
- **`async` в `useEffect`** напрямую нельзя: эффект должен вернуть функцию очистки, а не промис. Объявить `async`-функцию внутри и вызвать; учесть отмену (cancellation.md).
- **Запуск без `await`** («fire and forget») теряет ошибки — получится необработанное отклонение. Либо `await`, либо `.catch`.
- **`try/catch` не ловит ошибку в колбэке**, который выполнится позже (`setTimeout(() => { throw … })`), — только то, что ожидается через `await`.
- **Порядок логов:** код до первого `await` синхронный, поэтому `async`-функция без `await` выполняется целиком сразу, но результат доступен только через микрозадачу.
- **Ограничение параллельности:** `Promise.all` на 1000 запросов создаст 1000 запросов сразу. Нужен пул (задача ниже).

## Что изменилось

- ES2026: **`Array.fromAsync(asyncIterable)`** — собрать результаты асинхронного итератора в массив. Baseline широко с 07.2026.
- ES2027: **`await using`** — асинхронное освобождение ресурса в конце блока (`Symbol.asyncDispose`). Chrome 134+, Firefox 141+, в Safari нет. См. errors.md.
- На стадии 2: асинхронные методы итераторов и Async Context (передача контекста через `await`, как AsyncLocalStorage в Node).

## Что спрашивают

- Как работает `async/await`? Как он связан с промисами?
- Как обрабатывать ошибки в `async/await`?
- Как выполнить несколько запросов параллельно?
- Почему `useEffect(async () => {})` — плохая практика?
- Плюсы и минусы асинхронного программирования.

## Идеи для практики

- **Задачи на вывод:** порядок логов с двумя `async`-функциями и `await` не-промиса; `return` против `return await` в `try`.
- **Задачи с редактором:** `mapLimit(items, limit, fn)` — пул с ограничением параллельности и сохранением порядка результатов; последовательная загрузка страниц через `for await` и асинхронный генератор; `withTimeout(promise, ms)`.
- **Задача на ошибку:** `forEach(async)` в сохранении формы, ошибка теряется.
- **Карточки:** последовательно против параллельно; когда нужен `return await`; что значит «async всегда возвращает промис».

## Источники

- ECMA-262, §15.8 Async Function Definitions — https://tc39.es/ecma262/#sec-async-function-definitions
- ECMA-262, §27.7 AsyncFunction Objects, Await — https://tc39.es/ecma262/#await
- MDN, `async function` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
- MDN, `await` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await
- MDN, `for await…of` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
- react.dev, Fetching data with Effects — https://react.dev/learn/synchronizing-with-effects#fetching-data
