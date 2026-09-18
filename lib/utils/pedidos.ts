import { EstadoItemPedido, EstadoPedido } from '@/lib/types';
import { BadgeVariant } from '@/components/ui/Badge';

export const ESTADOS_PEDIDO: EstadoPedido[] = [
  'cotizacion',
  'confirmado',
  'en_transito',
  'entregado',
  'completado',
];

export const ESTADO_PEDIDO: Record<EstadoPedido, { label: string; badge: BadgeVariant }> = {
  cotizacion: { label: 'Cotización', badge: 'neutral' },
  confirmado: { label: 'Confirmado', badge: 'primary' },
  en_transito: { label: 'En tránsito', badge: 'warning' },
  entregado: { label: 'Entregado', badge: 'primary' },
  completado: { label: 'Completado', badge: 'positive' },
};

export const ESTADO_ITEM: Record<
  EstadoItemPedido,
  { label: string; badge: BadgeVariant; emoji: string }
> = {
  pendiente: { label: 'Pendiente', badge: 'neutral', emoji: '⏳' },
  comprado: { label: 'Comprado', badge: 'primary', emoji: '✅' },
  no_disponible: { label: 'No disponible', badge: 'negative', emoji: '🚫' },
  entregado: { label: 'Entregado', badge: 'positive', emoji: '📬' },
  defectuoso: { label: 'Defectuoso', badge: 'warning', emoji: '⚠️' },
};

export const ESTADOS_ITEM = Object.keys(ESTADO_ITEM) as EstadoItemPedido[];

// Emojis para el mensaje de WhatsApp (texto plano, no interfaz).
export const ESTADO_PEDIDO_EMOJI: Record<EstadoPedido, string> = {
  cotizacion: '📝',
  confirmado: '✅',
  en_transito: '🚚',
  entregado: '📬',
  completado: '🎉',
};

export const ESTADO_PEDIDO_FRASE: Record<EstadoPedido, string> = {
  cotizacion: 'en cotización',
  confirmado: 'confirmado',
  en_transito: 'en tránsito',
  entregado: 'entregado',
  completado: 'completado',
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
  const indiceActual = ESTADOS_PEDIDO.indexOf(actual);
  const indiceDestino = ESTADOS_PEDIDO.indexOf(destino);

  if (indiceDestino === indiceActual + 1) {
    return { requiereConfirmacion: false, mensaje: '' };
  }

  const mensaje =
    indiceDestino < indiceActual
      ? `¿Retroceder el pedido de "${ESTADO_PEDIDO[actual].label}" a "${ESTADO_PEDIDO[destino].label}"?`
      : `Esto saltará etapas intermedias. ¿Cambiar el pedido a "${ESTADO_PEDIDO[destino].label}"?`;

  return { requiereConfirmacion: true, mensaje };
}
