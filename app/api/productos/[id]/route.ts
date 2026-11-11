import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { borrarImagenesSinUso } from '@/lib/storage';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.from('productos').select('*').eq('id', id).single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const supabase = createSupabaseAdminClient();

  // Si cambia la imagen, la anterior se borra del Storage después de guardar.
  const cambiaImagen = 'imagen_url' in body;
  const { data: anterior } = cambiaImagen
    ? await supabase.from('productos').select('imagen_url').eq('id', id).maybeSingle()
    : { data: null };

  const { data, error } = await supabase
    .from('productos')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `Ya existe otro producto con el SKU "${body.sku}". Usa un código diferente.` },
        { status: 409 }
      );
    }
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  if (anterior?.imagen_url && anterior.imagen_url !== data.imagen_url) {
    await borrarImagenesSinUso(supabase, [anterior.imagen_url]);
  }

  return NextResponse.json(data);
}
