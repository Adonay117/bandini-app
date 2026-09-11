import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ClienteForm } from '@/components/forms/ClienteForm';

export default function NuevoClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/clientes"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ChevronLeft size={15} /> Clientes
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Nuevo cliente</h1>
        <p className="mt-1 text-sm text-muted">
          El teléfono debe ser único. Los stickers y premios se calculan solos con cada venta.
        </p>
      </div>
      <ClienteForm />
    </div>
  );
}
