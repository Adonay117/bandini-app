import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { ESTADOS_PEDIDO_CERRADOS } from '@/lib/utils/pedidos';
import { codigoDevolucion, codigoEmbarque } from '@/lib/utils/logistica';

// PostgREST devuelve las relaciones a-uno como objeto, pero el tipado
// genérico las ve como posible arreglo.
type Rel<T> = T | T[] | null | undefined;
function uno<T>(r: Rel<T>): T | null {
  return Array.isArray(r) ? (r[0] ?? null) : (r ?? null);
}

interface PedidoRel {
  id: string;
  numero: number;
  plataforma: string | null;
  cliente: Rel<{ nombre: string }>;
}

interface ItemRel {
  id: string;
  nombre: string;
  peso_lb: number | null;
  imagen_url: string | null;
  pedido: Rel<PedidoRel>;
}

interface DevolucionRel {
  numero: number;
  incidencia: Rel<{ tipo: string; linea: Rel<{ embarque: Rel<{ numero: number }>; pedido_item: Rel<ItemRel> }> }>;
}

// Lo que se puede agregar a un embarque nuevo:
//   - productos de pedidos activos (ya confirmados) con unidades sin embarcar;
//   - reposiciones aprobadas por la plataforma que aún no viajan.
export async function GET() {
  const supabase = createSupabaseAdminClient();
  const excluidos = `(${['cotizacion', ...ESTADOS_PEDIDO_CERRADOS].join(',')})`;

  const [items, reposiciones] = await Promise.all([
    supabase
      .from('pedido_items')
      .select(
        'id, nombre, cantidad, peso_lb, imagen_url, estado_item, pedido:pedidos!inner(id, numero, plataforma, estado, cliente:clientes(nombre))'
      )
      .not('pedido.estado', 'in', excluidos)
      .neq('estado_item', 'no_disponible')
      .is('desistido_at', null),
    supabase
      .from('reposiciones')
      .select(
        'id, cantidad, estado, devolucion:devoluciones(numero, incidencia:incidencias(tipo, linea:embarque_items(embarque:embarques(numero), pedido_item:pedido_items(id, nombre, peso_lb, imagen_url, pedido:pedidos(id, numero, plataforma, cliente:clientes(nombre))))))'
      )
      .eq('estado', 'pendiente'),
  ]);

  if (items.error || reposiciones.error) {
    return NextResponse.json({ error: (items.error ?? reposiciones.error)!.message }, { status: 500 });
  }

  const ids = (items.data ?? []).map((i) => i.id);
  const { data: logistica, error: logError } = ids.length
    ? await supabase.from('v_pedido_items_logistica').select('pedido_item_id, cantidad_embarcada').in('pedido_item_id', ids)
    : { data: [], error: null };
  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 });
  }
  const embarcada = new Map((logistica ?? []).map((l) => [l.pedido_item_id, Number(l.cantidad_embarcada)]));

  const productos = (items.data ?? [])
    .map((i) => {
      const pedido = uno(i.pedido as Rel<PedidoRel>);
      return {
        pedido_item_id: i.id,
        nombre: i.nombre,
        imagen_url: i.imagen_url,
        peso_lb: i.peso_lb,
        pendiente: i.cantidad - (embarcada.get(i.id) ?? 0),
        pedido_id: pedido?.id ?? null,
        pedido_numero: pedido?.numero ?? 0,
        plataforma: pedido?.plataforma ?? null,
        cliente_nombre: uno(pedido?.cliente)?.nombre ?? null,
        reposicion_id: null as string | null,
        origen: null as string | null,
      };
    })
    .filter((p) => p.pendiente > 0);

  const repuestos = (reposiciones.data ?? []).flatMap((r) => {
    const dev = uno(r.devolucion as Rel<DevolucionRel>);
    const linea = uno(uno(dev?.incidencia)?.linea);
    const item = uno(linea?.pedido_item);
    const pedido = uno(item?.pedido);
    if (!dev || !item || !pedido) return [];
    return [
      {
        pedido_item_id: item.id,
        nombre: item.nombre,
        imagen_url: item.imagen_url,
        peso_lb: item.peso_lb,
        pendiente: r.cantidad,
        pedido_id: pedido.id,
        pedido_numero: pedido.numero,
        plataforma: pedido.plataforma,
        cliente_nombre: uno(pedido.cliente)?.nombre ?? null,
        reposicion_id: r.id as string | null,
        origen: `Reposición ${codigoDevolucion(dev.numero)} · original en ${codigoEmbarque(uno(linea?.embarque)?.numero ?? 0)}` as
          | string
          | null,
      },
    ];
  });

  const todos = [...repuestos, ...productos].sort(
    (a, b) => a.pedido_numero - b.pedido_numero || a.nombre.localeCompare(b.nombre, 'es')
  );
  return NextResponse.json(todos);
}
