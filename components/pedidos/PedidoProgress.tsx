import { formatCurrency } from '@/lib/utils/formatters';

interface Props {
  total: number;
  abonado: number;
  saldo: number;
  className?: string;
}

export function PedidoProgress({ total, abonado, saldo, className = '' }: Props) {
  const pct = total > 0 ? Math.min(Math.max((abonado / total) * 100, 0), 100) : 0;
  const saldado = saldo <= 0 && total > 0;

  return (
    <div className={className}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full ${saldado ? 'bg-positive' : 'bg-primary'}`}
          style={{ width: `${total > 0 ? Math.max(pct, 4) : 0}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-light tabular-nums">
        <span>{formatCurrency(abonado)} abonado</span>
        <span className={saldado ? 'font-medium text-positive' : 'font-medium text-ink'}>
          {saldado ? 'saldado' : `${formatCurrency(saldo)} pendiente`}
        </span>
      </div>
    </div>
  );
}
