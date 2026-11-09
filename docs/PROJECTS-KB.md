# База примеров из реальных проектов

> Практическая половина обучения: как темы из [TOPIC-TREE.md](TOPIC-TREE.md) реализованы в живом коде.
> Проекты — не эталон, а реальность: в них есть и сильные решения, и спорные. Поэтому у примеров две пометки:
> ✅ — хорошее решение, можно брать за образец;
> 🔍 — разобрать критически: работает, но лучше сделать иначе или нужно понимать компромисс.
>
> Пути указаны от корня каждого проекта. Файлы я открывал и читал; в разделе «Ещё не разобрано» перечислено, что осталось.
> Составлено 08.11.2026. Код меняется — при наполнении листа ссылку надо перепроверять.

## Проекты

| Ключ | Проект | Путь | Что в нём главное |
|---|---|---|---|
| **CRM** | smallCRM (S-CRM3) | `~/Documents/работа/фриланс/smallCRM/S-CRM3` | Микросервисы на NestJS, мультитенантность, полная инфраструктура: CI, мониторинг, бэкапы с PITR |
| **AVT** | avt-team | `~/Documents/работа/фриланс/avt/avt-site` (приложение в `app_awt_new`) | Next.js-сайт с кабинетом, ботами и интеграциями; деплой на домашний сервер по `git push` |
| **PF** | Портфолио «Закат» | `~/Documents/мои проекты/sait-moi-portfolio/project-Valya` | three.js и анимация, шрифты, форма заявки по 152-ФЗ |
| **LND** | Промо-лендинг | `~/Documents/работа/фриланс/alena-lending/site` | Статика на 7 языках, конвейер изображений, Cloudflare Workers |
| **NPC** | Тестовые НПЦ ИРС | `~/Documents/работа/пробники в комании/НПЦ ирс` | Express и pg-promise, AG Grid, Web Worker и виртуализация на 100 000 записей |

---

## 1. Архитектура (BE6, FS1, FE16)

### CRM: микросервисы с общей инфраструктурой
- **Устройство:**
  - `backend/microservices/` — gateway (порт 5000), сервисы auth, crm, lms, live, notification, billing, analytics и общий пакет `shared/src`.
  - У сервисов общие `node_modules`, одна Prisma-схема и одна база.
- **Решения записаны в ADR** (`backend/docs/adr/ADR-0001…0004`): границы сервисов, мультитенантность, стратегия Prisma-схемы, мессенджер, роли. ✅ Хороший пример того, как документировать архитектуру.
- **Gateway только проксирует:** `gateway/src/modules/proxy/`, бизнес-логики в нём нет. Он же держит WebSocket-мосты: `ws-bridge`, `notifications-ws`, `schedule-ws`, `crm-tasks-ws`, `crm-leads-ws`.
- **gRPC-контракты лежат только в `shared/src/proto/`:** `common.proto`, `auth/actor.proto`, `lms/lms.proto`, `messenger/*.proto`. Серверная сторона — `auth-service/src/modules/grpc/actor-resolver.controller.ts`, `lms-service/src/modules/grpc/lms-internal.controller.ts`.
- 🔍 **Вопрос для разбора:** сервисы делят одну базу и одну схему. Это «распределённый монолит» или осознанный компромисс? В ADR-0001 обоснование есть — хороший материал для system design.

### AVT: монорепозиторий с вариантами дизайна
- **Устройство:** корневой `package.json` — npm workspaces на 16 вариантов сайта. Боевой — `app_awt_new`.
- 🔍 Workspaces влияют на сборку: см. пункт 6.

---

## 2. Мультитенантность (BE3, FS15)

- **CRM, сервер:** `crm-service/src/shared/middlewares/school.middleware.ts` наследует общий `shared/src/middleware/school-context.middleware.ts` и находит школу по slug через Prisma. Подключается к маршрутам в `app.module.ts` через `forRoutes`.
- **CRM, фронтенд:** `frontend/proxy.ts` (Next.js 16, бывший middleware) разбирает поддомен.
  - Функции `isSubdomain` и `getSchoolSlug`, зарезервированные имена берутся из `lib/routing/reserved-subdomains.ts`.
  - Клиент API добавляет заголовок `x-school-slug`.
