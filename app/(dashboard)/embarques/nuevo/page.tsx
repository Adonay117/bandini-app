'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Info, Repeat, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Panel } from '@/components/ui/Panel';
import { PlataformaBadge } from '@/components/ui/PlataformaBadge';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { MiniaturaArticulo } from '@/components/pedidos/ImagenArticulo';
import { ProductoPorEmbarcar } from '@/lib/types';
import { formatCurrency, hoyISO } from '@/lib/utils/formatters';
import { pedirApi } from '@/lib/api';
import { notificar } from '@/lib/notificar';

const clave = (p: ProductoPorEmbarcar) => `${p.pedido_item_id}:${p.reposicion_id ?? ''}`;

export default function NuevoEmbarquePage() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState<ProductoPorEmbarcar[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<Record<string, number>>({});

  const [guia, setGuia] = useState('');
  const [paqueteria, setPaqueteria] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [costo, setCosto] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/embarques/pendientes')
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar productos');
        setPendientes(await res.json());
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar productos'))
      .finally(() => setLoading(false));
  }, []);

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const visibles = q
      ? pendientes.filter(
          (p) =>
            p.nombre.toLowerCase().includes(q) ||
            (p.cliente_nombre ?? '').toLowerCase().includes(q) ||
            String(p.pedido_numero).includes(q)
        )
      : pendientes;
    const mapa = new Map<number, ProductoPorEmbarcar[]>();
    for (const p of visibles) {
      if (!mapa.has(p.pedido_numero)) mapa.set(p.pedido_numero, []);
      mapa.get(p.pedido_numero)!.push(p);
    }
    return [...mapa.entries()];
  }, [pendientes, busqueda]);

  const seleccionados = pendientes.filter((p) => (seleccion[clave(p)] ?? 0) > 0);
  const unidades = seleccionados.reduce((s, p) => s + seleccion[clave(p)], 0);
  const pedidos = new Set(seleccionados.map((p) => p.pedido_numero)).size;
  const todosConPeso = seleccionados.length > 0 && seleccionados.every((p) => Number(p.peso_lb) > 0);
  const pesoTotal = seleccionados.reduce((s, p) => s + Number(p.peso_lb ?? 0) * seleccion[clave(p)], 0);

  function alternar(p: ProductoPorEmbarcar, activo: boolean) {
    setSeleccion((prev) => ({ ...prev, [clave(p)]: activo ? p.pendiente : 0 }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!paqueteria.trim() || seleccionados.length === 0) return;
    setGuardando(true);
    setError(null);
    try {
      const json = await notificar(
        pedirApi<{ id: string }>(
          '/api/embarques',
          {
            method: 'POST',
            body: JSON.stringify({
              guia,
              paqueteria,
              fecha_envio: fecha,
              costo_total: Number(costo || 0),
              nota,
              lineas: seleccionados.map((p) => ({
                pedido_item_id: p.pedido_item_id,
                reposicion_id: p.reposicion_id,
                cantidad: seleccion[clave(p)],
              })),
            }),
          },
          'Error al crear el embarque'
        ),
        {
          cargando: 'Creando embarque…',
          exito: `Embarque creado con ${seleccionados.length} producto${seleccionados.length === 1 ? '' : 's'}`,
          error: 'No se pudo crear el embarque',
        }
      );
      router.push(`/embarques/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el embarque');
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Link href="/embarques" className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-ink">
        <ChevronLeft size={15} /> Embarques
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Nuevo embarque</h1>
        <p className="mt-1 text-sm text-muted">
          Un paquete puede llevar productos de varios pedidos y reposiciones de la plataforma.
        </p>
      </div>

      <Panel title="Paquete">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Paquetería / encomendista" value={paqueteria} onChange={(e) => setPaqueteria(e.target.value)} required />
          <Input label="Número de guía (opcional)" value={guia} onChange={(e) => setGuia(e.target.value)} />
          <Input label="Fecha de envío" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Input
            label="Costo total cobrado por traerlo"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-light">
          <Info size={13} className="mt-px shrink-0" />
          El costo es un egreso real del negocio (aunque el cliente no lo pague) y se reparte entre los productos recibidos
          por peso{seleccionados.length > 0 && !todosConPeso ? ' — como hay productos sin peso, se repartirá por unidades' : ''}.
        </p>
      </Panel>

      <Panel
        title="Productos por embarcar"
        action={<SearchInput value={busqueda} onChange={setBusqueda} placeholder="Producto, cliente o #pedido…" className="w-full sm:w-64" />}
      >
        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ) : grupos.length === 0 ? (
          <p className="text-sm text-muted-light">
            {pendientes.length === 0
              ? 'No hay productos pendientes de embarcar en pedidos confirmados.'
              : 'Nada coincide con la búsqueda.'}
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {grupos.map(([numero, productos]) => (
              <div key={numero}>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <Link href={`/pedidos/${productos[0].pedido_id}`} className="font-semibold text-primary hover:underline" target="_blank">
                    Pedido #{numero}
                  </Link>
                  {productos[0].plataforma && <PlataformaBadge plataforma={productos[0].plataforma} />}
                  <span className="text-muted-light">{productos[0].cliente_nombre}</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {productos.map((p) => {
                    const k = clave(p);
                    const cantidad = seleccion[k] ?? 0;
                    return (
                      <li
                        key={k}
                        className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
                          cantidad > 0 ? 'border-primary/40 bg-secondary/20' : 'border-border'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={cantidad > 0}
                          onChange={(e) => alternar(p, e.target.checked)}
                          aria-label={`Incluir ${p.nombre}`}
                          className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/30"
                        />
                        <MiniaturaArticulo src={p.imagen_url} size={40} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-ink">{p.nombre}</p>
                          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-light">
                            {p.reposicion_id && (
                              <span className="inline-flex items-center gap-1 text-primary">
                                <Repeat size={11} /> {p.origen}
                              </span>
                            )}
                            <span>{p.pendiente} por embarcar</span>
                            {p.peso_lb != null ? <span>· {p.peso_lb} lb c/u</span> : <span className="text-warning">· sin peso</span>}
                          </p>
                        </div>
                        {cantidad > 0 && p.pendiente > 1 && (
                          <QuantityStepper
                            value={cantidad}
                            onChange={(n) => setSeleccion((prev) => ({ ...prev, [k]: n }))}
                            min={1}
                            max={p.pendiente}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-2xl border border-border bg-white p-4 shadow-[var(--shadow-pop)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {seleccionados.length === 0 ? (
            'Elegí los productos que vienen en el paquete.'
          ) : (
            <>
              <strong className="text-ink">{unidades} u.</strong> de {pedidos} pedido{pedidos === 1 ? '' : 's'}
              {todosConPeso && ` · ${pesoTotal.toFixed(2)} lb`}
              {Number(costo) > 0 && ` · ${formatCurrency(Number(costo))}`}
            </>
          )}
        </p>
        <Button type="submit" disabled={guardando || !paqueteria.trim() || seleccionados.length === 0}>
          <Truck size={15} /> {guardando ? 'Creando…' : 'Crear embarque'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      )}
    </form>
  );
}
