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
