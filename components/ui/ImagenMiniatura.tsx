'use client';

import { useState } from 'react';
import Image from 'next/image';
import { urlMiniatura } from '@/lib/utils/image';

interface Props {
  src: string;
  size: number;
  className?: string;
}

// Cuadrito de lista/tabla: carga la miniatura de ~200px en vez de la foto
// completa. Si la miniatura no existe (imagen externa o subida sin ella),
// cae a la foto completa.
export function ImagenMiniatura({ src, size, className = 'h-full w-full object-cover' }: Props) {
  const [srcFallido, setSrcFallido] = useState<string | null>(null);
  const usar = srcFallido === src ? src : urlMiniatura(src);

  return (
    <Image
      src={usar}
      alt=""
      width={size}
      height={size}
      className={className}
      unoptimized
      onError={() => {
        if (usar !== src) setSrcFallido(src);
      }}
    />
  );
}
