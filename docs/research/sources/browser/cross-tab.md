# BroadcastChannel и postMessage

Лист: `browser/workers/cross-tab`. Вопросы в сборниках практические: «как синхронизировать logout между вкладками», «чем BroadcastChannel лучше storage event», «делится ли sessionStorage между вкладками».

## Что обязательно знать

| Механизм | Кто с кем | Ограничение | Данные |
|---|---|---|---|
| `window.postMessage(data, targetOrigin)` | окно ↔ окно, iframe, попап — **любые origin** | нужна ссылка на окно | структурированный клон, transfer |
| `MessageChannel` | два порта, прямой канал | порты передают через `postMessage` | клон, transfer |
| `BroadcastChannel(name)` | все контексты **одного origin**: вкладки, iframe, воркеры | только свой origin | клон |
| Событие `storage` | вкладки одного origin, кроме той, что изменила | только `localStorage`, строки | строки |
| `SharedWorker` | все контексты одного origin, общий код и состояние | один процесс-посредник | клон |
| Service Worker `clients` | воркер ↔ управляемые вкладки | нужен зарегистрированный SW | клон |
| Web Locks `navigator.locks` | координация: только одна вкладка делает работу | не канал данных | — |

- **`postMessage` между origin — граница безопасности:**
  - отправитель указывает **точный** `targetOrigin`, а не `'*'`, если данные чувствительные;
  - получатель **всегда проверяет `event.origin`** и формат `event.data`. Без проверки любой сайт, открывший вашу страницу в iframe или попапе, сможет слать команды.
- **BroadcastChannel:** `const ch = new BroadcastChannel('auth'); ch.postMessage({ type: 'logout' }); ch.onmessage = …`. Сам объект-отправитель своё сообщение не получает, а другие объекты канала с тем же именем — даже в той же вкладке — получают. `ch.close()` при уходе.
- **Хранилища и вкладки:** `localStorage` общий для origin, `sessionStorage` — свой у каждой вкладки (копируется при «дублировать вкладку» и при `window.open` того же origin без `noopener`).

## Типовые задачи

- **Синхронный logout и login:** BroadcastChannel `auth` → остальные вкладки сбрасывают состояние и уходят на страницу входа. Резерв — событие `storage`.
- **Одна вкладка-лидер:** WebSocket или опрос сервера держит одна вкладка, остальные получают данные через BroadcastChannel. Лидера выбирает `navigator.locks.request('leader', …)` — блокировка освобождается сама, когда вкладка закрывается.
- **Обновление токена:** только одна вкладка делает refresh, остальные ждут — та же блокировка.
- **Общение с виджетом или платёжной формой в iframe чужого origin:** `postMessage` с проверкой origin, протокол сообщений с `type` и версией.

## Тонкие места

- **`storage` не срабатывает в той же вкладке**, где произошла запись, — частый вопрос.
- **BroadcastChannel и bfcache:** страница с открытым каналом могла не попадать в bfcache в старых браузерах. Закрывать канал на `pagehide`.
- **Партиционирование хранилищ:** в iframe на чужом сайте `localStorage`, BroadcastChannel и SharedWorker разделены по сайту верхнего уровня (Storage Partitioning — Chrome 115, Firefox и Safari раньше). iframe `widget.com` на `a.com` и на `b.com` друг друга не видят.
- **Порядок** сообщений из разных вкладок не гарантирован; в протоколе нужны версии или метки времени.
- **Структурированное клонирование:** функции и DOM не передаются (web-workers.md).

## Что изменилось

- Storage Partitioning во всех основных браузерах — главный сдвиг для встраиваемых виджетов.
- Web Locks — Baseline широко с 2022.
- BroadcastChannel — Baseline широко с 2022 (Safari 15.4).

## Что спрашивают

- Делится ли `localStorage` и `sessionStorage` между вкладками?
- Какие есть способы синхронизировать состояние между вкладками? Чем BroadcastChannel лучше события `storage`?
- Как синхронизировать logout между вкладками?
- Как безопасно общаться с iframe через `postMessage`?

## Идеи для практики

- **Задачи с редактором:** `createTabSync(channelName)` с типизированными сообщениями и отпиской; выбор вкладки-лидера через Web Locks (тест на фейковом `navigator.locks`); обработчик `message` с проверкой origin и схемы данных — тест подаёт сообщения с чужого origin и с неверной формой.
- **Задача на ошибку:** `postMessage(token, '*')` и обработчик без проверки `event.origin`.
- **Карточки:** таблица механизмов; где `sessionStorage` копируется; что такое партиционирование.

## Источники

- HTML Standard, Cross-document messaging — https://html.spec.whatwg.org/multipage/web-messaging.html
- HTML Standard, Broadcasting to other browsing contexts — https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts
- MDN, `Window.postMessage` — https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
- MDN, Broadcast Channel API — https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
- MDN, Web Locks API — https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
- MDN, State Partitioning — https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/State_Partitioning
- Chrome for Developers, Storage Partitioning — https://developers.google.com/privacy-sandbox/cookies/storage-partitioning
