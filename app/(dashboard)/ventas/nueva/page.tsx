import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { VentaForm } from '@/components/forms/VentaForm';

export default function NuevaVentaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/ventas"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ChevronLeft size={15} /> Ventas
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Nueva venta</h1>
        <p className="mt-1 text-sm text-muted">El stock y los stickers del cliente se actualizan solos al registrarla.</p>
      </div>
      <VentaForm />
    </div>
  );
}
