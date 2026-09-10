'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMesLargo, mesActual } from '@/lib/utils/charts';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function parseMes(mes: string): { anio: number; mesNum: number } {
  const [anio, mesNum] = mes.split('-').map(Number);
  return { anio, mesNum };
}

export function MonthYearFilter({ value, onChange }: { value: string; onChange: (mes: string) => void }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseMes(value).anio);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setViewYear(parseMes(value).anio);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const { anio: selectedYear, mesNum: selectedMonth } = parseMes(value);

  function seleccionarMes(mesNum: number) {
    onChange(`${viewYear}-${String(mesNum).padStart(2, '0')}`);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-secondary bg-white px-3 py-2 text-sm text-muted transition-colors hover:bg-surface"
        aria-expanded={open}
      >
        <Calendar size={15} className="text-muted-light" />
        {formatMesLargo(value)}
        <ChevronDown size={14} className={`text-muted-light transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-secondary/70 bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="rounded-lg p-1.5 text-muted-light hover:bg-surface hover:text-muted"
              aria-label="Año anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-ink">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="rounded-lg p-1.5 text-muted-light hover:bg-surface hover:text-muted"
              aria-label="Año siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {MESES.map((label, i) => {
              const mesNum = i + 1;
              const activo = viewYear === selectedYear && mesNum === selectedMonth;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => seleccionarMes(mesNum)}
                  className={`rounded-lg px-2 py-2 text-sm transition-colors ${
                    activo ? 'bg-primary text-white' : 'text-muted hover:bg-surface'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onChange(mesActual());
              setOpen(false);
            }}
            className="mt-3 w-full rounded-lg py-1.5 text-center text-xs font-medium text-primary hover:bg-secondary/50"
          >
            Ir al mes actual
          </button>
        </div>
      )}
    </div>
  );
}
