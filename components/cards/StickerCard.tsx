import { Gift } from 'lucide-react';
import { Cliente } from '@/lib/types';
import { formatCurrency, montoFaltanteParaSiguienteSticker } from '@/lib/utils/formatters';

export function StickerCard({ cliente }: { cliente: Cliente }) {
  const stickers = Array.from({ length: 10 }, (_, i) => i < cliente.stickers_actuales);
  const faltante = montoFaltanteParaSiguienteSticker(cliente.monto_acumulado_tarjeta);

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h3 className="mb-4 text-sm font-semibold text-ink">Tarjeta de stickers</h3>

      <div className="mb-4 grid grid-cols-10 gap-1.5">
        {stickers.map((ganado, i) => {
          const esPremio = i === 4 || i === 9;
          return (
            <span
              key={i}
              className={`flex aspect-square items-center justify-center rounded-full text-[11px] font-semibold ${
                ganado ? 'bg-primary text-white' : 'bg-surface text-muted-light'
              } ${esPremio ? 'ring-2 ring-warning/70 ring-offset-1' : ''}`}
              title={esPremio ? `Sticker ${i + 1} — premio` : `Sticker ${i + 1}`}
            >
              {esPremio ? <Gift size={12} /> : i + 1}
            </span>
          );
        })}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min((cliente.stickers_actuales / 10) * 100, 100)}%` }}
        />
      </div>

      <p className="mt-2.5 text-sm text-muted">
        <span className="font-semibold text-ink tabular-nums">{cliente.stickers_actuales}/10</span> stickers ·{' '}
        {formatCurrency(cliente.monto_acumulado_tarjeta)} acumulados
      </p>
      <p className="mt-0.5 text-xs text-muted-light">
        {faltante > 0
          ? `Faltan ${formatCurrency(faltante)} de compra para el próximo sticker.`
          : 'El próximo sticker se suma con la siguiente compra.'}
      </p>
    </div>
  );
}
