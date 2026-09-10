import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const visto = request.nextUrl.searchParams.get('visto');

  const supabase = createSupabaseAdminClient();
  let query = supabase.from('notificaciones_admin').select('*').order('fecha_creacion', { ascending: false });

  if (visto !== null) {
    query = query.eq('visto', visto === 'true');
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
