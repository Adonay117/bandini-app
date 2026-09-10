'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Filter, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Loading } from '@/components/ui/Loading';
import { Pagination } from '@/components/ui/Pagination';
import { ProductosTable } from '@/components/tables/ProductosTable';
import { usePaginatedList } from '@/lib/hooks/usePaginatedList';
import { Producto } from '@/lib/types';

export default function ProductosPage() {
  return (
    <Suspense fallback={<Loading label="Cargando productos…" />}>
      <ProductosPageContent />
    </Suspense>
  );
}

function ProductosPageContent() {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [activo, setActivo] = useState('');
  const [stockBajo, setStockBajo] = useState(() => searchParams.get('stock_bajo') === '1');

  const params = useMemo(
    () => ({
      ...(search.trim() && { search: search.trim() }),
      ...(categoria.trim() && { categoria: categoria.trim() }),
      ...(activo && { activo }),
      ...(stockBajo && { stock_bajo: '1' }),
    }),
    [search, categoria, activo, stockBajo]
  );

  const {
    items: productos,
    total,
    totalPages,
    page,
    setPage,
    loading,
    error,
    extra,
  } = usePaginatedList<Producto, { stockBajoCount?: number }>('/api/productos', params);

  const hayFiltros = search || categoria || activo || stockBajo;
  const stockBajoCount = extra.stockBajoCount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Productos</h1>
          <p className="mt-1 text-sm text-muted">Inventario y precios.</p>
        </div>
        <Link href="/productos/nuevo">
          <Button>
            <Plus size={16} /> Nuevo producto
          </Button>
        </Link>
      </div>

      {!stockBajo && stockBajoCount > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertTriangle size={16} />
            {stockBajoCount} producto{stockBajoCount !== 1 ? 's' : ''} con stock bajo
            {hayFiltros ? ' (con los filtros actuales)' : ''}.
          </p>
          <Button variant="danger" onClick={() => setStockBajo(true)} className="w-fit">
            Ver ahora
          </Button>
        </div>
      )}

      <div className="rounded-2xl border border-secondary/70 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-light uppercase">
          <Filter size={14} /> Filtros
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input
            label="Buscar"
            placeholder="Nombre o SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input
            label="Categoría"
            placeholder="Ej. maquillaje…"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
          <Select label="Estado" value={activo} onChange={(e) => setActivo(e.target.value)}>
            <option value="">Todos</option>
            <option value="1">Activos</option>
            <option value="0">Inactivos</option>
          </Select>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted">Inventario</label>
            <button
              type="button"
              onClick={() => setStockBajo((v) => !v)}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
                stockBajo
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-secondary bg-white text-muted hover:bg-surface'
              }`}
            >
              <AlertTriangle size={14} />
              Solo stock bajo
            </button>
          </div>
        </div>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCategoria('');
              setActivo('');
              setStockBajo(false);
            }}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            Quitar filtros
          </button>
        )}
      </div>

      {loading && productos.length === 0 && <Loading label="Cargando productos…" />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && (productos.length > 0 || !loading) && (
        <>
          <ProductosTable productos={productos} />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
