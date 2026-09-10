export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function formatDiaCorto(date: Date): string {
  return new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short' }).format(date);
}

/** "YYYY-MM" del mes actual, para usar como valor por defecto de un <input type="month">. */
export function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMesLargo(mes: string): string {
  const [anio, mesNum] = mes.split('-').map(Number);
  const fecha = new Date(anio, mesNum - 1, 1);
  const label = new Intl.DateTimeFormat('es-SV', { month: 'long', year: 'numeric' }).format(fecha);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Todos los días (a medianoche local) del mes "YYYY-MM", del 1 al último día. */
export function diasDelMes(mes: string): Date[] {
  const [anio, mesNum] = mes.split('-').map(Number);
  const ultimoDia = new Date(anio, mesNum, 0).getDate();
  return Array.from({ length: ultimoDia }, (_, i) => new Date(anio, mesNum - 1, i + 1));
}

/** ¿La fecha cae dentro del mes "YYYY-MM"? */
export function estaEnMes(fecha: string | Date, mes: string): boolean {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const mesFecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return mesFecha === mes;
}
