# Итераторы, генераторы, асинхронные итераторы

Лист: `javascript/generators`. Приоритет: 140 (6 вопросов). Тему спрашивают мало, но она объясняет `async/await`, ленивые последовательности, потоки и Redux-Saga.

## Что обязательно знать

- **Генератор.** Вызов `function*` не выполняет тело, а возвращает объект-генератор. Этот объект одновременно итератор и итерируемый.
- **`yield value`** приостанавливает выполнение и отдаёт значение. `next(x)` продолжает работу, и `x` становится результатом выражения `yield`. Аргумент первого `next(x)` теряется: генератор ещё не дошёл до `yield`.
- **`return(v)`** завершает генератор, выполнив `finally`. **`throw(e)`** бросает ошибку в месте паузы.
- **`yield* iterable`** передаёт работу другому итерируемому или генератору, в том числе рекурсивно. Так удобно обходить деревья.
- **`return` в генераторе** задаёт `value` при `done: true`. Но `for…of` и spread это значение не видят.
- **Асинхронный генератор** `async function*` позволяет сочетать `yield` с `await`. Его перебирают через `for await…of`. Применения: пагинация, чтение потока, события.
- **Связь с `async/await`.** До ES2017 `async/await` делали на генераторах (библиотека `co`). Генератор отдавал `yield promise`, а исполнитель вызывал `next`, когда промис выполнялся. На собеседовании этим объясняют, как устроен `await`.

## Тонкие места

- **Ленивость и бесконечность:** `function* naturals() { let n = 0; while (true) yield n++ }` безопасен, пока его не распаковали spread'ом целиком.
- **Генератор одноразовый:** повторный `for…of` по тому же объекту ничего не выведет.
- **`break` в `for…of`** вызывает `return()`: выполнится `finally` генератора, и ресурс закроется.
- **Стрелочных генераторов нет.** Метод-генератор пишется как `*method() {}`.
- **Redux-Saga** построена на генераторах и эффектах через `yield`. В новых проектах её вытеснили RTK Query и TanStack Query, но в существующем коде она встречается.

## Что изменилось

- ES2025: **методы итераторов.** У генераторов появились `.map`, `.filter`, `.take`, `.drop`, `.toArray` и другие (Baseline недавно). Раньше для этого нужны были библиотеки или ручные генераторы.
- ES2026:
  - `Array.fromAsync(asyncGen())` собирает результаты асинхронного генератора в массив (Baseline широко с 07.2026);
  - `Iterator.concat` склеивает несколько итераторов.
- В работе:
  - на стадии 2 — асинхронные методы итераторов, `Iterator.range` и давно стоящий `function.sent`.

## Что спрашивают

- Что такое генераторы и итераторы, зачем они нужны?
- Что такое `yield`? Как передать значение в генератор?
- Что такое асинхронный итератор?
- Как `async/await` связан с генераторами?

## Идеи для практики

- **Задачи с редактором:**
  - `take(iterable, n)` и `chunk(iterable, size)` на генераторах;
  - обход дерева через `yield*`;
  - асинхронный генератор страниц API: останавливается, когда следующей страницы нет; проверяется через `for await` и `Array.fromAsync`.
- **Задача уровня «босс»:** свой `run(generatorFn)` — исполнитель, который превращает генератор с `yield promise` в аналог `async`-функции.
- **Задачи на вывод:**
  - аргумент первого `next(x)`;
  - `return` внутри генератора и `for…of`;
  - `finally` при `break`.

## Источники

- ECMA-262, §27.5 Generator Objects, §27.6 AsyncGenerator Objects — https://tc39.es/ecma262/#sec-generator-objects
- MDN, Iterators and generators — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators
- MDN, `function*` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*
- MDN, `async function*` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function*
- MDN, Iterator — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator
