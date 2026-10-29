'use client';

import { useEffect, useRef } from 'react';
import { descartarImagenes } from '@/lib/utils/image';

/**
 * Lleva la cuenta de las imágenes que un formulario subió y, al desmontarse,
 * pide descartarlas. El servidor solo borra las que no quedaron guardadas en
 * ningún producto o artículo, así que cubre los dos casos de huérfanas del
 * formulario sin tener que distinguirlos: la que se reemplazó por otra antes
 * de guardar y la de un formulario que se canceló.
 */
export function useSubidasImagen() {
  const subidas = useRef<string[]>([]);

  useEffect(() => {
    const lista = subidas.current;
    return () => descartarImagenes(lista);
  }, []);

  return {
    registrar(url: string) {
      subidas.current.push(url);
    },
  };
}
