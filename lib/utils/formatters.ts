export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(amount);
}

/** Enlace wa.me para abrir el chat de WhatsApp con un teléfono salvadoreño.
 * Asume prefijo +503 cuando el número tiene 8 dígitos (formato local). */
export function whatsappUrl(telefono: string): string {
  const digitos = telefono.replace(/\D/g, '');
  const completo = digitos.length === 8 ? `503${digitos}` : digitos;
  return `https://wa.me/${completo}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium' }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

const UMBRAL_MONTO_POR_STICKER = 50;

export function calcularStickers(montoAcumulado: number): number {
  return Math.floor(montoAcumulado / UMBRAL_MONTO_POR_STICKER);
}

export function montoFaltanteParaSiguienteSticker(montoAcumulado: number): number {
  const restante = UMBRAL_MONTO_POR_STICKER - (montoAcumulado % UMBRAL_MONTO_POR_STICKER);
  return restante === UMBRAL_MONTO_POR_STICKER ? 0 : restante;
}

/** Fecha sin hora ('YYYY-MM-DD', columnas `date`): se interpreta como día
 * local — new Date('2026-09-01') sería medianoche UTC y en El Salvador se
 * mostraría como el día anterior. */
export function formatDia(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
  return formatDate(new Date(anio, mes - 1, dia));
}

/** Hoy en formato 'YYYY-MM-DD' (hora local), para inputs type="date". */
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
