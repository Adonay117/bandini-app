'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { Pagination } from '@/components/ui/Pagination';
import { VentasTable } from '@/components/tables/VentasTable';
import { usePaginatedList } from '@/lib/hooks/usePaginatedList';
import { formatCurrency } from '@/lib/utils/formatters';
import { MetodoPago, Venta } from '@/lib/types';

const METODOS: MetodoPago[] = ['efectivo', 'tarjeta', 'transferencia'];

type Rango = 'hoy' | 'semana' | 'mes' | 'todo';
const RANGOS: { id: Rango; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: '7 días' },
  { id: 'mes', label: 'Este mes' },
  { id: 'todo', label: 'Todo' },
];

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function rangoFechas(r: Rango): { desde?: string; hasta?: string } {
  const hoy = new Date();
  if (r === 'todo') return {};
  if (r === 'hoy') return { desde: isoLocal(hoy), hasta: isoLocal(hoy) };
  if (r === 'semana') {
    const d = new Date(hoy);
    d.setDate(d.getDate() - 6);
    return { desde: isoLocal(d), hasta: isoLocal(hoy) };
  }
  return { desde: isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: isoLocal(hoy) };
}

interface ResumenVentas {
  totalMonto: number;
  unidades: number;
}

export default function VentasPage() {
  const [rango, setRango] = useState<Rango>('mes');
  const [search, setSearch] = useState('');
  const [metodoPago, setMetodoPago] = useState('');

  const params = useMemo(() => {
    const { desde, hasta } = rangoFechas(rango);
    return {
      ...(desde && { desde }),
      ...(hasta && { hasta }),
      ...(search.trim() && { search: search.trim() }),
      ...(metodoPago && { metodo_pago: metodoPago }),
    };
  }, [rango, search, metodoPago]);

  const { items: ventas, total, totalPages, page, setPage, loading, error, extra } = usePaginatedList<
    Venta,
    { resumen?: ResumenVentas }
  >('/api/ventas', params);

  const resumen = extra.resumen;
  const ticket = resumen && total > 0 ? resumen.totalMonto / total : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Ventas</h1>
          <p className="mt-1 text-sm text-muted">Historial de ventas registradas.</p>
        </div>
        <Link href="/ventas/nueva">
          <Button>
            <Plus size={16} /> Nueva venta
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Total vendido" value={resumen ? formatCurrency(resumen.totalMonto) : '—'} />
        <StatTile label="Ventas" value={total} hint="registros en el rango" />
        <StatTile label="Ticket promedio" value={ticket ? formatCurrency(ticket) : '—'} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="inline-flex w-fit rounded-xl border border-border bg-white p-0.5">
          {RANGOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRango(r.id)}
              className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors ${
                rango === r.id ? 'bg-primary text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por cliente o producto…"
            className="flex-1"
          />
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            className="min-h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-ink capitalize outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-48"
          >
            <option value="">Todos los métodos</option>
            {METODOS.map((m) => (
              <option key={m} value={m} className="capitalize">
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-negative-surface bg-negative-surface/40 p-4 text-sm text-negative">
          {error}
        </div>
      )}

      {loading && ventas.length === 0 ? (
        <ul className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-[76px] rounded-xl" />
            </li>
          ))}
        </ul>
      ) : ventas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted-light">
            <ShoppingCart size={18} />
          </span>
          <p className="text-sm text-muted">
            {search || metodoPago || rango !== 'todo'
              ? 'No hay ventas con estos filtros.'
              : 'Todavía no hay ventas registradas.'}
          </p>
          <Link href="/ventas/nueva">
            <Button variant="secondary">
              <Plus size={16} /> Registrar una venta
            </Button>
          </Link>
        </div>
      ) : (
        <div className={`flex flex-col gap-4 transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
          <VentasTable ventas={ventas} />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
