'use client';

import { useEffect, useState } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { MovimientoRow } from '@/components/productos/MovimientoRow';
import { usePaginatedList } from '@/lib/hooks/usePaginatedList';
import { MovimientoInventario } from '@/lib/types';

interface Props {
  productoId: string;
  soloMerma?: boolean;
  showTipoFilter?: boolean;
  pageSize?: number;
  /** Cambiar este valor fuerza una recarga (p. ej. tras registrar un movimiento). */
  reloadKey?: number;
  emptyLabel?: string;
}

export function MovimientosList({
  productoId,
  soloMerma = false,
  showTipoFilter = false,
  pageSize = 10,
  reloadKey = 0,
  emptyLabel = 'Sin movimientos registrados.',
}: Props) {
  const [tipo, setTipo] = useState('');
  const params: Record<string, string> = soloMerma ? { motivo: 'merma' } : tipo ? { tipo } : {};

  const { items, total, totalPages, page, setPage, loading, refetch } = usePaginatedList<MovimientoInventario>(
    `/api/productos/${productoId}/movimientos`,
    params,
    pageSize
  );

  useEffect(() => {
    if (reloadKey) refetch();
  }, [reloadKey, refetch]);

  return (
    <div>
      {showTipoFilter && (
        <div className="mb-1 flex justify-end">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="min-h-9 rounded-lg border border-border bg-white px-2.5 text-xs text-muted outline-none focus:border-primary"
          >
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
          </select>
        </div>
      )}

      {loading && items.length === 0 ? (
        <p className="py-2 text-sm text-muted-light">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="py-2 text-sm text-muted-light">{emptyLabel}</p>
      ) : (
        <>
          <ul className="flex flex-col">
            {items.map((m) => (
              <MovimientoRow key={m.id} m={m} />
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="mt-3">
              <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
