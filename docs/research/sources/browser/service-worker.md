# Service Worker и PWA

Лист: `browser/workers/service-worker`. В сборниках 31 вопрос — про кэш, офлайн, обновление и безопасность. Это самая «процессная» часть воркеров: жизненным циклом управляет браузер, а не страница.

## Что обязательно знать

- **Service Worker (SW)** — воркер-посредник между страницами origin и сетью. Он перехватывает запросы (`fetch`), получает push-уведомления и фоновые события. DOM ему недоступен. Работает только по HTTPS (и на `localhost`).
- **Регистрация:** `navigator.serviceWorker.register('/sw.js', { scope: '/', type: 'module' })`. Scope ограничен папкой файла, если сервер не разрешит шире (`Service-Worker-Allowed`).
- **Жизненный цикл:**
  1. `install` — заранее положить ресурсы в кэш (`event.waitUntil(cache.addAll([...]))`);
  2. `waiting` — новая версия ждёт, пока закроются **все** вкладки со старой;
  3. `activate` — удалить старые кэши;
  4. работа: события `fetch`, `message`, `push`, `sync`;
  5. простой — браузер **останавливает** SW, когда событий нет (секунды или минуты). Глобальные переменные теряются, состояние хранить в IndexedDB или Cache.
- **Обновление:** браузер проверяет `sw.js` при навигации и не реже раза в сутки. Ускорить переход — `self.skipWaiting()` и `clients.claim()`, но тогда старая страница может работать с новым SW и новыми кэшами. Безопаснее — показать «доступно обновление» и перезагрузить по согласию.
- **Стратегии кэширования в `fetch`:**

| Стратегия | Когда |
|---|---|
| Cache first | статика с хешем в имени, шрифты |
| Network first, при ошибке — кэш | HTML, API, где важна свежесть |
| Stale-while-revalidate | аватары, не критичные данные |
| Network only | платежи, мутации |
| Cache only | офлайн-страница |

  Библиотека Workbox реализует стратегии и прекеш из манифеста сборки.
- **PWA:** манифест (`manifest.webmanifest`: имя, иконки, `display`, `start_url`) + SW с офлайн-поведением + HTTPS → установка как приложения. На iOS — «На экран Домой», push с iOS 16.4 только для установленных.

## Тонкие места

- **«Застрявшая» версия:** ошибка в стратегии cache first для HTML — пользователи месяцами видят старое приложение. Нужен план отката: SW, который удаляет кэши и себя (`registration.unregister()`), и заголовок `Clear-Site-Data`.
- **`sw.js` не кэшировать надолго** на CDN — иначе обновление задержится.
- **Отладка:** DevTools → Application → Service Workers: Update on reload, Bypass for network, Unregister. Вопрос из сборников: «как SW осложняет отладку и как отключить его при измерении производительности».
- **Безопасность:** скомпрометированный SW перехватывает все запросы origin, переживает перезагрузку и закрытие вкладки. Защита — CSP, отсутствие XSS, никаких SW со сторонних origin, `Clear-Site-Data: "storage"` как аварийный выключатель.
- **Первый визит** SW не контролирует: он начинает перехватывать со следующей навигации (или после `clients.claim()`).
- **Навигационная предзагрузка** (`navigationPreload`) — чтобы запуск SW не задерживал загрузку HTML.
- **SW и HTTP-кэш** — два разных слоя: запрос из SW тоже проходит через HTTP-кэш. Вопрос: «memory cache, disk cache, service worker cache — в чём разница».
- **Фоновые возможности:** Background Sync и Periodic Background Sync — только Chromium. Push — Baseline широко (Safari 16).

## Что изменилось

- Модули в Service Worker (`type: 'module'`) — Baseline недавно с 01.2026 (Firefox 147).
- Static routing API (`event.addRoutes`) — правила маршрутизации без запуска SW: Chrome 123, Safari 27, в Firefox нет.
- Push в вебе — Baseline широко (2023), Declarative Web Push в Safari.
- Next.js и Vite не включают SW сами; нужен Workbox, `vite-plugin-pwa` или Serwist.

## Что спрашивают

- Что такое Service Worker? Жизненный цикл.
- Как SW связан с Cache Storage? Какие стратегии кэширования бывают?
- Как реализовать офлайн-режим?
- Как безопасно обновлять SW? Какие проблемы с кэшем он может создать?
- Какие угрозы связаны с SW?
- Что такое PWA?

## Идеи для практики

- **Задачи с редактором:** реализовать стратегии `cacheFirst`, `networkFirst`, `staleWhileRevalidate` как чистые функции над фейковыми `cache` и `fetch` — тест проверяет, что вернулось и что обновилось в кэше; очистка старых версий кэшей в `activate`.
- **Задача из работы:** пользователи видят старую версию после релиза — найти причину по коду SW и заголовкам и составить план исправления.
- **Карточки:** жизненный цикл; почему новая версия ждёт; какая стратегия для HTML, API, статики; аварийное отключение SW.

## Источники

- W3C, Service Workers — https://w3c.github.io/ServiceWorker/
- MDN, Service Worker API — https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- MDN, Using Service Workers — https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- web.dev, The service worker lifecycle — https://web.dev/articles/service-worker-lifecycle
- web.dev, PWA — https://web.dev/explore/progressive-web-apps
- Chrome for Developers, Workbox — https://developer.chrome.com/docs/workbox
- MDN, `Clear-Site-Data` — https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Clear-Site-Data
- web-features 3.45.0: service-workers, js-modules-service-workers, service-workers-static-routes, push, background-sync
