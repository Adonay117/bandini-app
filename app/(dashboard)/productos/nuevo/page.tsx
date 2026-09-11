import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ProductoForm } from '@/components/forms/ProductoForm';

export default function NuevoProductoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/productos"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ChevronLeft size={15} /> Productos
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Nuevo producto</h1>
        <p className="mt-1 text-sm text-muted">El SKU debe ser único. El stock luego se ajusta con abastecimientos y mermas.</p>
      </div>
      <div className="max-w-lg">
        <ProductoForm />
      </div>
    </div>
  );
}
