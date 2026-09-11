import { ArrowLeftRight, Banknote, CreditCard, LucideIcon } from 'lucide-react';
import { MetodoPago } from '@/lib/types';

const CFG: Record<MetodoPago, { label: string; icon: LucideIcon }> = {
  efectivo: { label: 'Efectivo', icon: Banknote },
  tarjeta: { label: 'Tarjeta', icon: CreditCard },
  transferencia: { label: 'Transferencia', icon: ArrowLeftRight },
};

export function MetodoPagoBadge({ metodo }: { metodo?: MetodoPago | null }) {
  const cfg = metodo ? CFG[metodo] : undefined;
  if (!cfg) return <span className="text-xs text-muted-light">—</span>;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-medium text-muted">
      <Icon size={11} strokeWidth={2.2} /> {cfg.label}
    </span>
  );
}
