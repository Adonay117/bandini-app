'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import NextImage from 'next/image';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Copy,
  ExternalLink,
  Gift,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { MetodoPagoBadge } from '@/components/ui/MetodoPagoBadge';
import { PlataformaBadge } from '@/components/ui/PlataformaBadge';
import { ClienteAvatar } from '@/components/clientes/ClienteAvatar';
import { EstadoStepper } from '@/components/pedidos/EstadoStepper';
import { PedidoProgress } from '@/components/pedidos/PedidoProgress';
import {
  AbonoPedido,
  EstadoItemPedido,
  EstadoPedido,
  MetodoPagoAbono,
  Pedido,
  PedidoItem,
  PremioSticker,
  ResolucionDefecto,
} from '@/lib/types';
import { formatCurrency, formatDate, whatsappUrl } from '@/lib/utils/formatters';
import { comprimirImagen } from '@/lib/utils/image';
import { estiloPlataforma, plataformaAplicaCupon } from '@/lib/utils/plataformas';
import {
  ESTADOS_ITEM,
  ESTADO_ITEM,
  ESTADO_PEDIDO,
  ESTADO_PEDIDO_EMOJI,
  ESTADO_PEDIDO_FRASE,
} from '@/lib/utils/pedidos';

type PedidoDetalle = Pedido & { items: PedidoItem[]; abonos: AbonoPedido[]; cliente_saldo_favor: number };

function agruparPorPlataforma(items: PedidoItem[]): string {
  if (items.length === 0) return '(sin artículos)';

  const grupos = new Map<string, PedidoItem[]>();
  for (const item of items) {
    const clave = item.plataforma || 'Sin plataforma';
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave)!.push(item);
  }

  return Array.from(grupos.keys())
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((plataforma) => {
      const lineas = grupos
        .get(plataforma)!
        .map((i) => {
          const { emoji, label } = ESTADO_ITEM[i.estado_item];
          const precioNeto = i.precio - i.monto_reembolsado;
          return `• ${i.producto} — ${formatCurrency(precioNeto)} ${emoji} ${label.toLowerCase()}`;
        })
        .join('\n');
      return `${estiloPlataforma(plataforma).emoji} *${plataforma}*\n${lineas}`;
    })
    .join('\n\n');
}

