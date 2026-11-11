# Процессы и потоки браузера

Лист: `browser/process-model`. Новая тема, добавлена 11.11.2026. В сборниках вопросы о ней разбросаны по темам main thread, воркеров и безопасности. Это основа, без которой не понять воркеры, iframe, cross-origin isolation и почему анимация `transform` плавная, а `top` — нет.

## Что обязательно знать

### Процессы (на примере Chromium)

| Процесс | Что делает |
|---|---|
| Browser (главный) | интерфейс, вкладки, навигация, права, координация остальных |
| Renderer | парсинг HTML и CSS, JavaScript, layout, paint для сайтов; работает в песочнице |
| GPU | растеризация и вывод кадров на экран для всех вкладок |
| Network service | все сетевые запросы, cookie, кэш HTTP |
| Storage и другие утилиты | IndexedDB, аудио, распаковка и пр. |
| Расширения, плагины | отдельные процессы |

- **Песочница:** у процесса отрисовки нет прямого доступа к файлам, сети и системе. Он просит об этом браузерный процесс через IPC. Ошибка в движке JS не даёт сразу доступ к компьютеру.
- **Site isolation:** документы разных **сайтов** — в разных процессах, включая iframe чужого сайта внутри страницы (out-of-process iframe). Сайт — это схема + регистрируемый домен (eTLD+1): `a.example.com` и `b.example.com` — один сайт, `example.com` и `example.org` — разные. В Chrome на десктопе включено с 2018 года (ответ на Spectre), в Firefox — проект Fission, по умолчанию с версии 95 (2021). В WebKit изоляция сайтов в активной разработке, по трекеру ошибок за 2026 год. Включена ли она по умолчанию в Safari, официально не подтверждено.
- **Почему это важно фронтендеру:**
  - падение или зависание одной вкладки не роняет остальные;
  - Spectre-подобные атаки читают память своего процесса, поэтому опасные API (`SharedArrayBuffer`, точный `performance.now`) доступны только в cross-origin isolated контексте (shared-memory.md);
  - `window.open` и iframe того же сайта могут оказаться в одном процессе и делить главный поток: тяжёлый iframe того же сайта тормозит родителя.

### Потоки внутри процесса отрисовки

- **Главный поток (main thread):** JavaScript страницы, обработчики событий, стили, layout, paint (запись команд отрисовки), большинство API. Одна очередь работы — отсюда «не блокируй главный поток».
- **Поток компоновщика (compositor):** собирает слои в кадр, прокручивает страницу и выполняет анимации `transform` и `opacity`, **не дожидаясь главного потока**. Поэтому такие анимации плавные даже при занятом JS, а анимация `top`, `width` требует layout на главном потоке.
- **Потоки растеризации:** превращают записанные команды отрисовки в пиксели (часто на GPU).
- **Воркеры** — отдельные потоки со своим event loop (web-workers.md).
- **Прокрутка:** если на странице есть не-пассивный обработчик `wheel` или `touchmove`, компоновщик вынужден ждать главный поток — прокрутка дёргается. Отсюда `{ passive: true }`.

## Тонкие места

- **«JavaScript однопоточный»** — точнее: у каждого агента (окно, воркер) один поток выполнения JS и свой event loop. Параллельность — через воркеры, общая память — только через `SharedArrayBuffer`.
- **Один процесс на вкладку — неверно.** Вкладки одного сайта могут делить процесс (при нехватке памяти), одна вкладка может использовать несколько процессов (iframe других сайтов).
- **`noopener`, COOP:** окно, открытое через `window.open`, по умолчанию связано с открывающим (`window.opener`), и они могут остаться в одном процессе. `rel="noopener"` (по умолчанию для `target="_blank"` с 2021 года) и заголовок `Cross-Origin-Opener-Policy` разрывают связь и позволяют разнести их по процессам.
- **Фоновые вкладки:** браузер замедляет таймеры, останавливает rAF, может заморозить или выгрузить вкладку (Page Lifecycle в Chromium: `freeze` и `resume`; во всех браузерах — `visibilitychange`). Код должен переживать возврат во вкладку.
- **bfcache:** страница целиком сохраняется в памяти при уходе «назад». Мешают обработчики `unload` и открытые соединения. При возврате срабатывает `pageshow` с `persisted: true`.

## Что изменилось

- Chrome постепенно расширяет изоляцию на Android (с 2019 года — для сайтов с логином).
- Заголовок `Origin-Agent-Cluster` (Chrome 90, Firefox 138, Safari Preview) — изоляция по origin, а не по сайту.
- `Document-Isolation-Policy` (Chrome 137, только Chromium) — cross-origin isolation для одного документа без COOP на весь сайт.
- Обработчик `unload` в Chrome постепенно отключается: вместо него `pagehide` и `visibilitychange`.

## Что спрашивают

- Что такое main thread и почему он важен? Какие задачи за него конкурируют?
- Почему анимация `transform` плавнее, чем анимация `left`?
- Как браузер изолирует вкладки и сайты? Что такое site isolation?
- Что происходит с JS во фоновой вкладке?
- Почему «JavaScript однопоточный», если есть воркеры?

## Идеи для практики

- **Карточки:** таблица процессов; что делает компоновщик без главного потока; сайт и origin — разница; зачем `{ passive: true }`.
- **Задача «предскажи»:** во время цикла на 2 секунды в JS какие из анимаций продолжат идти — `transform`, `left`, CSS-анимация `opacity`, анимация на rAF.
- **Практика в DevTools** (ручная отметка): найти процессы в диспетчере задач браузера, посмотреть потоки во вкладке Performance.
- **Демо:** схема процессов и потоков с подсветкой, кто участвует в клике, прокрутке и анимации.

## Источники

- Chromium, Process Model and Site Isolation — https://chromium.googlesource.com/chromium/src/+/main/docs/process_model_and_site_isolation.md
- Chrome for Developers, Inside look at modern web browser (части 1–4) — https://developer.chrome.com/blog/inside-browser-part1
- Chromium, Site Isolation — https://www.chromium.org/Home/chromium-security/site-isolation/
- Mozilla, Project Fission — https://wiki.mozilla.org/Project_Fission
- WebKit, Site Isolation (документация разработчиков) — https://docs.webkit.org/Deep%20Dive/SiteIsolation.html
- HTML Standard, Agents and agent clusters — https://html.spec.whatwg.org/multipage/webappapis.html#integration-with-the-javascript-agent-cluster-formalism
- web.dev, Page Lifecycle API — https://developer.chrome.com/docs/web-platform/page-lifecycle-api
- web.dev, Back/forward cache — https://web.dev/articles/bfcache
- MDN browser-compat-data 8.1.8: `Origin-Agent-Cluster`, `Document-Isolation-Policy`
