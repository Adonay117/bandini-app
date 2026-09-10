import Link from 'next/link';
import { Eye, Pencil, Gift } from 'lucide-react';
import { Cliente } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';

export function ClientesTable({ clientes }: { clientes: Cliente[] }) {
  if (clientes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-secondary py-16 text-center">
        <p className="text-sm text-muted-light">No hay clientes registrados todavía.</p>
      </div>
    );
  }

  return (
    <>
      {/* Móvil: tarjetas */}
      <ul className="flex flex-col gap-3 md:hidden">
        {clientes.map((c) => (
          <li key={c.id} className="rounded-2xl border border-secondary/70 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{c.nombre}</p>
                <p className="text-sm text-muted-light">{c.telefono}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary/50 px-2 py-1 text-xs font-medium text-primary">
                <Gift size={12} /> {c.stickers_actuales}/10
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-secondary/60 pt-3 text-sm">
              <div>
                <p className="text-xs text-muted-light">Acumulado</p>
                <p className="font-medium text-ink">{formatCurrency(c.monto_acumulado_tarjeta)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-light">Total gastado</p>
                <p className="font-medium text-ink">{formatCurrency(c.total_moneda_gastada)}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 border-t border-secondary/60 pt-3">
              <Link
                href={`/clientes/${c.id}`}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-secondary bg-white text-sm font-medium text-muted"
              >
                <Eye size={14} /> Ver
              </Link>
              <Link
                href={`/clientes/${c.id}?editar=1`}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary/50 text-sm font-medium text-primary"
              >
                <Pencil size={14} /> Editar
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla */}
      <div className="hidden overflow-hidden rounded-2xl border border-secondary/70 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-secondary/60">
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Nombre</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Teléfono</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Stickers</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Acumulado</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Total gastado</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-secondary/60 last:border-0 hover:bg-surface/60">
                <td className="px-5 py-3 font-medium text-ink">{c.nombre}</td>
                <td className="px-5 py-3 text-muted">{c.telefono}</td>
                <td className="px-5 py-3 text-muted">{c.stickers_actuales} / 10</td>
                <td className="px-5 py-3 text-muted">{formatCurrency(c.monto_acumulado_tarjeta)}</td>
                <td className="px-5 py-3 text-muted">{formatCurrency(c.total_moneda_gastada)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-ink"
                    >
                      <Eye size={14} /> Ver
                    </Link>
                    <Link
                      href={`/clientes/${c.id}?editar=1`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-ink"
                    >
                      <Pencil size={14} /> Editar
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
