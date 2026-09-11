import { Cliente } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <dt className="shrink-0 text-xs text-muted-light">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm text-ink">{children}</dd>
    </div>
  );
}

export function ClienteCard({ cliente }: { cliente: Cliente }) {
  const ubicacion = [cliente.lugar, cliente.departamento].filter(Boolean).join(', ');
  const telDigits = cliente.telefono.replace(/\D/g, '');

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h3 className="mb-2 text-sm font-semibold text-ink">Contacto</h3>
      <dl>
        <Fila label="Teléfono">
          <a href={`tel:${telDigits}`} className="text-primary hover:underline">
            {cliente.telefono}
          </a>
        </Fila>
        <Fila label="Email">
          {cliente.email ? (
            <a href={`mailto:${cliente.email}`} className="text-primary hover:underline">
              {cliente.email}
            </a>
          ) : (
            '—'
          )}
        </Fila>
        <Fila label="Cumpleaños">{cliente.fecha_nacimiento ? formatDate(cliente.fecha_nacimiento) : '—'}</Fila>
        <Fila label="Ubicación">{ubicacion || '—'}</Fila>
        <Fila label="Registrado">{formatDate(cliente.fecha_registro)}</Fila>
        <Fila label="Saldo a favor">{formatCurrency(cliente.saldo_favor)}</Fila>
        <Fila label="Notificaciones">{cliente.acepta_notificaciones ? 'Activadas' : 'Desactivadas'}</Fila>
      </dl>
    </div>
  );
}
