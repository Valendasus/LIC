# iframe: изоляция, sandbox и общение с окном

Лист: `browser/iframes`. Новая тема, добавлена 11.11.2026. Вопросов в сборниках 25, почти все — про `sandbox`, хранилища во встроенном iframe и защиту от встраивания (`X-Frame-Options`, `frame-ancestors`).

## Что обязательно знать

- **`<iframe>`** встраивает отдельный документ со своим `window`, `document`, историей и event loop (если origin другой — часто и процессом, см. process-model.md).
- **Доступ между окнами:**
  - **тот же origin** — родитель может читать `iframe.contentWindow.document`, а iframe — `parent.document`, полный доступ;
  - **другой origin** — доступ только к узкому набору (`postMessage`, `location` на запись, `close`, `frames`). Всё остальное — `SecurityError`. Общаться — только через `postMessage` с проверкой `event.origin` (cross-tab.md).
- **`sandbox`** — ограничения для встроенного документа. Пустой `sandbox` запрещает почти всё: скрипты, формы, попапы, навигацию верхнего окна, и делает origin «непрозрачным» (`null`) — у документа нет доступа к своим cookie и хранилищам. Разрешения добавляются токенами:
  - `allow-scripts`, `allow-forms`, `allow-popups`, `allow-modals`, `allow-downloads`;
  - `allow-same-origin` — сохранить настоящий origin;
  - `allow-top-navigation-by-user-activation` — менять адрес верхнего окна только по действию пользователя.
- **Опасная пара:** `allow-scripts allow-same-origin` для документа **того же origin** = песочницы нет — скрипт может сам снять атрибут `sandbox` у своего iframe.
- **`allow`** — Permissions Policy: какие возможности разрешены iframe (`camera`, `microphone`, `geolocation`, `fullscreen`, `clipboard-write`, `payment`). По умолчанию у чужого iframe их нет.
- **`srcdoc`** — HTML прямо в атрибуте, без отдельного запроса. С `sandbox` — удобная песочница для пользовательского кода.
- **`loading="lazy"`** — отложенная загрузка iframe (Baseline с 2023).
- **`referrerpolicy`**, **`credentialless`** (только Chromium) — iframe без cookie.

### Защита от встраивания вашего сайта

- **Clickjacking:** чужой сайт кладёт ваш под прозрачный слой и заставляет кликнуть.
- Защита — заголовки на **вашей** странице: `Content-Security-Policy: frame-ancestors 'self' https://partner.com` (современный способ, список разрешённых) и устаревший `X-Frame-Options: DENY | SAMEORIGIN`. При наличии обоих браузеры следуют `frame-ancestors`.

## Где iframe нужен во фронтенде

- Изоляция стороннего кода: платёжные формы (поля карты у PSP — iframe, PCI DSS), виджеты, реклама, встраиваемые видео и карты.
- Песочница для пользовательского кода: онлайн-редакторы, превью писем, «запусти код». На этой платформе React-задачи выполняются в iframe `/sandbox`.
- Микрофронтенды на iframe — самая сильная изоляция ценой UX (прокрутка, размеры, фокус, история). См. architecture/micro-frontends.
- Предпросмотр документов и PDF.

## Тонкие места

- **Хранилища во встроенном iframe** разделены по сайту верхнего уровня (Storage Partitioning). Сторонние cookie в iframe блокируются (Safari и Firefox давно, в Chrome — по выбору пользователя). Доступ к своим cookie — через Storage Access API (`document.requestStorageAccess()`, Baseline широко).
- **Высота под содержимое** автоматически не подстраивается: iframe сообщает высоту через `postMessage` (по ResizeObserver), родитель меняет `style.height`.
- **Производительность:** каждый iframe — отдельный документ; десятки iframe на странице — память и время загрузки. iframe того же сайта может разделить главный поток с родителем.
- **Доступность:** у iframe нужен `title`. Фокус уходит внутрь и обратно по Tab.
- **Невидимый iframe** не получает rAF и замедляет таймеры.
- **`load` iframe** срабатывает и для страницы ошибки — успешность загрузки так не узнать.

## Что изменилось

- Storage Partitioning во всех основных браузерах и отказ от сторонних cookie — iframe-виджетам нужна Storage Access API или серверная схема.
- `credentialless` iframe — только Chromium. Fenced Frames (Privacy Sandbox) — без поддержки по данным web-features.
- `X-Frame-Options` устарел в пользу `frame-ancestors`, но для совместимости ставят оба.

## Что спрашивают

- Что такое `sandbox` у iframe? Какие ограничения можно задать?
- Может ли iframe читать `localStorage` родителя?
- Чем опасны сторонние iframe?
- Разница между `X-Frame-Options` и `frame-ancestors`.
- Как общаться с iframe другого origin?

## Идеи для практики

- **Карточки:** что запрещает пустой `sandbox`; почему `allow-scripts` + `allow-same-origin` опасны; `frame-ancestors` против `X-Frame-Options`; что доступно между окнами разных origin.
- **Задача с редактором:** протокол «родитель ↔ виджет» на `postMessage`: рукопожатие, проверка origin, автоматическая высота — тест на фейковых окнах.
- **Задача на выбор:** для пяти сценариев (платёжная форма, превью письма, видео, редактор кода, чужой виджет) подобрать набор токенов `sandbox` и `allow`.

## Источники

- HTML Standard, The iframe element — https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-iframe-element
- HTML Standard, Sandboxing — https://html.spec.whatwg.org/multipage/browsers.html#sandboxing
- MDN, `<iframe>` — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
- MDN, CSP `frame-ancestors` — https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
- MDN, Clickjacking — https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Clickjacking
- MDN, Storage Access API — https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API
- MDN, Permissions Policy — https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Permissions_Policy
- web-features 3.45.0: iframe-sandbox, iframe-credentialless, storage-access, fencedframe
