/** Рамка задания: подпись слева, статус справа. */
export function Panel({ label, status, children }: { label: string; status: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex justify-between gap-3 text-xs text-muted">
        <span>{label}</span>
        <span className="truncate">{status}</span>
      </div>
      {children}
    </div>
  )
}
