'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { Pagination } from '@/components/ui/Pagination';
import { ProductosTable } from '@/components/tables/ProductosTable';
import { usePaginatedList } from '@/lib/hooks/usePaginatedList';
import { formatCurrency } from '@/lib/utils/formatters';
import { Producto } from '@/lib/types';

interface ResumenProductos {
  activos: number;
  inactivos: number;
  valorInventario: number;
  categorias: string[];
}

export default function ProductosPage() {
  return (
    <Suspense fallback={<ProductosSkeleton />}>
      <ProductosPageContent />
    </Suspense>
  );
}

function ProductosSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-11 rounded-xl" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-xl" />
        ))}
      </div>
    </div>
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

  const { items: productos, total, totalPages, page, setPage, loading, error, extra } = usePaginatedList<
    Producto,
    { stockBajoCount?: number; resumen?: ResumenProductos }
  >('/api/productos', params);

  const hayFiltros = Boolean(search || categoria || activo || stockBajo);
  const stockBajoCount = extra.stockBajoCount ?? 0;
  const resumen = extra.resumen;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
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

      <div className="grid grid-cols-3 gap-3">
        <StatTile label={hayFiltros ? 'Resultados' : 'Productos activos'} value={resumen?.activos ?? total} />
        <StatTile
          label="Valor de inventario"
          value={resumen ? formatCurrency(resumen.valorInventario) : '—'}
          hint="a precio de costo"
        />
        <button
          type="button"
          disabled={stockBajoCount === 0}
          onClick={() => setStockBajo((v) => !v)}
          className="rounded-xl text-left transition-transform enabled:hover:-translate-y-px disabled:cursor-default"
        >
          <StatTile
            label="Stock bajo"
            value={stockBajoCount}
            hint={stockBajoCount > 0 ? (stockBajo ? 'mostrando solo estos' : 'tocá para filtrar') : 'todo abastecido'}
            tone={stockBajoCount > 0 ? 'negative' : 'default'}
          />
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o SKU…" className="flex-1" />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="min-h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-ink outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-44"
        >
          <option value="">Todas las categorías</option>
          {(resumen?.categorias ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={activo}
          onChange={(e) => setActivo(e.target.value)}
          className="min-h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-ink outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-36"
        >
          <option value="">Activos e inactivos</option>
          <option value="1">Solo activos</option>
          <option value="0">Solo inactivos</option>
        </select>
        {hayFiltros && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setCategoria('');
              setActivo('');
              setStockBajo(false);
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

      {loading && productos.length === 0 ? (
        <ul className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-[72px] rounded-xl" />
            </li>
          ))}
        </ul>
      ) : productos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted-light">
            {hayFiltros ? <AlertTriangle size={18} /> : <Package size={18} />}
          </span>
          {hayFiltros ? (
            <>
              <p className="text-sm text-muted">Ningún producto coincide con los filtros.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setCategoria('');
                  setActivo('');
                  setStockBajo(false);
                }}
              >
                Quitar filtros
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">Todavía no hay productos en el inventario.</p>
              <Link href="/productos/nuevo">
                <Button>
                  <Plus size={16} /> Agregar el primero
                </Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className={`flex flex-col gap-4 transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
          <ProductosTable productos={productos} />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
