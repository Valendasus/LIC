# Ошибки и их обработка

Лист: `javascript/errors`. Приоритет: 36 (45 вопросов, 5 сборников из 6).

## Что обязательно знать

- **`throw`** бросает любое значение, но бросать стоит только `Error` и наследников: у них есть `message`, `name` и стек.
- **Встроенные типы:** `Error`, `TypeError`, `RangeError`, `ReferenceError`, `SyntaxError`, `URIError`, `EvalError`, `AggregateError` (ES2021, у `Promise.any`), в браузере — `DOMException` (`AbortError`, `TimeoutError`, `QuotaExceededError`, `DataCloneError`).
- **`try / catch / finally`:** `finally` выполняется всегда, даже после `return` в `try`. `return` в `finally` перебивает и результат, и брошенную ошибку — так лучше не писать. `catch` без параметра (`catch {}`) — с ES2019.
- **`cause`** (ES2022): `new Error('Не удалось сохранить', { cause: err })` — сохраняет исходную ошибку при переупаковке. Инструменты (DevTools, Sentry) показывают цепочку.
- **Свои ошибки:** `class ValidationError extends Error { name = 'ValidationError' }`. Проверка — `instanceof` или поле `name` / `code`.
- **Асинхронные ошибки** ловятся через `await` в `try` или `.catch`. Глобальные обработчики: `window.onerror` / событие `error` для синхронных, `unhandledrejection` для промисов. В React — Error Boundary для ошибок рендера (react-hooks/suspense-errors).
- **Стек** (`error.stack`) не стандартизирован, формат свой в каждом движке. Для прода нужны source maps.

## Тонкие места

- **`catch (e)` получает `unknown`**: брошено может быть что угодно. В TypeScript `useUnknownInCatchVariables` включён в `strict`. Проверять перед `e.message`.
- **`instanceof Error` ломается между realm'ами** (iframe, `vm`), и прокси или подделки его обманывают. **`Error.isError(x)`** (ES2026) проверяет внутренний слот. В Safari пока нет.
- **Ошибки в колбэках таймеров и обработчиков** не ловит внешний `try`.
- **Ошибка в `finally`** заменяет исходную — исходная теряется.
- **Ожидаемые ошибки и баги — разные вещи.** Валидация, 404, отказ в доступе — часть логики, их лучше возвращать как значения или специальные классы и показывать пользователю. Баги — логировать и показывать общий экран ошибки. Ловить всё подряд в `catch {}` и молчать — главный анти-паттерн.
- **Сообщение для пользователя** не равно `error.message`: оно должно объяснять, что делать дальше. Вопрос из сборников про UX форм.
- **`Error.captureStackTrace`** — нестандартный API V8, но теперь есть в Firefox 138 и Safari 17.2. На стадии 3 — стандартизация доступа к `error.stack` (Error Stack Accessor), на стадии 2 — `Error.captureStackTrace`.

## Что изменилось

- ES2022: `cause`. ES2026: `Error.isError` (Chrome 134, Firefox 138, Safari нет).
- **ES2027 — явное управление ресурсами**: `using res = getResource()` в конце блока вызывает `res[Symbol.dispose]()`, даже при исключении. `await using` — для `Symbol.asyncDispose`. `DisposableStack` и `AsyncDisposableStack` собирают несколько очисток. Если ошибки случились и в блоке, и при освобождении, получится `SuppressedError` с `error` и `suppressed`. Chrome 134, Firefox 141, Safari нет — Baseline нет. TypeScript поддерживает синтаксис с 5.2.
- На стадии 3 — Error Stack Accessor.

## Что спрашивают

- Как обрабатывать ошибки в JavaScript? `try/catch/finally`.
- Какие типы ошибок бывают?
- Как создать свою ошибку?
- Как обработать ошибки в `async/await` и в промисах?
- Как ловить глобальные ошибки на клиенте и отправлять в мониторинг?
- Что выполняется, если `return` есть и в `try`, и в `finally`?

## Идеи для практики

- **Задачи на вывод:** `return` в `try` и `finally`; ошибка в `finally`; `catch` асинхронной ошибки из `setTimeout`.
- **Задачи с редактором:** иерархия `AppError` → `HttpError` с `status`, `NetworkError` с `cause`; функция `toUserMessage(e)` для разных типов; `using` с `DisposableStack` для подписок (в задаче — с полифилом или проверкой `Symbol.dispose`).
- **Задача из работы:** обёртка над fetch, которая различает отмену, сетевую ошибку, 4xx и 5xx.
- **Карточки:** когда `instanceof Error` врёт; что делает `cause`; чем ожидаемая ошибка отличается от бага.

## Источники

- ECMA-262, §20.5 Error Objects — https://tc39.es/ecma262/#sec-error-objects
- ECMA-262, §14.15 The try Statement — https://tc39.es/ecma262/#sec-try-statement
- MDN, Error — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
- MDN, `Error.isError` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/isError
- MDN, `using` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using
- V8, Explicit resource management — https://v8.dev/features/explicit-resource-management
- Предложения Explicit Resource Management, Error Stack Accessor — https://github.com/tc39/proposals
