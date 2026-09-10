'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useClientes } from '@/lib/hooks/useClientes';
import { usePedidos } from '@/lib/hooks/usePedidos';
import { Cliente } from '@/lib/types';

export function PedidoForm() {
  const router = useRouter();
  const { clientes, loading: loadingClientes } = useClientes();
  const { crearPedido } = usePedidos();

  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientesFiltrados = useMemo(() => {
    if (!clienteQuery || clienteSeleccionado) return [];
    const q = clienteQuery.toLowerCase();
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q) || c.telefono.includes(q)).slice(0, 6);
  }, [clienteQuery, clienteSeleccionado, clientes]);

  const valido = clienteSeleccionado !== null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido || !clienteSeleccionado) return;

    setSubmitting(true);
    setError(null);
    try {
      const pedido = await crearPedido({ cliente_id: clienteSeleccionado.id });
      router.push(`/pedidos/${pedido.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear pedido');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4 rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm">
      <div className="relative">
        <Input
          label="Cliente"
          placeholder="Buscar por nombre o teléfono…"
          value={clienteQuery}
          onChange={(e) => {
            setClienteQuery(e.target.value);
            setClienteSeleccionado(null);
          }}
          required
        />
        {clienteSeleccionado && (
          <span className="absolute right-3 top-8 flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Check size={13} /> seleccionado
          </span>
        )}
        {clientesFiltrados.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-secondary bg-white shadow-lg">
            {clientesFiltrados.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="block w-full px-3.5 py-2.5 text-left text-sm hover:bg-surface"
                  onClick={() => {
                    setClienteSeleccionado(c);
                    setClienteQuery(c.nombre);
                  }}
                >
                  <span className="text-ink">{c.nombre}</span> <span className="text-muted-light">— {c.telefono}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {loadingClientes && <p className="mt-1 text-xs text-muted-light">Cargando clientes…</p>}
      </div>

      <p className="text-xs text-muted-light">
        El pedido se crea vacío — agrega los artículos (con su precio y costo de envío) desde el detalle.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={!valido || submitting}>
        {submitting ? 'Creando…' : 'Crear pedido'}
      </Button>
    </form>
  );
}
