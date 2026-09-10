import { estiloPlataforma } from '@/lib/utils/plataformas';

export function PlataformaBadge({ plataforma }: { plataforma: string }) {
  const { clases, emoji } = estiloPlataforma(plataforma);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${clases}`}>
      {emoji} {plataforma}
    </span>
  );
}
