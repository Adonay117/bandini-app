import { VentaForm } from '@/components/forms/VentaForm';

export default function NuevaVentaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Nueva venta</h1>
        <p className="mt-1 text-sm text-muted">Registra una venta y actualiza stock y stickers automáticamente.</p>
      </div>
      <VentaForm />
    </div>
  );
}
