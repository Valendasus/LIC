# Промисы

Лист: `javascript/async/promises`. Приоритет: 34 (31 вопрос, 5 сборников из 6).

## Что обязательно знать

- **Промис** — объект-представитель результата, который появится позже. Состояния: `pending` → `fulfilled` или `rejected` (вместе — `settled`). Переход один раз и навсегда.
- **Исполнитель** `new Promise((resolve, reject) => …)` выполняется **синхронно**. Исключение в нём превращается в отклонение.
- **`then(onFulfilled, onRejected)` всегда возвращает новый промис.** Результат колбэка: значение → выполнение нового промиса; брошенная ошибка → отклонение; промис или thenable → новый промис его «принимает».
- **Колбэки `then` вызываются всегда асинхронно**, микрозадачей, даже если промис уже выполнен. Это гарантия спецификации (`HostEnqueuePromiseJob`).
- **`catch(fn)`** — то же, что `then(undefined, fn)`. **`finally(fn)`** — не получает значения, пропускает результат дальше; если `fn` бросит или вернёт отклонённый промис — заменит результат.
- **Цепочка:** ошибка пропускает все `then` без второго аргумента до ближайшего `catch`. После `catch` цепочка продолжается как выполненная.
- **Thenable** — любой объект с методом `then`. Промисы принимают их ради совместимости со старыми библиотеками.
- **Статические методы:** `Promise.resolve`, `Promise.reject`, комбинаторы (combinators.md), `Promise.withResolvers` (ES2024), `Promise.try` (ES2025).

## Тонкие места

- **`then(a, b)` и `then(a).catch(b)` — не одно и то же.** Во втором варианте `b` поймает и ошибку из `a`.
- **Забытый `return`** в `then` рвёт цепочку: следующий `then` получит `undefined` и не будет ждать вложенный промис.
- **Разрешение промисом добавляет тики.** `resolve(otherPromise)` и `return promise` из `then` разворачиваются через `NewPromiseResolveThenableJob` — это +2 микрозадачи. Отсюда «неожиданный» порядок в задачах на вывод.
- **Необработанное отклонение:** в браузере — событие `unhandledrejection` на `window`, в Node с версии 15 — падение процесса. Обработчик, добавленный позже, вызовет `rejectionhandled`.
- **`resolve` после `resolve` или `reject`** игнорируется, бросок после `resolve` в исполнителе — тоже.
- **Промис не отменяется.** Отмена — через `AbortSignal` (cancellation.md).
- **Анти-паттерн «конструктор вокруг промиса»:** `new Promise((res, rej) => fetch(u).then(res, rej))` — лишняя обёртка, теряющая ошибки при опечатках. `new Promise` нужен только для обёртки колбэчных API.
- **`Promise.resolve(p) === p`**, если `p` — нативный промис того же конструктора.

## Что изменилось

- **`Promise.withResolvers()`** (ES2024, Baseline широко с 09.2026) возвращает `{ promise, resolve, reject }` — удобно, когда промис разрешается из другого места (очереди, события, тесты).
- **`Promise.try(fn, ...args)`** (ES2025, Baseline недавно) вызывает `fn` синхронно и всегда возвращает промис: синхронная ошибка тоже станет отклонением.
- На стадии 3 — «урезание силы thenable» (SafeResolve): защита от того, что `Object.prototype.then` перехватывает разрешение. Поведение обычного кода не изменится.
- На стадии 3 — `Promise.allKeyed` и `Promise.allSettledKeyed` (см. combinators.md).

## Что спрашивают

- Что такое промис и как он работает? Состояния.
- Плюсы промисов по сравнению с колбэками.
- Что возвращает `then`? Как работает цепочка?
- Разница между `then(a, b)` и `then(a).catch(b)`.
- Что такое `finally`?
- Как обработать необработанные отклонения?
- Реализуйте свой Promise / `promisify`.

## Идеи для практики

- **Задачи на вывод:** синхронный исполнитель; `finally` с заменой значения; `then(a, b)` и `catch`; порядок двух цепочек с `return Promise.resolve()` внутри — как раз про +2 тика.
- **Задачи с редактором:** `promisify(fn)`; `sleep(ms)`; `retry(fn, { attempts, delay })` с экспоненциальной задержкой; уровень «босс» — `MyPromise` по спецификации Promises/A+ (тесты: асинхронность колбэков, принятие thenable, цепочки).
- **Карточки:** что возвращает `then` в каждом случае; когда нужен `new Promise`; зачем `withResolvers` и `try`.
- **Задача на ошибку:** забытый `return` в цепочке.

## Источники

- ECMA-262, §27.2 Promise Objects — https://tc39.es/ecma262/#sec-promise-objects
- ECMA-262, NewPromiseResolveThenableJob — https://tc39.es/ecma262/#sec-newpromiseresolvethenablejob
- MDN, Using promises — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
- MDN, Promise — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
- MDN, `unhandledrejection` — https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
- Promises/A+ — https://promisesaplus.com/
- Предложение Curtailing the power of "Thenables" — https://github.com/tc39/proposal-thenable-curtailment
