# Числа, точность, BigInt и деньги

Лист: `javascript/numbers`. Приоритет: 53 (34 вопроса).

## Что обязательно знать

- **`Number`** — 64-битное число с плавающей точкой IEEE 754 (двойная точность). Целые точны до `Number.MAX_SAFE_INTEGER` = 2⁵³ − 1 = 9 007 199 254 740 991. Проверка — `Number.isSafeInteger`.
- **`0.1 + 0.2 !== 0.3`**: 0.1 и 0.2 не представимы точно в двоичной системе. Сравнение с допуском: `Math.abs(a - b) < Number.EPSILON` годится только около 1; для произвольных значений — относительная погрешность.
- **Особые значения:** `NaN` (не равен себе), `Infinity`, `−Infinity`, `−0` (`Object.is(-0, 0)` → false, `1 / -0` → `−Infinity`).
- **`BigInt`** (ES2020): целые произвольной длины, литерал `10n`. С Number не смешивается в арифметике (TypeError), но сравнивается (`1n < 2` → true, `1n == 1` → true). Деление отбрасывает дробную часть. `JSON.stringify` бросает TypeError, `typeof` → `'bigint'`. `Math` не работает с BigInt.
- **Разбор:** `Number(str)` строгий, `parseInt(str, 10)` и `parseFloat` — до первого лишнего символа. Основание у `parseInt` указывать всегда.
- **Округление:** `Math.round` (половины вверх, к +∞: `Math.round(-2.5)` → −2), `Math.trunc`, `Math.floor`, `Math.ceil`. `toFixed(n)` возвращает строку и округляет двоичное значение: `(1.005).toFixed(2)` → `'1.00'`.
- **Форматирование для людей** — только `Intl.NumberFormat` / `toLocaleString`: разделители, валюта, проценты, компактная запись («1,2 тыс.»).

## Деньги

- **Не хранить деньги во float.** Варианты:
  1. Целые минимальные единицы (копейки) в Number — до 90 трлн рублей безопасно.
  2. BigInt для больших сумм и точной арифметики.
  3. Десятичная библиотека (`decimal.js`, `big.js`, `dinero.js`), если нужны проценты, деление, округления по правилам.
- Округление по банковскому правилу или «половины от нуля» — бизнес-решение, его нужно задать явно.
- Предложение **Decimal** (десятичный тип в языке) на стадии 1 — в ближайшие годы его не будет.
- Отображение — `Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' })`. Сумма и валюта хранятся вместе.

## Тонкие места

- `0.1 * 3` → `0.30000000000000004`, но `0.5 + 0.25` точно (степени двойки).
- `9007199254740993` в коде превратится в `9007199254740992`. ID из базы данных длиной 19 цифр (Twitter, Discord, Snowflake) нужно получать **строкой**. `JSON.parse` с исходным текстом (ES2026) позволяет разобрать их в BigInt.
- `[1, 2, 10].sort()` — строковая сортировка (arrays.md).
- `Number.isNaN` против `isNaN`, `Number.isFinite` против `isFinite`: глобальные сначала приводят к числу.
- `0.1 + 0.2` в сумме цен корзины → неверная итоговая цена. Реальный баг e-commerce.
- **Побитовые операторы** приводят к 32-битному целому: `~~x` и `x | 0` обрезают число и ломаются после 2³¹.
- **Разделители разрядов в коде:** `1_000_000` (ES2021).

## Что изменилось

- ES2025: `Float16Array`, `Math.f16round` (Baseline недавно) — для графики и ML.
- ES2026: **`Math.sumPrecise(iterable)`** (Baseline недавно, 04.2026) — точная сумма, округлённая один раз в конце: `[1e20, 0.1, -1e20]` через `reduce` даёт `0`, а `Math.sumPrecise` — `0.1`. Ошибку, которая уже есть в самих слагаемых (0.1 не представимо), он не исправит. Пустой список даёт `-0`.
- ES2026: `Uint8Array.fromBase64` / `toBase64` / `fromHex` / `toHex` (Baseline недавно).
- ES2026: `JSON.rawJSON` и `source` в `reviver` — точная сериализация больших чисел.

## Что спрашивают

- Почему `0.1 + 0.2 !== 0.3`? Как сравнивать дробные числа?
- Что такое `NaN`? Как его проверить?
- Что такое BigInt? Когда нужен?
- Что такое `MAX_SAFE_INTEGER`?
- Как работать с деньгами в JavaScript?
- Разница между `parseInt`, `parseFloat` и `Number`.

## Идеи для практики

- **Задачи на вывод:** `0.1 + 0.2`, `(1.005).toFixed(2)`, `Math.round(-2.5)`, `9007199254740993`, `1n + 1`, `typeof NaN`.
- **Задачи с редактором:** расчёт корзины в копейках со скидкой в процентах и правилом округления; `formatMoney` через `Intl.NumberFormat`; `almostEqual(a, b)` с относительной погрешностью.
- **Задача из работы:** id из API длиннее 2⁵³ — найти, где теряется точность, и исправить разбор.
- **Карточки:** почему 0.1 не представимо; где граница безопасных целых; три способа хранить деньги.

## Источники

- ECMA-262, §6.1.6 Numeric Types — https://tc39.es/ecma262/#sec-numeric-types
- ECMA-262, §21.1 Number Objects, §21.2 BigInt Objects — https://tc39.es/ecma262/#sec-number-objects
- MDN, Number — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number
- MDN, BigInt — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
- MDN, `Math.sumPrecise` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sumPrecise
- MDN, `Intl.NumberFormat` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
- What Every Computer Scientist Should Know About Floating-Point Arithmetic — https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html
- Предложение Decimal — https://github.com/tc39/proposal-decimal