- **CRM, данные:** одна схема `public`, в бизнес-таблицах поле `school_id`. Ключи Redis и индексы Elasticsearch тоже с префиксом тенанта (ADR-0001).
- 🔍 **Компромисс:** изоляция только на уровне приложения. Забыл фильтр по `school_id` — данные утекли к чужой школе. Тема для разбора: Row Level Security в Postgres как второй рубеж.

---

## 3. Аутентификация и безопасность (BE4, FS4, FE17)

| Что | Где | Оценка |
|---|---|---|
| Хэш паролей argon2 и требования к паролю | CRM `auth-service/src/core/services/auth/password/password.service.ts` | 🔍 Используется вариант `argon2i`; OWASP рекомендует `argon2id`. Хорошая тема для обсуждения |
| Пара токенов access и refresh | CRM `auth-service/src/core/services/auth/token/token.service.ts` | 🔍 Оба токена подписаны одним `JWT_SECRET` — разобрать, почему лучше разные ключи. ✅ У access есть `jti` |
| Refresh в cookie `HttpOnly`, `Secure`, `SameSite=lax` на общий домен | CRM `auth-service/src/core/services/auth/cookie/cookie.service.ts` | ✅ Классика; `domain` нужен из-за поддоменов школ |
| Отзыв сессий: выход со всех устройств, смена пароля, blacklist access-токенов | CRM `auth-service/src/modules/auth/auth.service.ts`, `account-security.service.ts`, `owner-contact-change.service.ts` | ✅ Refresh-сессии хранятся в кеше и удаляются по префиксу |
| Ограничение попыток: вход, регистрация, отправка кодов | CRM `auth-service/src/core/services/common/rate-limit.service.ts` | ✅ Окна и минимальные интервалы на Redis, разные лимиты под разные действия |
| Обновление токена на клиенте | CRM `frontend/app/core/api/client.ts` | ✅ Сильный пример: интерцептор Axios с флагом `_retry`, плановое обновление до истечения, синхронизация вкладок через `BroadcastChannel`, «предохранитель» при повторных 403 |
| OAuth с PKCE и `state` в cookie | AVT `app_awt_new/src/lib/accounts/oauth.ts`, `auth.ts`, `app/api/auth/login/[provider]/route.ts` | ✅ `code_verifier` и cookie состояния на том же хосте, что и callback |
| Восстановление пароля | AVT `app_awt_new/src/app/api/auth/password/`, `(ru)/reset-password` | ✅ Пример полного потока |
| Роли и права одним каталогом | CRM `shared/src/constants/crm-permissions.catalog.ts`, `module-registry.ts`, ADR-0004 | ✅ Права в роли школы, а не в enum; фронт использует сгенерированное зеркало |
| Guard'ы NestJS | CRM `lms-service/src/shared/guards/school-auth.guard.ts`, `course-access.guard.ts`, `live-service/.../trusted-actor.guard.ts` | ✅ Для темы guards и `CanActivate` |
| Защита формы от ботов (honeypot), согласие на ПДн | PF `src/app/api/order/route.ts` | ✅ Скрытое поле `website`, фиксация времени и редакции согласия, ничего не хранится и не логируется |

---

## 4. API и обработка ошибок (BE2, FS8, FE17)

- **Глобальный фильтр ошибок:** CRM `shared/src/filters/all-exception.filter.ts`. Prisma `P2002` превращается в 409, единый формат `{ status, message[], error }`.
  - 🔍 Для обычного `Error` клиенту уходит `exception.message`: внутренние подробности могут утечь наружу. Сравните с NPC (`errorHandler.js`), где для 500 отдаётся общий текст.
- **Валидация:** CRM включает `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` глобально (CLAUDE.md проекта). Сравнение: NPC `utils/validation.js` (своя схема) и PF `lib/order.ts` (общие правила для формы и API).
- **Swagger:** только crm-service, `/api/docs`.
- **Ошибки сервера на фронте:** CRM `frontend/lib/routing/server-error-policy.ts`, `server-error-browser.ts`, `server-error-recovery.ts`. 5xx перехватывает интерцептор до React; `error.tsx` ловит только ошибки рендера. ✅ Хороший разбор «ошибка бэкенда ≠ падение рендера».
- **Загрузка файлов частями:** CRM `frontend/app/core/api/uploadMultipart.ts`, `uploadPartRequest.ts`, `genericUpload.ts`.

