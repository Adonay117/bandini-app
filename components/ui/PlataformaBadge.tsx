import Image from 'next/image';
import { estiloPlataforma } from '@/lib/utils/plataformas';

export function PlataformaBadge({ plataforma }: { plataforma: string }) {
  const { clases, emoji, logo } = estiloPlataforma(plataforma);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${clases}`}>
      {logo ? (
        <Image
          src={logo}
          alt={plataforma}
          width={56}
          height={14}
          className="h-3.5 w-auto"
          unoptimized
        />
      ) : (
        <>
          {emoji} {plataforma}
        </>
      )}
    </span>
  );
}
