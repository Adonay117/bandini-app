'use client';

import { FormEvent, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { usePaginatedList } from '@/lib/hooks/usePaginatedList';
import { MotivoMerma, MovimientoInventario, Producto } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

const MOTIVO_LABEL: Record<MotivoMerma, string> = {
  danado: 'Dañado',
  vencido: 'Vencido',
  roto: 'Roto',
  otro: 'Otro',
};

export function ReportarMermaForm({
  producto,
  onReportada,
}: {
  producto: Producto;
  onReportada: (productoActualizado: Producto) => void;
}) {
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState<MotivoMerma>('danado');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    items: movimientos,
    total,
    totalPages,
    page,
    setPage,
    loading: loadingMovimientos,
    refetch: recargarMovimientos,
  } = usePaginatedList<MovimientoInventario>(`/api/productos/${producto.id}/movimientos`, { motivo: 'merma' }, 10);

  const cantidadValida = Number(cantidad) > 0 && Number(cantidad) <= producto.stock_actual;
  const valorPerdido = Number(cantidad) > 0 ? Number(cantidad) * producto.precio_costo : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cantidadValida) return;

    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/productos/${producto.id}/movimientos/merma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: Number(cantidad), motivo, nota: nota.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al reportar la merma');
      const { producto: productoActualizado } = await res.json();
      setCantidad('');
      setNota('');
      onReportada(productoActualizado);
      recargarMovimientos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reportar la merma');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-4 rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xs font-medium tracking-wide text-muted-light uppercase">Reportar producto dañado</h2>
        <p className="mt-1 text-sm text-muted">Stock actual: {producto.stock_actual}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Cantidad dañada"
            type="number"
            min="1"
            max={producto.stock_actual}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
          <Select label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoMerma)}>
            {(Object.keys(MOTIVO_LABEL) as MotivoMerma[]).map((m) => (
              <option key={m} value={m}>
                {MOTIVO_LABEL[m]}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Nota (opcional)"
          placeholder="Ej. se rompió en bodega"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
        {Number(cantidad) > producto.stock_actual && (
          <p className="text-xs text-red-600">No puede ser mayor al stock actual ({producto.stock_actual}).</p>
        )}
        {valorPerdido > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle size={13} /> Se registrará un egreso de {formatCurrency(valorPerdido)} por el costo perdido.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" variant="secondary" disabled={!cantidadValida || enviando} className="w-fit">
          <AlertTriangle size={15} /> {enviando ? 'Reportando…' : 'Reportar merma'}
        </Button>
      </form>

      <div className="border-t border-secondary/60 pt-4">
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-light uppercase">Historial de mermas</p>
        {loadingMovimientos && movimientos.length === 0 ? (
          <p className="text-sm text-muted-light">Cargando…</p>
        ) : movimientos.length === 0 ? (
          <p className="text-sm text-muted-light">Sin mermas registradas.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2 text-sm">
              {movimientos.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between border-b border-secondary/60 pb-2 last:border-0 last:pb-0"
                >
                  <span className="font-medium text-red-600">
                    -{m.cantidad}
                    {m.motivo && <span className="ml-1.5 font-normal text-muted-light">· {MOTIVO_LABEL[m.motivo]}</span>}
                    {m.nota && <span className="ml-1.5 font-normal text-muted-light">· {m.nota}</span>}
                  </span>
                  <span className="text-xs text-muted-light">{formatDate(m.fecha)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
