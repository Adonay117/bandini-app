'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MetodoPagoAbono, MovimientoSaldoFavor } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

const MOTIVO_LABEL: Record<MovimientoSaldoFavor['motivo'], string> = {
  recarga: 'Recarga',
  excedente: 'Excedente de abono',
  aplicado_pedido: 'Aplicado a pedido',
  ajuste: 'Ajuste',
};

// Saldo a favor: plata que el cliente adelanta antes de tener un pedido
// concreto (o el excedente de un abono/premio que superó el saldo de un
// pedido). Se recarga acá y luego se aplica desde el detalle de cualquier
// pedido del cliente ("Usar saldo a favor").
export function SaldoFavorPanel({
  clienteId,
  saldoFavor,
  onCambio,
}: {
  clienteId: string;
  saldoFavor: number;
  onCambio: () => void;
}) {
  const [movimientos, setMovimientos] = useState<MovimientoSaldoFavor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoAbono>('efectivo');
  const [nota, setNota] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/saldo-favor`);
      if (!res.ok) return;
      const json = await res.json();
      setMovimientos(json.movimientos ?? []);
    } finally {
      setCargando(false);
    }
  }, [clienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function registrar(e: FormEvent) {
    e.preventDefault();
    if (!(Number(monto) > 0)) return;

    setRegistrando(true);
    setError(null);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/saldo-favor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: Number(monto), metodo_pago: metodoPago, nota: nota.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al registrar la recarga');
      setMonto('');
      setNota('');
      await cargar();
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la recarga');
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Wallet size={15} className="text-primary" /> Saldo a favor
        </h3>
        <span className="text-lg font-semibold tabular-nums text-ink">{formatCurrency(saldoFavor)}</span>
      </div>

      <form onSubmit={registrar} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          label="Registrar recarga"
          type="number"
          min="0"
          step="0.01"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="sm:w-32"
        />
        <Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as MetodoPagoAbono)} className="sm:w-36">
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
        </Select>
        <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} className="sm:flex-1" />
        <Button type="submit" disabled={registrando || !(Number(monto) > 0)}>
          {registrando ? 'Registrando…' : 'Recargar'}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-negative">{error}</p>}
      <p className="mt-2 text-xs text-muted-light">
        Cada recarga acumula stickers y cuenta como ingreso al registrarse. Después se aplica desde cualquier pedido del cliente.
      </p>

      {!cargando && movimientos.length > 0 && (
        <ul className="mt-4 flex flex-col border-t border-border pt-3 text-sm">
          {movimientos.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
              <span className={`font-medium tabular-nums ${m.monto >= 0 ? 'text-positive' : 'text-negative'}`}>
                {m.monto >= 0 ? '+' : ''}
                {formatCurrency(m.monto)}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-light">
                {MOTIVO_LABEL[m.motivo]}
                {m.pedido_numero && (
                  <Link href={`/pedidos/${m.pedido_id}`} className="text-primary hover:underline">
                    Pedido #{m.pedido_numero}
                  </Link>
                )}
                <span>{formatDate(m.fecha)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
