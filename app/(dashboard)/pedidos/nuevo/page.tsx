import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PedidoForm } from '@/components/forms/PedidoForm';

export default function NuevoPedidoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/pedidos"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ChevronLeft size={15} /> Pedidos
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Nuevo pedido</h1>
        <p className="mt-1 text-sm text-muted">Elegí el cliente para empezar.</p>
      </div>
      <PedidoForm />
    </div>
  );
}
