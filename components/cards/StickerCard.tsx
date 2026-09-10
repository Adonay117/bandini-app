import { Gift } from 'lucide-react';
import { Cliente } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';

export function StickerCard({ cliente }: { cliente: Cliente }) {
  const stickers = Array.from({ length: 10 }, (_, i) => i < cliente.stickers_actuales);

  return (
    <div className="rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xs font-medium tracking-wide text-muted-light uppercase">Tarjeta de stickers</h3>
      <div className="mb-4 grid grid-cols-10 gap-1.5">
        {stickers.map((ganado, i) => (
          <span
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              ganado ? 'bg-primary text-white' : 'bg-surface text-muted-light'
            } ${i === 4 || i === 9 ? 'ring-2 ring-offset-1 ring-amber-400' : ''}`}
          >
            {i === 4 || i === 9 ? <Gift size={13} /> : null}
          </span>
        ))}
      </div>
      <p className="text-sm text-muted">
        {cliente.stickers_actuales} / 10 stickers · {formatCurrency(cliente.monto_acumulado_tarjeta)} acumulados
      </p>
    </div>
  );
}
