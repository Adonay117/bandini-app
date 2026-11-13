'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

interface Props {
  label?: string;
  /** Fecha en formato 'YYYY-MM-DD' ('' = sin fecha). */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  id?: string;
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const aISO = (a: number, m: number, d: number) => `${a}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function parsear(iso: string): { a: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? { a: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) } : null;
}

// Selector de fecha con calendario desplegable (reemplaza <input type="date">).
// Trabaja siempre con strings 'YYYY-MM-DD' en hora local, sin zonas horarias.
export function DatePicker({ label, value, onChange, min, max, placeholder = 'Seleccionar fecha', required, disabled, error, id }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const contenedor = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);

  const seleccionada = parsear(value);
  const hoy = new Date();
  const [vista, setVista] = useState({ a: seleccionada?.a ?? hoy.getFullYear(), m: seleccionada?.m ?? hoy.getMonth() });

  useEffect(() => {
    if (!abierto) return;
    const cerrarFuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const cerrarEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', cerrarFuera);
    document.addEventListener('keydown', cerrarEsc);
    return () => {
      document.removeEventListener('mousedown', cerrarFuera);
      document.removeEventListener('keydown', cerrarEsc);
    };
  }, [abierto]);

  const celdas = useMemo(() => {
    const primero = new Date(vista.a, vista.m, 1).getDay();
    const total = new Date(vista.a, vista.m + 1, 0).getDate();
    return [...Array<null>(primero).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)] as (number | null)[];
  }, [vista]);

  const anios = useMemo(() => {
    const actual = new Date().getFullYear();
    const desde = (min ? parsear(min)?.a : undefined) ?? actual - 100;
    const hasta = (max ? parsear(max)?.a : undefined) ?? actual + 5;
    const lista: number[] = [];
    for (let a = hasta; a >= desde; a--) lista.push(a);
    return lista;
  }, [min, max]);

  function mover(delta: number) {
    setVista((v) => {
      const f = new Date(v.a, v.m + delta, 1);
      return { a: f.getFullYear(), m: f.getMonth() };
    });
  }

  function alternar() {
    if (disabled) return;
    if (seleccionada) setVista({ a: seleccionada.a, m: seleccionada.m });
    setAbierto((v) => !v);
  }

  const fueraDeRango = (iso: string) => Boolean((min && iso < min) || (max && iso > max));
  const hoyISO = aISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  return (
    <div className="flex flex-col gap-1.5" ref={contenedor}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={inputId}
          disabled={disabled}
          onClick={alternar}
          aria-haspopup="dialog"
          aria-expanded={abierto}
          className={`flex min-h-11 w-full items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60 ${
            error ? 'border-red-300' : 'border-secondary'
          }`}
        >
          <CalendarDays size={15} className="shrink-0 text-muted-light" />
          <span className={`flex-1 truncate ${value ? 'text-ink' : 'text-muted-light'}`}>
            {seleccionada ? formatDate(new Date(seleccionada.a, seleccionada.m, seleccionada.d)) : placeholder}
          </span>
        </button>
        {value && !required && !disabled && (
          <button
            type="button"
            aria-label="Quitar fecha"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-light hover:text-ink"
          >
            <X size={14} />
          </button>
        )}

        {abierto && (
          <div
            role="dialog"
            aria-label="Calendario"
            className="absolute left-0 top-full z-30 mt-1.5 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-white p-3 shadow-[var(--shadow-pop)]"
          >
            <div className="mb-2 flex items-center gap-1">
              <button type="button" onClick={() => mover(-1)} aria-label="Mes anterior" className="rounded-lg p-1.5 text-muted hover:bg-secondary/40">
                <ChevronLeft size={16} />
              </button>
              <select
                value={vista.m}
                onChange={(e) => setVista((v) => ({ ...v, m: Number(e.target.value) }))}
                aria-label="Mes"
                className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-sm font-medium text-ink outline-none hover:bg-secondary/40"
              >
                {MESES.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={vista.a}
                onChange={(e) => setVista((v) => ({ ...v, a: Number(e.target.value) }))}
                aria-label="Año"
                className="rounded-lg bg-transparent px-1 py-1 text-sm font-medium text-ink outline-none hover:bg-secondary/40"
              >
                {(anios.includes(vista.a) ? anios : [vista.a, ...anios]).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => mover(1)} aria-label="Mes siguiente" className="rounded-lg p-1.5 text-muted hover:bg-secondary/40">
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] text-muted-light">
              {DIAS.map((d, i) => (
                <span key={i} className="py-1">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {celdas.map((dia, i) => {
                if (dia === null) return <span key={`v${i}`} />;
                const iso = aISO(vista.a, vista.m, dia);
                const activo = iso === value;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={fueraDeRango(iso)}
                    onClick={() => {
                      onChange(iso);
                      setAbierto(false);
                    }}
                    aria-pressed={activo}
                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                      activo
                        ? 'bg-primary font-semibold text-white'
                        : iso === hoyISO
                          ? 'border border-primary/50 text-primary hover:bg-secondary/40'
                          : 'text-ink hover:bg-secondary/40'
                    }`}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex justify-between border-t border-border pt-2 text-xs">
              <button
                type="button"
                disabled={fueraDeRango(hoyISO)}
                onClick={() => {
                  onChange(hoyISO);
                  setAbierto(false);
                }}
                className="font-medium text-primary hover:underline disabled:opacity-40"
              >
                Hoy
              </button>
              {!required && value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setAbierto(false);
                  }}
                  className="text-muted hover:text-ink"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
