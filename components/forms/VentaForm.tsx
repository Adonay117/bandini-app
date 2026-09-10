'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, PartyPopper, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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

  function seleccionarCliente(c: Cliente) {
    setClienteSeleccionado(c);
    setClienteQuery(c.nombre);
  }

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

  function actualizarLinea(productoId: string, cambios: Partial<Pick<LineaCarrito, 'cantidad' | 'precioUnitario' | 'descuento'>>) {
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
    lineas.every((l) => l.cantidad >= 1 && l.cantidad <= l.producto.stock_actual && l.precioUnitario > 0 && l.total > 0);

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
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      {/* Cliente */}
      <div className="rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-medium tracking-wide text-muted-light uppercase">¿Quién compra?</h2>
        <div className="relative">
          <Input
            label="Cliente"
            placeholder="Buscar por nombre o teléfono…"
            value={clienteQuery}
            onChange={(e) => {
              setClienteQuery(e.target.value);
              setClienteSeleccionado(null);
            }}
            required
          />
          {clienteSeleccionado && (
            <span className="absolute right-3 top-8 flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Check size={13} /> seleccionado
            </span>
          )}
          {clientesFiltrados.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-secondary bg-white shadow-lg">
              {clientesFiltrados.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="block w-full px-3.5 py-2.5 text-left text-sm hover:bg-surface"
                    onClick={() => seleccionarCliente(c)}
                  >
                    <span className="text-ink">{c.nombre}</span>{' '}
                    <span className="text-muted-light">— {c.telefono}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {loadingClientes && <p className="mt-1 text-xs text-muted-light">Cargando clientes…</p>}
        </div>
      </div>

      {/* Carrito de productos */}
      <div className="rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-medium tracking-wide text-muted-light uppercase">Productos</h2>

        <div className="relative">
          <Input
            placeholder="Buscar producto por nombre o SKU para agregar…"
            value={productoQuery}
            onChange={(e) => setProductoQuery(e.target.value)}
          />
          {productosFiltrados.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-secondary bg-white shadow-lg">
              {productosFiltrados.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={p.stock_actual <= 0}
                    className="block w-full px-3.5 py-2.5 text-left text-sm hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                    onClick={() => agregarProducto(p)}
                  >
                    <span className="text-ink">{p.nombre}</span>{' '}
                    <span className={p.stock_actual <= 0 ? 'text-red-500' : 'text-muted-light'}>
                      — {formatCurrency(p.precio_venta)} · {p.stock_actual <= 0 ? 'sin stock' : `stock ${p.stock_actual}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {loadingProductos && <p className="mt-1 text-xs text-muted-light">Cargando productos…</p>}
        </div>

        {lineas.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-secondary py-8 text-center text-sm text-muted-light">
            Agrega uno o más productos a la venta.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {lineas.map((l) => (
              <li key={l.producto.id} className="rounded-xl border border-secondary/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{l.producto.nombre}</span>
                  <button
                    type="button"
                    onClick={() => quitarLinea(l.producto.id)}
                    className="shrink-0 rounded-lg p-1.5 text-muted-light hover:bg-red-50 hover:text-red-600"
                    aria-label="Quitar producto"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="Cantidad"
                    type="number"
                    min="1"
                    max={l.producto.stock_actual}
                    value={l.cantidad}
                    onChange={(e) => actualizarLinea(l.producto.id, { cantidad: Number(e.target.value) || 0 })}
                  />
                  <Input
                    label="Precio unitario"
                    type="number"
                    min="0"
                    step="0.01"
                    value={l.precioUnitario}
                    onChange={(e) => actualizarLinea(l.producto.id, { precioUnitario: Number(e.target.value) || 0 })}
                  />
                  <Input
                    label="Descuento"
                    type="number"
                    min="0"
                    step="0.01"
                    value={l.descuento}
                    onChange={(e) => actualizarLinea(l.producto.id, { descuento: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className={l.cantidad >= l.producto.stock_actual ? 'font-medium text-amber-600' : 'text-muted-light'}>
                    Stock disponible: {l.producto.stock_actual}
                  </span>
                  <span className="text-muted">Subtotal: {formatCurrency(l.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <Select
            label="Método de pago"
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
          >
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
          </Select>
        </div>
      </div>

      {/* Resumen */}
      <div className="rounded-2xl border border-secondary/70 bg-primary p-6 text-white shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-secondary">
            Total a cobrar <span className="text-secondary/70">({lineas.length} producto{lineas.length !== 1 ? 's' : ''})</span>
          </span>
          <span className="text-2xl font-semibold tracking-tight">{formatCurrency(total)}</span>
        </div>
        {stickersPreview && (
          <p
            className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              stickersPreview.stickersNuevos > 0 ? 'bg-white/10 text-secondary' : 'bg-white/5 text-secondary/70'
            }`}
          >
            {stickersPreview.stickersNuevos > 0 ? (
              <>
                <PartyPopper size={15} className="shrink-0" />
                {clienteSeleccionado?.nombre} ganará {stickersPreview.stickersNuevos} sticker(s) con esta venta.
              </>
            ) : (
              `Faltan ${formatCurrency(stickersPreview.faltante)} para el siguiente sticker.`
            )}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {exito && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <Check size={15} /> Venta creada correctamente.
        </p>
      )}

      <Button type="submit" disabled={!valido || submitting} className="w-full py-2.5">
        <Plus size={16} />
        {submitting ? 'Creando venta…' : 'Crear venta'}
      </Button>
    </form>
  );
}
