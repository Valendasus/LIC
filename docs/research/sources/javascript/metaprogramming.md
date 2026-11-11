# Proxy, Reflect, Symbol

Лист: `javascript/metaprogramming`. Приоритет: 60 (20 вопросов, поровну junior, middle, senior).

## Что обязательно знать

### Symbol

- **Примитив с уникальным значением:** `Symbol('id') !== Symbol('id')`. Описание нужно только для отладки.
- **Ключи-символы** не видны в `for…in`, `Object.keys`, `JSON.stringify`, но видны в `Object.getOwnPropertySymbols` и `Reflect.ownKeys`. Это не приватность, а защита от случайного конфликта имён.
- **Глобальный реестр:** `Symbol.for('app.id')` возвращает один и тот же символ во всех realm'ах, включая iframe.
- **Хорошо известные символы** — точки встраивания в поведение языка:
  - `Symbol.iterator`, `Symbol.asyncIterator` — протоколы итерации;
  - `Symbol.toPrimitive` — приведение типов;
  - `Symbol.hasInstance` — `instanceof`;
  - `Symbol.toStringTag` — `Object.prototype.toString`;
  - `Symbol.dispose`, `Symbol.asyncDispose` (ES2027) — `using`.

### Дескрипторы свойств

- У каждого свойства есть атрибуты. Свойство-данные: `value`, `writable`, `enumerable`, `configurable`. Аксессор: `get`, `set`, `enumerable`, `configurable`.
- `Object.defineProperty` по умолчанию выставляет все флаги в `false`, а присваивание — в `true`. Частая ловушка.
- `Object.getOwnPropertyDescriptors` вместе с `Object.defineProperties` копируют объект с геттерами. Спред так не умеет.

### Proxy и Reflect

- **`new Proxy(target, handler)`** перехватывает внутренние операции объекта: `get`, `set`, `has`, `deleteProperty`, `ownKeys`, `getOwnPropertyDescriptor`, `defineProperty`, `apply`, `construct`, `getPrototypeOf` и другие. Всего ловушек 13.
- **`Reflect`** — те же операции в виде функций с правильной семантикой. В ловушках вызываем `Reflect.get(target, key, receiver)`, чтобы геттеры видели правильный `this`.
- **Инварианты:** прокси не может соврать о неконфигурируемых свойствах цели — движок бросит TypeError.
- **Применения:**
  - реактивность (Vue 3, MobX, Valtio);
  - неизменяемые черновики (Immer);
  - валидация и значения по умолчанию;
  - логирование доступа;
  - моки в тестах.
- `Proxy.revocable` создаёт прокси, который можно отключить.

## Тонкие места

- **Прокси не прозрачен для приватных полей и внутренних слотов.** `new Proxy(new Map(), {}).get(1)` бросает TypeError. Поле `#x` класса через прокси недоступно. Методы встроенных объектов нужно привязывать к цели.
- **Прокси медленнее обычного доступа.** В горячих циклах его не используют.
- **Прокси нельзя отличить от обычного объекта стандартными средствами.** Так задумано. В Node для этого есть `util.types.isProxy`.
- **`typeof` прокси над функцией** — `'function'`.
- **Symbol не приводится к строке неявно:** `'' + sym` бросает TypeError, а `String(sym)` и `sym.description` работают.

## Что изменилось

- ES2023: символы как ключи WeakMap.
- ES2027: `Symbol.dispose` и `Symbol.asyncDispose` для `using`.
- Proxy и Reflect не меняются с ES2015.
- На стадии 2.7 — метаданные декораторов (`Symbol.metadata`).

## Что спрашивают

- Что такое Symbol и зачем он нужен?
- Что такое Proxy? Приведите пример применения.
- Зачем нужен Reflect?
- Что такое дескриптор свойства? Что значат `enumerable`, `writable`, `configurable`?
- Как устроена реактивность в Vue 3 или MobX?

## Идеи для практики

- **Задачи с редактором:**
  - `createObservable(obj, onChange)` на Proxy, с поддержкой вложенных объектов;
  - объект со значениями по умолчанию для отсутствующих ключей;
  - представление объекта «только для чтения»;
  - перечисление (enum) на символах.
- **Задачи на вывод:**
  - `Object.keys` и `JSON.stringify` для объекта с символьным ключом;
  - `defineProperty` без флагов, затем присваивание и `Object.keys`.
- **Карточки:**
  - хорошо известные символы и что каждый из них меняет;
  - чем `Reflect.get` с `receiver` лучше `target[key]`.

## Источники

- ECMA-262, §20.4 Symbol Objects, хорошо известные символы — https://tc39.es/ecma262/#sec-well-known-symbols
- ECMA-262, §10.5 Proxy Object Internal Methods — https://tc39.es/ecma262/#sec-proxy-object-internal-methods-and-internal-slots
- ECMA-262, §28.1 The Reflect Object — https://tc39.es/ecma262/#sec-reflect-object
- MDN, Meta programming — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming
- MDN, Proxy — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
- MDN, `Object.defineProperty` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
