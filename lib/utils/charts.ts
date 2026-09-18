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

/** "sep" o "sep 25" (con año si difiere del año actual) — etiqueta corta para ejes de gráficos. */
export function formatMesCorto(mes: string): string {
  const [anio, mesNum] = mes.split('-').map(Number);
  const fecha = new Date(anio, mesNum - 1, 1);
  const label = new Intl.DateTimeFormat('es-SV', { month: 'short' }).format(fecha).replace('.', '');
  const corto = label.charAt(0).toUpperCase() + label.slice(1);
  return anio === new Date().getFullYear() ? corto : `${corto} ${String(anio).slice(2)}`;
}

/** Últimos `n` meses "YYYY-MM" terminando en `mesFin` (incluido), en orden cronológico. */
export function ultimosMeses(mesFin: string, n: number): string[] {
  const [anio, mesNum] = mesFin.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(anio, mesNum - 1 - (n - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

/** Los 12 meses "YYYY-MM" de un año, de enero a diciembre. */
export function mesesDelAnio(anio: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, '0')}`);
}

/** Año actual, para usar como valor por defecto de un filtro por año. */
export function anioActual(): number {
  return new Date().getFullYear();
}

/** Día de la semana (0 = domingo … 6 = sábado) del día `dia` del mes "YYYY-MM". */
export function diaSemanaDe(mes: string, dia: number): number {
  const [anio, mesNum] = mes.split('-').map(Number);
  return new Date(anio, mesNum - 1, dia).getDay();
}

/** "vie 12 sept" — etiqueta corta de un día concreto del mes "YYYY-MM". */
export function etiquetaDiaFecha(mes: string, dia: number): string {
  const [anio, mesNum] = mes.split('-').map(Number);
  const fecha = new Date(anio, mesNum - 1, dia);
  const label = new Intl.DateTimeFormat('es-SV', { weekday: 'short', day: 'numeric', month: 'short' }).format(fecha);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
