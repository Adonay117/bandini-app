'use client';

import { FormEvent, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MovimientosList } from '@/components/productos/MovimientosList';
import { Producto } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';

export function AbastecerInventarioForm({
  producto,
  onAbastecido,
}: {
  producto: Producto;
  onAbastecido: (productoActualizado: Producto) => void;
}) {
  const [cantidad, setCantidad] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!(Number(cantidad) > 0)) return;

    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/productos/${producto.id}/movimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad: Number(cantidad),
          nota: nota.trim() || undefined,
          costo_unitario: costoUnitario.trim() ? Number(costoUnitario) : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al registrar la entrada');
      const { producto: productoActualizado } = await res.json();
      setCantidad('');
      setCostoUnitario('');
      setNota('');
      onAbastecido(productoActualizado);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la entrada');
    } finally {
      setEnviando(false);
    }
  }

  const costoCambia = costoUnitario.trim() !== '' && Number(costoUnitario) !== producto.precio_costo;

  return (
    <div className="flex max-w-lg flex-col gap-4 rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-card)]">
      <div>
        <h2 className="text-sm font-semibold text-ink">Abastecer inventario</h2>
        <p className="mt-1 text-sm text-muted">
          Stock actual <span className="font-medium text-ink tabular-nums">{producto.stock_actual}</span> · costo actual{' '}
          <span className="font-medium text-ink">{formatCurrency(producto.precio_costo)}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Cantidad a agregar"
            type="number"
            min="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
          <Input
            label="Costo unitario (si cambió)"
            type="number"
            min="0"
            step="0.01"
            placeholder={String(producto.precio_costo)}
            value={costoUnitario}
            onChange={(e) => setCostoUnitario(e.target.value)}
          />
        </div>
        <Input
          label="Nota (opcional)"
          placeholder="Ej. compra a proveedor"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
        {costoCambia && (
          <p className="text-xs text-warning">
            El costo del producto pasará de {formatCurrency(producto.precio_costo)} a{' '}
            {formatCurrency(Number(costoUnitario))}.
          </p>
        )}
        {error && <p className="text-sm text-negative">{error}</p>}
        <Button type="submit" disabled={!(Number(cantidad) > 0) || enviando} className="w-fit">
          <PackagePlus size={15} /> {enviando ? 'Registrando…' : 'Registrar entrada'}
        </Button>
      </form>

      <div className="border-t border-border pt-4">
        <p className="mb-1 text-sm font-semibold text-ink">Historial de movimientos</p>
        <MovimientosList productoId={producto.id} showTipoFilter reloadKey={reloadKey} />
      </div>
    </div>
  );
}
