import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

export function KPICard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  alerta = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  alerta?: boolean;
}) {
  const contenido = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-muted-light uppercase">{label}</p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            alerta ? 'bg-red-50 text-red-600' : 'bg-secondary/50 text-primary'
          }`}
        >
          <Icon size={16} strokeWidth={2.2} />
        </span>
      </div>
      <p className={`mt-3 text-2xl font-semibold tracking-tight sm:text-3xl ${alerta ? 'text-red-600' : 'text-ink'}`}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted-light">{hint}</p>}
    </>
  );

  const className = `rounded-2xl border p-5 shadow-sm sm:p-6 ${
    alerta ? 'border-red-200 bg-red-50/40' : 'border-secondary/70 bg-white'
  } ${
    href ? (alerta ? 'transition-colors hover:border-red-300 hover:bg-red-50' : 'transition-colors hover:border-primary/30 hover:bg-surface') : ''
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {contenido}
      </Link>
    );
  }

  return <div className={className}>{contenido}</div>;
}
