# LIC — Learn → Implement → Confirm

Платформа для обучения разработке. Каждая тема проходит три шага: **Learn** (понять), **Implement** (сделать руками), **Confirm** (подтвердить и повторять).

Дерево тем всех специальностей — [docs/TOPIC-TREE.md](docs/TOPIC-TREE.md). Заметки по первоисточникам к урокам — [docs/research/sources/](docs/research/sources/).

## Стек

Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript 7, Tailwind CSS 4.3, MDX, Prisma 7 и PostgreSQL 17.

## Запуск

Нужны Node.js 22+ и Docker.

```bash
npm install            # зависимости и генерация Prisma-клиента
cp .env.example .env   # строка подключения к базе
npm run db:up          # Postgres в Docker на порту 5433
npm run db:push        # создать таблицы
npm run dev            # http://localhost:3000
```

## Как устроено

| Где | Что |
|---|---|
| `content/specialties.yaml` | Список специальностей; `status: active` — открыта на платформе |
| `content/<специальность>/tree.yaml` | Дерево: блок → модуль → тема. У темы есть `grade` (J, M, S), `goals` и `content: true`, если она наполнена |
| `content/<специальность>/<путь>.mdx` | Содержание темы: разделы Learn, Implement, Confirm, Источники |
| `src/lib/tree.ts` | Чтение дерева, поиск узла, листья |
| `src/lib/progress.ts` | Пользователь, прогресс, расчёт прогресса веток |
| `src/app/actions.ts` | Серверная функция отметки уровня освоения |
| `src/mdx-components.tsx` | Компоненты, доступные в MDX без импорта |
| `prisma/schema.prisma` | В базе только данные пользователя: прогресс. Контент живёт в репозитории |

Компоненты для тем:

- `<Callout type="note | mistake | interview | deep">` — врезки: важное, частая ошибка, на собеседовании, под капотом.
- `<Example file? verdict="good | review">` — пример из реального кода: ✅ образец или 🔍 разобрать критически. Источник примера не называется.
- `<Task level="warmup | easy | medium | hard | boss" title>` — задача.
- `<Hints hints={[…]}>решение</Hints>` — лестница подсказок и решение.
- `<Question q="…">ответ</Question>` — вопрос на вспоминание.

## Карточки и повторение

Карточки темы лежат рядом с ней: `content/<специальность>/<путь>.cards.yaml`.

```yaml
- key: closure-def        # стабильный ключ: к нему привязано расписание, не переименовывать
  type: term              # term — термин, qa — вопрос и ответ, code — код и вопрос
  front: Замыкание
  back: Функция вместе со ссылкой на лексическое окружение…
  example: |              # необязательно, показывается на обороте
    ```js
    const add = (a) => (b) => a + b
    ```
  reverse: true           # для term: ещё и обратная карточка «определение → термин»
```

- **Разметка в текстах:** `код`, **жирный**, блоки кода, списки «- ». Если в строке есть «: », возьмите её в кавычки, иначе YAML сломается — это поймает `npm run content:check`.
- **Расписание:** FSRS-7 (`ts-fsrs` 6), цель — 90 % вспоминания. Состояние хранится в таблице `review_items`, каждый ответ — в `review_logs`.
- **Режимы:**
  - `/review` — ежедневное повторение по всем темам;
  - `/review?scope=<id ветки>` — карточки ветки или темы;
  - `&mode=free` — свободная тренировка без влияния на расписание.
- **Новые карточки:** не больше `NEW_PER_DAY` (20) в день. Значение задаётся в `src/lib/review.ts`.

## Задания: квиз, «что выведет», порядок

Лежат рядом с темой: `content/<специальность>/<путь>.practice.yaml`. Ключи общие с карточками темы и не должны повторяться.

```yaml
- key: quiz-yield
  kind: quiz                 # один верный ответ или несколько (если отмечено больше одного correct)
  question: Чем уступить поток браузеру?
  code: |                    # необязательно
    ...
  options:
    - text: 'scheduler.yield()'
      correct: true
    - text: 'await Promise.resolve()'
      why: Это микрозадача — браузер так и не получит управление.   # объяснение варианта
  explain: Итоговое объяснение.

- key: out-basic
  kind: output               # «что выведет»: answer — вывод console.log построчно
  code: |
    console.log('D')
  answer: [D]
  explain: ...

- key: order-cascade
  kind: order                # «расставьте по порядку»: steps в правильном порядке, перемешиваются сами
  prompt: Расставьте шаги каскада.
  steps: [Первый, Второй, Третий]
  explain: ...
```

- **Оценка:** за задания её ставит платформа. Неверно → «Снова», верно → «Хорошо», «Угадал» → «Трудно».
- **Порядок в очереди:** новые задания перемежаются с карточками той же темы — на три карточки одно задание.
- **Проверка «что выведет»:** `npm run content:check` **запускает код каждой задачи** и сверяет его с `answer`. Ошибочный ответ не попадёт на платформу.

## Задачи на код

Тоже лежат в `<путь>.practice.yaml`, вид `code`. Решение пишется в редакторе (CodeMirror), тесты выполняются в Web Worker: бесконечный цикл не вешает страницу, через 5 секунд воркер останавливается.

