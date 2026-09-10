export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-muted-light">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-secondary border-t-primary" />
      {label}
    </div>
  );
}
