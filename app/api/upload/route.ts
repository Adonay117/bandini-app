import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { borrarImagenesSinUso } from '@/lib/storage';
import { rutaMiniatura } from '@/lib/utils/image';

const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5MB
const TAMANO_MAXIMO_MINIATURA = 200 * 1024; // una de 200px pesa unos KB
const BUCKETS_PERMITIDOS = ['productos', 'pedidos'];

// Sube la foto y, si viene, su miniatura con el mismo nombre (`abc.webp` y
// `abc.mini.webp`), para que la URL de la miniatura se derive de la de la foto
// sin guardar otra columna (ver urlMiniatura).
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file');
  const miniatura = formData.get('miniatura');
  const bucketSolicitado = formData.get('bucket');
  const bucket = typeof bucketSolicitado === 'string' && BUCKETS_PERMITIDOS.includes(bucketSolicitado) ? bucketSolicitado : 'productos';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
  }
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return NextResponse.json({ error: 'Formato no permitido (usa PNG, JPG, WEBP o GIF)' }, { status: 400 });
  }
  if (file.size > TAMANO_MAXIMO) {
    return NextResponse.json({ error: 'La imagen no puede pesar más de 5MB' }, { status: 400 });
  }
  if (miniatura !== null && (!(miniatura instanceof File) || miniatura.type !== 'image/webp' || miniatura.size > TAMANO_MAXIMO_MINIATURA)) {
    return NextResponse.json({ error: 'Miniatura inválida' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const extension = file.name.split('.').pop() ?? 'jpg';
  const nombreArchivo = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(nombreArchivo, await file.arrayBuffer(), { contentType: file.type });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (miniatura instanceof File) {
    const { error: errorMini } = await supabase.storage
      .from(bucket)
      .upload(rutaMiniatura(nombreArchivo), await miniatura.arrayBuffer(), { contentType: 'image/webp' });
    if (errorMini) {
      await supabase.storage.from(bucket).remove([nombreArchivo]);
      return NextResponse.json({ error: errorMini.message }, { status: 500 });
    }
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(nombreArchivo);

  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}

// Descarta imágenes subidas desde un formulario que no se guardaron. Solo se
// borran las que ningún producto ni artículo usa.
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const urls = Array.isArray(body?.urls) ? body.urls.filter((u: unknown): u is string => typeof u === 'string') : [];
  if (urls.length === 0 || urls.length > 20) {
    return NextResponse.json({ error: 'Indica entre 1 y 20 URLs' }, { status: 400 });
  }

  await borrarImagenesSinUso(createSupabaseAdminClient(), urls);
  return NextResponse.json({ ok: true });
}
