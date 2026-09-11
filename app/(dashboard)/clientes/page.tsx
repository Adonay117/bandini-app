'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { Pagination } from '@/components/ui/Pagination';
import { ClientesTable } from '@/components/tables/ClientesTable';
import { usePaginatedList } from '@/lib/hooks/usePaginatedList';
import { Cliente, DEPARTAMENTOS_SV } from '@/lib/types';

interface ResumenClientes {
  tarjetasEnProgreso: number;
  cercaDePremio: number;
}

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [departamento, setDepartamento] = useState('');

  const params = useMemo(
    () => ({ ...(search.trim() && { search: search.trim() }), ...(departamento && { departamento }) }),
    [search, departamento]
  );

  const { items: clientes, total, totalPages, page, setPage, loading, error, extra } = usePaginatedList<
    Cliente,
    { resumen?: ResumenClientes }
  >('/api/clientes', params);

  const hayFiltros = Boolean(search || departamento);
  const resumen = extra.resumen;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label={hayFiltros ? 'Resultados' : 'Clientes activos'} value={total} />
        <StatTile
          label="Tarjetas en progreso"
          value={resumen?.tarjetasEnProgreso ?? '—'}
          hint="con stickers o saldo"
        />
        <StatTile
          label="A un sticker del premio"
          value={resumen?.cercaDePremio ?? '—'}
          hint="en 4 o 9 stickers"
          tone={resumen && resumen.cercaDePremio > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o teléfono…"
          className="flex-1"
        />
        <select
          value={departamento}
          onChange={(e) => setDepartamento(e.target.value)}
          className="min-h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-ink outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-56"
        >
          <option value="">Todos los departamentos</option>
          {DEPARTAMENTOS_SV.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {hayFiltros && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setDepartamento('');
            }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-negative-surface bg-negative-surface/40 p-4 text-sm text-negative">
          {error}
        </div>
      )}

      {loading && clientes.length === 0 ? (
        <ul className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-[68px] rounded-xl" />
            </li>
          ))}
        </ul>
      ) : clientes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted-light">
            <Users size={18} />
          </span>
          {hayFiltros ? (
            <>
              <p className="text-sm text-muted">Ningún cliente coincide con los filtros.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setDepartamento('');
                }}
              >
                Quitar filtros
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">Todavía no hay clientes registrados.</p>
              <Link href="/clientes/nuevo">
                <Button>
                  <Plus size={16} /> Registrar el primero
                </Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className={`flex flex-col gap-4 transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
          <ClientesTable clientes={clientes} />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
