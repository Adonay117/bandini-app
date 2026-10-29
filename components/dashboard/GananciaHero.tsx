import Link from 'next/link';
import { AlertTriangle, Package, Percent, Store, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';

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

interface GananciaHeroProps {
  mesLabel: string;
  ganancia: number;
  gananciaPrev?: number;
  gananciaPedidos: number;
  gananciaTienda: number;
  vendido: number;
  productosSinCosto: number;
}

// Ganancia neta del mes: lo vendido menos lo pagado en la plataforma (o el
// costo de inventario, en la tienda) y el envío. Lo que el cliente paga por
// el producto se va a la plataforma, así que el héroe nunca muestra montos
// brutos — solo lo que le queda al negocio.
export function GananciaHero({
  mesLabel,
  ganancia,
  gananciaPrev,
  gananciaPedidos,
  gananciaTienda,
  vendido,
  productosSinCosto,
}: GananciaHeroProps) {
  const delta = gananciaPrev ? (ganancia - gananciaPrev) / Math.abs(gananciaPrev) : null;
  const margen = vendido > 0 ? Math.round((ganancia / vendido) * 100) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#2d2645] p-5 text-white shadow-[var(--shadow-card)] sm:p-6">
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-white/55 uppercase">Ganancia neta de {mesLabel}</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-[40px] sm:leading-none">
              {formatCurrency(ganancia)}
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
            {ganancia < 0
              ? 'Este mes los costos superan lo vendido.'
              : 'Lo que te queda después de pagar el producto y el envío.'}
          </p>
          {productosSinCosto > 0 && (
            <Link
              href="/pedidos"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-[#ffe2a8] hover:bg-white/15"
            >
              <AlertTriangle size={12} strokeWidth={2.5} />
              {productosSinCosto} producto{productosSinCosto === 1 ? '' : 's'} sin precio de compra: la ganancia sale más alta
            </Link>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
          <HeroStat icon={Package} label="Pedidos" value={formatCurrency(gananciaPedidos)} />
          <HeroStat icon={Store} label="Tienda" value={formatCurrency(gananciaTienda)} />
          <HeroStat icon={Percent} label="Margen" value={margen == null ? '—' : `${margen}%`} />
        </div>
      </div>
    </div>
  );
}
