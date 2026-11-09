import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PracticePanel } from '@/widgets/practice-panel'
import { NodeRow } from '@/entities/topic'
import { getProgressMap, rollup } from '@/entities/progress/server'
import { getCurrentUser } from '@/entities/user/server'
import { getTree } from '@/entities/topic/server'

type Props = { params: Promise<{ specialty: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tree = await getTree((await params).specialty)
  return { title: tree?.title ?? 'Не найдено' }
}

export async function SpecialtyPage({ params }: Props) {
  const { specialty } = await params
  const tree = await getTree(specialty)
  if (!tree) notFound()

  const user = await getCurrentUser()
  const progress = await getProgressMap(user.id)
  const total = rollup(tree, progress)

  // Блоки сгруппированы по смыслу: платформа, языки, React, Next.js …
  const groups = new Map<string, typeof tree.children>()
  for (const block of tree.children) {
    const key = block.group ?? 'Другое'
    groups.set(key, [...(groups.get(key) ?? []), block])
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{tree.title}</h1>
        <p className="mt-1 text-muted">
          {tree.children.length} блоков · {total.leaves} тем · начато {total.started}
        </p>
      </header>
      <PracticePanel scope={tree.id} />
      {[...groups].map(([group, blocks]) => (
        <section key={group}>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">{group}</h2>
          <ul className="grid gap-2">
            {blocks.map((block) => (
              <NodeRow key={block.id} node={block} stats={rollup(block, progress)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
