# Даты, Intl и Temporal

Лист: `javascript/dates-intl`. Приоритет: 82 (50 вопросов, почти все из раздела про i18n). В 2026 году тема сильно изменилась: Temporal вошёл в стандарт.

## Что обязательно знать

### Date — как есть

- `Date` хранит **одно число**: миллисекунды от 1970-01-01T00:00:00Z (UTC). Часового пояса внутри нет. «Локальность» появляется только при чтении через `getHours`, `toString` и т. п. — по поясу устройства.
- **Ловушки, которые спрашивают:**
  - месяцы с нуля: `new Date(2026, 0, 31)` — 31 января;
  - переполнение молча переносится: `new Date(2026, 1, 31)` — 3 марта;
  - **разбор строк:** `new Date('2026-11-11')` — полночь **UTC**, а `new Date('2026-11-11T00:00')` — полночь **локальная**. Другие форматы разбираются как угодно браузеру;
  - `Date` изменяемый: `setDate` меняет объект, который могли передать куда-то ещё;
  - сложение «+1 день» через миллисекунды ломается на переходе на летнее время;
  - `new Date('foo')` — Invalid Date, проверка `Number.isNaN(d.getTime())`.
- **Хранить и передавать** — ISO 8601 в UTC (`toISOString()`) или метку времени. **Показывать** — через `Intl.DateTimeFormat` в поясе пользователя.

### Temporal — новый стандарт

- **Статус:** стадия 4 в марте 2026, войдёт в ES2027. Chrome 144 (01.2026), Firefox 139 (05.2025), в Safari нет — Baseline нет. В продакшене — с полифилом (`temporal-polyfill` или `@js-temporal/polyfill`).
- **Главная идея — разные типы для разных смыслов:**

| Тип | Что это | Пример |
|---|---|---|
| `Temporal.Instant` | точка на шкале времени | момент оплаты |
| `Temporal.ZonedDateTime` | момент + часовой пояс + календарь | встреча в 10:00 по Москве |
| `Temporal.PlainDate` | дата без времени и пояса | день рождения |
| `Temporal.PlainTime` | время без даты | «открываемся в 9:00» |
| `Temporal.PlainDateTime` | дата и время без пояса | время в форме до выбора пояса |
| `Temporal.PlainYearMonth`, `PlainMonthDay` | месяц года, день месяца | срок карты, годовщина |
| `Temporal.Duration` | длительность | 1 час 30 минут |
| `Temporal.Now` | текущие значения | `Temporal.Now.zonedDateTimeISO()` |

- **Отличия от Date:** все объекты неизменяемые; месяцы с 1; строки разбираются строго (только ISO 8601 / RFC 9557 с поясом в скобках: `2026-11-11T10:00+03:00[Europe/Moscow]`); арифметика учитывает переходы времени (`add({ days: 1 })` на `ZonedDateTime`); есть `until`, `since`, `round`, `Temporal.PlainDate.compare`; поддержка календарей.
- **Связь с Date:** `Temporal.Instant.fromEpochMilliseconds(date.getTime())`, `date.toTemporalInstant()`.
- `Intl.DateTimeFormat` умеет форматировать объекты Temporal.

### Intl — форматирование под язык

| API | Для чего | Baseline |
|---|---|---|
| `Intl.DateTimeFormat` | даты и время, `timeZone`, `dateStyle` | широко |
| `Intl.RelativeTimeFormat` | «через 3 дня», «вчера» | широко |
| `Intl.NumberFormat` | числа, валюты, проценты, единицы, `compact` | широко |
| `Intl.PluralRules` | формы множественного числа: в русском `one / few / many / other` | широко |
| `Intl.ListFormat` | «А, Б и В» | широко |
| `Intl.Collator` | сортировка строк по правилам языка | широко |
| `Intl.Segmenter` | графемы, слова, предложения | широко с 10.2026 |
| `Intl.DisplayNames` | названия языков, стран, валют | широко |
| `Intl.DurationFormat` | «1 ч 30 мин» | недавно (03.2025) |
| `Intl.Locale` с информацией о неделе, часовом цикле | первый день недели и т. п. | недавно (07.2026) |

- Создавать форматтер заранее и переиспользовать: конструктор дорогой.

## Тонкие места

- **Гидратация:** форматирование даты на сервере и на клиенте в разных поясах и локалях даёт расхождение текста. Решение: фиксировать `timeZone` и `locale`, либо форматировать только на клиенте (react-internals/hydration).
- **Сравнение дат:** `d1 === d2` сравнивает объекты; нужно `d1.getTime() === d2.getTime()` или `Temporal.*.compare`.
- **«Начало дня»** зависит от пояса: в поясах с переходом на летнее время бывают дни, где полночь не существует.
- **Пояса — по IANA-именам** (`Europe/Moscow`), не по смещению: смещение меняется со временем и законами.
- **Даты рождения и сроки** — `PlainDate`, без времени. Классический баг: день рождения, сохранённый как полночь UTC, на клиенте в западном поясе показывается днём раньше.
- **Множественное число** в русском не «1 / не 1»: `Intl.PluralRules('ru').select(21)` → `'one'`, `select(22)` → `'few'`, `select(25)` → `'many'`.

## Что изменилось

- **Temporal** — стадия 4 (03.2026), ES2027, Baseline нет из-за Safari.
- `Intl.DurationFormat` (Baseline 03.2025), `Intl.Segmenter` стал широко доступен (10.2026), информация о локали `Intl.Locale.prototype.getWeekInfo` и др. (Baseline 07.2026).
- `Date` не меняется и не устаревает формально, но для новой логики с поясами и календарём рекомендуется Temporal.

## Что спрашивают

- Как работать с датами и часовыми поясами в JavaScript?
- Почему `new Date('2026-01-01')` в некоторых поясах показывает 31 декабря?
- Чем Temporal отличается от Date?
- Как форматировать даты, числа и валюты под язык пользователя?
- Как сделать относительное время («5 минут назад»)?
- Как правильно склонять слова по числам?

## Идеи для практики

- **Задачи на вывод:** `new Date(2026, 1, 31)`, разбор двух ISO-строк с поясом и без, мутация через `setDate`.
- **Задачи с редактором:** `formatRelative(date, now)` через `RelativeTimeFormat`; `plural(n, forms)` через `PluralRules`; «через N дней» с учётом перехода времени — через Temporal; разбить строку на графемы и посчитать «видимые» символы.
- **Задача из работы:** день рождения уезжает на день назад — найти причину и исправить с `PlainDate`.
- **Карточки:** что хранит Date; таблица типов Temporal; почему пояс по имени, а не смещению.

## Источники

- ECMA-262, §21.4 Date Objects — https://tc39.es/ecma262/#sec-date-objects
- Temporal, спецификация и документация — https://tc39.es/proposal-temporal/docs/
- MDN, Temporal — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal
- ECMA-402 (Intl) — https://tc39.es/ecma402/
- MDN, Intl — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
- RFC 9557, Date and Time on the Internet: Timestamps with Additional Information — https://www.rfc-editor.org/rfc/rfc9557
- web-features: temporal, intl-segmenter, intl-duration-format, intl-locale-info — https://web-platform-dx.github.io/web-features-explorer/
