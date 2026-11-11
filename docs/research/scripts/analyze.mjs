import { readFileSync, writeFileSync } from 'node:fs'
import { parse } from 'yaml'
// Запуск из папки с данными: node docs/research/scripts/analyze.mjs (cwd — рабочая папка с classified.json).
const TREE = new URL('../../../content/frontend/tree.yaml', import.meta.url)
const rows = JSON.parse(readFileSync('classified.json', 'utf8'))
const tree = parse(readFileSync(TREE, 'utf8'))
const leaves = []
const walk = (nodes, path, block) => { for (const n of nodes) { const p = [...path, n.slug]; if (n.children) walk(n.children, p, block ?? n.title); else leaves.push({ id: p.join('/'), title: n.title, block: block ?? n.title }) } }
walk(tree, [])
const author = (s) => s.split('/')[0]
const level = (r) => { const t = `${r.level ?? ''} ${r.section}`; if (/Basic|Junior/.test(t)) return 1; if (/Intermediate|Middle/.test(t)) return 2; if (/Advanced|Senior|Lead/.test(t)) return 3; return 0 }
const totals = {}
for (const r of rows) if (r.leaf) totals[author(r.source)] = (totals[author(r.source)] ?? 0) + 1
const AUTHORS = Object.keys(totals)
const key = (q) => q.toLowerCase().replace(/[^a-zа-яё0-9]+/g, ' ').trim()
const CLASSIC = ['greatfrontend', 'sudheerj', 'YauhenKavalchuk', 'h5bp', 'AndrewMosh']
const out = leaves.map((leaf) => {
  const mine = rows.filter((r) => r.leaf === leaf.id)
  const by = {}
  for (const r of mine) by[author(r.source)] = (by[author(r.source)] ?? 0) + 1
  const attention = AUTHORS.reduce((s, a) => s + (by[a] ?? 0) / totals[a], 0) / AUTHORS.length
  const levels = [1, 2, 3].map((l) => mine.filter((r) => level(r) === l).length)
  const seen = new Set()
  const ordered = [...mine].sort((a, b) => (a.weak - b.weak) || (CLASSIC.indexOf(author(a.source)) + 1 || 9) - (CLASSIC.indexOf(author(b.source)) + 1 || 9))
  const questions = []
  for (const r of ordered) { const k = key(r.question); if (seen.has(k)) continue; seen.add(k); questions.push({ q: r.question, lang: r.lang, src: author(r.source), level: level(r) || undefined }) }
  return { ...leaf, count: mine.length, unique: questions.length, authors: Object.keys(by).length, attention: +(attention * 1000).toFixed(2), levels, questions }
})
out.sort((a, b) => b.attention - a.attention)
out.forEach((l, i) => (l.rank = i + 1))
writeFileSync('by-leaf.json', JSON.stringify({ generated: '2026-11-11', authors: totals, leaves: out }, null, 1))
console.log(out.slice(0, 40).map((l) => `${l.rank}. ${l.id} att=${l.attention} n=${l.count} a=${l.authors}`).join('\n'))
console.log('zero:', out.filter((l) => l.count === 0).map((l) => l.id).join(', '))
console.log('low(<5):', out.filter((l) => l.count > 0 && l.count < 5).map((l) => l.id).join(', '))
