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
