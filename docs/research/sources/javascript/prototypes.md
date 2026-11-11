# Прототипы и цепочка прототипов

Лист: `javascript/objects/prototypes`. Приоритет: 63 (26 вопросов). Многие вопросы про прототипы ушли в лист «Классы» — темы надо преподавать вместе.

## Что обязательно знать

- У каждого объекта есть внутренний слот **`[[Prototype]]`** — ссылка на другой объект или `null`. Чтение свойства, которого нет на объекте, идёт по цепочке прототипов до `null` (`OrdinaryGet`, §10.1.8).
- **Запись не идёт по цепочке:** `obj.x = 1` создаёт собственное свойство, даже если `x` есть в прототипе. Исключения: в прототипе сеттер — он вызовется; свойство в прототипе неизменяемое (`writable: false`) — запись молча не сработает (в строгом режиме — TypeError).
- **Три разные вещи с похожими именами:**
  - `obj.[[Prototype]]` — прототип объекта. Читать: `Object.getPrototypeOf(obj)`.
  - `F.prototype` — обычное свойство функции. Это объект, который станет прототипом экземпляров `new F()`.
  - `obj.__proto__` — устаревший аксессор на `Object.prototype`, оставлен для совместимости (Annex B).
- **Как задать прототип:** `Object.create(proto, descriptors)`, `class extends`, `Object.setPrototypeOf` (медленно, ломает оптимизации движка), литерал `{ __proto__: proto }` — легален и не устарел.
- **`instanceof`** проверяет, есть ли `F.prototype` в цепочке `obj`. Можно переопределить через `Symbol.hasInstance`. Не работает между realm'ами (iframe): поэтому есть `Array.isArray` и `Error.isError`.
- **Собственное и унаследованное:** `Object.hasOwn(obj, key)` (ES2022) — замена `obj.hasOwnProperty(key)`. Оператор `in` проверяет всю цепочку. `Object.keys`, `Object.entries` — только собственные перечисляемые строковые ключи. `for…in` — перечисляемые, включая унаследованные.

## Тонкие места

- `Object.create(null)` — объект без прототипа: нет `toString`, `hasOwnProperty`. Удобен как словарь, но `Map` обычно лучше.
- **Загрязнение прототипа (prototype pollution):** глубокое слияние пользовательского JSON с ключом `"__proto__"` меняет `Object.prototype` для всего приложения. Защита: `Object.create(null)`, проверка ключей, `Map`, `structuredClone`. Это реальная уязвимость, её спрашивают на security-вопросах.
- **Методы в прототипе** экономят память: одна функция на все экземпляры. Стрелки в полях класса — по функции на экземпляр.
- **Затенение (shadowing):** собственное свойство скрывает одноимённое из прототипа. `delete obj.x` снова откроет прототипное.
- **Встроенные прототипы** не расширяем (`Array.prototype.last = …`). Это ломало стандартизацию: так появились `flat` вместо `flatten` и `includes` вместо `contains`.

## Что изменилось

- ES2022: `Object.hasOwn`.
- ES2026: `Error.isError` — надёжная проверка ошибки между realm'ами (Baseline нет: Safari только в Preview).
- Механизм прототипов стабилен с ES5.

## Что спрашивают

- Что такое прототип и цепочка прототипов?
- Разница между `__proto__` и `prototype`.
- Как работает прототипное наследование и чем оно отличается от классического?
- Как создать объект без прототипа?
- Разница между `in` и `hasOwnProperty`.
- Как работает `instanceof`? Реализуйте свой.

## Идеи для практики

- **Задачи на вывод:** чтение и запись через цепочку, затенение и `delete`, `instanceof` после замены `F.prototype`.
- **Задача с редактором:** `myInstanceOf(obj, F)`; безопасный `deepMerge`, который не поддаётся prototype pollution (тесты с `"__proto__"` и `"constructor"`).
- **Карточки:** три «прототипа» с похожими именами; почему не расширяем встроенные прототипы.
- **Демо:** нарисованная цепочка `obj → F.prototype → Object.prototype → null` с подсветкой поиска свойства.

## Источники

- ECMA-262, §10.1 Ordinary Object Internal Methods — https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots
- ECMA-262, §7.3.21 OrdinaryHasInstance — https://tc39.es/ecma262/#sec-ordinaryhasinstance
- MDN, Inheritance and the prototype chain — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain
- MDN, `Object.hasOwn` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn
- MDN, Prototype pollution — https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Prototype_pollution
- Предложение `Error.isError` — https://github.com/tc39/proposal-is-error
