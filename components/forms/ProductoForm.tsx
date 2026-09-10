'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check, ImagePlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useProductos } from '@/lib/hooks/useProductos';
import { Producto } from '@/lib/types';
import { comprimirImagen } from '@/lib/utils/image';

export function ProductoForm({ producto }: { producto?: Producto }) {
  const router = useRouter();
  const { crearProducto, actualizarProducto } = useProductos();
  const editando = producto !== undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sku, setSku] = useState(producto?.sku ?? '');
  const [nombre, setNombre] = useState(producto?.nombre ?? '');
  const [categoria, setCategoria] = useState(producto?.categoria ?? '');
  const [precioCosto, setPrecioCosto] = useState(producto ? String(producto.precio_costo) : '');
  const [precioVenta, setPrecioVenta] = useState(producto ? String(producto.precio_venta) : '');
  const [stockActual, setStockActual] = useState(producto ? String(producto.stock_actual) : '0');
  const [stockMinimo, setStockMinimo] = useState(producto ? String(producto.stock_minimo) : '0');
  const [activo, setActivo] = useState(producto?.activo ?? true);
  const [imagenUrl, setImagenUrl] = useState(producto?.imagen_url ?? '');
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const valido = sku.trim() !== '' && nombre.trim() !== '' && Number(precioCosto) > 0 && Number(precioVenta) > 0;

  // Al abastecer inventario puede cambiar precio_costo por fuera de este
  // formulario (el padre pasa un nuevo objeto `producto`); resincroniza solo
  // ese campo. Ojo: NO resincronizar todos los campos aquí — eso pisaría
  // cualquier edición en curso del usuario (sku, nombre, etc.) cada vez que
  // cambia la referencia de `producto`, aunque el usuario no haya guardado.
  useEffect(() => {
    if (!producto) return;
    setPrecioCosto(String(producto.precio_costo));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a propósito: solo precio_costo, no producto completo (ver comentario arriba)
  }, [producto?.precio_costo]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoImagen(true);
    setError(null);
    try {
      const comprimida = await comprimirImagen(file);
      const formData = new FormData();
      formData.append('file', comprimida);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al subir la imagen');
      const { url } = await res.json();
      setImagenUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setSubiendoImagen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        sku: sku.trim(),
        nombre: nombre.trim(),
        categoria: categoria.trim() || undefined,
        precio_costo: Number(precioCosto),
        precio_venta: Number(precioVenta),
        stock_minimo: Number(stockMinimo),
        imagen_url: imagenUrl || undefined,
      };

      if (editando) {
        // stock_actual no se edita aquí: se abastece desde el panel de
        // "Abastecer inventario" para que siempre quede registrado en
        // movimientos_inventario.
        await actualizarProducto(producto.id, { ...payload, activo });
        setExito(true);
        setTimeout(() => setExito(false), 2000);
      } else {
        await crearProducto({ ...payload, stock_actual: Number(stockActual) });
        router.push('/productos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar producto');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4 rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted">Imagen</label>
        <div className="flex items-center gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-secondary bg-surface">
            {subiendoImagen ? (
              <Loader2 size={18} className="animate-spin text-muted-light" />
            ) : imagenUrl ? (
              <Image src={imagenUrl} alt="" width={80} height={80} className="h-full w-full object-cover" unoptimized />
            ) : (
              <ImagePlus size={20} className="text-muted-light" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
              id="producto-imagen-input"
            />
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={subiendoImagen}>
              {imagenUrl ? 'Cambiar imagen' : 'Subir imagen'}
            </Button>
            {imagenUrl && (
              <button
                type="button"
                onClick={() => setImagenUrl('')}
                className="flex items-center gap-1 text-xs text-muted-light hover:text-red-600"
              >
                <X size={12} /> Quitar imagen
              </button>
            )}
          </div>
        </div>
      </div>

      <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      <Input label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Precio costo"
          type="number"
          min="0"
          step="0.01"
          value={precioCosto}
          onChange={(e) => setPrecioCosto(e.target.value)}
          required
        />
        <Input
          label="Precio venta"
          type="number"
          min="0"
          step="0.01"
          value={precioVenta}
          onChange={(e) => setPrecioVenta(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {editando ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted">Stock actual</label>
            <p className="rounded-lg border border-secondary bg-surface px-3 py-2 text-sm text-ink">
              {producto.stock_actual}
            </p>
            <p className="text-xs text-muted-light">Usa &quot;Abastecer inventario&quot; abajo para agregar stock.</p>
          </div>
        ) : (
          <Input
            label="Stock actual"
            type="number"
            min="0"
            value={stockActual}
            onChange={(e) => setStockActual(e.target.value)}
          />
        )}
        <Input
          label="Stock mínimo"
          type="number"
          min="0"
          value={stockMinimo}
          onChange={(e) => setStockMinimo(e.target.value)}
        />
      </div>

      {editando && (
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="accent-primary" />
          Producto activo
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {exito && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <Check size={15} /> Cambios guardados.
        </p>
      )}

      <Button type="submit" disabled={!valido || submitting || subiendoImagen}>
        {submitting ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear producto'}
      </Button>
    </form>
  );
}
