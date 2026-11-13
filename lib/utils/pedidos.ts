import { EstadoItemPedido, EstadoPedido } from '@/lib/types';
import { BadgeVariant } from '@/components/ui/Badge';

// Camino principal del pedido (lo que muestra el stepper). Los estados
// parciales se muestran en la misma posición que su estado completo, y
// desistido/cancelado quedan fuera del camino.
export const ESTADOS_PEDIDO: EstadoPedido[] = [
  'confirmado',
  'comprado',
  'en_transito',
  'recibido',
  'entregado',
  'completado',
];

export const TODOS_ESTADOS_PEDIDO: EstadoPedido[] = [
  'confirmado',
  'comprado',
  'en_transito',
  'recibido_parcial',
  'recibido',
  'entregado_parcial',
  'entregado',
  'completado',
  'desistido',
  'cancelado',
];

// Estados que la API deja fijar a mano; el resto los calcula la base de
// datos (embarques, recepciones, entregas y cobro). 'comprado' se fija solo
// cuando no queda producto por comprar; 'completado' cuando está entregado y
// pagado. Quedan manuales por si hay que forzarlos desde la acción sugerida.
export const ESTADOS_PEDIDO_MANUALES: EstadoPedido[] = [
  'confirmado',
  'comprado',
  'completado',
  'cancelado',
];

// Siguiente paso sugerido para el usuario (null = el sistema avanza solo).
export function siguienteAccion(
  estado: EstadoPedido,
  { hayProductos, saldado }: { hayProductos: boolean; saldado: boolean }
): { tipo: 'estado'; destino: EstadoPedido; label: string } | { tipo: 'info'; texto: string; href?: string } | null {
  switch (estado) {
    case 'confirmado':
      return hayProductos
        ? { tipo: 'estado', destino: 'comprado', label: 'Marcar todo como comprado' }
        : { tipo: 'info', texto: 'Agregá productos al pedido para empezar a comprar.' };
    case 'comprado':
      return { tipo: 'info', texto: 'Siguiente: incluir los productos en un embarque.', href: '/embarques/nuevo' };
    case 'en_transito':
      return { tipo: 'info', texto: 'Siguiente: registrar la recepción cuando llegue el embarque.', href: '/embarques' };
    case 'recibido_parcial':
    case 'recibido':
      return { tipo: 'info', texto: 'Siguiente: registrar la entrega al cliente.' };
    case 'entregado_parcial':
      return { tipo: 'info', texto: 'Siguiente: entregar los productos que faltan.' };
    case 'entregado':
      return saldado
        ? null
        : { tipo: 'info', texto: 'Se completa solo al registrar el pago del saldo pendiente.' };
    default:
      return null;
  }
}

// Un pedido sin productos solo puede quedarse en confirmado (estado inicial) o cancelarse.
export function permitidoSinProductos(estado: EstadoPedido): boolean {
  return estado === 'confirmado' || estado === 'cancelado';
}

// Estados en los que el pedido ya no está "activo" (no suma a por cobrar).
export const ESTADOS_PEDIDO_CERRADOS: EstadoPedido[] = ['completado', 'desistido', 'cancelado'];

export const ESTADO_PEDIDO: Record<EstadoPedido, { label: string; badge: BadgeVariant }> = {
  confirmado: { label: 'Confirmado', badge: 'primary' },
  comprado: { label: 'Comprado', badge: 'primary' },
  en_transito: { label: 'En tránsito', badge: 'warning' },
  recibido_parcial: { label: 'Recibido parcial', badge: 'warning' },
  recibido: { label: 'Recibido', badge: 'primary' },
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
  confirmado: '✅',
  comprado: '🛒',
  en_transito: '🚚',
  recibido_parcial: '📦',
  recibido: '📦',
  entregado_parcial: '📬',
  entregado: '📬',
  completado: '🎉',
  desistido: '✋',
  cancelado: '❌',
};

export const ESTADO_PEDIDO_FRASE: Record<EstadoPedido, string> = {
  confirmado: 'confirmado',
  comprado: 'comprado',
  en_transito: 'en tránsito',
  recibido_parcial: 'recibido parcialmente',
  recibido: 'recibido en El Salvador',
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
