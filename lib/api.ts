// Llamada a la API interna (/api/*) que lanza un Error con el mensaje que
// devuelve el endpoint cuando la respuesta no es ok. Pensada para combinarse
// con `notificar`, que muestra ese mensaje en el toast de error.
export async function pedirApi<T = unknown>(url: string, init: RequestInit = {}, mensajeError = 'Ocurrió un error'): Promise<T> {
  const esJson = typeof init.body === 'string';
  const res = await fetch(url, {
    ...init,
    headers: esJson ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? mensajeError);
  return json as T;
}
