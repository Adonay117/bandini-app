'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { ReportarMermaForm } from '@/components/forms/ReportarMermaForm';
import { Producto } from '@/lib/types';

export default function MermaProductoPage() {
  const params = useParams<{ id: string }>();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/productos/${params.id}`);
        if (!res.ok) throw new Error((await res.json()).error ?? 'Producto no encontrado');
        const json = await res.json();
        if (!cancelled) setProducto(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar producto');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading && !producto) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96 max-w-lg rounded-2xl" />
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/productos/${producto.id}`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ChevronLeft size={15} /> {producto.nombre}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Reportar producto dañado</h1>
      </div>
      <ReportarMermaForm producto={producto} onReportada={setProducto} />
    </div>
  );
}
