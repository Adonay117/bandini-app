import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5MB
const BUCKETS_PERMITIDOS = ['productos', 'pedidos'];

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file');
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

  const supabase = createSupabaseAdminClient();
  const extension = file.name.split('.').pop() ?? 'jpg';
  const nombreArchivo = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(nombreArchivo, await file.arrayBuffer(), { contentType: file.type });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(nombreArchivo);

  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
