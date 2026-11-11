import { BadgeVariant } from '@/components/ui/Badge';
import {
  EstadoDevolucion,
  EstadoEmbarque,
  EstadoEntrega,
  EstadoIncidencia,
  EstadoRecepcion,
  EstadoReposicion,
  IncidenciaConDevoluciones,
  ModalidadEntrega,
  Plataforma,
  Reposicion,
  ResolucionDevolucion,
  TipoIncidencia,
} from '@/lib/types';

type Etiqueta = { label: string; badge: BadgeVariant };

export const PLATAFORMAS: Plataforma[] = ['SHEIN', 'TEMU', 'AMAZON'];

export const NOMBRE_PLATAFORMA: Record<Plataforma, string> = {
  SHEIN: 'Shein',
  TEMU: 'Temu',
  AMAZON: 'Amazon',
};

export const ESTADO_EMBARQUE: Record<EstadoEmbarque, Etiqueta> = {
  en_transito: { label: 'En tránsito', badge: 'warning' },
  recibido_parcial: { label: 'Recepción parcial', badge: 'warning' },
  con_incidencias: { label: 'Con incidencias', badge: 'negative' },
  recibido: { label: 'Recibido', badge: 'positive' },
};

export const ESTADO_RECEPCION: Record<EstadoRecepcion, Etiqueta> = {
  pendiente: { label: 'Por recibir', badge: 'neutral' },
  correcto: { label: 'Correcto', badge: 'positive' },
  faltante: { label: 'Faltante', badge: 'negative' },
  incompleto: { label: 'Incompleto', badge: 'warning' },
  con_incidencia: { label: 'Con incidencia', badge: 'negative' },
};

export const TIPO_INCIDENCIA: Record<TipoIncidencia, string> = {
  faltante: 'Faltante',
  incompleto: 'Cantidad incompleta',
  danado: 'Dañado',
  equivocado: 'Producto equivocado',
};

export const ESTADO_INCIDENCIA: Record<EstadoIncidencia, Etiqueta> = {
  abierta: { label: 'Abierta', badge: 'negative' },
  en_reclamo: { label: 'En reclamo', badge: 'warning' },
  resuelta: { label: 'Resuelta', badge: 'positive' },
  absorbida: { label: 'Pérdida asumida', badge: 'neutral' },
};

export const ESTADO_DEVOLUCION: Record<EstadoDevolucion, Etiqueta> = {
  solicitada: { label: 'Solicitada', badge: 'warning' },
  aceptada: { label: 'Aceptada', badge: 'primary' },
  rechazada: { label: 'Rechazada', badge: 'negative' },
  completada: { label: 'Completada', badge: 'positive' },
};

export const RESOLUCION_DEVOLUCION: Record<ResolucionDevolucion, string> = {
  reembolso: 'Reembolso',
  reposicion: 'Reposición',
};

export const ESTADO_REPOSICION: Record<EstadoReposicion, Etiqueta> = {
  pendiente: { label: 'Por embarcar', badge: 'warning' },
  en_transito: { label: 'En tránsito', badge: 'warning' },
  recibida: { label: 'Recibida', badge: 'positive' },
  con_incidencia: { label: 'Con incidencia', badge: 'negative' },
};

export const MODALIDAD_ENTREGA: Record<ModalidadEntrega, string> = {
  punto_propio: 'Punto propio',
  encomienda: 'Encomienda',
};

export const ESTADO_ENTREGA: Record<EstadoEntrega, Etiqueta> = {
  pendiente: { label: 'Pendiente', badge: 'neutral' },
  enviada: { label: 'Con encomendista', badge: 'warning' },
  entregada: { label: 'Entregada', badge: 'positive' },
  no_retirada: { label: 'No retirada', badge: 'negative' },
};

// Siguiente estado válido de una entrega según su modalidad.
export function siguientesEstadosEntrega(modalidad: ModalidadEntrega, actual: EstadoEntrega): EstadoEntrega[] {
  if (actual === 'entregada') return [];
  if (actual === 'no_retirada') return ['pendiente'];
  if (modalidad === 'encomienda' && actual === 'pendiente') return ['enviada', 'entregada', 'no_retirada'];
  return ['entregada', 'no_retirada'];
}

export function codigoEmbarque(numero: number): string {
  return `EMB-${String(numero).padStart(3, '0')}`;
}

export function codigoPedido(numero: number): string {
  return `PED-${String(numero).padStart(3, '0')}`;
}

export function codigoDevolucion(numero: number): string {
  return `DEV-${String(numero).padStart(3, '0')}`;
}

// reposiciones.devolucion_id es unique, así que PostgREST embebe la
// reposición como objeto o null (relación 1-1). La API la expone siempre
// como arreglo para que el frontend no tenga que distinguir.
export function normalizarReposiciones(
  incidencias: IncidenciaConDevoluciones[] | null | undefined
): IncidenciaConDevoluciones[] {
  return (incidencias ?? []).map((inc) => ({
    ...inc,
    devoluciones: (inc.devoluciones ?? []).map((dev) => {
      const rep = dev.reposiciones as Reposicion[] | Reposicion | null | undefined;
      return { ...dev, reposiciones: Array.isArray(rep) ? rep : rep ? [rep] : [] };
    }),
  }));
}

// Traduce errores de validación de Postgres (raise exception … errcode
// 23514 / P0002) a un status HTTP útil para la API.
export function statusDeErrorDb(code?: string): number {
  if (code === '23514' || code === '23505' || code === '23503') return 409;
  if (code === 'P0002' || code === 'PGRST116') return 404;
  if (code === '22023' || code === '22P02') return 400;
  return 500;
}
