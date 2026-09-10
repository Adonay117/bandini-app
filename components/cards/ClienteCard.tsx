import { Cliente } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

export function ClienteCard({ cliente }: { cliente: Cliente }) {
  return (
    <div className="rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xs font-medium tracking-wide text-muted-light uppercase">Información</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <dt className="text-muted-light">Teléfono</dt>
        <dd className="text-ink">{cliente.telefono}</dd>
        <dt className="text-muted-light">Email</dt>
        <dd className="text-ink">{cliente.email ?? '—'}</dd>
        <dt className="text-muted-light">Ubicación</dt>
        <dd className="text-ink">
          {[cliente.lugar, cliente.departamento].filter(Boolean).join(', ') || '—'}
        </dd>
        <dt className="text-muted-light">Registrado</dt>
        <dd className="text-ink">{formatDate(cliente.fecha_registro)}</dd>
        <dt className="text-muted-light">Total gastado</dt>
        <dd className="text-ink">{formatCurrency(cliente.total_moneda_gastada)}</dd>
        <dt className="text-muted-light">Tarjetas completadas</dt>
        <dd className="text-ink">{cliente.total_tarjetas_completadas}</dd>
        <dt className="text-muted-light">Premios ganados</dt>
        <dd className="text-ink">{cliente.total_premios_ganados}</dd>
      </dl>
    </div>
  );
}
