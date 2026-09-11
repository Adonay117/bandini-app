import { MotivoMerma, MovimientoInventario } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

const MOTIVO_LABEL: Record<MotivoMerma, string> = {
  danado: 'Dañado',
  vencido: 'Vencido',
  roto: 'Roto',
  otro: 'Otro',
};

function descripcion(m: MovimientoInventario): string {
  if (m.motivo) return MOTIVO_LABEL[m.motivo];
  if (m.venta_id) return 'Venta';
  if (m.costo_unitario != null) return `${formatCurrency(m.costo_unitario)} c/u`;
  return m.tipo === 'entrada' ? 'Entrada' : 'Salida';
}

export function MovimientoRow({ m }: { m: MovimientoInventario }) {
  const esEntrada = m.tipo === 'entrada';
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-sm last:border-0">
      <span className="flex min-w-0 items-center gap-2">
        <span className={`shrink-0 font-semibold tabular-nums ${esEntrada ? 'text-positive' : 'text-negative'}`}>
          {esEntrada ? '+' : '−'}
          {m.cantidad}
        </span>
        <span className="truncate text-xs text-muted-light">
          {descripcion(m)}
          {m.nota && ` · ${m.nota}`}
        </span>
      </span>
      <span className="shrink-0 text-xs text-muted-light">{formatDate(m.fecha)}</span>
    </li>
  );
}