---

## 5. Данные, очереди, поиск, файлы (BE3, BE5, FS5–FS7)

| Тема | Где | Заметки |
|---|---|---|
| Prisma-схема из частей | CRM `backend/prisma/schema-parts/00-base … 85-notifications.prisma` → `schema.prisma` (генерируется) | ✅ Тема «как держать большую схему»; ADR-0002 |
| Миграции и проверка расхождений в CI | CRM `.github/workflows/deploy-stage.yml`, job `schema-check` | ✅ «Migrations apply cleanly on empty DB», «No drift between migrations and schema-parts» |
| Очереди BullMQ | CRM `live-service/src/modules/messenger/video/hls-processor.service.ts`, `video-prepare.processor.ts`, `indexing/messenger-index.processor.ts`, `live/meeting-empty-autocomplete.processor.ts` | Перекодирование видео в HLS и индексация — классические фоновые задачи |
| Elasticsearch | CRM `crm-service/src/modules/search/global-search-index.service.ts`, `student/student-files-search.service.ts`, `live-service/.../messenger-search.service.ts` | Глобальный поиск и поиск по сообщениям |
| S3 и presigned URL | CRM `shared/src/s3/s3.service.ts`, `live-service/.../sign-url-batch.ts`; AVT приватные файлы клиентов (`deploy/s3`) | ✅ Пакетная подпись ссылок |
| Почта: SMTP и IMAP | AVT `lib/mail.ts`, `lib/inbox`; PF `api/order/route.ts` (Яндекс SMTP) | |
| Telegram-боты и вебхуки | AVT `app/api/telegram/customer/route.ts`, `team/`, `lib/telegram.ts`, `deploy/bots/*.cjs` | ✅ Проверка подлинности вебхука (`telegramWebhookIsAuthentic`), ответ до обработки (коммит «acknowledge telegram webhook before processing») |
| LLM через OpenRouter | AVT `lib/openrouter.ts`, `app/api/ai/route.ts`, `app/api/improve/route.ts` | Интеграция внешнего ИИ-API |
| Пагинация LIMIT/OFFSET, Infinite Row Model | NPC `Fullstack/server/models/clients.js`, `client/src/pages/clients/ClientsGrid.jsx` | ✅ Белый список сортировки, `id` для стабильного порядка |

---

## 6. Фронтенд (FE)

| Тема | Где | Заметки |
|---|---|---|
| Глобальные сторы Zustand | CRM `frontend/app/core/store/*.ts` (около 30 файлов) | Один стор на ресурс |
| Один API-клиент на ресурс | CRM `frontend/app/core/api/*.ts` | Удобно сравнить с FSD |
| Маршрутизация по ролям, защита от петель редиректов | CRM `frontend/lib/routing/crm-role-access.ts`, `redirect-loop-breaker.ts`, `owner-session-handoff.ts` | ✅ Реальные проблемы авторизации на клиенте |
| Группы маршрутов App Router | CRM `frontend/app/(auth)`, `(domains)/crm`, `(domains)/lms`, `(public)`, `superadmin`; AVT `app/(ru)`, `app/(intl)/[lang]`; PF `app/(site)`, `app/(legal)` | |
| 3D-сцена | PF `src/components/three/SunsetScene.tsx` | three.js, React Three Fiber, постобработка |
| Анимации на прокрутке | PF и LND (GSAP, ScrollTrigger, Lenis); AVT `lib/scroll-motion.ts`, `raf.ts`, `pointerFrame.ts` | |
| Виртуализация и Web Worker | NPC `Frontend/eco-registry/src/api/registry.worker.ts`, `pages/registry/CitizensTable.tsx` | 🔍 Баг высоты меньше 900 px — разобранный пример |
| Сложные интерфейсы | CRM: TipTap, CodeMirror, dnd-kit, LiveKit, HLS (`package.json` фронта); блоки курсов `app/(domains)/lms/courses/[slug]/components/blocks` | |
| Тесты фронтенда | CRM `frontend/test/*.test.mjs` (`node --test`), `frontend/e2e` (Playwright); AVT `app_awt_new/test` | |

