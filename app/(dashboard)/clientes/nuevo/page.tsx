import { ClienteForm } from '@/components/forms/ClienteForm';

export default function NuevoClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Nuevo cliente</h1>
        <p className="mt-1 text-sm text-muted">Registra un cliente nuevo.</p>
      </div>
      <ClienteForm />
    </div>
  );
}
