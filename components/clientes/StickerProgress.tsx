const META = 10;

export function StickerProgress({ actuales, className = '' }: { actuales: number; className?: string }) {
  const pct = Math.min((actuales / META) * 100, 100);
  const cerca = actuales === 4 || actuales === 9;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full ${cerca ? 'bg-warning' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted tabular-nums">
        {actuales}/{META}
      </span>
    </div>
  );
}
