import Image from 'next/image';
import { estiloPlataforma, nombrePlataforma } from '@/lib/utils/plataformas';

interface Props {
  plataforma: string;
  /** Alto del logo en px; el ancho sigue la proporción de cada marca. */
  alto?: number;
  className?: string;
}

// Logo de la marca para gráficos y tarjetas. Las plataformas sin logo
// ("otras" o texto libre) se muestran con su nombre en texto.
export function PlataformaLogo({ plataforma, alto = 16, className = '' }: Props) {
  const { logo } = estiloPlataforma(plataforma);
  const nombre = nombrePlataforma(plataforma);

  if (!logo) {
    return (
      <span className={`font-semibold text-ink ${className}`} style={{ fontSize: Math.round(alto * 0.9), lineHeight: `${alto}px` }}>
        {nombre}
      </span>
    );
  }

  return (
    <Image
      src={logo}
      alt={nombre}
      width={alto * 5}
      height={alto}
      className={`w-auto object-contain object-left ${className}`}
      style={{ height: alto }}
      unoptimized
    />
  );
}
