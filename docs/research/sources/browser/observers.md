# Intersection, Resize, Mutation Observer

Лист: `browser/observers-navigation/observers`. В сборниках 7 прямых вопросов, но тема постоянно нужна в работе: ленивая загрузка, бесконечная прокрутка, аналитика видимости, адаптивные компоненты, сторонний DOM. В заметку включены PerformanceObserver и ReportingObserver — их тоже спрашивают.

## Что обязательно знать

Общий шаблон: `const o = new XObserver(callback, options); o.observe(target); … o.unobserve(target); o.disconnect()`. Колбэк получает **пачку** записей и вызывается асинхронно, а не на каждое изменение.

| Наблюдатель | Что сообщает | Когда вызывается (HTML Standard) | Baseline |
|---|---|---|---|
| `IntersectionObserver` | пересечение элемента с корнем (окно или контейнер) | в конце кадра, после layout | широко |
| `ResizeObserver` | новый размер элемента (`contentBoxSize`, `borderBoxSize`) | в кадре, после layout, до отрисовки, в цикле | широко |
| `MutationObserver` | изменения DOM: дети, атрибуты, текст | **микрозадачей** после изменений | широко |
| `PerformanceObserver` | записи производительности: `largest-contentful-paint`, `layout-shift`, `event`, `longtask`, `resource` | асинхронно, задачей | широко |
| `ReportingObserver` | отчёты: устаревшие API, нарушения CSP, вмешательства | асинхронно | недавно (03.2026) |

### IntersectionObserver

- Опции: `root` (по умолчанию окно), `rootMargin` (заранее расширить зону, `'200px'` — грузить заранее), `threshold` (`0`, `[0, 0.5, 1]`).
- Запись: `isIntersecting`, `intersectionRatio`, `boundingClientRect`, `time`.
- **Первый вызов приходит сразу** после `observe` с текущим состоянием — даже если элемент не виден.
- Применения: ленивые картинки и компоненты, бесконечная прокрутка (сторожевой элемент в конце списка), «элемент увиден» для аналитики, запуск анимации при появлении, активный пункт оглавления.
- Для простых картинок есть `loading="lazy"` без JS.

### ResizeObserver

- Размер **элемента**, а не окна: компонент реагирует на свой контейнер. Для стилей то же решают container queries (`@container`), для JS-логики (графики, виртуальные списки, canvas) — ResizeObserver.
- Изменение размеров внутри колбэка запускает новый проход в том же кадре; бесконечная обратная связь даёт ошибку «ResizeObserver loop completed with undelivered notifications». Она не роняет страницу, но засоряет мониторинг.

### MutationObserver

- Опции: `childList`, `attributes`, `attributeFilter`, `characterData`, `subtree`, `attributeOldValue`.
- Колбэк — микрозадача: несколько изменений подряд в одной задаче приходят одной пачкой.
- `takeRecords()` — забрать накопленные записи синхронно (перед `disconnect`).
- Применения: реагировать на DOM, который меняет сторонний код (виджеты, расширения, CMS), ждать появления элемента в e2e-утилитах, редакторы. В своём React-коде почти не нужен — состояние и так известно.

## Тонкие места

- **Заменяют опрос и обработчики `scroll`:** `getBoundingClientRect` в `scroll` вызывает layout на каждом событии; наблюдатели работают без принудительного layout.
- **Один наблюдатель на много элементов** дешевле, чем по наблюдателю на элемент.
- **`disconnect` при размонтировании** обязателен (утечки, memory.md). В React — очистка эффекта или callback ref с возвратом функции очистки (React 19).
- **Видимость ≠ пересечение:** элемент под другим элементом или с `opacity: 0` «пересекается». Проверка реальной видимости — IntersectionObserver v2 (`trackVisibility`, только Chromium).
- **Тесты:** в jsdom наблюдателей нет. Нужен мок (класс с ручным вызовом колбэка) — вопрос из сборников «как тестировать компоненты с ResizeObserver и IntersectionObserver». Реальное поведение — в Playwright.
- **PerformanceObserver с `buffered: true`** получает и записи, случившиеся до подписки, — так собирают Web Vitals (библиотека `web-vitals`).

## Что изменилось

- `ReportingObserver` — Baseline недавно (03.2026, Firefox 149).
- Опция `scrollMargin` у IntersectionObserver — для вложенных прокручиваемых контейнеров (появилась в Chromium, поддержку уточнять перед уроком).
- Callback ref с функцией очистки (React 19) — удобная точка для `observe` и `disconnect`.
- Событие `scrollend` — Baseline 12.2025.

## Что спрашивают

- Как работает IntersectionObserver? Где применяется?
- Как работает MutationObserver?
- Что такое PerformanceObserver и зачем он нужен?
- Как тестировать компоненты, которые используют наблюдатели?
- Паттерн «наблюдатель» — что это и где используется?

## Идеи для практики

- **Задачи с редактором:** хук `useInView(ref, options)` с отпиской; бесконечная прокрутка на сторожевом элементе; `waitForElement(selector, { timeout, signal })` на MutationObserver; `useElementSize` на ResizeObserver. Тесты — с моками наблюдателей.
- **Задачи на порядок:** изменили атрибут и ширину элемента в одной задаче — в каком порядке придут колбэки MutationObserver, rAF, ResizeObserver, IntersectionObserver (frame.md).
- **Карточки:** таблица наблюдателей; почему первый вызов IntersectionObserver приходит сразу; чем ResizeObserver лучше `resize` у окна.

## Источники

- W3C, Intersection Observer — https://w3c.github.io/IntersectionObserver/
- CSSWG, Resize Observer — https://drafts.csswg.org/resize-observer/
- DOM Standard, Mutation observers — https://dom.spec.whatwg.org/#mutation-observers
- W3C, Performance Timeline — https://w3c.github.io/performance-timeline/
- W3C, Reporting API — https://w3c.github.io/reporting/
- MDN, Intersection Observer API — https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- MDN, Resize Observer API — https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API
- MDN, MutationObserver — https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
- HTML Standard, update the rendering — порядок наблюдателей в кадре — https://html.spec.whatwg.org/multipage/webappapis.html#update-the-rendering
- react.dev, ref callback cleanup — https://react.dev/reference/react-dom/components/common#ref-callback
