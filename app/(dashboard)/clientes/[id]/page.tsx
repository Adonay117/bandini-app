'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Pencil, X, Gift } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { ClienteCard } from '@/components/cards/ClienteCard';
import { StickerCard } from '@/components/cards/StickerCard';
import { ClienteForm } from '@/components/forms/ClienteForm';
import { Cliente, PremioSticker, Venta } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

type ClienteDetalle = Cliente & { premios: PremioSticker[]; ultimas_ventas: Venta[] };

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ClienteDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(searchParams.get('editar') === '1');

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

  if (loading) return <Loading label="Cargando cliente…" />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{data.nombre}</h1>
        <Button variant="secondary" onClick={() => setEditando((v) => !v)}>
          {editando ? <X size={15} /> : <Pencil size={15} />}
          {editando ? 'Cancelar' : 'Editar'}
        </Button>
      </div>

      {editando ? (
        <div className="max-w-lg rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm">
          <ClienteForm
            cliente={data}
            onGuardado={() => {
              setEditando(false);
              cargar();
            }}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <ClienteCard cliente={data} />
          <StickerCard cliente={data} />
        </div>
      )}

      <div className="rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xs font-medium tracking-wide text-muted-light uppercase">Premios ganados</h3>
        {data.premios.length === 0 ? (
          <p className="text-sm text-muted-light">Aún no ha ganado premios.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-3 text-sm">
              {data.premios.map((p) => (
                <li key={p.id} className="flex items-center justify-between border-b border-secondary/60 pb-3 last:border-0 last:pb-0">
                  <span className="flex items-center gap-2 text-ink">
                    <Gift size={15} className="text-primary" />
                    {p.stickers_alcanzados} stickers — {formatCurrency(p.premio_monto)}
                  </span>
                  <span className="text-muted-light">
                    {p.estado_canje} · {formatDate(p.fecha_ganado)}
                  </span>
                </li>
              ))}
            </ul>
            {data.premios.some((p) => p.estado_canje === 'disponible') && (
              <p className="mt-3 text-xs text-muted-light">
                Los premios disponibles se canjean como descuento al abonar un pedido del cliente.
              </p>
            )}
          </>
        )}
      </div>

      <div className="rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xs font-medium tracking-wide text-muted-light uppercase">Últimas ventas</h3>
        {data.ultimas_ventas.length === 0 ? (
          <p className="text-sm text-muted-light">Sin ventas registradas.</p>
        ) : (
          <ul className="flex flex-col gap-3 text-sm">
            {data.ultimas_ventas.map((v) => (
              <li key={v.id} className="flex justify-between border-b border-secondary/60 pb-3 last:border-0 last:pb-0">
                <span className="font-medium text-ink">{formatCurrency(v.total)}</span>
                <span className="text-muted-light">{formatDate(v.fecha)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
