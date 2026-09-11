import { formatCurrency } from '@/lib/utils/formatters';

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-white/55 uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-white sm:text-base">{value}</p>
    </div>
  );
}

interface BalanceHeroProps {
  mesLabel: string;
  balance: number;
  ingresos: number;
  egresos: number;
  ventas: number;
}

export function BalanceHero({ mesLabel, balance, ingresos, egresos, ventas }: BalanceHeroProps) {
  const positivo = balance >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary p-5 text-white shadow-[var(--shadow-card)] sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 h-52 w-52 rounded-full bg-white/[0.06]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-28 -bottom-24 h-44 w-44 rounded-full bg-white/[0.035]"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-white/55 uppercase">Balance de {mesLabel}</p>
          <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums sm:text-[40px] sm:leading-none">
            {formatCurrency(balance)}
          </p>
          <p className="mt-2 text-sm text-white/65">
            {balance === 0
              ? 'Sin movimiento neto este mes.'
              : positivo
                ? 'Ganancia neta después de egresos.'
                : 'Los egresos superan a los ingresos.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
          <HeroStat label="Ingresos" value={formatCurrency(ingresos)} />
          <HeroStat label="Egresos" value={formatCurrency(egresos)} />
          <HeroStat label="Ventas" value={formatCurrency(ventas)} />
        </div>
      </div>
    </div>
  );
}
