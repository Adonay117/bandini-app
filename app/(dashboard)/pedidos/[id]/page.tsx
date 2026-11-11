'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Ban,
  Check,
  ChevronLeft,
  Copy,
  ExternalLink,
  Gift,
  Hand,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
  ShoppingBag,
  Trash2,
  Truck,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { MetodoPagoBadge } from '@/components/ui/MetodoPagoBadge';
import { PlataformaBadge } from '@/components/ui/PlataformaBadge';
import { PopConfirm, PopConfirmRequest } from '@/components/ui/PopConfirm';
import { ClienteAvatar } from '@/components/clientes/ClienteAvatar';
import { EstadoStepper } from '@/components/pedidos/EstadoStepper';
import { PedidoProgress } from '@/components/pedidos/PedidoProgress';
import { MiniaturaArticulo } from '@/components/pedidos/ImagenArticulo';
import { ProductoPedidoForm, ProductoPedidoInput } from '@/components/pedidos/ProductoPedidoForm';
import { ItemTrazabilidad } from '@/components/pedidos/ItemTrazabilidad';
import { AjusteClientePanel, AjusteClientePayload } from '@/components/pedidos/AjusteClientePanel';
import { EntregasPanel } from '@/components/pedidos/EntregasPanel';
import { RentabilidadPanel } from '@/components/pedidos/RentabilidadPanel';
import { HistorialPanel } from '@/components/pedidos/HistorialPanel';
import {
  EstadoItemPedido,
  EstadoPedido,
  MetodoPagoAbono,
  PedidoDetalle,
  PedidoItemDetalle,
  Plataforma,
  PremioSticker,
} from '@/lib/types';
import { formatCurrency, formatDate, formatDia, whatsappUrl } from '@/lib/utils/formatters';
import { estiloPlataforma, plataformaAplicaCupon } from '@/lib/utils/plataformas';
import { NOMBRE_PLATAFORMA, PLATAFORMAS, codigoPedido } from '@/lib/utils/logistica';
import {
  ESTADOS_ITEM_MANUALES,
  ESTADO_ITEM,
  ESTADO_PEDIDO,
  ESTADO_PEDIDO_EMOJI,
  ESTADO_PEDIDO_FRASE,
} from '@/lib/utils/pedidos';
import { pedirApi } from '@/lib/api';
import { notificar } from '@/lib/notificar';

// Estados de producto donde tiene sentido ajustar el cobro con el cliente.
const ESTADOS_AJUSTE: EstadoItemPedido[] = [
  'defectuoso',
  'con_incidencia',
  'en_devolucion',
  'pendiente_reposicion',
  'reembolsado',
  'desistido',
  'recibido_parcial',
];

function construirMensaje(data: PedidoDetalle): string {
  const nombre = data.cliente_nombre ?? 'cliente';
  const saldoAlDia = data.saldo_pendiente <= 0;
  const plataforma = data.plataforma ? `${estiloPlataforma(data.plataforma).emoji} ${NOMBRE_PLATAFORMA[data.plataforma]}` : null;
  const items = data.items.length
    ? data.items
        .map((i) => {
          const { emoji, label } = ESTADO_ITEM[i.estado_item];
          const neto = i.precio_venta * i.cantidad - i.monto_reembolsado;
          return `• ${i.nombre}${i.cantidad > 1 ? ` ×${i.cantidad}` : ''} — ${formatCurrency(neto)} ${emoji} ${label.toLowerCase()}`;
        })
        .join('\n')
    : '(sin productos)';
  const entregaActiva = data.entregas.find((e) => e.estado === 'pendiente' || e.estado === 'enviada');
  const lineaEntrega = entregaActiva
    ? entregaActiva.modalidad === 'encomienda'
      ? `🚚 Envío por encomienda: ${entregaActiva.encomendista}${entregaActiva.agencia_punto ? ` (${entregaActiva.agencia_punto})` : ''}. El envío se le paga directo a la encomendista.`
      : '🏠 Retiro en nuestro punto de entrega.'
    : null;

  return [
    `${ESTADO_PEDIDO_EMOJI[data.estado]} Pedido #${data.numero} — ${ESTADO_PEDIDO_FRASE[data.estado]}`,
    `📅 ${formatDate(data.fecha_creacion)}${plataforma ? ` · ${plataforma}` : ''}`,
    '',
    `Hola ${nombre}, este es el detalle de tu pedido:`,
    '',
    `🛍️ Productos (${data.items.length}):`,
    items,
    '',
    `💰 Total: ${formatCurrency(data.total_pedido)}`,
    `✅ Abonado: ${formatCurrency(data.total_abonado)}`,
    saldoAlDia ? '🎉 ¡Pedido pagado en su totalidad!' : `⏳ Saldo pendiente: ${formatCurrency(data.saldo_pendiente)}`,
    ...(lineaEntrega ? ['', lineaEntrega] : []),
    '',
    '¡Gracias por tu preferencia! 💜',
  ].join('\n');
}

