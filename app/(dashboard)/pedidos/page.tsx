'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { Pagination } from '@/components/ui/Pagination';
import { PedidosTable } from '@/components/tables/PedidosTable';
import { usePaginatedList } from '@/lib/hooks/usePaginatedList';
import { formatCurrency } from '@/lib/utils/formatters';
import { ESTADOS_PEDIDO, ESTADO_PEDIDO } from '@/lib/utils/pedidos';
import { EstadoPedido, Pedido } from '@/lib/types';

interface ResumenPedidos {
  porCobrar: number;
  activos: number;
}

export default function PedidosPage() {
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [cambioEstadoError, setCambioEstadoError] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      ...(search.trim() && { search: search.trim() }),
      ...(estado && { estado }),
    }),
    [search, estado]
  );

  const { items: pedidos, total, totalPages, page, setPage, loading, error, refetch, extra } = usePaginatedList<
    Pedido,
    { resumen?: ResumenPedidos }
  >('/api/pedidos', params);

  const hayFiltros = Boolean(search || estado);
  const resumen = extra.resumen;

  async function cambiarEstado(id: string, nuevoEstado: EstadoPedido) {
    setCambioEstadoError(null);
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cambiar estado');
      refetch();
    } catch (err) {
      setCambioEstadoError(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Pedidos</h1>
          <p className="mt-1 text-sm text-muted">Órdenes de Shein, Temu, Amazon y más.</p>
        </div>
        <Link href="/pedidos/nuevo">
          <Button>
            <Plus size={16} /> Nuevo pedido
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label={hayFiltros ? 'Resultados' : 'Total pedidos'} value={total} />
        <StatTile label="En curso" value={resumen?.activos ?? '—'} hint="sin completar" />
        <StatTile
          label="Por cobrar"
          value={resumen ? formatCurrency(resumen.porCobrar) : '—'}
          tone={resumen && resumen.porCobrar > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por cliente o lugar…"
          className="flex-1"
        />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          aria-label="Filtrar por estado"
          className="min-h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-ink outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-48"
        >
          <option value="">Cualquier estado</option>
          {ESTADOS_PEDIDO.map((e) => (
            <option key={e} value={e}>
              {ESTADO_PEDIDO[e].label}
            </option>
          ))}
        </select>
        {hayFiltros && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setEstado('');
            }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {(error || cambioEstadoError) && (
        <div role="alert" className="rounded-xl border border-negative-surface bg-negative-surface/40 p-4 text-sm text-negative">
          {error || cambioEstadoError}
        </div>
      )}

      {loading && pedidos.length === 0 ? (
        <ul className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-[92px] rounded-xl" />
            </li>
          ))}
        </ul>
      ) : pedidos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted-light">
            <ClipboardList size={18} />
          </span>
          <p className="text-sm text-muted">
            {hayFiltros ? 'Ningún pedido coincide con los filtros.' : 'Todavía no hay pedidos registrados.'}
          </p>
          <Link href="/pedidos/nuevo">
            <Button variant="secondary">
              <Plus size={16} /> Crear un pedido
            </Button>
          </Link>
        </div>
      ) : (
        <div className={`flex flex-col gap-4 transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
          <PedidosTable pedidos={pedidos} onCambiarEstado={cambiarEstado} />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
