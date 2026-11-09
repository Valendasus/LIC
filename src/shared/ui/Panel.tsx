/** Рамка задания: подпись слева, статус справа. */
export function Panel({ label, status, children }: { label: string; status: string; children: React.ReactNode }) {
  return (
    <div className="rounded-panel bg-surface p-5 sm:p-7">
      <div className="mb-4 flex justify-between gap-3 text-xs text-muted">
        <span>{label}</span>
        <span className="truncate">{status}</span>
      </div>
      {children}
    </div>
  )
}
