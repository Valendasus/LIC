import { readFileSync, writeFileSync } from 'node:fs'
import { RULES } from './rules.mjs'
const q = JSON.parse(readFileSync('questions.json', 'utf8'))

// Разделы сборника Захарова, которые к фронтенду не относятся.
const DROP = /^(Java|Python|Dart|Swift|C|Assembly|Go|PHP|C\+\+|C# и \.NET|Lua|Kotlin|Rust|Ruby \/ Rails|SQL и диалекты SQL|JPA, Hibernate, транзакции|Spring Security|MVC, WebFlux|DI, IoC, AOP, конфигурация|Actuator, метрики, observability|Сборка и зависимости: Maven, Gradle|Bash и shell scripting|Express, Fastify, NestJS|Event loop, libuv, streams, worker_threads|Общие вопросы по языкам и выбору технологий|Карьера.*|Legacy и развитие fullstack-систем|Общие вопросы по fullstack-разработке)$/
// Подсказки по разделу: какие ветки дерева проверять в первую очередь.
const HINTS = [
  [/react|hooks|redux|components, props|error boundaries|jsx|state management/i, ['react-', 'rsc/', 'state/', 'typescript/react']],
  [/next|ssr|ssg|nuxt/i, ['nextjs/', 'rsc/', 'react-internals/hydration']],
  [/typescript|\bts\b/i, ['typescript/']],
  [/^javascript$|ecmascript/i, ['javascript/', 'browser/']],
  [/css|layout|flexbox|grid|стил|responsive|адаптив/i, ['css/', 'styling/', 'tailwind/']],
  [/html|семантик|forms|формы|seo/i, ['html/', 'ui-a11y/']],
  [/accessib|доступн|wcag|a11y/i, ['ui-a11y/', 'html/']],
  [/performance|производ|bundle|rum|monitoring/i, ['performance/', 'tooling/', 'browser/rendering']],
  [/test/i, ['testing/']],
  [/vite|webpack|babel|eslint|prettier|npm|pnpm|monorepo/i, ['tooling/', 'architecture/monorepo']],
  [/security|безопасн/i, ['browser/security', 'rsc/security', 'nextjs/auth', 'backend-communication/']],
  [/backend|взаимодейств|data fetching|network|сеть|http/i, ['backend-communication/', 'browser/network', 'react-ecosystem/tanstack-query']],
  [/browser|браузер|dom|storage|rendering pipeline/i, ['browser/', 'javascript/async/event-loop']],
  [/архитектур|architect|routing и архитектура|проектирование fullstack|design systems/i, ['architecture/', 'system-design/', 'ui-a11y/design-systems', 'react-ecosystem/routing']],
  [/ux|ui-основы|информацион|hand-off|product/i, ['ui-a11y/']],
  [/i18n/i, ['react-ecosystem/i18n', 'nextjs/i18n', 'javascript/dates-intl']],
]

const OFFTOPIC = /директив|template driven|reactive forms|routermodule|shared модул|angular|\bng[A-Z]|ng-(template|container|content)|ngzone|\bvue\b|vuex|pinia|svelte|jquery|backbone|ember|knockout|rxjs|switchMap|микросервис|microservice|оркестрац|kubernetes|docker|sql|orm\b|java\b/i
// Если ни одно правило не сработало — тема по разделу (слабая привязка).
const SECTION_DEFAULT = [
  [/^Семантика$/, 'html/semantics/headings-sections'],
  [/^(Формы|Forms)$/, 'html/forms/inputs'],
  [/SEO/, 'html/seo-markup'],
  [/Layout: Flexbox, Grid/, 'css/flexbox'],
  [/Responsive design/, 'css/responsive/media-queries'],
  [/Архитектура стилей/, 'css/architecture'],
  [/Rendering pipeline/, 'browser/rendering/pipeline'],
  [/Browser storage/, 'browser/storage/cookies-web-storage'],
  [/Браузерная безопасность|Frontend security/, 'browser/security'],
  [/^Accessibility$|UX и доступность/, 'ui-a11y/a11y-basics'],
  [/Design systems/, 'ui-a11y/design-systems'],
  [/UI-основы|Информационная архитектура|Основы UX/, 'ui-a11y/ui-states'],
  [/Hand-off/, 'ui-a11y/figma'],
  [/Data fetching/, 'backend-communication/api-client'],
  [/Взаимодействие frontend и backend/, 'backend-communication/api-design'],
  [/Routing и архитектура SPA/, 'react-ecosystem/routing'],
  [/Архитектура frontend-приложений/, 'architecture/structure'],
  [/Monorepo/, 'architecture/monorepo'],
  [/npm, pnpm, yarn/, 'tooling/packages'],
  [/ESLint, Prettier, Husky/, 'tooling/linting'],
  [/Vite, Webpack, Babel/, 'tooling/bundlers'],
  [/i18n/, 'react-ecosystem/i18n'],
  [/Ошибки на клиенте, RUM/, 'performance/field-lab'],
  [/Bundle size/, 'performance/bundle'],
  [/Performance debugging/, 'performance/web-vitals'],
  [/Unit testing/, 'testing/vitest'],
  [/Component testing/, 'testing/testing-library'],
  [/E2E testing/, 'testing/playwright'],
  [/^JavaScript$/, 'javascript/types/types-coercion'],
  [/^TypeScript$/, 'typescript/basics'],
  [/React \+ TypeScript/, 'typescript/react-types'],
  [/Hooks, refs, rendering model/, 'react-internals/rerenders'],
  [/Components, props, state/, 'react-basics/components'],
  [/Error boundaries, Suspense/, 'react-hooks/suspense-errors'],
  [/SSR, SSG и Next.js/, 'nextjs/server-client'],
  [/State management/, 'state/kinds'],
]
// Файлы сборников с разбивкой по темам: подсказка и отсев.
const FILE_DROP = /^(angular|vue-js|node-js)$/
const FILE_HINT = {
  html: ['html/', 'ui-a11y/'], 'html-questions': ['html/', 'ui-a11y/'],
  css: ['css/', 'styling/', 'tailwind/', 'animation/'], 'css-questions': ['css/', 'styling/', 'tailwind/', 'animation/'],
  js: ['javascript/', 'browser/'], es: ['javascript/'], 'async-js': ['javascript/async'], 'browser-js': ['browser/', 'javascript/'], 'oop-fp': ['javascript/'], 'javascript-questions': ['javascript/', 'browser/'],
  'browser-rendering': ['browser/rendering', 'performance/'], web: ['backend-communication/', 'browser/'], 'network-questions': ['backend-communication/', 'browser/'],
  ts: ['typescript/'], react: ['react-', 'rsc/', 'nextjs/', 'state/'], 'state-management': ['state/', 'react-ecosystem/state-libs'],
  testing: ['testing/'], 'testing-questions': ['testing/'], tools: ['tooling/', 'architecture/monorepo'], performance: ['performance/', 'browser/rendering'], 'performance-questions': ['performance/'],
  security: ['browser/security', 'backend-communication/'], accessibility: ['ui-a11y/', 'html/'], 'accessibility-questions': ['ui-a11y/', 'html/'], architecture: ['architecture/', 'system-design/'],
}
const SOURCE_HINT = [[/reactjs|react_interview/i, ['react-', 'rsc/', 'nextjs/', 'state/']], [/javascript-interview/i, ['javascript/', 'browser/']]]
const norm = (s) => s.replace(/`/g, '').replace(/\s+/g, ' ').trim()
const rows = []
for (const item of q) {
  if (item.source.includes('Zakharov') && DROP.test(item.section)) continue
  const text = norm(item.question)
  if (text.length < 8 || OFFTOPIC.test(text) || FILE_DROP.test(item.file)) continue
  const ctx = `${item.source} ${item.section}`
  const matches = RULES.filter(([, re]) => re.test(text)).map(([id]) => id)
  const prefixes = [...(FILE_HINT[item.file] ?? []), ...SOURCE_HINT.filter(([re]) => re.test(item.source)).flatMap(([, p]) => p), ...HINTS.filter(([re]) => re.test(item.section)).flatMap(([, p]) => p)]
  let leaf = null
  for (const p of prefixes) { leaf = matches.find((id) => id.startsWith(p)) ?? null; if (leaf) break }
  let weak = false
  if (!leaf) { const d = SECTION_DEFAULT.find(([re]) => re.test(item.section)); if (d) { leaf = d[1]; weak = true } }
  if (!leaf) leaf = matches[0] || null
  rows.push({ ...item, question: text, leaf, weak, also: [...new Set(matches)].filter((id) => id !== leaf).slice(0, 3) })
}
writeFileSync('classified.json', JSON.stringify(rows, null, 1))
const un = rows.filter((r) => !r.leaf)
console.log('kept', rows.length, 'unmatched', un.length)