export default function PedidoDetallePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<PedidoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [editandoItemId, setEditandoItemId] = useState<string | null>(null);
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [confirmacion, setConfirmacion] = useState<PopConfirmRequest | null>(null);

  const [editandoCompra, setEditandoCompra] = useState(false);
  const [referenciaCompra, setReferenciaCompra] = useState('');
  const [fechaCompra, setFechaCompra] = useState('');

  const [desistiendo, setDesistiendo] = useState(false);
  const [motivoDesistimiento, setMotivoDesistimiento] = useState('');
  const [itemsDesistidos, setItemsDesistidos] = useState<Record<string, boolean>>({});

  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPagoAbono, setMetodoPagoAbono] = useState<MetodoPagoAbono>('efectivo');
  const [agregandoAbono, setAgregandoAbono] = useState(false);
  const [avisoAbono, setAvisoAbono] = useState<string | null>(null);

  const [montoSaldoFavor, setMontoSaldoFavor] = useState('');
  const [usandoSaldoFavor, setUsandoSaldoFavor] = useState(false);

  const [premiosDisponibles, setPremiosDisponibles] = useState<PremioSticker[]>([]);
  const [aplicandoPremio, setAplicandoPremio] = useState<string | null>(null);
  const [cuponPorPremio, setCuponPorPremio] = useState<Record<string, boolean>>({});

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/pedidos/${params.id}`);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Pedido no encontrado');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pedido');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const cargarPremios = useCallback(async (clienteId: string) => {
    try {
      const res = await fetch(`/api/clientes/${clienteId}/stickers`);
      if (!res.ok) return;
      const json = await res.json();
      const premios = (json.premios_ganados ?? []) as PremioSticker[];
      setPremiosDisponibles(premios.filter((p) => p.estado_canje === 'disponible'));
    } catch {
      // silencioso: los premios son un extra, no bloquean el resto de la página
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (data?.cliente_id) cargarPremios(data.cliente_id);
  }, [data?.cliente_id, cargarPremios]);

  const mensaje = useMemo(() => (data ? construirMensaje(data) : ''), [data]);
  const itemsAplicanCupon = Boolean(data?.plataforma && plataformaAplicaCupon(data.plataforma));
  const nombresItems = useMemo(() => new Map((data?.items ?? []).map((i) => [i.id, i.nombre])), [data?.items]);

  // Toda acción del pedido pasa por aquí: llama a la API y muestra el toast
  // de cargando → éxito/error.
  function llamar<T = unknown>(
    url: string,
    init: RequestInit,
    mensajes: { exito: string | ((data: T) => string); error: string; cargando?: string }
  ) {
    return notificar(pedirApi<T>(url, init, mensajes.error), mensajes);
  }

  async function ejecutar(accion: () => Promise<unknown>) {
    try {
      await accion();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error');
    }
  }

  async function copiarDetalle() {
    await navigator.clipboard.writeText(mensaje);
    notificar.exito('Detalle copiado', 'Listo para pegar en WhatsApp');
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function actualizarPedido(cambios: Record<string, unknown>, exito: string) {
    await llamar(
      `/api/pedidos/${params.id}`,
      { method: 'PATCH', body: JSON.stringify(cambios) },
      { exito, error: 'No se pudo actualizar el pedido' }
    );
  }

  async function cambiarEstado(estado: EstadoPedido) {
    setCambiandoEstado(true);
    await ejecutar(() => actualizarPedido({ estado }, `Pedido ${ESTADO_PEDIDO_FRASE[estado]}`));
    setCambiandoEstado(false);
  }

  async function guardarCompra(e: FormEvent) {
    e.preventDefault();
    await ejecutar(() =>
      actualizarPedido(
        { referencia_compra: referenciaCompra, fecha_compra: fechaCompra || null },
        'Datos de compra guardados'
      )
    );
    setEditandoCompra(false);
  }

  async function agregarItem(datos: ProductoPedidoInput) {
    await llamar(
      `/api/pedidos/${params.id}/items`,
      { method: 'POST', body: JSON.stringify(datos) },
      { exito: `${datos.nombre} agregado al pedido`, error: 'No se pudo agregar el producto' }
    );
    setMostrarAgregar(false);
    await cargar();
  }

  async function guardarItem(itemId: string, datos: ProductoPedidoInput) {
    await llamar(
      `/api/pedidos/${params.id}/items/${itemId}`,
      { method: 'PATCH', body: JSON.stringify({ ...datos, url: datos.url ?? null, imagen_url: datos.imagen_url ?? null }) },
      { exito: `${datos.nombre} actualizado`, error: 'No se pudo guardar el producto' }
    );
    setEditandoItemId(null);
    await cargar();
  }

  function actualizarEstadoItem(itemId: string, estado_item: EstadoItemPedido) {
    ejecutar(() =>
      llamar(
        `/api/pedidos/${params.id}/items/${itemId}`,
        { method: 'PATCH', body: JSON.stringify({ estado_item }) },
        {
          exito: `${nombresItems.get(itemId) ?? 'Producto'}: ${ESTADO_ITEM[estado_item].label.toLowerCase()}`,
          error: 'No se pudo actualizar el estado del producto',
        }
      )
    );
  }

  async function ajustarConCliente(itemId: string, payload: AjusteClientePayload) {
    await llamar(
      `/api/pedidos/${params.id}/items/${itemId}/defecto`,
      { method: 'POST', body: JSON.stringify(payload) },
      { exito: 'Ajuste con el cliente registrado', error: 'No se pudo ajustar el producto' }
    );
    await cargar();
  }

  function eliminarItem(item: PedidoItemDetalle, boton: HTMLElement) {
    setConfirmacion({
      anchor: boton,
      message: `¿Quitar "${item.nombre}" del pedido?`,
      confirmLabel: 'Quitar',
      onConfirm: () =>
        ejecutar(() =>
          llamar(
            `/api/pedidos/${params.id}/items/${item.id}`,
            { method: 'DELETE' },
            { exito: `${item.nombre} quitado del pedido`, error: 'No se pudo quitar el producto' }
          )
        ),
    });
  }

  async function registrarDesistimiento(e: FormEvent) {
    e.preventDefault();
    const ids = Object.entries(itemsDesistidos)
      .filter(([, v]) => v)
      .map(([id]) => id);
    await ejecutar(() =>
      llamar(
        `/api/pedidos/${params.id}/desistimiento`,
        { method: 'POST', body: JSON.stringify({ motivo: motivoDesistimiento, item_ids: ids.length ? ids : undefined }) },
        { exito: 'Desistimiento registrado', error: 'No se pudo registrar el desistimiento' }
      )
    );
    setDesistiendo(false);
    setMotivoDesistimiento('');
    setItemsDesistidos({});
  }

  function revertirDesistimiento(boton: HTMLElement) {
    setConfirmacion({
      anchor: boton,
      message: '¿El cliente sí quiere sus productos? Se revierte el desistimiento.',
      confirmLabel: 'Revertir',
      onConfirm: () =>
        ejecutar(() =>
          llamar(
            `/api/pedidos/${params.id}/desistimiento`,
            { method: 'DELETE' },
            { exito: 'Desistimiento revertido', error: 'No se pudo revertir el desistimiento' }
          )
        ),
    });
  }

  function cancelarPedido(boton: HTMLElement) {
    setConfirmacion({
      anchor: boton,
      message: '¿Cancelar el pedido? Los pagos y productos quedan en el historial.',
      confirmLabel: 'Cancelar pedido',
      onConfirm: () => cambiarEstado('cancelado'),
    });
  }

  async function agregarAbono(e: FormEvent) {
    e.preventDefault();
    if (!(Number(montoAbono) > 0)) return;

    setAgregandoAbono(true);
    setAvisoAbono(null);
    try {
      const json = await llamar<{ excedente: number }>(
        `/api/pedidos/${params.id}/abonos`,
        { method: 'POST', body: JSON.stringify({ monto: Number(montoAbono), metodo_pago: metodoPagoAbono }) },
        { exito: `Abono de ${formatCurrency(Number(montoAbono))} registrado`, error: 'No se pudo registrar el abono' }
      );
      if (json.excedente > 0) {
        setAvisoAbono(
          `Se abonó ${formatCurrency(Number(montoAbono) - json.excedente)} al pedido; ${formatCurrency(json.excedente)} pasó al saldo a favor del cliente.`
        );
      }
      setMontoAbono('');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar abono');
    } finally {
      setAgregandoAbono(false);
    }
  }

  async function usarSaldoFavor(e: FormEvent) {
    e.preventDefault();
    if (!(Number(montoSaldoFavor) > 0)) return;

    setUsandoSaldoFavor(true);
    setAvisoAbono(null);
    try {
      await llamar(
        `/api/pedidos/${params.id}/abonos`,
        { method: 'POST', body: JSON.stringify({ desde_saldo_favor: true, monto: Number(montoSaldoFavor) }) },
        { exito: `${formatCurrency(Number(montoSaldoFavor))} aplicados desde el saldo a favor`, error: 'No se pudo usar el saldo a favor' }
      );
      setMontoSaldoFavor('');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al usar el saldo a favor');
    } finally {
      setUsandoSaldoFavor(false);
    }
  }

  async function aplicarPremio(premioId: string) {
    setAplicandoPremio(premioId);
    try {
      await llamar(
        `/api/pedidos/${params.id}/abonos`,
        { method: 'POST', body: JSON.stringify({ premio_id: premioId, cupon_proveedor: cuponPorPremio[premioId] ?? false }) },
        { exito: 'Premio aplicado al pedido', error: 'No se pudo aplicar el premio' }
      );
      await cargar();
      if (data?.cliente_id) await cargarPremios(data.cliente_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aplicar el premio');
    } finally {
      setAplicandoPremio(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (error && !data)
    return (
      <div role="alert" className="rounded-xl border border-negative-surface bg-negative-surface/40 p-4 text-sm text-negative">
        {error}
      </div>
    );
  if (!data) return null;

  const est = ESTADO_PEDIDO[data.estado];
  const saldado = data.saldo_pendiente <= 0 && data.total_pedido > 0;
  const cerrado = data.estado === 'desistido' || data.estado === 'cancelado';
  const desistidos = data.items.filter((i) => i.desistido_at);
  const desistibles = data.items.filter(
    (i) => !i.desistido_at && !['entregado', 'no_disponible', 'reembolsado'].includes(i.estado_item)
  );
  const hayProductosPorEmbarcar = data.items.some(
    (i) => i.estado_item !== 'no_disponible' && !i.desistido_at && (i.logistica?.cantidad_embarcada ?? 0) < i.cantidad
  );

  return (
    <div className="flex flex-col gap-6">
      <Link href="/pedidos" className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-ink">
        <ChevronLeft size={15} /> Pedidos
      </Link>

      {/* Hero */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          {data.cliente_nombre ? (
            <ClienteAvatar nombre={data.cliente_nombre} size="lg" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-muted-light">#</span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Pedido #{data.numero}</h1>
              <Badge variant={est.badge}>{est.label}</Badge>
              {data.plataforma && <PlataformaBadge plataforma={data.plataforma} />}
            </div>
            {data.cliente_nombre && (
              <p className="mt-0.5 truncate text-sm text-muted">
                {data.cliente_id ? (
                  <Link href={`/clientes/${data.cliente_id}`} className="font-medium text-primary hover:underline">
                    {data.cliente_nombre}
                  </Link>
                ) : (
                  data.cliente_nombre
                )}
                {data.cliente_lugar && ` · ${data.cliente_lugar}`}
              </p>
            )}
            <p className="text-xs text-muted-light">
              {codigoPedido(data.numero)} · creado el {formatDate(data.fecha_creacion)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {data.cliente_telefono && (
            <a
              href={whatsappUrl(data.cliente_telefono)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-positive px-4 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-95"
            >
              <MessageCircle size={15} /> WhatsApp
            </a>
          )}
          <Button type="button" variant="secondary" onClick={copiarDetalle}>
            {copiado ? <Check size={15} /> : <Copy size={15} />}
            {copiado ? 'Copiado' : 'Copiar detalle'}
          </Button>
        </div>
      </div>

      {/* Pedido viejo sin plataforma: se elige una */}
      {!data.plataforma && (
        <div className="flex flex-col gap-2 rounded-2xl border border-warning/40 bg-warning-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-warning">Este pedido no tiene plataforma. Cada pedido pertenece a una sola:</p>
          <div className="flex gap-2">
            {PLATAFORMAS.map((p: Plataforma) => (
              <Button
                key={p}
                type="button"
                variant="secondary"
                onClick={() => ejecutar(() => actualizarPedido({ plataforma: p }, `Plataforma: ${NOMBRE_PLATAFORMA[p]}`))}
              >
                {NOMBRE_PLATAFORMA[p]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Desistimiento / cancelación */}
      {(cerrado || desistidos.length > 0) && (
        <div className="flex flex-col gap-2 rounded-2xl border border-negative/30 bg-negative-surface/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-negative">
            <p className="font-medium">
              {data.estado === 'cancelado'
                ? 'Pedido cancelado.'
                : data.estado === 'desistido'
                  ? 'El cliente desistió del pedido.'
                  : `El cliente desistió de ${desistidos.length === 1 ? '1 producto' : `${desistidos.length} productos`}.`}
            </p>
            {data.motivo_desistimiento && <p className="text-xs">Motivo: {data.motivo_desistimiento}</p>}
            <p className="text-xs text-negative/80">Pagos, productos e historial se conservan.</p>
          </div>
          {data.estado !== 'cancelado' && (
            <Button type="button" variant="secondary" onClick={(e) => revertirDesistimiento(e.currentTarget)}>
              <RotateCcw size={14} /> Revertir desistimiento
            </Button>
          )}
        </div>
      )}

      {/* Estado */}
      <Panel
        title="Estado del pedido"
        action={
          !cerrado && (
            <div className="flex flex-wrap gap-1">
              {desistibles.length > 0 && (
                <Button type="button" variant="ghost" onClick={() => setDesistiendo((v) => !v)}>
                  <Hand size={14} /> Cliente desiste
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={(e) => cancelarPedido(e.currentTarget)}>
                <Ban size={14} /> Cancelar
              </Button>
            </div>
          )
        }
      >
        {!cerrado && <EstadoStepper
            actual={data.estado}
            onChange={cambiarEstado}
            disabled={cambiandoEstado}
            sinProductos={data.items.length === 0}
          />}

        {desistiendo && (
          <form onSubmit={registrarDesistimiento} className="mt-4 flex flex-col gap-3 rounded-xl border border-negative/30 p-4">
            <p className="text-xs text-muted">
              No es una cancelación: se conservan pagos, productos e historial. Marcá qué productos ya no quiere (ninguno =
              todo lo que falta entregar).
            </p>
            <div className="flex flex-col gap-1.5">
              {desistibles.map((i) => (
                <label key={i.id} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={itemsDesistidos[i.id] ?? false}
                    onChange={(e) => setItemsDesistidos((prev) => ({ ...prev, [i.id]: e.target.checked }))}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                  />
                  {i.nombre} {i.cantidad > 1 && <span className="text-muted-light">×{i.cantidad}</span>}
                </label>
              ))}
            </div>
            <Input
              label="Motivo (opcional)"
              placeholder="Ya no lo quiere, no llegó a recoger…"
              value={motivoDesistimiento}
              onChange={(e) => setMotivoDesistimiento(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="submit" variant="danger">
                Registrar desistimiento
              </Button>
              <Button type="button" variant="ghost" onClick={() => setDesistiendo(false)}>
                Cerrar
              </Button>
            </div>
          </form>
        )}

        {/* Compra en la plataforma */}
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          {editandoCompra ? (
            <form onSubmit={guardarCompra} className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
              <Input
                label="Nº de orden en la plataforma"
                value={referenciaCompra}
                onChange={(e) => setReferenciaCompra(e.target.value)}
                className="sm:w-56"
              />
              <Input label="Fecha de compra" type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} />
              <Button type="submit">Guardar</Button>
              <Button type="button" variant="ghost" onClick={() => setEditandoCompra(false)}>
                Cancelar
              </Button>
            </form>
          ) : (
            <>
              <span className="flex items-center gap-2 text-muted">
                <ShoppingBag size={15} className="text-muted-light" />
                {data.referencia_compra || data.fecha_compra ? (
                  <>
                    Compra {data.referencia_compra && <strong className="font-medium text-ink">{data.referencia_compra}</strong>}
                    {data.fecha_compra && ` · ${formatDia(data.fecha_compra)}`}
                  </>
                ) : (
                  'Sin datos de la compra en la plataforma'
                )}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setReferenciaCompra(data.referencia_compra ?? '');
                    setFechaCompra(data.fecha_compra ?? '');
                    setEditandoCompra(true);
                  }}
                >
                  <Pencil size={13} /> Editar
                </Button>
                {hayProductosPorEmbarcar && !cerrado && (
                  <Link href="/embarques/nuevo">
                    <Button type="button" variant="secondary">
                      <Truck size={14} /> Nuevo embarque
                    </Button>
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </Panel>

      {/* Productos */}
      <Panel
        title={`Productos${data.items.length ? ` (${data.items.length})` : ''}`}
        action={
          !mostrarAgregar &&
          !cerrado && (
            <Button type="button" variant="secondary" onClick={() => setMostrarAgregar(true)}>
              <Plus size={15} /> Agregar
            </Button>
          )
        }
      >
        {data.items.length === 0 && !mostrarAgregar ? (
          <p className="text-sm text-muted-light">Sin productos agregados.</p>
        ) : (
          <ul className="flex flex-col gap-4 text-sm">
            {data.items.map((item) => {
              const estadoItem = ESTADO_ITEM[item.estado_item];
              const conLogistica = item.lineas.length > 0 || (item.logistica?.cantidad_entregada ?? 0) > 0;
              const totalItem = item.precio_venta * item.cantidad;
              if (editandoItemId === item.id) {
                return (
                  <li key={item.id}>
                    <ProductoPedidoForm
                      item={item}
                      cantidadMinima={Math.max(item.logistica?.cantidad_embarcada ?? 0, 1)}
                      onGuardar={(datos) => guardarItem(item.id, datos)}
                      onCancelar={() => setEditandoItemId(null)}
                    />
                  </li>
                );
              }
              return (
                <li key={item.id} className="flex items-start gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
                  <MiniaturaArticulo src={item.imagen_url} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-ink">
                        <span className="font-medium">{item.nombre}</span>
                        {item.cantidad > 1 && <span className="text-muted-light">×{item.cantidad}</span>}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex text-muted-light hover:text-primary"
                            title="Ver producto original"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {item.plataforma_origen &&
                          data.plataforma &&
                          item.plataforma_origen.trim().toUpperCase() !== data.plataforma && (
                            <span className="rounded bg-surface px-1 text-[10px] text-muted-light" title="Plataforma original (pedido viejo)">
                              orig. {item.plataforma_origen}
                            </span>
                          )}
                      </span>
                      {!cerrado && (
                        <div className="flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={() => setEditandoItemId(item.id)}
                            className="rounded-lg p-2.5 text-muted-light hover:bg-surface hover:text-muted"
                            aria-label="Editar producto"
                          >
                            <Pencil size={13} />
                          </button>
                          {!conLogistica && (
                            <button
                              type="button"
                              onClick={(e) => eliminarItem(item, e.currentTarget)}
                              className="rounded-lg p-2.5 text-muted-light hover:bg-negative-surface hover:text-negative"
                              aria-label="Quitar producto"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      {item.monto_reembolsado > 0 ? (
                        <span className="flex items-center gap-1.5 tabular-nums">
                          <span className="text-muted-light line-through">{formatCurrency(totalItem)}</span>
                          <span className="font-medium text-ink">{formatCurrency(totalItem - item.monto_reembolsado)}</span>
                          <span className="text-negative">−{formatCurrency(item.monto_reembolsado)} ajuste</span>
                        </span>
                      ) : (
                        <span className="font-medium text-ink tabular-nums">
                          {formatCurrency(totalItem)}
                          {item.cantidad > 1 && (
                            <span className="font-normal text-muted-light"> ({formatCurrency(item.precio_venta)} c/u)</span>
                          )}
                        </span>
                      )}
                      <span className="tabular-nums">
                        compra{' '}
                        {item.precio_compra != null ? (
                          formatCurrency(item.precio_compra * item.cantidad)
                        ) : (
                          <span className="text-warning">sin registrar</span>
                        )}
                      </span>
                      {item.peso_lb != null && <span className="tabular-nums">{item.peso_lb} lb c/u</span>}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {conLogistica || !ESTADOS_ITEM_MANUALES.includes(item.estado_item) || cerrado ? (
                        <Badge variant={estadoItem.badge}>
                          {estadoItem.emoji} {estadoItem.label}
                        </Badge>
                      ) : (
                        <Select
                          value={item.estado_item}
                          onChange={(e) => actualizarEstadoItem(item.id, e.target.value as EstadoItemPedido)}
                          className="w-auto !min-h-9 !py-1.5"
                          aria-label={`Estado de ${item.nombre}`}
                        >
                          {ESTADOS_ITEM_MANUALES.filter((e) => e !== 'defectuoso' || item.estado_item === 'defectuoso').map((e) => (
                            <option key={e} value={e}>
                              {ESTADO_ITEM[e].label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>

                    <ItemTrazabilidad item={item} />

                    {ESTADOS_AJUSTE.includes(item.estado_item) && (
                      <AjusteClientePanel
                        item={item}
                        saldoPendiente={data.saldo_pendiente}
                        onResolver={(payload) => ajustarConCliente(item.id, payload)}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {mostrarAgregar && (
          <div className="mt-4">
            <ProductoPedidoForm onGuardar={agregarItem} onCancelar={() => setMostrarAgregar(false)} />
          </div>
        )}
      </Panel>

      <EntregasPanel pedido={data} onCambio={cargar} />

      {/* Pago */}
      <Panel title="Pago">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Total" value={formatCurrency(data.total_pedido)} />
          <StatTile label="Abonado" value={formatCurrency(data.total_abonado)} />
          <StatTile
            label="Saldo"
            value={formatCurrency(data.saldo_pendiente)}
            tone={saldado ? 'positive' : data.saldo_pendiente > 0 ? 'warning' : 'default'}
          />
        </div>

        <PedidoProgress
          className="mt-4"
          total={data.total_pedido}
          abonado={data.total_abonado}
          saldo={data.saldo_pendiente}
        />

        {data.saldo_pendiente > 0 && premiosDisponibles.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-secondary/20 p-3">
            <p className="text-xs font-semibold text-primary">Premios disponibles del cliente</p>
            {premiosDisponibles.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-1.5 border-b border-border pb-2 text-sm last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted">
                    <Gift size={14} className="text-primary" />
                    {formatCurrency(p.premio_monto)} · {p.stickers_alcanzados} stickers
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => aplicarPremio(p.id)}
                    disabled={aplicandoPremio === p.id || !itemsAplicanCupon}
                    title={itemsAplicanCupon ? undefined : 'Solo aplicable a pedidos de Shein o Temu'}
                  >
                    {aplicandoPremio === p.id ? 'Aplicando…' : 'Aplicar como descuento'}
                  </Button>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-muted-light">
                  <input
                    type="checkbox"
                    checked={cuponPorPremio[p.id] ?? false}
                    onChange={(e) => setCuponPorPremio((prev) => ({ ...prev, [p.id]: e.target.checked }))}
                    className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/30"
                  />
                  Cubierto con cupón del proveedor (no genera egreso)
                </label>
              </div>
            ))}
            {!itemsAplicanCupon && (
              <p className="text-xs text-muted-light">
                Solo aplicable a pedidos de Shein o Temu.
              </p>
            )}
          </div>
        )}

        {data.saldo_pendiente > 0 && data.cliente_saldo_favor > 0 && (
          <form onSubmit={usarSaldoFavor} className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-secondary/20 p-3 sm:flex-row sm:items-end">
            <Input
              label={`Usar saldo a favor (disponible ${formatCurrency(data.cliente_saldo_favor)})`}
              placeholder={`Máx. ${formatCurrency(Math.min(data.cliente_saldo_favor, data.saldo_pendiente))}`}
              type="number"
              inputMode="decimal"
              min="0"
              max={Math.min(data.cliente_saldo_favor, data.saldo_pendiente)}
              step="0.01"
              value={montoSaldoFavor}
              onChange={(e) => setMontoSaldoFavor(e.target.value)}
              className="sm:w-52"
            />
            <Button type="submit" variant="secondary" disabled={usandoSaldoFavor || !(Number(montoSaldoFavor) > 0)}>
              {usandoSaldoFavor ? 'Aplicando…' : 'Usar saldo a favor'}
            </Button>
          </form>
        )}

        {data.saldo_pendiente > 0 ? (
          <form onSubmit={agregarAbono} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input
              label="Registrar abono"
              placeholder={`Máx. ${formatCurrency(data.saldo_pendiente)} (el excedente va al saldo a favor)`}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={montoAbono}
              onChange={(e) => setMontoAbono(e.target.value)}
              className="sm:w-40"
            />
            <Select
              value={metodoPagoAbono}
              onChange={(e) => setMetodoPagoAbono(e.target.value as MetodoPagoAbono)}
              className="sm:w-40"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </Select>
            <Button type="submit" disabled={agregandoAbono || !(Number(montoAbono) > 0)}>
              <Plus size={15} /> {agregandoAbono ? 'Registrando…' : 'Abonar'}
            </Button>
          </form>
        ) : (
          data.total_pedido > 0 && (
            <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-positive">
              <Check size={15} /> Pedido saldado.
            </p>
          )
        )}

        {avisoAbono && (
          <p role="status" aria-live="polite" className="mt-2 text-xs text-primary">
            {avisoAbono}
          </p>
        )}

        {data.abonos.length > 0 && (
          <ul className="mt-4 flex flex-col border-t border-border pt-3 text-sm">
            {data.abonos.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
                <span
                  className={`flex items-center gap-1.5 font-medium tabular-nums ${
                    a.tipo === 'reembolso' ? 'text-negative' : 'text-ink'
                  }`}
                >
                  {a.tipo === 'reembolso' && <Undo2 size={13} />}
                  {a.premio_id && <Gift size={13} className="text-primary" />}
                  {a.tipo === 'reembolso' ? '−' : ''}
                  {formatCurrency(a.monto)}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-light">
                  {a.tipo === 'reembolso' ? (
                    'Reembolso al cliente'
                  ) : a.premio_id ? (
                    'Premio canjeado'
                  ) : a.origen === 'saldo_favor' ? (
                    'Saldo a favor'
                  ) : (
                    <MetodoPagoBadge metodo={a.metodo_pago} />
                  )}
                  <span>{formatDate(a.fecha_abono)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {data.rentabilidad && <RentabilidadPanel r={data.rentabilidad} estado={data.estado} />}

      <HistorialPanel historial={data.historial} nombres={nombresItems} />

      {error && (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      )}

      <PopConfirm request={confirmacion} onClose={() => setConfirmacion(null)} />
    </div>
  );
}
