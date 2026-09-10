import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { parsePaginacion } from '@/lib/utils/pagination';

function mapVenta(row: Record<string, unknown>) {
  const { cliente, producto, ...venta } = row as {
    cliente?: { nombre: string } | null;
    producto?: { nombre: string } | null;
    [key: string]: unknown;
  };
  return { ...venta, cliente_nombre: cliente?.nombre ?? null, producto_nombre: producto?.nombre ?? null };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const clienteId = params.get('cliente_id');
  const clienteNombre = params.get('cliente')?.trim();
  const productoNombre = params.get('producto')?.trim();
  const metodoPago = params.get('metodo_pago');
  const fecha = params.get('fecha');
  const paginado = params.has('page');

  const supabase = createSupabaseAdminClient();

  function respuestaVacia() {
    if (!paginado) return NextResponse.json([]);
    const { page, pageSize } = parsePaginacion(params);
    return NextResponse.json({ data: [], total: 0, page, pageSize });
  }

  let clienteIds: string[] | null = null;
  if (clienteNombre) {
    const { data, error } = await supabase.from('clientes').select('id').ilike('nombre', `%${clienteNombre}%`);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    clienteIds = (data ?? []).map((c) => c.id);
    if (clienteIds.length === 0) return respuestaVacia();
  }

  let productoIds: string[] | null = null;
  if (productoNombre) {
    const { data, error } = await supabase.from('productos').select('id').ilike('nombre', `%${productoNombre}%`);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    productoIds = (data ?? []).map((p) => p.id);
    if (productoIds.length === 0) return respuestaVacia();
  }

  let query = supabase
    .from('ventas')
    .select('*, cliente:clientes(nombre), producto:productos(nombre)', paginado ? { count: 'exact' } : undefined)
    .order('fecha', { ascending: false });

  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (clienteIds) query = query.in('cliente_id', clienteIds);
  if (productoIds) query = query.in('producto_id', productoIds);
  if (metodoPago) query = query.eq('metodo_pago', metodoPago);
  if (fecha) query = query.gte('fecha', `${fecha}T00:00:00`).lte('fecha', `${fecha}T23:59:59.999`);

  if (paginado) {
    const { page, pageSize, from, to } = parsePaginacion(params);
    const { data, error, count } = await query.range(from, to);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: (data ?? []).map(mapVenta), total: count ?? 0, page, pageSize });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(mapVenta));
}

interface ItemInput {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { cliente_id, metodo_pago, items } = body as { cliente_id: string; metodo_pago?: string; items: ItemInput[] };

  if (!cliente_id) {
    return NextResponse.json({ error: 'cliente_id es obligatorio' }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Debe incluir al menos un producto' }, { status: 400 });
  }

  for (const item of items) {
    if (!item.producto_id) {
      return NextResponse.json({ error: 'Cada producto requiere producto_id' }, { status: 400 });
    }
    if (!(item.cantidad > 0)) {
      return NextResponse.json({ error: 'cantidad debe ser mayor a 0 en todos los productos' }, { status: 400 });
    }
    if (!(item.precio_unitario > 0)) {
      return NextResponse.json({ error: 'precio_unitario debe ser mayor a 0 en todos los productos' }, { status: 400 });
    }
    if ((item.descuento ?? 0) < 0) {
      return NextResponse.json({ error: 'descuento no puede ser negativo' }, { status: 400 });
    }
  }

  const supabase = createSupabaseAdminClient();

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('id')
    .eq('id', cliente_id)
    .single();
  if (clienteError || !cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  // Suma la cantidad pedida por producto (puede repetirse el mismo producto
  // en varias líneas del carrito) para validar el stock una sola vez por producto.
  const cantidadPorProducto = new Map<string, number>();
  for (const item of items) {
    cantidadPorProducto.set(item.producto_id, (cantidadPorProducto.get(item.producto_id) ?? 0) + item.cantidad);
  }

  const { data: productos, error: productosError } = await supabase
    .from('productos')
    .select('id, nombre, stock_actual, activo')
    .in('id', Array.from(cantidadPorProducto.keys()));

  if (productosError) {
    return NextResponse.json({ error: productosError.message }, { status: 500 });
  }

  const productosPorId = new Map((productos ?? []).map((p) => [p.id, p]));

  for (const [productoId, cantidadTotal] of cantidadPorProducto) {
    const producto = productosPorId.get(productoId);
    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    if (!producto.activo) {
      return NextResponse.json({ error: `El producto "${producto.nombre}" no está activo` }, { status: 409 });
    }
    if (producto.stock_actual < cantidadTotal) {
      return NextResponse.json(
        { error: `Stock insuficiente de "${producto.nombre}": disponible ${producto.stock_actual}, solicitado ${cantidadTotal}` },
        { status: 409 }
      );
    }
  }

  const filas = items.map((item) => {
    const descuento = item.descuento ?? 0;
    const total = item.precio_unitario * item.cantidad - descuento;
    return {
      cliente_id,
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      descuento,
      total,
      metodo_pago: metodo_pago ?? null,
    };
  });

  if (filas.some((f) => !(f.total > 0))) {
    return NextResponse.json({ error: 'El total calculado debe ser mayor a 0 en todos los productos' }, { status: 400 });
  }

  const { data: ventas, error: ventaError } = await supabase.from('ventas').insert(filas).select();

  if (ventaError) {
    const status = ventaError.code === '23514' ? 409 : 500;
    return NextResponse.json({ error: ventaError.message }, { status });
  }

  // El trigger registrar_venta_con_stickers ya actualizó stock/stickers/notificaciones
  // para cada fila insertada.
  const { data: clienteActualizado } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', cliente_id)
    .single();

  return NextResponse.json({ ventas, cliente: clienteActualizado }, { status: 201 });
}
