'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { ClienteAvatar } from '@/components/clientes/ClienteAvatar';
import { StickerProgress } from '@/components/clientes/StickerProgress';
import { useClientes } from '@/lib/hooks/useClientes';
import { usePedidos } from '@/lib/hooks/usePedidos';
import { Cliente, Plataforma } from '@/lib/types';
import { PLATAFORMAS } from '@/lib/utils/logistica';
import { PlataformaBadge } from '@/components/ui/PlataformaBadge';
import { notificar } from '@/lib/notificar';

export function PedidoForm() {
  const router = useRouter();
  const { clientes, loading: loadingClientes } = useClientes();
  const { crearPedido } = usePedidos();

  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [plataforma, setPlataforma] = useState<Plataforma | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientesFiltrados = useMemo(() => {
    if (!clienteQuery || clienteSeleccionado) return [];
    const q = clienteQuery.toLowerCase();
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q) || c.telefono.includes(q)).slice(0, 6);
  }, [clienteQuery, clienteSeleccionado, clientes]);

  const valido = clienteSeleccionado !== null && plataforma !== null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido || !clienteSeleccionado || !plataforma) return;

    setSubmitting(true);
    setError(null);
    try {
      const pedido = await notificar(crearPedido({ cliente_id: clienteSeleccionado.id, plataforma }), {
        cargando: 'Creando pedido…',
        exito: `Pedido creado para ${clienteSeleccionado.nombre}`,
        error: 'No se pudo crear el pedido',
      });
      router.push(`/pedidos/${pedido.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear pedido');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-lg flex-col gap-4 rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-card)]"
    >
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Cliente</label>
        {clienteSeleccionado ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3">
            <ClienteAvatar nombre={clienteSeleccionado.nombre} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{clienteSeleccionado.nombre}</p>
              <p className="truncate text-xs text-muted-light">{clienteSeleccionado.telefono}</p>
              <div className="mt-1">
                <StickerProgress actuales={clienteSeleccionado.stickers_actuales} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setClienteSeleccionado(null);
                setClienteQuery('');
              }}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-secondary/50"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="relative">
            <SearchInput
              value={clienteQuery}
              onChange={setClienteQuery}
              placeholder="Buscar por nombre o teléfono…"
            />
            {clientesFiltrados.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-pop)]">
                {clientesFiltrados.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface"
                      onClick={() => {
                        setClienteSeleccionado(c);
                        setClienteQuery('');
                      }}
                    >
                      <ClienteAvatar nombre={c.nombre} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{c.nombre}</span>
                        <span className="block truncate text-xs text-muted-light">{c.telefono}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {loadingClientes && <p className="mt-1.5 text-xs text-muted-light">Cargando clientes…</p>}
          </div>
        )}
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-xs font-medium text-muted">Plataforma</legend>
        <div className="grid grid-cols-3 gap-2">
          {PLATAFORMAS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlataforma(p)}
              aria-pressed={plataforma === p}
              className={`flex min-h-11 items-center justify-center rounded-xl border px-2 py-2 transition-colors ${
                plataforma === p
                  ? 'border-primary bg-secondary/40 ring-2 ring-primary/20'
                  : 'border-border bg-white hover:border-primary/30'
              }`}
            >
              <PlataformaBadge plataforma={p} />
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted-light">Cada pedido es de una sola plataforma.</p>
      </fieldset>

      <p className="text-xs text-muted-light">
        El pedido se crea vacío. Agregá los productos, sus precios y los abonos desde el detalle.
      </p>

      {error && (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!valido || submitting}>
        {submitting ? 'Creando…' : 'Crear pedido'}
      </Button>
    </form>
  );
}
