import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Cliente } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { ClienteAvatar } from '@/components/clientes/ClienteAvatar';
import { StickerProgress } from '@/components/clientes/StickerProgress';

export function ClientesTable({ clientes }: { clientes: Cliente[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {clientes.map((c) => {
        const ubicacion = [c.lugar, c.departamento].filter(Boolean).join(', ');
        return (
          <li key={c.id}>
            <Link
              href={`/clientes/${c.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-3 shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-px hover:border-primary/25 hover:shadow-[var(--shadow-card-hover)] sm:px-4"
            >
              <ClienteAvatar nombre={c.nombre} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{c.nombre}</p>
                <p className="truncate text-xs text-muted-light">
                  {c.telefono}
                  {ubicacion && ` · ${ubicacion}`}
                </p>
                <div className="mt-1.5 sm:hidden">
                  <StickerProgress actuales={c.stickers_actuales} />
                </div>
              </div>

              <div className="hidden shrink-0 sm:block">
                <StickerProgress actuales={c.stickers_actuales} />
              </div>

              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-sm font-semibold text-ink tabular-nums">
                  {formatCurrency(c.total_moneda_gastada)}
                </p>
                <p className="text-[11px] text-muted-light">gastado</p>
              </div>

              <ChevronRight size={16} className="shrink-0 text-muted-light" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
