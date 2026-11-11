# Promise.all, allSettled, race, any

Лист: `javascript/async/combinators`. Приоритет: 90 (13 вопросов). Вопросов мало, но реализацию `Promise.all` просят часто, и это практическая тема.

## Что обязательно знать

| Метод | Выполняется | Отклоняется | Пустой массив |
|---|---|---|---|
| `Promise.all` | когда выполнены все — массив значений в исходном порядке | при **первом** отклонении | сразу `[]` |
| `Promise.allSettled` (ES2020) | когда завершены все — `{ status, value \| reason }[]` | никогда | сразу `[]` |
| `Promise.race` | первым завершившимся | первым завершившимся | **навсегда pending** |
| `Promise.any` (ES2021) | первым выполненным | когда отклонены все — `AggregateError` с `errors` | сразу отклонён `AggregateError` |

- Все принимают **любое итерируемое**, а не только массив. Не-промисы оборачиваются через `Promise.resolve`.
- **Комбинатор ничего не отменяет.** После отклонения `all` или победы в `race` остальные операции продолжают работать. Отмена — через `AbortSignal` (cancellation.md).

## Тонкие места

- **Порядок результатов `all` — по входу**, а не по времени завершения.
- **Fail-fast `all`:** остальные отклонения после первого не порождают «unhandled rejection» — `all` подписан на все промисы.
- **`race` для таймаута** — классика, но таймер остаётся висеть. Правильнее `AbortSignal.timeout(ms)` для fetch или очищать таймер в `finally`.
- **`allSettled` для частичного успеха:** загрузить виджеты дашборда, показать то, что пришло, и ошибку для остального. Вопрос из сборников: «как обработать частичный успех при загрузке нескольких ресурсов».
- **`any` против `race`:** `any` игнорирует отклонения до последнего — подходит для зеркал и резервных CDN.

## Что изменилось

- Методы стабильны с ES2021.
- На стадии 3 — **`Promise.allKeyed(obj)`** и **`Promise.allSettledKeyed(obj)`**: принимают объект промисов и возвращают объект результатов по тем же ключам. Решают путаницу с порядком в деструктуризации `const [user, posts] = await Promise.all([…])`. В браузерах нет.

## Что спрашивают

- Разница между `all`, `allSettled`, `race` и `any`.
- Что произойдёт с остальными промисами, если один отклонится в `Promise.all`?
- Реализуйте `Promise.all` (и `allSettled`, `race`).
- Как сделать таймаут для промиса?

## Идеи для практики

- **Задачи с редактором** (основная форма для этой темы): `promiseAll` (порядок, пустой вход, итерируемое, не-промисы, fail-fast), `promiseAllSettled`, `promiseAny` с `AggregateError`, `promiseRace`.
- **Задача из работы:** дашборд из 4 виджетов — частичный успех через `allSettled`, тест на рендер ошибок по отдельности.
- **Карточки:** таблица выше; почему `race([])` висит вечно; комбинатор не отменяет операции.

## Источники

- ECMA-262, §27.2.4 Properties of the Promise Constructor — https://tc39.es/ecma262/#sec-properties-of-the-promise-constructor
- MDN, `Promise.all` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
- MDN, `Promise.allSettled` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
- MDN, `Promise.any` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any
- MDN, `Promise.race` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race
- Предложение Await Dictionary (`Promise.allKeyed`) — https://github.com/tc39/proposal-await-dictionary
