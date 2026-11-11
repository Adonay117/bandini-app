'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { PlataformaBadge } from '@/components/ui/PlataformaBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { MiniaturaArticulo } from '@/components/pedidos/ImagenArticulo';
import { IncidenciaAcciones } from '@/components/embarques/IncidenciaAcciones';
import { IncidenciaBandeja } from '@/lib/types';
import { codigoEmbarque } from '@/lib/utils/logistica';

// Bandeja de todo lo que llegó mal y requiere seguimiento con la
// plataforma: incidencias abiertas, reclamos en curso y reposiciones que
// todavía no llegan.
export default function IncidenciasPage() {
  const [todas, setTodas] = useState(false);
  const [lista, setLista] = useState<IncidenciaBandeja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/incidencias${todas ? '?todas=1' : ''}`);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar incidencias');
      setLista(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar incidencias');
    } finally {
      setLoading(false);
    }
  }, [todas]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abiertas = lista.filter((i) => i.estado === 'abierta').length;
  const enReclamo = lista.filter((i) => i.estado === 'en_reclamo').length;
  const reposiciones = lista.flatMap((i) => i.devoluciones.flatMap((d) => d.reposiciones)).filter(
    (r) => r.estado === 'pendiente' || r.estado === 'en_transito'
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Incidencias y devoluciones</h1>
          <p className="mt-1 text-sm text-muted">Productos faltantes, dañados o equivocados y su reclamo a la plataforma.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={todas}
            onChange={(e) => {
              setLoading(true);
              setTodas(e.target.checked);
            }}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
          />
          Ver también las cerradas
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Abiertas" value={loading ? '—' : abiertas} tone={abiertas > 0 ? 'negative' : 'default'} />
        <StatTile label="En reclamo" value={loading ? '—' : enReclamo} tone={enReclamo > 0 ? 'warning' : 'default'} />
        <StatTile label="Reposiciones" value={loading ? '—' : reposiciones} hint="por llegar" />
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-negative-surface bg-negative-surface/40 p-4 text-sm text-negative">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted-light">
            <AlertTriangle size={18} />
          </span>
          <p className="text-sm text-muted">No hay incidencias pendientes.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((inc) => {
            const item = inc.linea.pedido_item;
            return (
              <li key={inc.id} className="rounded-2xl border border-border bg-white p-4 shadow-[var(--shadow-card)]">
                <div className="mb-3 flex items-center gap-3">
                  <MiniaturaArticulo src={item.imagen_url} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                      <span className="truncate">{item.nombre}</span>
                      {item.pedido.plataforma && <PlataformaBadge plataforma={item.pedido.plataforma} />}
                    </p>
                    <p className="text-xs text-muted-light">
                      <Link href={`/pedidos/${item.pedido.id}`} className="text-primary hover:underline">
                        Pedido #{item.pedido.numero}
                      </Link>
                      {item.pedido.cliente && ` · ${item.pedido.cliente.nombre}`} ·{' '}
                      <Link href={`/embarques/${inc.linea.embarque.id}`} className="text-primary hover:underline">
                        {codigoEmbarque(inc.linea.embarque.numero)}
                      </Link>
                    </p>
                  </div>
                </div>
                <IncidenciaAcciones incidencia={inc} precioCompraUnitario={item.precio_compra} onCambio={cargar} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
