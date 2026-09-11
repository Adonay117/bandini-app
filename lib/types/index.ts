export const DEPARTAMENTOS_SV = [
  'Ahuachapán',
  'Santa Ana',
  'Sonsonate',
  'Chalatenango',
  'La Libertad',
  'San Salvador',
  'Cuscatlán',
  'La Paz',
  'Cabañas',
  'San Vicente',
  'Usulután',
  'San Miguel',
  'Morazán',
  'La Unión',
] as const;

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  fecha_nacimiento?: string;
  departamento?: string;
  lugar?: string;
  monto_acumulado_tarjeta: number;
  stickers_actuales: number;
  total_moneda_gastada: number;
  total_tarjetas_completadas: number;
  total_premios_ganados: number;
  saldo_favor: number;
  acepta_notificaciones: boolean;
  fecha_registro: string;
  activo: boolean;
}

export interface Producto {
  id: string;
  sku: string;
  nombre: string;
  categoria?: string;
  precio_costo: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  imagen_url?: string;
  activo: boolean;
}

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';

export interface Venta {
  id: string;
  cliente_id?: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  total: number;
  metodo_pago?: MetodoPago;
  fecha: string;
  cliente_nombre?: string;
  producto_nombre?: string;
}

export interface PremioSticker {
  id: string;
  cliente_id: string;
  stickers_alcanzados: 5 | 10;
  premio_monto: 12 | 25;
  monto_acumulado_cuando_gano: number;
  estado_canje: 'disponible' | 'canjeado' | 'expirado';
  cubierto_por_cupon: boolean;
  fecha_ganado: string;
  fecha_canjeado?: string;
}

export type TipoNotificacion =
  | 'cumpleanos'
  | 'sticker_ganado'
  | 'estado_pedido' // histórico: ya no se generan filas nuevas de este tipo
  | 'item_no_disponible';

export interface NotificacionAdmin {
  id: string;
  cliente_id: string;
  tipo: TipoNotificacion;
  asunto: string;
  cuerpo_mensaje: string;
  visto: boolean;
  fecha_creacion: string;
  fecha_leido?: string;
}

export type EstadoPedido =
  | 'cotizacion'
  | 'confirmado'
  | 'en_transito'
  | 'entregado'
  | 'completado';

export interface Pedido {
  id: string;
  numero: number;
  cliente_id: string;
  estado: EstadoPedido;
  total_articulos: number;
  total_pedido: number;
  total_abonado: number;
  saldo_pendiente: number;
  fecha_creacion: string;
  cliente_nombre?: string;
  cliente_lugar?: string;
  cliente_telefono?: string;
}

export type EstadoItemPedido = 'pendiente' | 'comprado' | 'no_disponible' | 'entregado' | 'defectuoso';

export type ResolucionDefecto = 'cambio' | 'reembolso_total' | 'reembolso_parcial';

export interface PedidoItem {
  id: string;
  pedido_id: string;
  plataforma: string;
  producto: string;
  precio: number;
  monto_reembolsado: number;
  url?: string;
  imagen_url?: string;
  estado_item: EstadoItemPedido;
}

export type MetodoPagoAbono = 'efectivo' | 'tarjeta' | 'transferencia';

export type TipoAbonoPedido = 'abono' | 'reembolso';

export type OrigenAbono = 'directo' | 'saldo_favor';

export interface AbonoPedido {
  id: string;
  pedido_id: string;
  monto: number;
  fecha_abono: string;
  metodo_pago: MetodoPagoAbono | null;
  premio_id?: string;
  tipo: TipoAbonoPedido;
  origen: OrigenAbono;
}

export type MotivoMovimientoSaldoFavor = 'recarga' | 'excedente' | 'aplicado_pedido' | 'ajuste';

export interface MovimientoSaldoFavor {
  id: string;
  cliente_id: string;
  monto: number;
  motivo: MotivoMovimientoSaldoFavor;
  es_cupon: boolean;
  pedido_id?: string;
  pedido_numero?: number;
  abono_id?: string;
  metodo_pago?: MetodoPagoAbono | null;
  nota?: string;
  fecha: string;
}

export type MotivoMerma = 'danado' | 'vencido' | 'roto' | 'otro';

export interface MovimientoInventario {
  id: string;
  producto_id: string;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  nota?: string;
  costo_unitario?: number;
  motivo?: MotivoMerma;
  venta_id?: string;
  fecha: string;
}

export type TipoTransaccion = 'ingreso' | 'egreso';

export interface Transaccion {
  id: string;
  tipo: TipoTransaccion;
  monto: number;
  categoria: string;
  fecha: string;
}
