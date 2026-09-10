'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Scale, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Loading } from '@/components/ui/Loading';
import { Pagination } from '@/components/ui/Pagination';
import { KPICard } from '@/components/cards/KPICard';
import { TransaccionesTable } from '@/components/tables/TransaccionesTable';
import { usePaginatedList } from '@/lib/hooks/usePaginatedList';
import { Transaccion, TipoTransaccion } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';

export default function TransaccionesPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');

  const params = useMemo(
    () => ({
      ...(desde && { desde }),
      ...(hasta && { hasta }),
      ...(tipoFiltro && { tipo: tipoFiltro }),
    }),
    [desde, hasta, tipoFiltro]
  );

  const {
    items: transacciones,
    total,
    totalPages,
    page,
    setPage,
    loading,
    error,
    extra,
    refetch,
  } = usePaginatedList<Transaccion, { totales?: { ingresos: number; egresos: number } }>('/api/transacciones', params);

  const [tipoNuevo, setTipoNuevo] = useState<TipoTransaccion>('egreso');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const totalIngresos = extra.totales?.ingresos ?? 0;
  const totalEgresos = extra.totales?.egresos ?? 0;
  const balance = totalIngresos - totalEgresos;
  const hayFiltros = desde || hasta || tipoFiltro;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!(Number(monto) > 0)) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/transacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: tipoNuevo, monto: Number(monto), categoria: categoria.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al registrar transacción');
      setMonto('');
      setCategoria('');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al registrar transacción');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Ingresos y Egresos</h1>
        <p className="mt-1 text-sm text-muted">
          Ventas y abonos se registran solos; agrega aquí gastos u otros ingresos manuales.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard label={hayFiltros ? 'Ingresos (filtrado)' : 'Ingresos'} value={formatCurrency(totalIngresos)} icon={TrendingUp} />
        <KPICard label={hayFiltros ? 'Egresos (filtrado)' : 'Egresos'} value={formatCurrency(totalEgresos)} icon={TrendingDown} />
        <KPICard label={hayFiltros ? 'Balance (filtrado)' : 'Balance'} value={formatCurrency(balance)} icon={Scale} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-3 rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm sm:grid-cols-4"
      >
        <Select value={tipoNuevo} onChange={(e) => setTipoNuevo(e.target.value as TipoTransaccion)}>
          <option value="egreso">Egreso</option>
          <option value="ingreso">Ingreso</option>
        </Select>
        <Input placeholder="Monto" type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
        <Input placeholder="Categoría (opcional)" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={submitting}>
          <Plus size={15} /> Registrar
        </Button>
        {formError && <p className="col-span-full text-sm text-red-600">{formError}</p>}
      </form>

      <div className="rounded-2xl border border-secondary/70 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-light uppercase">
          <Filter size={14} /> Filtros — dar seguimiento por período
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Input label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <Select label="Tipo" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
            <option value="">Todos</option>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </Select>
        </div>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              setDesde('');
              setHasta('');
              setTipoFiltro('');
            }}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            Quitar filtros
          </button>
        )}
      </div>

      {loading && transacciones.length === 0 && <Loading label="Cargando transacciones…" />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && (transacciones.length > 0 || !loading) && (
        <>
          <TransaccionesTable transacciones={transacciones} />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