function construirMensaje(data: PedidoDetalle): string {
  const items = agruparPorPlataforma(data.items);
  const nombre = data.cliente_nombre ?? 'cliente';
  const saldoAlDia = data.saldo_pendiente <= 0;

  return [
    `${ESTADO_PEDIDO_EMOJI[data.estado]} Pedido #${data.numero} — ${ESTADO_PEDIDO_FRASE[data.estado]}`,
    `📅 ${formatDate(data.fecha_creacion)}`,
    '',
    `Hola ${nombre}, este es el detalle de tu pedido:`,
    '',
    `🛍️ Artículos (${data.items.length}):`,
    items,
    '',
    `💰 Total: ${formatCurrency(data.total_pedido)}`,
    `✅ Abonado: ${formatCurrency(data.total_abonado)}`,
    saldoAlDia
      ? '🎉 ¡Pedido pagado en su totalidad!'
      : `⏳ Saldo pendiente: ${formatCurrency(data.saldo_pendiente)}`,
    '',
    '¡Gracias por tu preferencia! 💜',
  ].join('\n');
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function ImagenArticulo({ imagenUrl, onImagenChange }: { imagenUrl: string; onImagenChange: (url: string) => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    try {
      const comprimida = await comprimirImagen(file);
      const formData = new FormData();
      formData.append('file', comprimida);
      formData.append('bucket', 'pedidos');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const { url: subida } = await res.json();
        onImagenChange(subida);
      }
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
        {subiendo ? (
          <Loader2 size={16} className="animate-spin text-muted-light" />
        ) : imagenUrl ? (
          <NextImage src={imagenUrl} alt="" width={56} height={56} className="h-full w-full object-cover" unoptimized />
        ) : (
          <ImageIcon size={18} className="text-muted-light" />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFile}
          className="hidden"
        />
        <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} disabled={subiendo}>
          {imagenUrl ? 'Cambiar imagen' : 'Subir imagen'}
        </Button>
        {imagenUrl && (
          <button
            type="button"
            onClick={() => onImagenChange('')}
            className="flex w-fit items-center gap-1 text-xs text-muted-light hover:text-negative"
          >
            <X size={11} /> Quitar imagen
          </button>
        )}
      </div>
    </div>
  );
}

function EditarItemForm({
  item,
  onGuardar,
  onCancelar,
}: {
  item: PedidoItem;
  onGuardar: (cambios: {
    plataforma: string;
    producto: string;
    precio: number;
    url?: string;
    imagen_url?: string;
  }) => Promise<void>;
  onCancelar: () => void;
}) {
  const [plataforma, setPlataforma] = useState(item.plataforma);
  const [producto, setProducto] = useState(item.producto);
  const [precio, setPrecio] = useState(String(item.precio));
  const [url, setUrl] = useState(item.url ?? '');
  const [imagenUrl, setImagenUrl] = useState(item.imagen_url ?? '');
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!plataforma.trim() || !producto.trim() || !(Number(precio) >= 0)) return;
    setGuardando(true);
    try {
      await onGuardar({
        plataforma: plataforma.trim(),
        producto: producto.trim(),
        precio: Number(precio),
        url: url.trim() || undefined,
        imagen_url: imagenUrl || undefined,
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-border bg-surface/60 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Input placeholder="Plataforma" value={plataforma} onChange={(e) => setPlataforma(e.target.value)} />
          {plataforma.trim() && <PlataformaBadge plataforma={plataforma.trim()} />}
        </div>
        <Input placeholder="Producto" value={producto} onChange={(e) => setProducto(e.target.value)} />
      </div>
      <Input placeholder="URL del artículo (opcional)" value={url} onChange={(e) => setUrl(e.target.value)} />
      <ImagenArticulo imagenUrl={imagenUrl} onImagenChange={setImagenUrl} />
      <Input
        placeholder="Precio"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={precio}
        onChange={(e) => setPrecio(e.target.value)}
        className="sm:max-w-[160px]"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

interface DefectoPayload {
  resolucion: ResolucionDefecto;
  monto_reembolso?: number;
  plataforma?: string;
  producto?: string;
  precio?: number;
  url?: string;
  imagen_url?: string;
}

function ResolverDefectoPanel({
  item,
  onResolver,
}: {
  item: PedidoItem;
  onResolver: (payload: DefectoPayload) => Promise<void>;
}) {
  const [modo, setModo] = useState<ResolucionDefecto | null>(null);
  const [montoParcial, setMontoParcial] = useState('');
  const [plataforma, setPlataforma] = useState(item.plataforma);
  const [producto, setProducto] = useState('');
  const [precio, setPrecio] = useState(String(item.precio));
  const [url, setUrl] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(payload: DefectoPayload) {
    setEnviando(true);
    setError(null);
    try {
      await onResolver(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al resolver el artículo');
    } finally {
      setEnviando(false);
    }
  }

  async function handleCambio(e: FormEvent) {
    e.preventDefault();
    if (!producto.trim()) return;
    await ejecutar({
      resolucion: 'cambio',
      plataforma: plataforma.trim(),
      producto: producto.trim(),
      precio: Number(precio) || 0,
      url: url.trim() || undefined,
      imagen_url: imagenUrl || undefined,
    });
  }

  const disponibleReembolso = item.precio - item.monto_reembolsado;

  async function handleReembolsoParcial(e: FormEvent) {
    e.preventDefault();
    const monto = Number(montoParcial);
    if (!(monto > 0)) return;
    await ejecutar({ resolucion: 'reembolso_parcial', monto_reembolso: monto });
  }

  return (
    <div className="mt-2 flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning-surface p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
        <AlertTriangle size={13} /> Defectuoso — {formatCurrency(disponibleReembolso)} pendientes de resolver
      </p>

      {modo === null && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setModo('cambio')} disabled={enviando}>
            Cambio de producto
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => ejecutar({ resolucion: 'reembolso_total' })}
            disabled={enviando}
          >
            {enviando ? 'Procesando…' : `Reembolso total (${formatCurrency(disponibleReembolso)})`}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setModo('reembolso_parcial')} disabled={enviando}>
            Reembolso parcial
          </Button>
        </div>
      )}

      {modo === 'cambio' && (
        <form onSubmit={handleCambio} className="flex flex-col gap-2">
          <p className="text-xs text-muted">El proveedor envía un artículo de reemplazo:</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Input placeholder="Plataforma" value={plataforma} onChange={(e) => setPlataforma(e.target.value)} />
              {plataforma.trim() && <PlataformaBadge plataforma={plataforma.trim()} />}
            </div>
            <Input placeholder="Producto de reemplazo" value={producto} onChange={(e) => setProducto(e.target.value)} />
          </div>
          <Input placeholder="URL del artículo (opcional)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <ImagenArticulo imagenUrl={imagenUrl} onImagenChange={setImagenUrl} />
          <Input
            placeholder="Precio"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            className="sm:max-w-[160px]"
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Confirmar cambio'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setModo(null)} disabled={enviando}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {modo === 'reembolso_parcial' && (
        <form onSubmit={handleReembolsoParcial} className="flex flex-col gap-2">
          <p className="text-xs text-muted">
            Monto a devolver al cliente (el resto queda como pérdida del artículo):
          </p>
          <Input
            placeholder={`Máx. ${formatCurrency(disponibleReembolso)}`}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            max={disponibleReembolso}
            value={montoParcial}
            onChange={(e) => setMontoParcial(e.target.value)}
            className="sm:max-w-[160px]"
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Confirmar reembolso'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setModo(null)} disabled={enviando}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-xs text-negative">
          {error}
        </p>
      )}
    </div>
  );
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

  const [plataforma, setPlataforma] = useState('');
  const [producto, setProducto] = useState('');
  const [precio, setPrecio] = useState('');
  const [url, setUrl] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [agregandoItem, setAgregandoItem] = useState(false);

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
    setLoading(true);
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
  const itemsAplicanCupon = useMemo(
    () => (data ? data.items.some((item) => plataformaAplicaCupon(item.plataforma)) : false),
    [data]
  );

  async function copiarDetalle() {
    await navigator.clipboard.writeText(mensaje);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function cambiarEstado(estado: EstadoPedido) {
    setCambiandoEstado(true);
    try {
      const res = await fetch(`/api/pedidos/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cambiar estado');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
    } finally {
      setCambiandoEstado(false);
    }
  }

  async function agregarItem(e: FormEvent) {
    e.preventDefault();
    if (!plataforma.trim() || !producto.trim() || !(Number(precio) >= 0)) return;

    setAgregandoItem(true);
    try {
      const res = await fetch(`/api/pedidos/${params.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plataforma: plataforma.trim(),
          producto: producto.trim(),
          precio: Number(precio),
          url: url.trim() || undefined,
          imagen_url: imagenUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al agregar artículo');
      setPlataforma('');
      setProducto('');
      setPrecio('');
      setUrl('');
      setImagenUrl('');
      setMostrarAgregar(false);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar artículo');
    } finally {
      setAgregandoItem(false);
    }
  }

  async function guardarItem(itemId: string, cambios: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/pedidos/${params.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al guardar artículo');
      setEditandoItemId(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar artículo');
    }
  }

  async function actualizarEstadoItem(itemId: string, estado_item: EstadoItemPedido) {
    try {
      const res = await fetch(`/api/pedidos/${params.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_item }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al actualizar estado');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estado');
    }
  }

  async function resolverDefecto(itemId: string, payload: DefectoPayload) {
    const res = await fetch(`/api/pedidos/${params.id}/items/${itemId}/defecto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Error al resolver el artículo');
    await cargar();
  }

  async function eliminarItem(itemId: string) {
    try {
      const res = await fetch(`/api/pedidos/${params.id}/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al quitar artículo');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al quitar artículo');
    }
  }

  async function agregarAbono(e: FormEvent) {
    e.preventDefault();
    if (!(Number(montoAbono) > 0)) return;

    setAgregandoAbono(true);
    setAvisoAbono(null);
    try {
      const res = await fetch(`/api/pedidos/${params.id}/abonos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: Number(montoAbono), metodo_pago: metodoPagoAbono }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al registrar abono');
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
      const res = await fetch(`/api/pedidos/${params.id}/abonos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desde_saldo_favor: true, monto: Number(montoSaldoFavor) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al usar el saldo a favor');
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
      const res = await fetch(`/api/pedidos/${params.id}/abonos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ premio_id: premioId, cupon_proveedor: cuponPorPremio[premioId] ?? false }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al aplicar el premio');
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

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/pedidos"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
      >
        <ChevronLeft size={15} /> Pedidos
      </Link>

      {/* Hero */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          {data.cliente_nombre ? (
            <ClienteAvatar nombre={data.cliente_nombre} size="lg" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-muted-light">
              #
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Pedido #{data.numero}</h1>
              <Badge variant={est.badge}>{est.label}</Badge>
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
            <p className="text-xs text-muted-light">Creado el {formatDate(data.fecha_creacion)}</p>
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

      {/* Estado */}
      <Panel title="Estado del pedido">
        <EstadoStepper actual={data.estado} onChange={cambiarEstado} disabled={cambiandoEstado} />
      </Panel>

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
                    title={itemsAplicanCupon ? undefined : 'Solo aplicable a pedidos con artículos de Shein o Temu'}
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
                Solo aplicable a pedidos con artículos de Shein o Temu.
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

      {/* Artículos */}
      <Panel
        title={`Artículos${data.items.length ? ` (${data.items.length})` : ''}`}
        action={
          !mostrarAgregar && (
            <Button type="button" variant="secondary" onClick={() => setMostrarAgregar(true)}>
              <Plus size={15} /> Agregar
            </Button>
          )
        }
      >
        {data.items.length === 0 && !mostrarAgregar ? (
          <p className="text-sm text-muted-light">Sin artículos agregados.</p>
        ) : (
          <ul className="flex flex-col gap-3 text-sm">
            {data.items.map((item) =>
              editandoItemId === item.id ? (
                <li key={item.id}>
                  <EditarItemForm
                    item={item}
                    onGuardar={(cambios) => guardarItem(item.id, cambios)}
                    onCancelar={() => setEditandoItemId(null)}
                  />
                </li>
              ) : (
                <li
                  key={item.id}
                  className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
                    {item.imagen_url ? (
                      <NextImage
                        src={item.imagen_url}
                        alt=""
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <ImageIcon size={15} className="text-muted-light" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-ink">
                        <span className="truncate">{item.producto}</span>
                        <PlataformaBadge plataforma={item.plataforma} />
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex align-middle text-muted-light hover:text-primary"
                            title="Ver artículo original"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditandoItemId(item.id)}
                          className="rounded-lg p-2.5 text-muted-light hover:bg-surface hover:text-muted"
                          aria-label="Editar artículo"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarItem(item.id)}
                          className="rounded-lg p-2.5 text-muted-light hover:bg-negative-surface hover:text-negative"
                          aria-label="Quitar artículo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {item.monto_reembolsado > 0 ? (
                        <span className="flex items-center gap-1.5 tabular-nums">
                          <span className="text-muted-light line-through">{formatCurrency(item.precio)}</span>
                          <span className="font-medium text-ink">
                            {formatCurrency(item.precio - item.monto_reembolsado)}
                          </span>
                          <span className="text-xs text-negative">
                            −{formatCurrency(item.monto_reembolsado)} reemb.
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted tabular-nums">{formatCurrency(item.precio)}</span>
                      )}
                      <Select
                        value={item.estado_item}
                        onChange={(e) => actualizarEstadoItem(item.id, e.target.value as EstadoItemPedido)}
                        className="w-auto"
                      >
                        {ESTADOS_ITEM.map((estadoItem) => (
                          <option key={estadoItem} value={estadoItem}>
                            {ESTADO_ITEM[estadoItem].label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {item.estado_item === 'defectuoso' && (
                      <ResolverDefectoPanel item={item} onResolver={(payload) => resolverDefecto(item.id, payload)} />
                    )}
                  </div>
                </li>
              )
            )}
          </ul>
        )}

        {mostrarAgregar && (
          <form
            onSubmit={agregarItem}
            className="mt-3 flex flex-col gap-3 rounded-xl border border-dashed border-border p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted">Agregar artículo</p>
              <button
                type="button"
                onClick={() => setMostrarAgregar(false)}
                className="rounded-lg p-2.5 text-muted-light hover:bg-surface hover:text-muted"
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Input placeholder="Plataforma" value={plataforma} onChange={(e) => setPlataforma(e.target.value)} />
                {plataforma.trim() && <PlataformaBadge plataforma={plataforma.trim()} />}
              </div>
              <Input placeholder="Producto" value={producto} onChange={(e) => setProducto(e.target.value)} />
            </div>
            <Input placeholder="URL del artículo (opcional)" value={url} onChange={(e) => setUrl(e.target.value)} />
            <ImagenArticulo imagenUrl={imagenUrl} onImagenChange={setImagenUrl} />
            <Input
              placeholder="Precio"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="sm:max-w-[160px]"
            />
            <Button type="submit" disabled={agregandoItem} className="w-full sm:w-auto">
              <Plus size={15} /> {agregandoItem ? 'Agregando…' : 'Agregar artículo'}
            </Button>
          </form>
        )}
      </Panel>

      {error && (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
