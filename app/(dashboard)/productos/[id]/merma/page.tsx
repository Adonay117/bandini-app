'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Loading } from '@/components/ui/Loading';
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

  if (loading) return <Loading label="Cargando producto…" />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!producto) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/productos/${producto.id}`} className="mb-2 flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> Volver al producto
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{producto.nombre}</h1>
        <p className="mt-1 text-sm text-muted">Reportar producto dañado.</p>
      </div>
      <ReportarMermaForm producto={producto} onReportada={setProducto} />
    </div>
  );
}
