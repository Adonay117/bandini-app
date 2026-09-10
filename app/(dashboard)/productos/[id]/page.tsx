'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, PackagePlus } from 'lucide-react';
import { Loading } from '@/components/ui/Loading';
import { ProductoForm } from '@/components/forms/ProductoForm';
import { Producto } from '@/lib/types';

export default function ProductoDetallePage() {
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{producto.nombre}</h1>
          <p className="mt-1 text-sm text-muted">Editar producto.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/productos/${producto.id}/abastecer`}
            className="flex min-h-11 items-center gap-1.5 rounded-xl bg-secondary/50 px-4 py-2.5 text-sm font-medium text-primary hover:bg-secondary/70"
          >
            <PackagePlus size={15} /> Abastecer inventario
          </Link>
          <Link
            href={`/productos/${producto.id}/merma`}
            className="flex min-h-11 items-center gap-1.5 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <AlertTriangle size={15} /> Reportar dañado
          </Link>
        </div>
      </div>
      <ProductoForm producto={producto} />
    </div>
  );
}
