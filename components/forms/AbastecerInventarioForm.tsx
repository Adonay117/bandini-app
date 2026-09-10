'use client';

import { FormEvent, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { usePaginatedList } from '@/lib/hooks/usePaginatedList';
import { MovimientoInventario, Producto } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

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

  const [tipoFiltro, setTipoFiltro] = useState('');
  const {
    items: movimientos,
    total,
    totalPages,
    page,
    setPage,
    loading: loadingMovimientos,
    refetch: recargarMovimientos,
  } = usePaginatedList<MovimientoInventario>(
    `/api/productos/${producto.id}/movimientos`,
    tipoFiltro ? { tipo: tipoFiltro } : {},
    10
  );

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
      recargarMovimientos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la entrada');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-4 rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xs font-medium tracking-wide text-muted-light uppercase">Abastecer inventario</h2>
        <p className="mt-1 text-sm text-muted">
          Stock actual: {producto.stock_actual} · Costo actual: {formatCurrency(producto.precio_costo)}
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
        {costoUnitario.trim() !== '' && Number(costoUnitario) !== producto.precio_costo && (
          <p className="text-xs text-amber-600">
            El costo del producto se actualizará de {formatCurrency(producto.precio_costo)} a{' '}
            {formatCurrency(Number(costoUnitario))}.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={!(Number(cantidad) > 0) || enviando} className="w-fit">
          <PackagePlus size={15} /> {enviando ? 'Registrando…' : 'Registrar entrada'}
        </Button>
      </form>

      <div className="border-t border-secondary/60 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-light uppercase">Historial de movimientos</p>
          <Select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="w-auto">
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
          </Select>
        </div>
        {loadingMovimientos && movimientos.length === 0 ? (
          <p className="text-sm text-muted-light">Cargando…</p>
        ) : movimientos.length === 0 ? (
          <p className="text-sm text-muted-light">Sin movimientos registrados.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2 text-sm">
              {movimientos.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between border-b border-secondary/60 pb-2 last:border-0 last:pb-0"
                >
                  <span className={`font-medium ${m.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.tipo === 'entrada' ? '+' : '-'}
                    {m.cantidad}
                    {m.costo_unitario != null && (
                      <span className="ml-1.5 font-normal text-muted-light">· {formatCurrency(m.costo_unitario)} c/u</span>
                    )}
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
