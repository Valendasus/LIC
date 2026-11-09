/** Блок кода только для чтения. */
export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-[oklch(22%_0.02_260)] p-3 font-mono text-[13px] leading-relaxed text-[oklch(92%_0.01_260)]">
      <code>{code.replace(/\n$/, '')}</code>
    </pre>
  )
}
