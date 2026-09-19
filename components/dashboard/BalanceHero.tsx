import { ShoppingCart, TrendingDown, TrendingUp } from 'lucide-react';
import { DiaDashboard } from '@/lib/hooks/useDashboard';
import { formatCurrency } from '@/lib/utils/formatters';

const SPARK_W = 300;
const SPARK_H = 64;
const SPARK_PAD = 6;

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10">
        <Icon size={12} strokeWidth={2.5} className="text-white/70" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wide text-white/55 uppercase">{label}</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-white sm:text-base">{value}</p>
      </div>
    </div>
  );
}

/** Curva suavizada (cuadrática por segmentos) para que el trazo no se vea quebrado. */
function trazoSuave(puntos: [number, number][]): string {
  if (puntos.length < 2) return '';
  let d = `M ${puntos[0][0]} ${puntos[0][1]}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const [x0, y0] = puntos[i];
    const [x1, y1] = puntos[i + 1];
    d += ` Q ${x0} ${y0} ${(x0 + x1) / 2} ${(y0 + y1) / 2}`;
  }
  const [xu, yu] = puntos[puntos.length - 1];
  d += ` L ${xu} ${yu}`;
  return d;
}

interface BalanceHeroProps {
  mesLabel: string;
  balance: number;
  balancePrev?: number;
  ingresos: number;
  egresos: number;
  ventas: number;
  dias?: DiaDashboard[];
}

export function BalanceHero({ mesLabel, balance, balancePrev, ingresos, egresos, ventas, dias = [] }: BalanceHeroProps) {
  const positivo = balance >= 0;
  const delta = balancePrev ? (balance - balancePrev) / Math.abs(balancePrev) : null;

  // Curva de balance acumulado día a día del mes — el mismo número grande es
  // el último punto de la curva, para que la cifra se sienta parte de una
  // tendencia y no un dato suelto.
  let acumulado = 0;
  const serie = dias.map((d) => (acumulado += d.ingresos - d.egresos));
  const min = Math.min(0, ...serie);
  const max = Math.max(0, ...serie);
  const rango = max - min || 1;
  const puntos: [number, number][] = serie.map((v, i) => [
    serie.length > 1 ? (i / (serie.length - 1)) * SPARK_W : SPARK_W / 2,
    SPARK_H - SPARK_PAD - ((v - min) / rango) * (SPARK_H - SPARK_PAD * 2),
  ]);
  const trazo = trazoSuave(puntos);
  const area = puntos.length > 1 ? `${trazo} L ${SPARK_W} ${SPARK_H} L 0 ${SPARK_H} Z` : '';
  const ultimo = puntos[puntos.length - 1];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#2d2645] p-5 text-white shadow-[var(--shadow-card)] sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-white/[0.05]"
      />

      {puntos.length > 1 && (
        <svg
          aria-hidden
          viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full sm:h-[70px]"
        >
          <defs>
            <linearGradient id="balanceHeroFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#balanceHeroFill)" />
          <path d={trazo} fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          {ultimo && (
            <circle cx={ultimo[0]} cy={ultimo[1]} r="3.5" fill={positivo ? '#7ee6b0' : '#ffb0a8'} stroke="#2d2645" strokeWidth="1.5" />
          )}
        </svg>
      )}

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-white/55 uppercase">Balance de {mesLabel}</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-[40px] sm:leading-none">
              {formatCurrency(balance)}
            </p>
            {delta != null && Math.round(delta * 100) !== 0 && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold tabular-nums ${
                  delta > 0 ? 'text-[#9cf0c4]' : 'text-[#ffc4bd]'
                }`}
              >
                {delta > 0 ? <TrendingUp size={11} strokeWidth={2.5} /> : <TrendingDown size={11} strokeWidth={2.5} />}
                {delta > 0 ? '+' : '−'}
                {Math.abs(Math.round(delta * 100))}%
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-white/65">
            {balance === 0
              ? 'Sin movimiento neto este mes.'
              : positivo
                ? 'Ganancia neta después de egresos.'
                : 'Los egresos superan a los ingresos.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
          <HeroStat icon={TrendingUp} label="Ingresos" value={formatCurrency(ingresos)} />
          <HeroStat icon={TrendingDown} label="Egresos" value={formatCurrency(egresos)} />
          <HeroStat icon={ShoppingCart} label="Ventas" value={formatCurrency(ventas)} />
        </div>
      </div>
    </div>
  );
}
