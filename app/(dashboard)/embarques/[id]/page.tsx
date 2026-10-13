'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ClipboardCheck, Pencil, Repeat, Trash2, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Panel } from '@/components/ui/Panel';
import { PlataformaBadge } from '@/components/ui/PlataformaBadge';
import { PopConfirm, PopConfirmRequest } from '@/components/ui/PopConfirm';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { MiniaturaArticulo } from '@/components/pedidos/ImagenArticulo';
import { IncidenciaAcciones } from '@/components/embarques/IncidenciaAcciones';
import { EmbarqueDetalle, LineaEmbarqueDetalle } from '@/lib/types';
import { formatCurrency, formatDateTime, formatDia, hoyISO } from '@/lib/utils/formatters';
import { ESTADO_EMBARQUE, ESTADO_RECEPCION, codigoDevolucion, codigoEmbarque } from '@/lib/utils/logistica';
import { pedirApi } from '@/lib/api';
import { notificar } from '@/lib/notificar';

interface LineaForm {
  recibida: string;
  ok: string;
  tipo: 'danado' | 'equivocado';
  nota: string;
}

export default function EmbarqueDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<EmbarqueDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<PopConfirmRequest | null>(null);

  const [recibiendo, setRecibiendo] = useState(false);
  const [fechaRecepcion, setFechaRecepcion] = useState(hoyISO());
  const [form, setForm] = useState<Record<string, LineaForm>>({});
  const [guardando, setGuardando] = useState(false);

  const [editando, setEditando] = useState(false);
  const [paqueteria, setPaqueteria] = useState('');
  const [guia, setGuia] = useState('');
  const [costo, setCosto] = useState('');
  const [fechaEnvio, setFechaEnvio] = useState('');

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/embarques/${params.id}`);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Embarque no encontrado');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el embarque');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, LineaEmbarqueDetalle[]>();
    for (const l of data?.lineas ?? []) {
      const k = l.pedido_item.pedido.id;
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k)!.push(l);
    }
    return [...mapa.values()].sort((a, b) => a[0].pedido_item.pedido.numero - b[0].pedido_item.pedido.numero);
  }, [data]);

  // Líneas que se pueden (re)registrar: las pendientes, o las recibidas cuyas
  // incidencias no avanzaron a un reclamo (la base de datos lo valida igual).
  const lineasEditables = useMemo(
    () =>
      (data?.lineas ?? []).filter(
        (l) => l.cantidad_recibida == null || l.incidencias.every((i) => i.estado === 'abierta' && i.devoluciones.length === 0)
      ),
    [data]
  );

  function abrirRecepcion() {
    setForm(
      Object.fromEntries(
        lineasEditables.map((l) => [
          l.id,
          {
            recibida: String(l.cantidad_recibida ?? l.cantidad_esperada),
            ok: String(l.cantidad_ok ?? l.cantidad_esperada),
            tipo: l.incidencias.find((i) => i.tipo === 'equivocado') ? 'equivocado' : 'danado',
            nota: l.nota_recepcion ?? '',
          },
        ])
      )
    );
    setRecibiendo(true);
  }

  function actualizarLinea(id: string, cambios: Partial<LineaForm>, esperada: number) {
    setForm((prev) => {
      const actual = { ...prev[id], ...cambios };
      const recibida = Math.min(Math.max(Number(actual.recibida) || 0, 0), esperada);
      if (cambios.recibida !== undefined && Number(actual.ok) > recibida) actual.ok = String(recibida);
      return { ...prev, [id]: actual };
    });
  }

  async function registrarRecepcion(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await notificar(
        pedirApi(
          `/api/embarques/${params.id}/recepcion`,
          {
            method: 'POST',
            body: JSON.stringify({
              fecha: fechaRecepcion ? `${fechaRecepcion}T12:00:00` : undefined,
              lineas: Object.entries(form).map(([id, f]) => ({
                embarque_item_id: id,
                cantidad_recibida: Number(f.recibida),
                cantidad_ok: Number(f.ok),
                tipo_incidencia: f.tipo,
                nota: f.nota,
              })),
            }),
          },
          'Error al registrar la recepción'
        ),
        { cargando: 'Registrando recepción…', exito: 'Recepción registrada', error: 'No se pudo registrar la recepción' }
      );
      setRecibiendo(false);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la recepción');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarDatos(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await notificar(
        pedirApi(`/api/embarques/${params.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ paqueteria, guia, costo_total: Number(costo || 0), fecha_envio: fechaEnvio }),
        }),
        { exito: 'Datos del embarque guardados', error: 'No se pudieron guardar los datos' }
      );
      setEditando(false);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    }
  }

  function borrar(boton: HTMLElement) {
    setConfirmacion({
      anchor: boton,
      message: '¿Borrar el embarque? Sus productos vuelven a quedar por embarcar y el costo se revierte.',
      confirmLabel: 'Borrar',
      onConfirm: async () => {
        try {
          await notificar(pedirApi(`/api/embarques/${params.id}`, { method: 'DELETE' }, 'Error al borrar'), {
            cargando: 'Borrando embarque…',
            exito: 'Embarque borrado',
            error: 'No se pudo borrar el embarque',
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error al borrar');
          return;
        }
        router.push('/embarques');
      },
    });
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (!data) {
    return (
      <div role="alert" className="rounded-xl border border-negative-surface bg-negative-surface/40 p-4 text-sm text-negative">
        {error}
      </div>
    );
  }

  const est = ESTADO_EMBARQUE[data.estado];
  const sinRecepcion = data.lineas.every((l) => l.cantidad_recibida == null);
  const unidades = data.lineas.reduce((s, l) => s + l.cantidad_esperada, 0);
  const recibidas = data.lineas.reduce((s, l) => s + (l.cantidad_recibida ?? 0), 0);
  const ok = data.lineas.reduce((s, l) => s + (l.cantidad_ok ?? 0), 0);
  const costoAsignado = data.lineas.reduce((s, l) => s + Number(l.costo_importacion), 0);
  const incidencias = data.lineas.flatMap((l) => l.incidencias.map((i) => ({ incidencia: i, linea: l })));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/embarques" className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-ink">
        <ChevronLeft size={15} /> Embarques
      </Link>

      {/* Encabezado */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        {editando ? (
          <form onSubmit={guardarDatos} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Paquetería / encomendista" value={paqueteria} onChange={(e) => setPaqueteria(e.target.value)} />
            <Input label="Número de guía" value={guia} onChange={(e) => setGuia(e.target.value)} />
            <Input label="Fecha de envío" type="date" value={fechaEnvio} onChange={(e) => setFechaEnvio(e.target.value)} />
            <Input
              label="Costo total"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
            />
            <p className="text-xs text-muted-light sm:col-span-2">
              Cambiar el costo asienta la diferencia en ingresos/egresos y recalcula el costo de importación de cada producto.
            </p>
            <div className="flex gap-2">
              <Button type="submit">Guardar</Button>
              <Button type="button" variant="ghost" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-muted">
                <Truck size={22} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{codigoEmbarque(data.numero)}</h1>
                  <Badge variant={est.badge}>{est.label}</Badge>
                </div>
                <p className="text-sm text-muted">
                  {data.paqueteria}
                  {data.guia && ` · guía ${data.guia}`}
                </p>
                <p className="text-xs text-muted-light">
                  Enviado {formatDia(data.fecha_envio)}
                  {data.fecha_recepcion && ` · recibido ${formatDateTime(data.fecha_recepcion)}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {lineasEditables.length > 0 && !recibiendo && (
                <Button type="button" onClick={abrirRecepcion}>
                  <ClipboardCheck size={15} /> {sinRecepcion ? 'Registrar recepción' : 'Corregir recepción'}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPaqueteria(data.paqueteria);
                  setGuia(data.guia ?? '');
                  setCosto(String(data.costo_total));
                  setFechaEnvio(data.fecha_envio);
                  setEditando(true);
                }}
              >
                <Pencil size={14} /> Editar
              </Button>
              {sinRecepcion && (
                <Button type="button" variant="ghost" onClick={(e) => borrar(e.currentTarget)} aria-label="Borrar embarque">
                  <Trash2 size={15} />
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Costo envío" value={formatCurrency(Number(data.costo_total))} hint={`reparto por ${data.metodo_reparto}`} />
          <StatTile label="Unidades" value={unidades} hint={`${grupos.length} pedido${grupos.length === 1 ? '' : 's'}`} />
          <StatTile label="Recibidas" value={sinRecepcion ? '—' : `${recibidas}/${unidades}`} tone={!sinRecepcion && recibidas < unidades ? 'warning' : 'default'} />
          <StatTile label="En buen estado" value={sinRecepcion ? '—' : `${ok}/${unidades}`} tone={!sinRecepcion && ok < unidades ? 'negative' : !sinRecepcion ? 'positive' : 'default'} />
        </div>
        {!sinRecepcion && costoAsignado + 0.01 < Number(data.costo_total) && (
          <p className="text-xs text-warning">
            {formatCurrency(Number(data.costo_total) - costoAsignado)} del costo no se asigna a ningún producto porque nada llegó.
          </p>
        )}
      </div>

      {/* Recepción */}
      {recibiendo && (
        <form onSubmit={registrarRecepcion}>
          <Panel title="Registrar recepción">
            <p className="mb-3 text-xs text-muted">
              Por producto: cuántas unidades llegaron y cuántas en buen estado. Lo que falte genera una incidencia de faltante o
              cantidad incompleta; lo que llegó pero no sirve, una de dañado o producto equivocado.
            </p>
            <div className="mb-4 max-w-48">
              <Input label="Fecha de recepción" type="date" value={fechaRecepcion} onChange={(e) => setFechaRecepcion(e.target.value)} />
            </div>
            <ul className="flex flex-col gap-3">
              {lineasEditables.map((l) => {
                const f = form[l.id];
                if (!f) return null;
                const recibida = Number(f.recibida) || 0;
                const buenas = Number(f.ok) || 0;
                return (
                  <li key={l.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-3">
                      <MiniaturaArticulo src={l.pedido_item.imagen_url} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{l.pedido_item.nombre}</p>
                        <p className="text-xs text-muted-light">
                          Pedido #{l.pedido_item.pedido.numero} · esperadas {l.cantidad_esperada}
                          {l.reposicion && ' · reposición'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Input
                        label="Llegaron"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={l.cantidad_esperada}
                        value={f.recibida}
                        onChange={(e) => actualizarLinea(l.id, { recibida: e.target.value }, l.cantidad_esperada)}
                      />
                      <Input
                        label="En buen estado"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={recibida}
                        value={f.ok}
                        onChange={(e) => actualizarLinea(l.id, { ok: e.target.value }, l.cantidad_esperada)}
                      />
                      {buenas < recibida && (
                        <Select
                          label="Problema"
                          value={f.tipo}
                          onChange={(e) => actualizarLinea(l.id, { tipo: e.target.value as LineaForm['tipo'] }, l.cantidad_esperada)}
                        >
                          <option value="danado">Dañado</option>
                          <option value="equivocado">Producto equivocado</option>
                        </Select>
                      )}
                      {(buenas < recibida || recibida < l.cantidad_esperada) && (
                        <Input
                          label="Nota"
                          value={f.nota}
                          onChange={(e) => actualizarLinea(l.id, { nota: e.target.value }, l.cantidad_esperada)}
                        />
                      )}
                    </div>
                    {(recibida < l.cantidad_esperada || buenas < recibida) && (
                      <p className="mt-2 text-xs text-warning">
                        {recibida < l.cantidad_esperada &&
                          `${recibida === 0 ? 'Faltante' : 'Incompleto'}: ${l.cantidad_esperada - recibida} u. `}
                        {buenas < recibida && `${f.tipo === 'danado' ? 'Dañado' : 'Equivocado'}: ${recibida - buenas} u.`}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar recepción'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setRecibiendo(false)}>
                Cancelar
              </Button>
            </div>
          </Panel>
        </form>
      )}

      {/* Contenido por pedido */}
      <Panel title={`Contenido (${data.lineas.length} producto${data.lineas.length === 1 ? '' : 's'})`}>
        <div className="flex flex-col gap-5">
          {grupos.map((lineas) => {
            const pedido = lineas[0].pedido_item.pedido;
            return (
              <div key={pedido.id}>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <Link href={`/pedidos/${pedido.id}`} className="font-semibold text-primary hover:underline">
                    Pedido #{pedido.numero}
                  </Link>
                  {pedido.plataforma && <PlataformaBadge plataforma={pedido.plataforma} />}
                  <span className="text-muted-light">{pedido.cliente?.nombre}</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {lineas.map((l) => {
                    const rec = ESTADO_RECEPCION[l.estado_recepcion];
                    return (
                      <li key={l.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                        <MiniaturaArticulo src={l.pedido_item.imagen_url} size={40} />
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink">
                            <span className="truncate">{l.pedido_item.nombre}</span>
                            {l.reposicion && (
                              <Badge variant="primary">
                                <Repeat size={10} /> Reposición {l.reposicion.devolucion && codigoDevolucion(l.reposicion.devolucion.numero)}
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-light">
                            {l.cantidad_recibida == null
                              ? `${l.cantidad_esperada} u. esperadas`
                              : `${l.cantidad_ok}/${l.cantidad_esperada} OK · ${l.cantidad_recibida} llegaron`}
                            {l.pedido_item.peso_lb != null && ` · ${l.pedido_item.peso_lb} lb c/u`}
                          </p>
                          {l.nota_recepcion && <p className="text-xs text-muted">“{l.nota_recepcion}”</p>}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge variant={rec.badge}>{rec.label}</Badge>
                          <span className="text-xs text-muted tabular-nums" title="Costo de importación asignado">
                            {formatCurrency(Number(l.costo_importacion))}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Incidencias */}
      {incidencias.length > 0 && (
        <Panel title={`Incidencias (${incidencias.length})`}>
          <div className="flex flex-col gap-4">
            {incidencias.map(({ incidencia, linea }) => (
              <div key={incidencia.id} className="flex flex-col gap-1.5">
                <p className="text-xs text-muted">
                  <span className="font-medium text-ink">{linea.pedido_item.nombre}</span> · Pedido #{linea.pedido_item.pedido.numero}
                </p>
                <IncidenciaAcciones
                  incidencia={incidencia}
                  precioCompraUnitario={linea.pedido_item.precio_compra}
                  onCambio={cargar}
                />
              </div>
            ))}
          </div>
        </Panel>
      )}

      {data.nota && <p className="text-sm text-muted">Nota: {data.nota}</p>}

      {error && (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      )}
      <PopConfirm request={confirmacion} onClose={() => setConfirmacion(null)} />
    </div>
  );
}
