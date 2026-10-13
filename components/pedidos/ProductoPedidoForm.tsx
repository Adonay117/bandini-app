'use client';

import { FormEvent, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ImagenArticulo } from '@/components/pedidos/ImagenArticulo';
import { PedidoItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';

export interface ProductoPedidoInput {
  nombre: string;
  cantidad: number;
  precio_venta: number;
  precio_compra: number | null;
  peso_lb: number | null;
  url?: string;
  imagen_url?: string;
}

const numeroOpcional = (v: string) => (v.trim() === '' ? null : Number(v));

// Alta y edición de un producto del pedido. Precios y peso son UNITARIOS:
// el total del producto es precio × cantidad, y el peso se usa para
// repartir el costo de cada embarque.
export function ProductoPedidoForm({
  item,
  cantidadMinima = 1,
  onGuardar,
  onCancelar,
}: {
  item?: PedidoItem;
  cantidadMinima?: number;
  onGuardar: (datos: ProductoPedidoInput) => Promise<void>;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(item?.nombre ?? '');
  const [cantidad, setCantidad] = useState(String(item?.cantidad ?? 1));
  const [precioVenta, setPrecioVenta] = useState(item ? String(item.precio_venta) : '');
  const [precioCompra, setPrecioCompra] = useState(item?.precio_compra != null ? String(item.precio_compra) : '');
  const [peso, setPeso] = useState(item?.peso_lb != null ? String(item.peso_lb) : '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [imagenUrl, setImagenUrl] = useState(item?.imagen_url ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cantidadNum = Number(cantidad);
  const valido =
    nombre.trim() !== '' &&
    Number.isInteger(cantidadNum) &&
    cantidadNum >= cantidadMinima &&
    precioVenta.trim() !== '' &&
    Number(precioVenta) >= 0 &&
    (precioCompra.trim() === '' || Number(precioCompra) >= 0) &&
    (peso.trim() === '' || Number(peso) >= 0);

  const margenUnitario =
    precioVenta.trim() !== '' && precioCompra.trim() !== '' ? Number(precioVenta) - Number(precioCompra) : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setGuardando(true);
    setError(null);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        cantidad: cantidadNum,
        precio_venta: Number(precioVenta),
        precio_compra: numeroOpcional(precioCompra),
        peso_lb: numeroOpcional(peso),
        url: url.trim() || undefined,
        imagen_url: imagenUrl || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el producto');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-surface/40 p-4">
      <p className="text-xs font-semibold text-muted">{item ? 'Editar producto' : 'Agregar producto'}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_110px]">
        <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus={!item} />
        <Input
          label="Cantidad"
          type="number"
          inputMode="numeric"
          min={cantidadMinima}
          step="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input
          label="Precio venta (c/u)"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={precioVenta}
          onChange={(e) => setPrecioVenta(e.target.value)}
        />
        <Input
          label="Precio compra (c/u)"
          placeholder="En la plataforma"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={precioCompra}
          onChange={(e) => setPrecioCompra(e.target.value)}
        />
        <Input
          label="Peso (lb c/u)"
          placeholder="Para repartir el envío"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.001"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
        />
      </div>
      {cantidadMinima > 1 && (
        <p className="text-xs text-muted-light">Ya se embarcaron {cantidadMinima} unidades: la cantidad no puede ser menor.</p>
      )}
      {margenUnitario != null && (
        <p className={`text-xs ${margenUnitario >= 0 ? 'text-muted' : 'text-negative'}`}>
          Margen antes de envío: {formatCurrency(margenUnitario * (cantidadNum || 0))}
          {cantidadNum > 1 && ` (${formatCurrency(margenUnitario)} c/u)`}
        </p>
      )}
      <Input label="URL del producto (opcional)" value={url} onChange={(e) => setUrl(e.target.value)} />
      <ImagenArticulo imagenUrl={imagenUrl} onImagenChange={setImagenUrl} />
      {error && (
        <p role="alert" className="text-xs text-negative">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={guardando || !valido}>
          {item ? null : <Plus size={15} />}
          {guardando ? 'Guardando…' : item ? 'Guardar cambios' : 'Agregar producto'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
