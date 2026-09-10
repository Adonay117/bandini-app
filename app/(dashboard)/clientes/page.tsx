'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Loading } from '@/components/ui/Loading';
import { Pagination } from '@/components/ui/Pagination';
import { ClientesTable } from '@/components/tables/ClientesTable';
import { usePaginatedList } from '@/lib/hooks/usePaginatedList';
import { Cliente, DEPARTAMENTOS_SV } from '@/lib/types';

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [departamento, setDepartamento] = useState('');

  const params = useMemo(
    () => ({ ...(search.trim() && { search: search.trim() }), ...(departamento && { departamento }) }),
    [search, departamento]
  );

  const { items: clientes, total, totalPages, page, setPage, loading, error } = usePaginatedList<Cliente>(
    '/api/clientes',
    params
  );

  const hayFiltros = search || departamento;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Clientes</h1>
          <p className="mt-1 text-sm text-muted">Tarjetas de fidelidad y contacto.</p>
        </div>
        <Link href="/clientes/nuevo">
          <Button>
            <Plus size={16} /> Nuevo cliente
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-secondary/70 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-light uppercase">
          <Filter size={14} /> Filtros
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Buscar"
            placeholder="Nombre o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select label="Departamento" value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
            <option value="">Todos</option>
            {DEPARTAMENTOS_SV.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setDepartamento('');
            }}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            Quitar filtros
          </button>
        )}
      </div>

      {loading && clientes.length === 0 && <Loading label="Cargando clientes…" />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && (clientes.length > 0 || !loading) && (
        <>
          <ClientesTable clientes={clientes} />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
