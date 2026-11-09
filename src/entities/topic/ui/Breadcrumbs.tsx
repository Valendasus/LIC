import Link from 'next/link'
import { hrefOf, type TreeNode } from '../api/tree'

export function Breadcrumbs({ trail }: { trail: TreeNode[] }) {
  return (
    <nav aria-label="Путь" className="mb-4 text-sm text-muted">
      <ol className="flex flex-wrap gap-1.5">
        {trail.map((node, index) => (
          <li key={node.id} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden>/</span>}
            {index < trail.length - 1 ? (
              <Link href={hrefOf(node)} className="hover:text-accent">
                {node.title}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {node.title}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
