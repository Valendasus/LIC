/** Блок кода только для чтения. */
export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-card bg-bg px-4 py-3 font-mono text-[13px] leading-relaxed text-fg">
      <code>{code.replace(/\n$/, '')}</code>
    </pre>
  )
}
