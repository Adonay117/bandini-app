'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Banknote, Check, CreditCard, LucideIcon, PartyPopper, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ClienteAvatar } from '@/components/clientes/ClienteAvatar';
import { StickerProgress } from '@/components/clientes/StickerProgress';
import { ProductoThumb } from '@/components/productos/ProductoThumb';
import { useClientes } from '@/lib/hooks/useClientes';
import { useProductos } from '@/lib/hooks/useProductos';
import { useVentas } from '@/lib/hooks/useVentas';
import { Cliente, MetodoPago, Producto } from '@/lib/types';
import { calcularStickers, formatCurrency, montoFaltanteParaSiguienteSticker } from '@/lib/utils/formatters';

interface LineaCarrito {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
}

const METODOS: { id: MetodoPago; label: string; icon: LucideIcon }[] = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'transferencia', label: 'Transferencia', icon: ArrowLeftRight },
];

function Seccion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="mb-4 text-sm font-semibold text-ink">{title}</h2>
      {children}
    </div>
  );
}

export function VentaForm() {
  const router = useRouter();
  const { clientes, loading: loadingClientes } = useClientes();
  const { productos, loading: loadingProductos } = useProductos();
  const { crearVenta } = useVentas();

  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  const [productoQuery, setProductoQuery] = useState('');
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const clientesFiltrados = useMemo(() => {
    if (!clienteQuery || clienteSeleccionado) return [];
    const q = clienteQuery.toLowerCase();
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q) || c.telefono.includes(q)).slice(0, 6);
  }, [clienteQuery, clienteSeleccionado, clientes]);

  const productosFiltrados = useMemo(() => {
    if (!productoQuery) return [];
    const q = productoQuery.toLowerCase();
    return productos
      .filter((p) => p.activo && (p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [productoQuery, productos]);

  function agregarProducto(p: Producto) {
    if (p.stock_actual <= 0) return;
    setCarrito((prev) => {
      const existente = prev.find((l) => l.producto.id === p.id);
      if (existente) {
        if (existente.cantidad >= p.stock_actual) return prev;
        return prev.map((l) => (l.producto.id === p.id ? { ...l, cantidad: l.cantidad + 1 } : l));
      }
      return [...prev, { producto: p, cantidad: 1, precioUnitario: p.precio_venta, descuento: 0 }];
    });
    setProductoQuery('');
  }

  function actualizarLinea(
    productoId: string,
    cambios: Partial<Pick<LineaCarrito, 'cantidad' | 'precioUnitario' | 'descuento'>>
  ) {
    setCarrito((prev) =>
      prev.map((l) => {
        if (l.producto.id !== productoId) return l;
        const actualizada = { ...l, ...cambios };
        if (cambios.cantidad !== undefined) {
          actualizada.cantidad = Math.min(Math.max(cambios.cantidad, 0), l.producto.stock_actual);
        }
        return actualizada;
      })
    );
  }

  function quitarLinea(productoId: string) {
    setCarrito((prev) => prev.filter((l) => l.producto.id !== productoId));
  }

  const lineas = carrito.map((l) => ({ ...l, total: l.precioUnitario * l.cantidad - l.descuento }));
  const total = Math.max(0, lineas.reduce((s, l) => s + l.total, 0));

  const stickersPreview = useMemo(() => {
    if (!clienteSeleccionado || total <= 0) return null;
    const montoNuevo = clienteSeleccionado.monto_acumulado_tarjeta + total;
    const stickersNuevos = calcularStickers(montoNuevo) - clienteSeleccionado.stickers_actuales;
    const faltante = montoFaltanteParaSiguienteSticker(montoNuevo);
    return { stickersNuevos: Math.max(0, stickersNuevos), faltante };
  }, [clienteSeleccionado, total]);

  const valido =
    clienteSeleccionado !== null &&
    lineas.length > 0 &&
    lineas.every(
      (l) => l.cantidad >= 1 && l.cantidad <= l.producto.stock_actual && l.precioUnitario > 0 && l.total > 0
    );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido || !clienteSeleccionado) return;

    setSubmitting(true);
    setError(null);
    try {
      await crearVenta({
        cliente_id: clienteSeleccionado.id,
        metodo_pago: metodoPago,
        items: lineas.map((l) => ({
          producto_id: l.producto.id,
          cantidad: l.cantidad,
          precio_unitario: l.precioUnitario,
          descuento: l.descuento,
        })),
      });
      setExito(true);
      setTimeout(() => router.push('/ventas'), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear venta');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      {/* Cliente */}
      <Seccion title="¿Quién compra?">
        {clienteSeleccionado ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3">
            <ClienteAvatar nombre={clienteSeleccionado.nombre} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{clienteSeleccionado.nombre}</p>
              <p className="truncate text-xs text-muted-light">{clienteSeleccionado.telefono}</p>
              <div className="mt-1">
                <StickerProgress actuales={clienteSeleccionado.stickers_actuales} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setClienteSeleccionado(null);
                setClienteQuery('');
              }}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-secondary/50"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="relative">
            <SearchInput
              value={clienteQuery}
              onChange={setClienteQuery}
              placeholder="Buscar cliente por nombre o teléfono…"
            />
            {clientesFiltrados.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-pop)]">
                {clientesFiltrados.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface"
                      onClick={() => {
                        setClienteSeleccionado(c);
                        setClienteQuery('');
                      }}
                    >
                      <ClienteAvatar nombre={c.nombre} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{c.nombre}</span>
                        <span className="block truncate text-xs text-muted-light">{c.telefono}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-light tabular-nums">
                        {c.stickers_actuales}/10
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {loadingClientes && <p className="mt-1.5 text-xs text-muted-light">Cargando clientes…</p>}
            {!loadingClientes && clienteQuery && clientesFiltrados.length === 0 && (
              <p className="mt-1.5 text-xs text-muted-light">Ningún cliente coincide.</p>
            )}
          </div>
        )}
      </Seccion>

      {/* Productos */}
      <Seccion title="Productos">
        <div className="relative">
          <SearchInput
            value={productoQuery}
            onChange={setProductoQuery}
            placeholder="Buscar producto por nombre o SKU…"
          />
          {productosFiltrados.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-pop)]">
              {productosFiltrados.map((p) => {
                const sinStock = p.stock_actual <= 0;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={sinStock}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                      onClick={() => agregarProducto(p)}
                    >
                      <ProductoThumb src={p.imagen_url} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{p.nombre}</span>
                        <span className={`block text-xs ${sinStock ? 'text-negative' : 'text-muted-light'}`}>
                          {formatCurrency(p.precio_venta)} · {sinStock ? 'sin stock' : `stock ${p.stock_actual}`}
                        </span>
                      </span>
                      <Plus size={15} className="shrink-0 text-muted-light" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {loadingProductos && <p className="mt-1.5 text-xs text-muted-light">Cargando productos…</p>}
        </div>

        {lineas.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-light">
            Agregá uno o más productos a la venta.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {lineas.map((l) => {
              const topeStock = l.cantidad >= l.producto.stock_actual;
              return (
                <li key={l.producto.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-3">
                    <ProductoThumb src={l.producto.imagen_url} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink">{l.producto.nombre}</span>
                        <button
                          type="button"
                          onClick={() => quitarLinea(l.producto.id)}
                          className="-mt-1 shrink-0 rounded-lg p-1.5 text-muted-light hover:bg-negative-surface hover:text-negative"
                          aria-label="Quitar producto"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <p className={`mt-0.5 text-xs ${topeStock ? 'font-medium text-warning' : 'text-muted-light'}`}>
                        {topeStock ? 'Máximo disponible' : `Stock disponible: ${l.producto.stock_actual}`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted">Cantidad</label>
                      <QuantityStepper
                        value={l.cantidad}
                        onChange={(n) => actualizarLinea(l.producto.id, { cantidad: n })}
                        min={1}
                        max={l.producto.stock_actual}
                      />
                    </div>
                    <Input
                      label="Precio unit."
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.precioUnitario}
                      onChange={(e) => actualizarLinea(l.producto.id, { precioUnitario: Number(e.target.value) || 0 })}
                      className="w-20"
                    />
                    <Input
                      label="Descuento"
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.descuento}
                      onChange={(e) => actualizarLinea(l.producto.id, { descuento: Number(e.target.value) || 0 })}
                      className="w-20"
                    />
                    <div className="ml-auto text-right">
                      <p className="text-xs text-muted-light">Subtotal</p>
                      <p className="text-sm font-semibold text-ink tabular-nums">{formatCurrency(l.total)}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted">Método de pago</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {METODOS.map((m) => {
              const Icon = m.icon;
              const activo = metodoPago === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetodoPago(m.id)}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors ${
                    activo
                      ? 'border-primary bg-secondary/50 text-primary'
                      : 'border-border bg-white text-muted hover:bg-surface'
                  }`}
                >
                  <Icon size={15} /> {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </Seccion>

      {/* Resumen */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-5 text-white shadow-[var(--shadow-card)] sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-14 h-44 w-44 rounded-full bg-white/[0.06]"
        />
        <div className="relative flex items-baseline justify-between gap-3">
          <span className="text-sm text-white/70">
            Total a cobrar
            <span className="text-white/45">
              {' '}
              · {lineas.length} producto{lineas.length !== 1 ? 's' : ''}
            </span>
          </span>
          <span className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{formatCurrency(total)}</span>
        </div>
        {stickersPreview && (
          <p className="relative mt-3 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/85">
            {stickersPreview.stickersNuevos > 0 ? (
              <>
                <PartyPopper size={15} className="shrink-0" />
                {clienteSeleccionado?.nombre} gana {stickersPreview.stickersNuevos} sticker
                {stickersPreview.stickersNuevos !== 1 ? 's' : ''} con esta venta.
              </>
            ) : (
              `Faltan ${formatCurrency(stickersPreview.faltante)} para el siguiente sticker.`
            )}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}
      {exito && (
        <p className="flex items-center gap-1.5 text-sm text-positive">
          <Check size={15} /> Venta creada correctamente.
        </p>
      )}

      <Button type="submit" disabled={!valido || submitting} className="w-full py-3">
        <Plus size={16} />
        {submitting ? 'Creando venta…' : 'Crear venta'}
      </Button>
    </form>
  );
}
