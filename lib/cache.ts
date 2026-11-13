// Caché en memoria del navegador para "stale-while-revalidate": al volver a una
// pantalla ya visitada se muestra al instante lo último que se cargó y en
// paralelo se pide el dato fresco. Vive solo mientras la pestaña esté abierta.
const MAX_ENTRADAS = 100;
const almacen = new Map<string, unknown>();

export function cacheGet<T>(clave: string): T | undefined {
  return almacen.get(clave) as T | undefined;
}

export function cacheSet(clave: string, valor: unknown) {
  almacen.delete(clave); // reinsertar = más reciente
  almacen.set(clave, valor);
  if (almacen.size > MAX_ENTRADAS) {
    const masVieja = almacen.keys().next().value;
    if (masVieja !== undefined) almacen.delete(masVieja);
  }
}

/** Vacía todo (p. ej. al cerrar sesión, para no mostrar datos del usuario anterior). */
export function cacheClear() {
  almacen.clear();
}
