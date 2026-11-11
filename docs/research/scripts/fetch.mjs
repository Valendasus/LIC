import { mkdirSync, writeFileSync } from 'node:fs'
const out = process.argv[2]
const plan = {
  'greatfrontend/top-javascript-interview-questions': [/^README\.md$/],
  'greatfrontend/top-reactjs-interview-questions': [/^README\.md$/],
  'YauhenKavalchuk/interview-questions': [/^questions\/.+\.md$/],
  'TheAndreyZakharov/IT-Interview-Question-Bank': [/^RU\/Questions_By_Topic_RU\/.+\.md$/],
  'h5bp/Front-end-Developer-Interview-Questions': [/^src\/questions\/.+\.md$/, /^src\/translations\/russian\/.+\.md$/],
  'sudheerj/javascript-interview-questions': [/^README\.md$/],
  'sudheerj/reactjs-interview-questions': [/^README\.md$/],
  'AndrewMosh/react_interview_cheatsheet': [/^README\.md$/],
}
for (const [repo, patterns] of Object.entries(plan)) {
  const meta = await (await fetch(`https://api.github.com/repos/${repo}`)).json()
  const tree = await (await fetch(`https://api.github.com/repos/${repo}/git/trees/${meta.default_branch}?recursive=1`)).json()
  const files = tree.tree.filter((x) => x.type === 'blob' && patterns.some((p) => p.test(x.path)))
  for (const file of files) {
    const text = await (await fetch(`https://raw.githubusercontent.com/${repo}/${meta.default_branch}/${encodeURI(file.path)}`)).text()
    const dest = `${out}/${repo.replace('/', '__')}/${file.path}`
    mkdirSync(dest.split('/').slice(0, -1).join('/'), { recursive: true })
    writeFileSync(dest, text)
  }
  console.log(repo, files.length, 'files', meta.pushed_at.slice(0, 10))
}