---

## 7. Шрифты, изображения, производительность (FE21)

- **PF `scripts/subset-jp.mjs`:** японский шрифт урезан до реально используемых символов. Было около 27 файлов и 450 КБ на страницу, стало по одному маленькому файлу на начертание.
  - Проверка `--check` перед каждой сборкой.
  - Исходник скачивается по закреплённому коммиту со сверкой SHA-256.
  - ✅ Отличный пример сразу для производительности, сборки и цепочки поставок.
- **PF README:** почему не `next/font/google`. При недоступном Google сборка молча подставляет Arial, поэтому шрифты лежат локально и делятся по `unicode-range`.
- **LND `scripts/images.mjs` + `images.config.mjs`:** sharp заранее нарезает все ширины и качества, которые может запросить `next/image`. Сервера для сжатия нет, сайт статический. Готовые файлы не пересоздаются (сравнение `mtime`).
- **LND `out/_headers`:** `immutable` на год для `/_next/static/*`, 30 дней для картинок и шрифтов.
- **AVT `app_awt_new/docs/mobile-performance-before.json` и `-after.json`:** замеры до и после оптимизации мобильной версии.

---

## 8. SEO (SEO1–SEO13)

| Тема | Где | Заметки |
|---|---|---|
| Честный `lastModified` в sitemap | AVT `app/sitemap.ts` | ✅ Раньше стояло «сейчас», и поисковик перестаёт доверять дате. Языковые альтернативы у каждой записи |
| `robots.ts` с объяснением каждого запрета | AVT `app/robots.ts` | ✅ `/api/` (краулинговый бюджет), `/admin`, `/profile` (конкурировал бы с главной), `/media/`, `/kp/` (личные предложения) |
| `manifest.ts` и почему `display: browser` | AVT `app/manifest.ts` | ✅ Осознанный выбор: сайт живёт ссылкой |
| hreflang и `x-default` на 7 языках | LND `src/app/[lang]/layout.tsx`, `src/app/sitemap.ts`, `src/lib/site.ts` | ✅ Одна страница на 7 языках без дублей |
| Согласованные hreflang в одном месте | AVT `lib/meta.ts` | |
| OG-картинки кодом | PF и AVT `opengraph-image.tsx`; LND `out/og.jpg` | |
| `canonical`, OG и sitemap из одного адреса сайта | PF `src/lib/site.ts` (`NEXT_PUBLIC_SITE_URL`) | |
| Страницы услуг под запросы | AVT `app/(intl)/[lang]/services/[slug]/page.tsx` | Пример посадочных страниц под кластеры |
| www → без www, http → https | AVT `deploy/nginx/avt-team.ru.conf` | 301 на канонический хост |
| Аналитика | AVT `lib/analytics.ts` | |

---

## 9. DevOps (DO1–DO15)

### Деплой
- **AVT, push-to-deploy:**
  - `deploy/autodeploy/post-receive` — хук bare-репозитория запускает выкладку через `systemd-run`, поэтому сборка не обрывается вместе с push. ✅
  - `deploy/autodeploy/deploy.sh` — три режима: `push`, `poll`, `force`. Истина — ветка `main` на GitHub. Healthcheck 180 секунд, хранятся 3 прошлых образа для отката. Скрипт запускается из копии, потому что checkout переписывает рабочее дерево. ✅
  - `deploy/autodeploy/avt-deploy.timer` — сверка раз в минуту, отсчёт от конца прошлого запуска (`OnUnitInactiveSec`). ✅
- **CRM, GitHub Actions:**
  - `.github/workflows/deploy-stage.yml`: проверка схемы → тесты бэка и фронта → сборка образов в GHCR → загрузка файлов стека по SSH → деплой.
  - Ещё `deploy-dev.yml`, `deploy-monitoring.yml`, `backup-drill.yml`.
- **Docker:**
  - CRM `backend/Dockerfile` — многоэтапная сборка NestJS-монорепы, кеш npm через `--mount=type=cache`, Prisma generate до копирования `src`.
  - AVT `deploy/Dockerfile` — два этапа, Next.js `standalone`; объяснено, почему сервер оказывается в `app_awt_new/server.js` при workspaces. ✅

