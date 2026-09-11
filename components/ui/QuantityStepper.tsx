'use client';

import { Minus, Plus } from 'lucide-react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function QuantityStepper({ value, onChange, min = 0, max }: Props) {
  const clamp = (n: number) => Math.max(min, max != null ? Math.min(max, n) : n);

  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-white">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label="Restar uno"
        className="flex h-10 w-9 items-center justify-center text-muted transition-colors hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(clamp(n));
        }}
        className="h-10 w-11 border-x border-border bg-transparent text-center text-sm font-medium tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={max != null && value >= max}
        aria-label="Sumar uno"
        className="flex h-10 w-9 items-center justify-center text-muted transition-colors hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
