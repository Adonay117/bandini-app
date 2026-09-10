import { ProductoForm } from '@/components/forms/ProductoForm';

export default function NuevoProductoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Nuevo producto</h1>
        <p className="mt-1 text-sm text-muted">Agrega un producto al inventario.</p>
      </div>
      <ProductoForm />
    </div>
  );
}