### Сеть и nginx
- **CRM `deploy/nginx/app-wildcard.conf`:**
  - `upstream` с `keepalive`, `map` для WebSocket;
  - поддомены школ через регулярное выражение с именованной группой `slug`;
  - TLS 1.2–1.3, HSTS, `ssl_session_tickets off`;
  - gzip с комментариями, почему такие параметры. ✅
- **AVT `deploy/nginx/avt-team.ru.conf`:**
  - HTTP/3 (`listen 443 quic`, `Alt-Svc`);
  - `immutable` для `/_next/static/`;
  - разный `client_max_body_size` по маршрутам;
  - динамический upstream через `resolver 127.0.0.11` и переменную.
- **AVT `deploy/README.md`, раздел «Три вещи, на которых спотыкались»:**
  - порт контейнера не публикуется: nginx ходит по имени в общей сети, а хост закрыт `policy DROP`;
  - DNS контейнера недоступен из-за firewall: лечится `build.network: host` и `dns:` в compose, а не дыркой в firewall;
  - Telegram доступен только через VPN-маршрут.
  - ✅ Готовые кейсы «почини сервер».

### Наблюдаемость
- **CRM `monitoring/`:** Prometheus, Alertmanager (уведомления в Telegram), Grafana provisioning, Loki и promtail, blackbox.
- **Цели сбора** (`prometheus.yml`): node-exporter, cAdvisor, Postgres, Redis, Elasticsearch, Alertmanager, Loki, сервисы бэкенда, blackbox-http.
- **Алерты** (`prometheus/alerts/rules.yml`, 25+):
  - инфраструктура: InstanceDown, HighCpuUsage, DiskAlmostFull, ContainerMemoryNearLimit;
  - доступность: EndpointDown, SslCertExpiringSoon;
  - хранилища: PostgresDown, Elasticsearch*;
  - бэкапы: Backup*, WalArchive*.
- **Метрики приложения:** CRM `shared/src/utils/setup-metrics.ts` — `/metrics` со стандартными метриками Node и RED-метриками HTTP. ✅

### Бэкапы и стенды
- **CRM `deploy/backup/`:**
  - `backup.sh` — срез Postgres, Redis и секретов, шифрование, S3; понятные коды выхода, защита от параллельного запуска, `--dry-run`;
  - `basebackup.sh` и `wal-shipper.sh` — восстановление на момент времени: RPO в минуты вместо часа;
  - `restore.sh`, `restore-pitr.sh`, `tenant-export.sh`, `lifecycle.json`. ✅
- **CRM `docker-compose.prod.yml`:** параметры архивации WAL в сервисе Postgres; комментарий, почему они задаются при старте сервера, а не через `ALTER SYSTEM`.
- **CRM `deploy/stage/`:** `restore-prod-to-stage.sh`, `anonymize.sql`, `scrub-secrets.sql` — стенд из копии прода без персональных данных. ✅

### Командная работа
- **CRM `CLAUDE.md`, раздел про ветки:**
  - единственная рабочая ветка `stage`;
  - без `--force`, `rebase` и `amend` для отправленных коммитов;
  - атомарные коммиты, тест на каждое исправление, проверки перед push.
  - ✅ Живой пример правил git в команде, где изменения забирают вручную.

---

## 10. Ещё не разобрано

Будет разобрано при наполнении соответствующих листов:
- **CRM:**
  - сервисы lms, live, notification, billing, analytics;
  - мессенджер по ADR-0003;
  - расписание и часовые пояса;
  - LiveKit;
  - workflow `deploy-dev.yml`, `backup-drill.yml`;
  - Grafana-дашборды;
  - e2e-тесты.
- **AVT:**
  - кабинет клиента (канбан, чат);
  - админка и CMS;
  - `lib/broadcast`, `lib/proposals`;
  - ассистент на сайте;
  - `deploy/bots`, `deploy/s3`;
  - тесты `app_awt_new/test`.
- **PF:** устройство 3D-сцены, i18n (`lib/i18n.ts`), `scripts/bake-textures.mjs`.
- **LND:** `worker/index.ts` (зачем воркер перед статикой), загрузчик изображений `src/lib/image-loader.ts`.
