'use client';

import { FormEvent, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Cliente } from '@/lib/types';
import { calcularStickers } from '@/lib/utils/formatters';

interface PremioHist {
  monto: 12 | 25;
  estado: 'canjeado' | 'disponible';
  fecha: string;
}

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function AjusteTarjetaForm({
  cliente,
  onGuardado,
  onCancelar,
}: {
  cliente: Cliente;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [monto, setMonto] = useState(String(cliente.monto_acumulado_tarjeta));
  const [tarjetas, setTarjetas] = useState(String(cliente.total_tarjetas_completadas));
  const [premiosGanados, setPremiosGanados] = useState(String(cliente.total_premios_ganados));
  const [gasto, setGasto] = useState('');
  const [premios, setPremios] = useState<PremioHist[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montoNum = Number(monto);
  const montoValido = monto.trim() !== '' && montoNum >= 0 && montoNum < 500;
  const stickers = montoValido ? calcularStickers(montoNum) : 0;

  function setPremio(i: number, cambios: Partial<PremioHist>) {
    setPremios((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...cambios } : p)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!montoValido || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}/ajuste-tarjeta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto_acumulado_tarjeta: montoNum,
          total_tarjetas_completadas: Number(tarjetas) || 0,
          total_premios_ganados: Number(premiosGanados) || 0,
          total_moneda_gastada: gasto.trim() ? Number(gasto) : undefined,
          premios: premios.length ? premios : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al ajustar la tarjeta');
      onGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ajustar la tarjeta');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-lg flex-col gap-4 rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-surface p-3 text-xs text-warning">
        <AlertTriangle size={14} className="mt-px shrink-0" />
        <p>
          Sobrescribe el progreso de la tarjeta <b>sin generar ingresos ni egresos</b>. Usalo para cargar el
          historial previo al sistema o corregir un error.
        </p>
      </div>

      <div>
        <Input
          label="Monto acumulado en la tarjeta actual"
          type="number"
          min="0"
          max="499.99"
          step="0.01"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          error={monto.trim() !== '' && !montoValido ? 'Debe estar entre 0 y 499.99' : undefined}
        />
        <p className="mt-1 text-xs text-muted-light">
          {montoValido
            ? `= ${stickers} sticker${stickers === 1 ? '' : 's'}`
            : 'Si ya completó otra tarjeta, ese monto va en "Tarjetas completadas".'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Tarjetas completadas"
          type="number"
          min="0"
          value={tarjetas}
          onChange={(e) => setTarjetas(e.target.value)}
        />
        <Input
          label="Premios ganados (total)"
          type="number"
          min="0"
          value={premiosGanados}
          onChange={(e) => setPremiosGanados(e.target.value)}
        />
      </div>

      <Input
        label="Total gastado histórico (opcional)"
        type="number"
        min="0"
        step="0.01"
        placeholder="se estima solo si lo dejás vacío"
        value={gasto}
        onChange={(e) => setGasto(e.target.value)}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted">Premios ya cobrados antes del sistema (opcional)</label>
          <button
            type="button"
            onClick={() => setPremios((p) => [...p, { monto: 12, estado: 'canjeado', fecha: hoyISO() }])}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus size={13} /> Agregar
          </button>
        </div>
        {premios.map((p, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select
              value={String(p.monto)}
              onChange={(e) => setPremio(i, { monto: Number(e.target.value) === 25 ? 25 : 12 })}
              className="min-h-10 rounded-lg border border-border bg-white px-2 text-sm text-ink outline-none focus:border-primary"
            >
              <option value="12">$12</option>
              <option value="25">$25</option>
            </select>
            <select
              value={p.estado}
              onChange={(e) => setPremio(i, { estado: e.target.value as PremioHist['estado'] })}
              className="min-h-10 rounded-lg border border-border bg-white px-2 text-sm text-ink outline-none focus:border-primary"
            >
              <option value="canjeado">Canjeado</option>
              <option value="disponible">Disponible</option>
            </select>
            <input
              type="date"
              value={p.fecha}
              onChange={(e) => setPremio(i, { fecha: e.target.value })}
              className="min-h-10 min-w-[7.5rem] flex-1 rounded-lg border border-border bg-white px-2 text-sm text-ink outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setPremios((prev) => prev.filter((_, idx) => idx !== i))}
              className="shrink-0 rounded-lg p-1.5 text-muted-light hover:bg-negative-surface hover:text-negative"
              aria-label="Quitar premio"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={!montoValido || enviando}>
          {enviando ? 'Guardando…' : 'Guardar ajuste'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
