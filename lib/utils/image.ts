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

  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * escala);
  const height = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', calidad));
  if (!blob) return file;

  const nombreBase = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${nombreBase}.webp`, { type: 'image/webp' });
}
