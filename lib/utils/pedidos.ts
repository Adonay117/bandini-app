import { EstadoItemPedido, EstadoPedido } from '@/lib/types';
import { BadgeVariant } from '@/components/ui/Badge';

// Camino principal del pedido (lo que muestra el stepper). Los estados
// parciales se muestran en la misma posición que su estado completo, y
// desistido/cancelado quedan fuera del camino.
export const ESTADOS_PEDIDO: EstadoPedido[] = [
  'cotizacion',
  'confirmado',
  'comprado',
  'en_transito',
  'recibido',
  'listo_entrega',
  'entregado',
  'completado',
];

export const TODOS_ESTADOS_PEDIDO: EstadoPedido[] = [
  'cotizacion',
  'confirmado',
  'comprado',
  'en_transito',
  'recibido_parcial',
  'recibido',
  'listo_entrega',
  'entregado_parcial',
  'entregado',
  'completado',
  'desistido',
  'cancelado',
];

// Estados que la API deja fijar a mano; el resto los calcula la base de
// datos a partir de embarques, recepciones y entregas.
export const ESTADOS_PEDIDO_MANUALES: EstadoPedido[] = [
  'cotizacion',
  'confirmado',
  'comprado',
  'listo_entrega',
  'completado',
  'cancelado',
];

// Un pedido sin productos solo puede quedarse en cotización o cancelarse.
export function permitidoSinProductos(estado: EstadoPedido): boolean {
  return estado === 'cotizacion' || estado === 'cancelado';
}

// Estados en los que el pedido ya no está "activo" (no suma a por cobrar).
export const ESTADOS_PEDIDO_CERRADOS: EstadoPedido[] = ['completado', 'desistido', 'cancelado'];

export const ESTADO_PEDIDO: Record<EstadoPedido, { label: string; badge: BadgeVariant }> = {
  cotizacion: { label: 'Cotización', badge: 'neutral' },
  confirmado: { label: 'Confirmado', badge: 'primary' },
  comprado: { label: 'Comprado', badge: 'primary' },
  en_transito: { label: 'En tránsito', badge: 'warning' },
  recibido_parcial: { label: 'Recibido parcial', badge: 'warning' },
  recibido: { label: 'Recibido', badge: 'primary' },
  listo_entrega: { label: 'Listo p/ entrega', badge: 'primary' },
  entregado_parcial: { label: 'Entrega parcial', badge: 'warning' },
  entregado: { label: 'Entregado', badge: 'positive' },
  completado: { label: 'Completado', badge: 'positive' },
  desistido: { label: 'Desistido', badge: 'negative' },
  cancelado: { label: 'Cancelado', badge: 'negative' },
};

// Posición en el stepper de cada estado (los parciales comparten la del completo).
export function pasoStepper(estado: EstadoPedido): number {
  if (estado === 'recibido_parcial') return ESTADOS_PEDIDO.indexOf('recibido');
  if (estado === 'entregado_parcial') return ESTADOS_PEDIDO.indexOf('entregado');
  return ESTADOS_PEDIDO.indexOf(estado);
}

export const ESTADO_ITEM: Record<EstadoItemPedido, { label: string; badge: BadgeVariant; emoji: string }> = {
  pendiente: { label: 'Por comprar', badge: 'neutral', emoji: '⏳' },
  comprado: { label: 'Comprado', badge: 'primary', emoji: '🛒' },
  no_disponible: { label: 'No disponible', badge: 'negative', emoji: '🚫' },
  en_transito: { label: 'En tránsito', badge: 'warning', emoji: '🚚' },
  recibido_parcial: { label: 'Recibido parcial', badge: 'warning', emoji: '📦' },
  recibido: { label: 'Recibido', badge: 'primary', emoji: '📦' },
  con_incidencia: { label: 'Con incidencia', badge: 'negative', emoji: '⚠️' },
  en_devolucion: { label: 'En devolución', badge: 'warning', emoji: '↩️' },
  pendiente_reposicion: { label: 'Pend. reposición', badge: 'warning', emoji: '🔁' },
  reembolsado: { label: 'Reembolsado', badge: 'neutral', emoji: '💸' },
  entregado_parcial: { label: 'Entrega parcial', badge: 'warning', emoji: '📬' },
  entregado: { label: 'Entregado', badge: 'positive', emoji: '📬' },
  desistido: { label: 'Desistido', badge: 'negative', emoji: '✋' },
  defectuoso: { label: 'Defectuoso', badge: 'warning', emoji: '⚠️' },
};

// Estados de producto que se fijan a mano; los demás salen de la logística.
export const ESTADOS_ITEM_MANUALES: EstadoItemPedido[] = ['pendiente', 'comprado', 'no_disponible', 'defectuoso'];

// Emojis para el mensaje de WhatsApp (texto plano, no interfaz).
export const ESTADO_PEDIDO_EMOJI: Record<EstadoPedido, string> = {
  cotizacion: '📝',
  confirmado: '✅',
  comprado: '🛒',
  en_transito: '🚚',
  recibido_parcial: '📦',
  recibido: '📦',
  listo_entrega: '🎁',
  entregado_parcial: '📬',
  entregado: '📬',
  completado: '🎉',
  desistido: '✋',
  cancelado: '❌',
};

export const ESTADO_PEDIDO_FRASE: Record<EstadoPedido, string> = {
  cotizacion: 'en cotización',
  confirmado: 'confirmado',
  comprado: 'comprado',
  en_transito: 'en tránsito',
  recibido_parcial: 'recibido parcialmente',
  recibido: 'recibido en El Salvador',
  listo_entrega: 'listo para entrega',
  entregado_parcial: 'entregado parcialmente',
  entregado: 'entregado',
  completado: 'completado',
  desistido: 'desistido',
  cancelado: 'cancelado',
};

// Determina si un cambio de estado necesita confirmación explícita: solo
// cuando NO es el siguiente paso natural (retroceder o saltarse etapas
// intermedias), para evitar toques accidentales. Un avance de un solo paso
// no interrumpe con un diálogo. No confirma por sí misma: el llamador decide
// cómo pedir esa confirmación (p.ej. con <PopConfirm>).
export function evaluarCambioEstado(
  actual: EstadoPedido,
  destino: EstadoPedido
): { requiereConfirmacion: boolean; mensaje: string } {
  const indiceActual = pasoStepper(actual);
  const indiceDestino = pasoStepper(destino);

  if (indiceDestino === indiceActual + 1 && indiceActual >= 0) {
    return { requiereConfirmacion: false, mensaje: '' };
  }

  if (destino === 'cancelado') {
    return { requiereConfirmacion: true, mensaje: '¿Cancelar el pedido? Los pagos y productos se conservan en el historial.' };
  }

  const mensaje =
    indiceDestino < indiceActual
      ? `¿Retroceder el pedido de "${ESTADO_PEDIDO[actual].label}" a "${ESTADO_PEDIDO[destino].label}"?`
      : `Esto saltará etapas intermedias. ¿Cambiar el pedido a "${ESTADO_PEDIDO[destino].label}"?`;

  return { requiereConfirmacion: true, mensaje };
}
