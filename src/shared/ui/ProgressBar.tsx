/** Полоса прогресса с процентом справа. */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-good" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-9 text-right font-mono text-xs text-muted tabular-nums">{percent}%</span>
    </div>
  )
}
