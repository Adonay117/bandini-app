'use client';

import { useEffect, useRef, useState } from 'react';

/** Ancho en px de un elemento, actualizado con ResizeObserver. Los gráficos
 * SVG lo usan para dibujar a la resolución real del contenedor (0 hasta que
 * se mide en el cliente). */
export function useAnchoElemento<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entrada]) => setAncho(Math.floor(entrada.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, ancho };
}
