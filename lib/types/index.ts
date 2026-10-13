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

export interface VentaItem {
  id: string;
  venta_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  total: number;
  producto_nombre?: string;
}

export interface Venta {
  id: string;
  cliente_id?: string;
  metodo_pago?: MetodoPago;
  total: number;
  fecha: string;
  cliente_nombre?: string;
  items: VentaItem[];
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

export type Plataforma = 'SHEIN' | 'TEMU' | 'AMAZON';

export type EstadoPedido =
  | 'cotizacion'
  | 'confirmado'
  | 'comprado'
  | 'en_transito'
  | 'recibido_parcial'
  | 'recibido'
  | 'listo_entrega'
  | 'entregado_parcial'
  | 'entregado'
  | 'completado'
  | 'desistido'
  | 'cancelado';

export type EstadoPago = 'pendiente' | 'parcial' | 'pagado' | 'a_favor';

export interface Pedido {
  id: string;
  numero: number;
  cliente_id: string;
  plataforma: Plataforma | null;
  estado: EstadoPedido;
  estado_pago: EstadoPago;
  total_articulos: number;
  total_pedido: number;
  total_abonado: number;
  saldo_pendiente: number;
  referencia_compra?: string | null;
  fecha_compra?: string | null;
  desistido_at?: string | null;
  motivo_desistimiento?: string | null;
  nota?: string | null;
  fecha_creacion: string;
  cliente_nombre?: string;
  cliente_lugar?: string;
  cliente_telefono?: string;
}

export type EstadoItemPedido =
  | 'pendiente'
  | 'comprado'
  | 'no_disponible'
  | 'en_transito'
  | 'recibido_parcial'
  | 'recibido'
  | 'con_incidencia'
  | 'en_devolucion'
  | 'pendiente_reposicion'
  | 'reembolsado'
  | 'entregado_parcial'
  | 'entregado'
  | 'desistido'
  | 'defectuoso'; // legado

export type ResolucionDefecto = 'cambio' | 'reembolso_total' | 'reembolso_parcial' | 'descuento';

export interface PedidoItem {
  id: string;
  pedido_id: string;
  nombre: string;
  cantidad: number;
  precio_compra: number | null; // unitario
  precio_venta: number; // unitario
  peso_lb: number | null; // unitario
  monto_reembolsado: number; // devuelto/descontado al cliente
  url?: string;
  imagen_url?: string;
  estado_item: EstadoItemPedido;
  desistido_at?: string | null;
  plataforma_origen?: string | null; // legado
}

// Cantidades y costos derivados (vista v_pedido_items_logistica).
export interface ItemLogistica {
  pedido_item_id: string;
  cantidad_embarcada: number;
  cantidad_en_transito: number;
  cantidad_recibida: number;
  cantidad_ok: number;
  cantidad_perdida: number;
  cantidad_entregada: number;
  cantidad_en_entrega: number;
  cantidad_reembolsada_plataforma: number;
  monto_reembolso_plataforma: number;
  incidencias_abiertas: number;
  devoluciones_abiertas: number;
  reposiciones_pendientes: number;
  costo_producto: number;
  costo_importacion: number;
  venta_neta: number;
}

export type EstadoEmbarque = 'en_transito' | 'recibido_parcial' | 'con_incidencias' | 'recibido';

export interface Embarque {
  id: string;
  numero: number;
  guia: string | null;
  paqueteria: string;
  fecha_envio: string;
  costo_total: number;
  estado: EstadoEmbarque;
  fecha_recepcion: string | null;
  nota: string | null;
  fecha_creacion: string;
}

export type EstadoRecepcion = 'pendiente' | 'correcto' | 'faltante' | 'incompleto' | 'con_incidencia';

export interface EmbarqueItem {
  id: string;
  embarque_id: string;
  pedido_item_id: string;
  reposicion_id: string | null;
  cantidad_esperada: number;
  cantidad_recibida: number | null;
  cantidad_ok: number | null;
  fecha_recepcion: string | null;
  nota_recepcion: string | null;
  estado_recepcion: EstadoRecepcion;
  costo_importacion?: number;
}

export type TipoIncidencia = 'faltante' | 'incompleto' | 'danado' | 'equivocado';
export type EstadoIncidencia = 'abierta' | 'en_reclamo' | 'resuelta' | 'absorbida';

export interface Incidencia {
  id: string;
  embarque_item_id: string;
  tipo: TipoIncidencia;
  cantidad: number;
  descripcion: string | null;
  estado: EstadoIncidencia;
  fecha: string;
  fecha_resolucion: string | null;
}

export type ResolucionDevolucion = 'reembolso' | 'reposicion';
export type EstadoDevolucion = 'solicitada' | 'aceptada' | 'rechazada' | 'completada';

export interface Devolucion {
  id: string;
  numero: number;
  incidencia_id: string;
  cantidad: number;
  resolucion: ResolucionDevolucion;
  estado: EstadoDevolucion;
  referencia: string | null;
  monto_reembolso: number | null;
  nota: string | null;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
}

export type EstadoReposicion = 'pendiente' | 'en_transito' | 'recibida' | 'con_incidencia';

export interface Reposicion {
  id: string;
  devolucion_id: string;
  cantidad: number;
  estado: EstadoReposicion;
  fecha_creacion: string;
}

export type ModalidadEntrega = 'punto_propio' | 'encomienda';
export type EstadoEntrega = 'pendiente' | 'enviada' | 'entregada' | 'no_retirada';

export interface Entrega {
  id: string;
  pedido_id: string;
  modalidad: ModalidadEntrega;
  encomendista: string | null;
  agencia_punto: string | null;
  estado: EstadoEntrega;
  fecha_programada: string | null;
  fecha_entrega: string | null;
  nota: string | null;
  fecha_creacion: string;
  items: { id: string; pedido_item_id: string; cantidad: number }[];
}

export interface RentabilidadPedido {
  ventas: number;
  costo_productos: number;
  costo_importacion: number;
  reembolsos_plataforma: number;
  productos_sin_costo: number;
  ganancia: number;
}

export interface HistorialEstado {
  id: number;
  entidad: string;
  entidad_id: string;
  estado_anterior: string | null;
  estado_nuevo: string;
  fecha: string;
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

// ── Composiciones que devuelven los endpoints de detalle ────────────────

export type DevolucionConReposicion = Devolucion & { reposiciones: Reposicion[] };
export type IncidenciaConDevoluciones = Incidencia & { devoluciones: DevolucionConReposicion[] };

// Línea de embarque vista desde el producto (detalle de pedido).
export type LineaTrazabilidad = EmbarqueItem & {
  embarque: Pick<Embarque, 'id' | 'numero' | 'estado' | 'paqueteria' | 'guia' | 'fecha_envio'>;
  incidencias: IncidenciaConDevoluciones[];
};

export type PedidoItemDetalle = PedidoItem & {
  logistica: ItemLogistica | null;
  lineas: LineaTrazabilidad[];
};

export type PedidoDetalle = Pedido & {
  cliente_saldo_favor: number;
  items: PedidoItemDetalle[];
  abonos: AbonoPedido[];
  entregas: Entrega[];
  rentabilidad: RentabilidadPedido | null;
  historial: HistorialEstado[];
};

// Línea de embarque vista desde el embarque.
export type LineaEmbarqueDetalle = EmbarqueItem & {
  costo_importacion: number;
  pedido_item: Pick<
    PedidoItem,
    'id' | 'nombre' | 'cantidad' | 'peso_lb' | 'precio_compra' | 'imagen_url' | 'url' | 'estado_item'
  > & {
    pedido: { id: string; numero: number; plataforma: Plataforma | null; cliente: { nombre: string } | null };
  };
  reposicion: { id: string; devolucion: { numero: number } | null } | null;
  incidencias: IncidenciaConDevoluciones[];
};

export type EmbarqueDetalle = Embarque & {
  metodo_reparto: 'peso' | 'unidades';
  lineas: LineaEmbarqueDetalle[];
};

export type EmbarqueResumen = Embarque & {
  total_lineas: number;
  total_pedidos: number;
  unidades: number;
  recibidas: number;
  reposiciones: number;
};

export interface ProductoPorEmbarcar {
  pedido_item_id: string;
  nombre: string;
  imagen_url: string | null;
  peso_lb: number | null;
  pendiente: number;
  pedido_id: string | null;
  pedido_numero: number;
  plataforma: Plataforma | null;
  cliente_nombre: string | null;
  reposicion_id: string | null;
  origen: string | null;
}

export type IncidenciaBandeja = IncidenciaConDevoluciones & {
  linea: {
    id: string;
    cantidad_esperada: number;
    cantidad_recibida: number | null;
    cantidad_ok: number | null;
    embarque: { id: string; numero: number; paqueteria: string };
    pedido_item: {
      id: string;
      nombre: string;
      cantidad: number;
      imagen_url: string | null;
      precio_compra: number | null;
      url: string | null;
      pedido: { id: string; numero: number; plataforma: Plataforma | null; cliente: { nombre: string } | null };
    };
  };
};
