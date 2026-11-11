'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { MetodoPagoBadge } from '@/components/ui/MetodoPagoBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Venta } from '@/lib/types';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';

export default function VentaDetallePage() {
  const params = useParams<{ id: string }>();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`/api/ventas/${params.id}`);
        if (!res.ok) throw new Error((await res.json()).error ?? 'Venta no encontrada');
        const data = await res.json();
        if (!cancelado) setVenta(data);
      } catch (err) {
        if (!cancelado) setError(err instanceof Error ? err.message : 'Error al cargar la venta');
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
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

  if (!venta) return null;

  const unidades = venta.items.reduce((s, i) => s + i.cantidad, 0);
  const descuentoTotal = venta.items.reduce((s, i) => s + i.descuento, 0);
  const subtotal = venta.items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/ventas"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
      >
        <ChevronLeft size={15} /> Ventas
      </Link>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Detalle de venta</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {venta.cliente_id && venta.cliente_nombre ? (
              <Link href={`/clientes/${venta.cliente_id}`} className="font-medium text-primary hover:underline">
                {venta.cliente_nombre}
              </Link>
            ) : (
              <span>{venta.cliente_nombre ?? 'Sin cliente'}</span>
            )}
            <span aria-hidden>·</span>
            <MetodoPagoBadge metodo={venta.metodo_pago} />
            <span aria-hidden>·</span>
            <span>{formatDateTime(venta.fecha)}</span>
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-2xl font-semibold text-ink tabular-nums">{formatCurrency(venta.total)}</p>
          <p className="text-xs text-muted-light">
            {venta.items.length} producto{venta.items.length === 1 ? '' : 's'} · {unidades} unidad
            {unidades === 1 ? '' : 'es'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-[var(--shadow-card)]">
        <ul className="divide-y divide-border">
          {venta.items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{i.producto_nombre ?? 'Producto eliminado'}</p>
                <p className="mt-0.5 text-xs text-muted-light tabular-nums">
                  {i.cantidad} × {formatCurrency(i.precio_unitario)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-ink tabular-nums">{formatCurrency(i.total)}</p>
                {i.descuento > 0 && (
                  <p className="text-[11px] text-warning tabular-nums">−{formatCurrency(i.descuento)} desc.</p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 border-t border-border px-4 py-3 text-sm sm:px-5">
          {descuentoTotal > 0 && (
            <>
              <div className="flex justify-between text-muted">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-warning">
                <dt>Descuento</dt>
                <dd className="tabular-nums">−{formatCurrency(descuentoTotal)}</dd>
              </div>
            </>
          )}
          <div className="flex justify-between font-semibold text-ink">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatCurrency(venta.total)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
