import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ProductoThumb } from '@/components/productos/ProductoThumb';
import { Producto } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';

export function ProductosTable({ productos }: { productos: Producto[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {productos.map((p) => {
        const stockBajo = p.stock_actual <= p.stock_minimo;
        return (
          <li key={p.id}>
            <Link
              href={`/productos/${p.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-3 shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-px hover:border-primary/25 hover:shadow-[var(--shadow-card-hover)] sm:px-4"
            >
              <ProductoThumb src={p.imagen_url} size={44} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-ink">{p.nombre}</p>
                  {!p.activo && <Badge>Inactivo</Badge>}
                </div>
                <p className="truncate text-xs text-muted-light">
                  <span className="font-mono">{p.sku}</span>
                  {p.categoria && ` · ${p.categoria}`}
                </p>
                <div className="mt-1 flex items-center gap-2.5 text-xs sm:hidden">
                  <span className="font-semibold text-ink tabular-nums">{formatCurrency(p.precio_venta)}</span>
                  <span className={stockBajo ? 'font-semibold text-negative' : 'text-muted-light'}>
                    {p.stock_actual} en stock
                  </span>
                </div>
              </div>

              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-sm font-semibold text-ink tabular-nums">{formatCurrency(p.precio_venta)}</p>
                <p className="text-[11px] text-muted-light">precio venta</p>
              </div>

              <div className="hidden w-24 shrink-0 text-right sm:block">
                <p
                  className={`text-sm font-semibold tabular-nums ${stockBajo ? 'text-negative' : 'text-ink'}`}
                >
                  {p.stock_actual}
                </p>
                <p className="text-[11px] text-muted-light">
                  {stockBajo ? 'stock bajo' : `mín. ${p.stock_minimo}`}
                </p>
              </div>

              <ChevronRight size={16} className="shrink-0 text-muted-light" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
