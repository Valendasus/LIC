import { Fragment, type ReactNode } from 'react'

/**
 * Упрощённая разметка для карточек: блоки кода ```…```, списки «- », `код`, **жирный**, переносы строк.
 * Без HTML: текст карточки выводится как текст, поэтому разметка безопасна.
 */
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const blocks: ReactNode[] = []
  const lines = text.replace(/\r\n/g, '\n').trim().split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++])
      i++
      blocks.push(
        <pre key={blocks.length} className="overflow-x-auto rounded-card bg-bg px-4 py-3 text-left font-mono text-[13px] leading-relaxed text-fg">
          <code>{code.join('\n')}</code>
        </pre>,
      )
      continue
    }
    if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) items.push(lines[i++].slice(2))
      blocks.push(
        <ul key={blocks.length} className="list-disc space-y-1 pl-5 text-left">
          {items.map((item, k) => (
            <li key={k}>{inline(item)}</li>
          ))}
        </ul>,
      )
      continue
    }
    if (line.trim() === '') {
      i++
      continue
    }
    const paragraph: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('```') && !lines[i].startsWith('- ')) {
      paragraph.push(lines[i++])
    }
    blocks.push(
      <p key={blocks.length}>
        {paragraph.map((part, k) => (
          <Fragment key={k}>
            {k > 0 && <br />}
            {inline(part)}
          </Fragment>
        ))}
      </p>,
    )
  }
  return <div className={`space-y-2 ${className}`}>{blocks}</div>
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const token = match[0]
    out.push(
      token.startsWith('`') ? (
        <code key={match.index} className="rounded-md bg-raised px-1.5 py-0.5 font-mono text-[0.88em]">
          {token.slice(1, -1)}
        </code>
      ) : (
        <strong key={match.index}>{token.slice(2, -2)}</strong>
      ),
    )
    last = match.index + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
