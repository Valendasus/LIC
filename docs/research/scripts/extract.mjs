import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
const root = path.join(process.argv[2], 'raw')
const files = (dir) => readdirSync(dir).flatMap((name) => (statSync(path.join(dir, name)).isDirectory() ? files(path.join(dir, name)) : [path.join(dir, name)]))
const out = []
for (const file of files(root).filter((f) => f.endsWith('.md'))) {
  const rel = path.relative(root, file)
  const source = rel.split('/')[0].replace('__', '/')
  const lang = /[А-Яа-яЁё]/.test(readFileSync(file, 'utf8').slice(0, 4000)) && !source.startsWith('h5bp') ? 'ru' : rel.includes('russian') ? 'ru' : 'en'
  let section = path.basename(file, '.md').replace(/^## \d+\. /, '')
  const seen = new Set()
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const heading = raw.match(/^#{2,4}\s+(.+)/)
    if (heading && !/\?\s*$/.test(heading[1])) {
      section = heading[1].replace(/^[\d.]+\s*/, '').trim()
      continue
    }
    let q = null
    let level = null
    const row = raw.match(/^\|\s*\d+\s*\|\s*\[(.+?)\]\(#[^)]*\)\s*\|(?:\s*(Basic|Intermediate|Advanced)\s*\|)?/)
    const linked = raw.match(/^\s*[-*]\s+\[(.+?)\]\((?:https?:|#)[^)]*\)\s*$/)
    const plain = raw.match(/^\s*[-*]\s+(.+?)(?:\s*\[id:[^\]]+\])?\s*$/)
    if (row) [q, level] = [row[1], row[2] ?? null]
    else if (linked) q = linked[1]
    else if (plain && /\?\s*$/.test(plain[1])) q = plain[1]
    if (!q) continue
    q = q.replace(/\s+/g, ' ').trim()
    if (q.length < 8 || seen.has(q)) continue
    seen.add(q)
    out.push({ source, lang, section, file: path.basename(file, '.md'), question: q, level })
  }
}
writeFileSync(path.join(process.argv[2], 'questions.json'), JSON.stringify(out, null, 1))
const by = {}
for (const item of out) by[item.source] = (by[item.source] ?? 0) + 1
console.log(out.length, by)