```yaml
- key: code-once
  kind: code
  level: easy                # warmup, easy, medium, hard, boss
  title: once
  prompt: |                  # условие в той же разметке, что карточки
    Напишите `once(fn)`…
  starter: |                 # заготовка; может быть пустой строкой
    function once(fn) {}
  hints:                     # лестница: направление → приём → каркас → ключевая строка
    - Что нужно запомнить между вызовами?
  tests: |                   # видят функции решения напрямую; есть test, expect, spy, sleep
    test('вызывает один раз', () => {
      const fn = spy(() => 1)
      const f = once(fn)
      f(); f()
      expect(fn.calls).toHaveLength(1)
    })
  solution: |                # эталон; в браузер уходит только после решения или по «Показать решение»
    function once(fn) { … }
  explain: Разбор: почему так, сложность, что спросят на собесе.
```

- **Проверки в тестах:**
  - `toBe`, `toEqual`, `toBeTruthy`, `toBeFalsy`, `toBeUndefined`, `toBeNull`;
  - `toContain`, `toHaveLength`, `toBeGreaterThan`, `toBeLessThan`, `toBeCloseTo`, `toBeInstanceOf`, `toThrow`;
  - модификаторы `.not`, `.resolves` и `.rejects`.
- **Оценка:**
  - открыто решение → «Снова»;
  - решено с 2+ подсказками или не с первого запуска → «Трудно»;
  - иначе → «Хорошо».
- **Минимум подсказок:**
  - `easy` — 1;
  - `medium` — 2;
  - `hard` и `boss` — 3.
- **Черновик** хранится в браузере и удаляется после перехода к следующему элементу.
- **Проверка контента:** `npm run content:check` запускает тесты на эталоне и на заготовке тем же модулем, что и браузер (`src/features/solve-task/lib/code-runner.ts`). Эталон обязан пройти все тесты, заготовка — провалить хотя бы один.

## Задачи на типы и React-задачи

Формат тот же, что у задач на код. Отличаются `kind` и тесты.

**`kind: types`** — проверяет компилятор TypeScript 6 в воркере.
- Тест — строка с `Expect<Equal<A, B>>`, `IsTrue<…>`, `IsFalse<…>` или пара `// @ts-expect-error` и строка под ней.
- Ошибка типов на строках теста — тест не пройден.
- Ошибка в самом решении — отдельный пункт «Решение без ошибок типов».

```yaml
  tests: |
    type cases = [
      Expect<Equal<MyPick<Todo, 'title'>, { title: string }>>,
    ]
    // @ts-expect-error
    type invalid = MyPick<Todo, 'author'>
```

**`kind: react`** — компонент на TSX.
- **Сборка:** TypeScript 6 в воркере, в каждый цикл вставляется защита (после миллиона повторов — ошибка).
- **Тесты** выполняются в iframe-песочнице `/sandbox`, для каждого запуска — новый iframe.
- **Доступно без импорта:**
  - все хуки React;
  - `render`, `renderHook`, `act`;
  - `screen`, `fireEvent`, `waitFor`, `within`;
  - `userEvent`.
- **Импорты** из `react`, `@testing-library/react` и `@testing-library/user-event` тоже работают.
- **`preview`** — JSX-выражение, которое показывается после тестов. С компонентом можно взаимодействовать.
- **Без `act`.** `render` синхронный (`flushSync`): в продакшен-сборке React `act` нет, поэтому песочница его не использует. Эффекты ждут через `waitFor` или `findBy…`.

```yaml
  preview: <Counter max={5} />
  tests: |
    test('клик', async () => {
      const user = userEvent.setup()
      render(<Counter />)
      await user.click(screen.getByRole('button', { name: 'Увеличить' }))
      expect(screen.getByRole('status')).toHaveTextContent('1')
    })
```

**Проверки элементов:** `toBeInTheDocument`, `toHaveTextContent`, `toHaveValue`, `toHaveAttribute`, `toBeDisabled`, `toBeChecked`, `toHaveFocus`.

**Где проверяются эталоны:**
- **Типы:** `content:check` прогоняет их компилятором.
- **React:** `content:check` только собирает их. Тесты эталонов и заготовок выполняются в `npm test` (`test/content/react-tasks.test.tsx`, jsdom) и в e2e (настоящий браузер).

## Проверки и тесты

```bash
npm run content:check   # дерево, карточки, задания; «что выведет» и эталоны задач реально запускаются; нормы состава и TODO
npm run content:check -- javascript/async   # только темы с этим id или префиксом
npm run content:run -- файл.js              # запустить фрагмент в песочнице «что выведет» (или код через stdin)
npm run new:topic -- javascript/async/x     # заготовка новой темы
npm run typecheck       # TypeScript
npm run test            # юнит- и интеграционные тесты (Vitest)
npm run test:coverage   # то же с покрытием; порог — 100% строк, ветвлений, функций и операторов
npm run test:e2e        # e2e в браузере (Playwright): продакшен-сборка на порту 3300; первая холодная сборка воркера с компилятором — несколько минут
npm run test:all        # всё по порядку
```

- **Отдельная база.** Тесты работают с базой `lic_test` (её создаёт `e2e/prepare-db.mjs`). Рабочий прогресс в базе `lic` тесты не трогают.
- **Unit-тесты** лежат в `test/`, e2e — в `e2e/`. Тестовый набор тем — `test/fixtures/content`, он подставляется через переменную `LIC_CONTENT_DIR`.
- **Первый запуск e2e:** нужен браузер — `npx playwright install chromium`.

## Добавить тему

Коротко:

1. `npm run new:topic -- javascript/async/async-await` — три файла с метками `TODO`, тема в дереве отмечена `content: true`. В заготовке практики — частые вопросы с собеседований и задачи соседних тем.
2. Заполните урок, карточки и практику. Задания вставляются в урок компонентом `<Practice id="ключ" />`, а не копируются.
3. `npm run content:check -- javascript/async/async-await` — пока есть `TODO` или не выполнены нормы состава, проверка не проходит.
