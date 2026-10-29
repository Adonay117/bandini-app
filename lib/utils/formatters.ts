export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(amount);
}

/** "$1.2 k" / "$850" — montos cortos para ejes y etiquetas de gráficos. */
export function formatCurrencyCompacto(amount: number): string {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
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

// Nombre legible de las categorías de `transacciones` que asientan los
// triggers. Las manuales son texto libre y se muestran tal cual.
const CATEGORIAS_TRANSACCION: Record<string, string> = {
  venta: 'Venta',
  abono_pedido: 'Abono de pedido',
  premio_sticker: 'Premio de sticker',
  costo_embarque: 'Costo de embarque',
  ajuste_costo_embarque: 'Ajuste de costo de embarque',
  compra_pedido: 'Compra en plataforma',
  ajuste_compra_pedido: 'Ajuste de compra en plataforma',
  reembolso_plataforma: 'Reembolso de plataforma',
  saldo_favor: 'Saldo a favor',
  reembolso_pedido: 'Reembolso a cliente',
  merma: 'Merma',
};

export function etiquetaCategoria(categoria: string | null | undefined): string {
  if (!categoria) return 'Sin categoría';
  return CATEGORIAS_TRANSACCION[categoria] ?? categoria.charAt(0).toUpperCase() + categoria.slice(1);
}
