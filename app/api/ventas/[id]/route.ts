import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('ventas')
    .select('*, cliente:clientes(nombre), items:venta_items(*, producto:productos(nombre))')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const { cliente, items, ...venta } = data as {
    cliente?: { nombre: string } | null;
    items?: { producto?: { nombre: string } | null; [key: string]: unknown }[];
    [key: string]: unknown;
  };

  return NextResponse.json({
    ...venta,
    cliente_nombre: cliente?.nombre ?? null,
    items: (items ?? []).map(({ producto, ...item }) => ({ ...item, producto_nombre: producto?.nombre ?? null })),
  });
}
