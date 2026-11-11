const repos = process.argv.slice(2)
for (const repo of repos) {
  const meta = await (await fetch(`https://api.github.com/repos/${repo}`)).json()
  const tree = await (await fetch(`https://api.github.com/repos/${repo}/git/trees/${meta.default_branch}?recursive=1`)).json()
  const files = tree.tree.filter((x) => x.type === 'blob' && /\.(md|mdx|json|ya?ml)$/i.test(x.path))
  console.log(`== ${repo} (${meta.default_branch}, ${meta.pushed_at.slice(0, 10)}) ${files.length} files, ${Math.round(files.reduce((s, f) => s + f.size, 0) / 1024)} KB`)
  const dirs = {}
  for (const f of files) {
    const d = f.path.split('/').slice(0, 2).join('/')
    dirs[d] = (dirs[d] ?? 0) + 1
  }
  console.log(Object.entries(dirs).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([d, n]) => `${d}:${n}`).join(' | '))
}
