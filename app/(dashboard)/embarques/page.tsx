'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, Repeat, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { EmbarqueResumen, EstadoEmbarque } from '@/lib/types';
import { formatCurrency, formatDia } from '@/lib/utils/formatters';
import { ESTADO_EMBARQUE, codigoEmbarque } from '@/lib/utils/logistica';

export default function EmbarquesPage() {
  const [embarques, setEmbarques] = useState<EmbarqueResumen[]>([]);
  const [estado, setEstado] = useState<EstadoEmbarque | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/embarques');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar embarques');
      setEmbarques(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar embarques');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtrados = useMemo(() => (estado ? embarques.filter((e) => e.estado === estado) : embarques), [embarques, estado]);
  const enTransito = embarques.filter((e) => e.estado === 'en_transito' || e.estado === 'recibido_parcial').length;
  const conIncidencias = embarques.filter((e) => e.estado === 'con_incidencias').length;
  const costoTotal = embarques.reduce((s, e) => s + Number(e.costo_total), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Embarques</h1>
          <p className="mt-1 text-sm text-muted">Paquetes que traen los productos de los pedidos a El Salvador.</p>
        </div>
        <Link href="/embarques/nuevo">
          <Button>
            <Plus size={16} /> Nuevo embarque
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="En camino" value={loading ? '—' : enTransito} hint="por recibir" tone={enTransito > 0 ? 'warning' : 'default'} />
        <StatTile
          label="Con incidencias"
          value={loading ? '—' : conIncidencias}
          tone={conIncidencias > 0 ? 'negative' : 'default'}
        />
        <StatTile label="Costo de envíos" value={loading ? '—' : formatCurrency(costoTotal)} hint="todos los embarques" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(['', 'en_transito', 'recibido_parcial', 'con_incidencias', 'recibido'] as const).map((e) => (
          <button
            key={e || 'todos'}
            type="button"
            onClick={() => setEstado(e)}
            aria-pressed={estado === e}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              estado === e ? 'border-primary bg-primary text-white' : 'border-border bg-white text-muted hover:border-primary/30'
            }`}
          >
            {e ? ESTADO_EMBARQUE[e].label : 'Todos'}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-negative-surface bg-negative-surface/40 p-4 text-sm text-negative">
          {error}
        </div>
      )}

      {loading && embarques.length === 0 ? (
        <ul className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-[76px] rounded-xl" />
            </li>
          ))}
        </ul>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted-light">
            <Truck size={18} />
          </span>
          <p className="text-sm text-muted">{estado ? 'Ningún embarque en este estado.' : 'Todavía no hay embarques.'}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtrados.map((e) => {
            const est = ESTADO_EMBARQUE[e.estado];
            return (
              <li key={e.id}>
                <Link
                  href={`/embarques/${e.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-3 shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-px hover:border-primary/25 hover:shadow-[var(--shadow-card-hover)] sm:px-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-muted">
                    <Truck size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink tabular-nums">{codigoEmbarque(e.numero)}</span>
                      <Badge variant={est.badge}>{est.label}</Badge>
                      {e.reposiciones > 0 && (
                        <Badge variant="primary">
                          <Repeat size={10} /> {e.reposiciones} reposición{e.reposiciones > 1 ? 'es' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-light">
                      {e.paqueteria}
                      {e.guia && ` · guía ${e.guia}`} · {formatDia(e.fecha_envio)}
                    </p>
                    <p className="text-xs text-muted">
                      {e.total_pedidos} pedido{e.total_pedidos === 1 ? '' : 's'} · {e.unidades} u.
                      {e.estado !== 'en_transito' && ` · ${e.recibidas} recibidas`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-ink tabular-nums">{formatCurrency(Number(e.costo_total))}</p>
                    <p className="hidden text-[11px] text-muted-light sm:block">costo envío</p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-muted-light" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
