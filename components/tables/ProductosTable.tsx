import Link from 'next/link';
import Image from 'next/image';
import { AlertTriangle, Pencil, Package, PackagePlus } from 'lucide-react';
import { Producto } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';

function ImagenProducto({ producto, size }: { producto: Producto; size: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-secondary/60 bg-surface"
      style={{ width: size, height: size }}
    >
      {producto.imagen_url ? (
        <Image
          src={producto.imagen_url}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <Package size={size * 0.4} className="text-muted-light" />
      )}
    </div>
  );
}

export function ProductosTable({ productos }: { productos: Producto[] }) {
  if (productos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-secondary py-16 text-center">
        <p className="text-sm text-muted-light">No hay productos registrados todavía.</p>
      </div>
    );
  }

  return (
    <>
      {/* Móvil: tarjetas */}
      <ul className="flex flex-col gap-3 md:hidden">
        {productos.map((p) => (
          <li key={p.id} className="rounded-2xl border border-secondary/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <ImagenProducto producto={p} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium text-ink">{p.nombre}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      p.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-surface text-muted'
                    }`}
                  >
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-xs text-muted-light">
                  {p.sku} {p.categoria && `· ${p.categoria}`}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-sm">
                  <span className="font-medium text-ink">{formatCurrency(p.precio_venta)}</span>
                  <span className={p.stock_actual <= p.stock_minimo ? 'font-semibold text-red-600' : 'text-muted'}>
                    Stock: {p.stock_actual}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-secondary/60 pt-3">
              <Link
                href={`/productos/${p.id}`}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-primary"
              >
                <Pencil size={14} /> Editar
              </Link>
              <Link
                href={`/productos/${p.id}/abastecer`}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-secondary/50 text-sm font-medium text-primary"
              >
                <PackagePlus size={14} /> Abastecer
              </Link>
              <Link
                href={`/productos/${p.id}/merma`}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-red-50 text-sm font-medium text-red-700"
              >
                <AlertTriangle size={14} /> Dañado
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla */}
      <div className="hidden overflow-hidden rounded-2xl border border-secondary/70 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-secondary/60">
              <th className="px-5 py-3" />
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">SKU</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Nombre</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Categoría</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Precio venta</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Stock</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Estado</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-b border-secondary/60 last:border-0 hover:bg-surface/60">
                <td className="px-5 py-3">
                  <ImagenProducto producto={p} size={36} />
                </td>
                <td className="px-5 py-3 font-mono text-xs text-muted-light">{p.sku}</td>
                <td className="px-5 py-3 font-medium text-ink">{p.nombre}</td>
                <td className="px-5 py-3 text-muted">{p.categoria ?? '—'}</td>
                <td className="px-5 py-3 text-muted">{formatCurrency(p.precio_venta)}</td>
                <td className={`px-5 py-3 ${p.stock_actual <= p.stock_minimo ? 'font-semibold text-red-600' : 'text-muted'}`}>
                  {p.stock_actual}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      p.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-surface text-muted'
                    }`}
                  >
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/productos/${p.id}/merma`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-red-50 hover:text-red-700"
                    >
                      <AlertTriangle size={14} /> Dañado
                    </Link>
                    <Link
                      href={`/productos/${p.id}/abastecer`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-ink"
                    >
                      <PackagePlus size={14} /> Abastecer
                    </Link>
                    <Link
                      href={`/productos/${p.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-ink"
                    >
                      <Pencil size={14} /> Editar
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
