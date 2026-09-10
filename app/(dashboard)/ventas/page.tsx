'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Loading } from '@/components/ui/Loading';
import { Pagination } from '@/components/ui/Pagination';
import { VentasTable } from '@/components/tables/VentasTable';
import { usePaginatedList } from '@/lib/hooks/usePaginatedList';
import { MetodoPago, Venta } from '@/lib/types';

const metodosPago: MetodoPago[] = ['efectivo', 'tarjeta', 'transferencia'];

export default function VentasPage() {
  const [fecha, setFecha] = useState('');
  const [cliente, setCliente] = useState('');
  const [producto, setProducto] = useState('');
  const [metodoPago, setMetodoPago] = useState('');

  const params = useMemo(
    () => ({
      ...(fecha && { fecha }),
      ...(cliente.trim() && { cliente: cliente.trim() }),
      ...(producto.trim() && { producto: producto.trim() }),
      ...(metodoPago && { metodo_pago: metodoPago }),
    }),
    [fecha, cliente, producto, metodoPago]
  );

  const { items: ventas, total, totalPages, page, setPage, loading, error } = usePaginatedList<Venta>(
    '/api/ventas',
    params
  );

  const hayFiltros = fecha || cliente || producto || metodoPago;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Ventas</h1>
          <p className="mt-1 text-sm text-muted">Historial de ventas registradas.</p>
        </div>
        <Link href="/ventas/nueva">
          <Button>+ Nueva venta</Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-secondary/70 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-light uppercase">
          <Filter size={14} /> Filtros
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Input label="Cliente" placeholder="Nombre…" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          <Input label="Producto" placeholder="Nombre…" value={producto} onChange={(e) => setProducto(e.target.value)} />
          <Select label="Método de pago" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
            <option value="">Todos</option>
            {metodosPago.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              setFecha('');
              setCliente('');
              setProducto('');
              setMetodoPago('');
            }}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            Quitar filtros
          </button>
        )}
      </div>

      {loading && ventas.length === 0 && <Loading label="Cargando ventas…" />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && (ventas.length > 0 || !loading) && (
        <>
          <VentasTable ventas={ventas} />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
