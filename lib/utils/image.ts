import { pedirApi } from '@/lib/api';

export type BucketImagen = 'productos' | 'pedidos';

/** Lado mayor de la miniatura: cubre cuadritos de hasta ~100px en pantallas 2x. */
const MINIATURA_MAX = 200;

/** Redibuja la imagen en un canvas a `maxDimension` como máximo y la exporta a WebP. */
async function redimensionar(file: File, maxDimension: number, calidad: number, sufijo = ''): Promise<File | null> {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * escala);
  const height = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', calidad));
  if (!blob) return null;

  const nombreBase = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${nombreBase}${sufijo}.webp`, { type: 'image/webp' });
}

/**
 * Redimensiona y recomprime una imagen en el navegador antes de subirla,
 * para que cada foto pese una fracción de lo original y rinda mucho más el
 * 1GB gratis de Supabase Storage.
 */
export async function comprimirImagen(
  file: File,
  { maxDimension = 1000, calidad = 0.8 }: { maxDimension?: number; calidad?: number } = {}
): Promise<File> {
  // GIF se deja intacto (podría ser animado; comprimir lo rompería).
  if (file.type === 'image/gif') return file;
  return (await redimensionar(file, maxDimension, calidad)) ?? file;
}

/**
 * Versión de ~200px (unos KB) para los cuadritos de listas y tablas, que así
 * no descargan la foto completa. De un GIF toma el primer cuadro.
 */
export function crearMiniatura(file: File): Promise<File | null> {
  return redimensionar(file, MINIATURA_MAX, 0.7, '.mini');
}

/** Comprime la imagen, genera su miniatura y sube las dos. Devuelve la URL pública de la foto completa. */
export async function subirImagen(file: File, bucket: BucketImagen): Promise<string> {
  const [comprimida, miniatura] = await Promise.all([comprimirImagen(file), crearMiniatura(file)]);
  const formData = new FormData();
  formData.append('file', comprimida);
  if (miniatura) formData.append('miniatura', miniatura);
  formData.append('bucket', bucket);
  const { url } = await pedirApi<{ url: string }>('/api/upload', { method: 'POST', body: formData }, 'Error al subir la imagen');
  return url;
}

/**
 * Pide borrar imágenes subidas desde un formulario que al final no se usaron
 * (se reemplazaron o se canceló). El servidor solo borra las que ningún
 * producto ni artículo referencia, así que es seguro llamarlo de más.
 * `keepalive` deja que la petición termine aunque la página se esté cerrando.
 */
export function descartarImagenes(urls: string[]): void {
  if (urls.length === 0) return;
  fetch('/api/upload', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
    keepalive: true,
  }).catch(() => {
    // Limpieza de mejor esfuerzo: si falla, el archivo queda huérfano y nada más.
  });
}

const RUTA_PUBLICA = /\/storage\/v1\/object\/public\/(productos|pedidos)\/(.+)$/;

/** Bucket y ruta dentro del bucket de una URL pública de nuestro Storage (null si es una URL externa). */
export function rutaEnStorage(url: string): { bucket: BucketImagen; ruta: string } | null {
  const m = RUTA_PUBLICA.exec(url);
  return m ? { bucket: m[1] as BucketImagen, ruta: m[2] } : null;
}

/** Ruta de la miniatura de un archivo: `abc.webp` → `abc.mini.webp`. */
export function rutaMiniatura(ruta: string): string {
  return ruta.replace(/\.[^./]+$/, '') + '.mini.webp';
}

/** URL de la miniatura de una imagen nuestra; las URLs externas se devuelven tal cual. */
export function urlMiniatura(url: string): string {
  const enStorage = rutaEnStorage(url);
  if (!enStorage || enStorage.ruta.endsWith('.mini.webp')) return url;
  return url.slice(0, url.length - enStorage.ruta.length) + rutaMiniatura(enStorage.ruta);
}
