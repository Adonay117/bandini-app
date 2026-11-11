import { ReactNode } from 'react';

export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
