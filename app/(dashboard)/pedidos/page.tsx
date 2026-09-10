'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Loading } from '@/components/ui/Loading';
import { Pagination } from '@/components/ui/Pagination';
import { PedidosTable } from '@/components/tables/PedidosTable';
import { usePaginatedList } from '@/lib/hooks/usePaginatedList';
import { EstadoPedido, Pedido } from '@/lib/types';

const estados: EstadoPedido[] = ['cotizacion', 'confirmado', 'en_transito', 'entregado', 'completado'];

export default function PedidosPage() {
  const [fecha, setFecha] = useState('');
  const [cliente, setCliente] = useState('');
  const [lugar, setLugar] = useState('');
  const [estado, setEstado] = useState('');

  const params = useMemo(
    () => ({
      ...(fecha && { fecha }),
      ...(cliente.trim() && { cliente: cliente.trim() }),
      ...(lugar.trim() && { lugar: lugar.trim() }),
      ...(estado && { estado }),
    }),
    [fecha, cliente, lugar, estado]
  );

  const { items: pedidos, total, totalPages, page, setPage, loading, error } = usePaginatedList<Pedido>(
    '/api/pedidos',
    params
  );

  const hayFiltros = fecha || cliente || lugar || estado;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
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

      <div className="rounded-2xl border border-secondary/70 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-light uppercase">
          <Filter size={14} /> Filtros
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Input label="Cliente" placeholder="Nombre…" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          <Input label="Lugar" placeholder="Municipio/dirección…" value={lugar} onChange={(e) => setLugar(e.target.value)} />
          <Select label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {estados.map((e) => (
              <option key={e} value={e}>
                {e}
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
              setLugar('');
              setEstado('');
            }}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            Quitar filtros
          </button>
        )}
      </div>

      {loading && pedidos.length === 0 && <Loading label="Cargando pedidos…" />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && (pedidos.length > 0 || !loading) && (
        <>
          <PedidosTable pedidos={pedidos} />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
