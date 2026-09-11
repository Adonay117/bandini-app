'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ChevronLeft, Gift, MessageCircle, Pencil, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { ClienteAvatar } from '@/components/clientes/ClienteAvatar';
import { AjusteTarjetaForm } from '@/components/clientes/AjusteTarjetaForm';
import { SaldoFavorPanel } from '@/components/clientes/SaldoFavorPanel';
import { ClienteCard } from '@/components/cards/ClienteCard';
import { StickerCard } from '@/components/cards/StickerCard';
import { ClienteForm } from '@/components/forms/ClienteForm';
import { Cliente, PremioSticker, Venta } from '@/lib/types';
import { formatCurrency, formatDate, montoFaltanteParaSiguienteSticker, whatsappUrl } from '@/lib/utils/formatters';

type ClienteDetalle = Cliente & { premios: PremioSticker[]; ultimas_ventas: Venta[] };

const ESTADO_PREMIO: Record<PremioSticker['estado_canje'], { label: string; className: string }> = {
  disponible: { label: 'Disponible', className: 'bg-positive-surface text-positive' },
  canjeado: { label: 'Canjeado', className: 'bg-surface text-muted' },
  expirado: { label: 'Expirado', className: 'bg-negative-surface text-negative' },
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h3 className="mb-4 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ClienteDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(searchParams.get('editar') === '1');
  const [ajustando, setAjustando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clientes/${params.id}`);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Cliente no encontrado');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar cliente');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
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

  if (!data) return null;

  const ubicacion = [data.lugar, data.departamento].filter(Boolean).join(', ');
  const faltante = montoFaltanteParaSiguienteSticker(data.monto_acumulado_tarjeta);
  const premiosDisponibles = data.premios.some((p) => p.estado_canje === 'disponible');

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/clientes"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
      >
        <ChevronLeft size={15} /> Clientes
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <ClienteAvatar nombre={data.nombre} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">{data.nombre}</h1>
            <p className="mt-0.5 truncate text-sm text-muted">
              {data.telefono}
              {ubicacion && ` · ${ubicacion}`}
            </p>
            <p className="text-xs text-muted-light">Cliente desde {formatDate(data.fecha_registro)}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href={whatsappUrl(data.telefono)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-positive px-4 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-95"
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
          {!ajustando && (
            <Button variant="secondary" onClick={() => setEditando((v) => !v)}>
              {editando ? <X size={15} /> : <Pencil size={15} />}
              {editando ? 'Cancelar' : 'Editar'}
            </Button>
          )}
          {!editando && (
            <Button variant="ghost" onClick={() => setAjustando((v) => !v)}>
              {ajustando ? <X size={15} /> : <SlidersHorizontal size={15} />}
              {ajustando ? 'Cancelar' : 'Ajustar tarjeta'}
            </Button>
          )}
        </div>
      </div>

      {ajustando ? (
        <AjusteTarjetaForm
          cliente={data}
          onGuardado={() => {
            setAjustando(false);
            cargar();
          }}
          onCancelar={() => setAjustando(false)}
        />
      ) : editando ? (
        <div className="max-w-lg rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-card)]">
          <ClienteForm
            cliente={data}
            onGuardado={() => {
              setEditando(false);
              cargar();
            }}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatTile label="Total gastado" value={formatCurrency(data.total_moneda_gastada)} />
            <StatTile
              label="Stickers"
              value={`${data.stickers_actuales}/10`}
              hint={faltante > 0 ? `faltan ${formatCurrency(faltante)}` : 'listo para el siguiente'}
              tone={data.stickers_actuales === 4 || data.stickers_actuales === 9 ? 'warning' : 'default'}
            />
            <StatTile label="Tarjetas completadas" value={data.total_tarjetas_completadas} />
            <StatTile label="Premios ganados" value={data.total_premios_ganados} />
            <StatTile label="Saldo a favor" value={formatCurrency(data.saldo_favor)} />
          </div>

          <div className="grid items-start gap-4 md:grid-cols-2">
            <StickerCard cliente={data} />
            <ClienteCard cliente={data} />
          </div>

          <SaldoFavorPanel clienteId={data.id} saldoFavor={data.saldo_favor} onCambio={cargar} />

          <Panel title="Premios ganados">
            {data.premios.length === 0 ? (
              <p className="text-sm text-muted-light">Aún no ha ganado premios.</p>
            ) : (
              <>
                <ul className="flex flex-col gap-3 text-sm">
                  {data.premios.map((p) => {
                    const estado = ESTADO_PREMIO[p.estado_canje];
                    return (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                      >
                        <span className="flex items-center gap-2 text-ink">
                          <Gift size={15} className="shrink-0 text-primary" />
                          {p.stickers_alcanzados} stickers — {formatCurrency(p.premio_monto)}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${estado.className}`}>
                            {estado.label}
                          </span>
                          <span className="text-xs text-muted-light">{formatDate(p.fecha_ganado)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {premiosDisponibles && (
                  <p className="mt-3 text-xs text-muted-light">
                    Los premios disponibles se canjean como descuento al abonar un pedido del cliente.
                  </p>
                )}
              </>
            )}
          </Panel>

          <Panel title="Últimas ventas">
            {data.ultimas_ventas.length === 0 ? (
              <p className="text-sm text-muted-light">Sin ventas registradas.</p>
            ) : (
              <ul className="flex flex-col gap-3 text-sm">
                {data.ultimas_ventas.map((v) => (
                  <li
                    key={v.id}
                    className="flex justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <span className="font-medium text-ink tabular-nums">{formatCurrency(v.total)}</span>
                    <span className="text-xs text-muted-light">{formatDate(v.fecha)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
