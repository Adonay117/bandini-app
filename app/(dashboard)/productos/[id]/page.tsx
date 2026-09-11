'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ChevronLeft, PackagePlus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { ProductoThumb } from '@/components/productos/ProductoThumb';
import { MovimientosList } from '@/components/productos/MovimientosList';
import { ProductoForm } from '@/components/forms/ProductoForm';
import { Producto } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';

export default function ProductoDetallePage() {
  const params = useParams<{ id: string }>();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/productos/${params.id}`);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Producto no encontrado');
      setProducto(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar producto');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading && !producto) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-negative-surface bg-negative-surface/40 p-4 text-sm text-negative">
        {error}
      </div>
    );
  }

  if (!producto) return null;

  const stockBajo = producto.stock_actual <= producto.stock_minimo;
  const ganancia = producto.precio_venta - producto.precio_costo;
  const margenPct = producto.precio_venta > 0 ? Math.round((ganancia / producto.precio_venta) * 100) : 0;
  const valorEnStock = producto.stock_actual * producto.precio_costo;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/productos"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
      >
        <ChevronLeft size={15} /> Productos
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <ProductoThumb src={producto.imagen_url} size={64} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">{producto.nombre}</h1>
              <Badge variant={producto.activo ? 'positive' : 'neutral'}>{producto.activo ? 'Activo' : 'Inactivo'}</Badge>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted">
              <span className="font-mono">{producto.sku}</span>
              {producto.categoria && ` · ${producto.categoria}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={`/productos/${producto.id}/abastecer`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary/60 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-secondary"
          >
            <PackagePlus size={15} /> Abastecer
          </Link>
          <Link
            href={`/productos/${producto.id}/merma`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-negative-surface px-4 py-2.5 text-sm font-medium text-negative transition-colors hover:brightness-95"
          >
            <AlertTriangle size={15} /> Dañado
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Stock actual"
          value={producto.stock_actual}
          hint={stockBajo ? `bajo el mínimo (${producto.stock_minimo})` : `mínimo ${producto.stock_minimo}`}
          tone={stockBajo ? 'negative' : 'default'}
        />
        <StatTile label="Precio de venta" value={formatCurrency(producto.precio_venta)} hint={`costo ${formatCurrency(producto.precio_costo)}`} />
        <StatTile
          label="Ganancia / unidad"
          value={formatCurrency(ganancia)}
          hint={`${margenPct}% sobre venta`}
          tone={ganancia > 0 ? 'positive' : 'negative'}
        />
        <StatTile label="Valor en stock" value={formatCurrency(valorEnStock)} hint="a precio de costo" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ProductoForm producto={producto} onGuardado={cargar} />
        <section className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Movimientos recientes</h3>
            <Link href={`/productos/${producto.id}/abastecer`} className="text-xs font-medium text-primary hover:underline">
              Ver todo
            </Link>
          </div>
          <MovimientosList productoId={producto.id} pageSize={6} />
        </section>
      </div>
    </div>
  );
}
