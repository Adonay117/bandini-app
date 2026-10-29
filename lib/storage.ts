import { SupabaseClient } from '@supabase/supabase-js';
import { BucketImagen, rutaEnStorage, rutaMiniatura } from '@/lib/utils/image';

// Solo server-side (recibe el cliente con service role).
//
// Borra del Storage las imágenes (foto + miniatura) que ya no usa ningún
// producto ni artículo de pedido. Se llama después de reemplazar, quitar o
// borrar una imagen, y desde los formularios que descartan subidas sin
// guardar. La verificación de referencias lo hace seguro aunque la misma URL
// siga en uso en otro registro, y las URLs externas se ignoran.
//
// Nunca lanza: si la limpieza falla, la operación principal ya se hizo y lo
// peor que pasa es que el archivo queda huérfano.
export async function borrarImagenesSinUso(
  supabase: SupabaseClient,
  urls: (string | null | undefined)[]
): Promise<void> {
  const origen = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const candidatas = [
    ...new Set(urls.filter((u): u is string => Boolean(u?.startsWith(origen)) && rutaEnStorage(u!) !== null)),
  ];
  if (candidatas.length === 0) return;

  try {
    const [productos, items] = await Promise.all([
      supabase.from('productos').select('imagen_url').in('imagen_url', candidatas),
      supabase.from('pedido_items').select('imagen_url').in('imagen_url', candidatas),
    ]);
    if (productos.error || items.error) throw productos.error ?? items.error;
    const enUso = new Set([...(productos.data ?? []), ...(items.data ?? [])].map((r) => r.imagen_url as string));

    const porBucket = new Map<BucketImagen, string[]>();
    for (const url of candidatas) {
      if (enUso.has(url)) continue;
      const { bucket, ruta } = rutaEnStorage(url)!;
      porBucket.set(bucket, [...(porBucket.get(bucket) ?? []), ruta, rutaMiniatura(ruta)]);
    }

    await Promise.all(
      [...porBucket].map(async ([bucket, rutas]) => {
        const { error } = await supabase.storage.from(bucket).remove(rutas);
        if (error) throw error;
      })
    );
  } catch (err) {
    console.error('No se pudieron borrar imágenes sin uso', err);
  }
}
