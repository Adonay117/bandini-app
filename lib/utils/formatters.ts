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
