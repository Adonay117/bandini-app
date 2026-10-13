'use client';

import { FormEvent, useMemo, useState } from 'react';
import { MapPin, PackageCheck, Plus, Store, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Panel } from '@/components/ui/Panel';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { EstadoEntrega, ModalidadEntrega, PedidoItemDetalle, PedidoDetalle } from '@/lib/types';
import { formatDateTime, formatDia } from '@/lib/utils/formatters';
import { ESTADO_ENTREGA, MODALIDAD_ENTREGA, siguientesEstadosEntrega } from '@/lib/utils/logistica';
import { pedirApi } from '@/lib/api';
import { notificar } from '@/lib/notificar';

const ACCION_ENTREGA: Record<EstadoEntrega, string> = {
  pendiente: 'Volver a pendiente',
  enviada: 'Entregada a encomendista',
  entregada: 'Marcar entregada',
  no_retirada: 'No retirada',
};

// Unidades de un producto que se pueden asignar a una entrega nueva:
// recibidas en buen estado menos las ya entregadas o en una entrega activa.
function disponibleParaEntregar(item: PedidoItemDetalle): number {
  const log = item.logistica;
  if (!log) return 0;
  return Math.max(log.cantidad_ok - log.cantidad_entregada - log.cantidad_en_entrega, 0);
}

export function EntregasPanel({
  pedido,
  onCambio,
}: {
  pedido: PedidoDetalle;
  onCambio: () => Promise<void>;
}) {
  const [creando, setCreando] = useState(false);
  const [modalidad, setModalidad] = useState<ModalidadEntrega>('punto_propio');
  const [encomendista, setEncomendista] = useState('');
  const [agencia, setAgencia] = useState('');
  const [fecha, setFecha] = useState('');
  const [nota, setNota] = useState('');
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entregables = useMemo(
    () => pedido.items.map((i) => ({ item: i, max: disponibleParaEntregar(i) })).filter((x) => x.max > 0),
    [pedido.items]
  );
  const nombrePorItem = useMemo(() => new Map(pedido.items.map((i) => [i.id, i.nombre])), [pedido.items]);

  function abrirFormulario() {
    setCantidades(Object.fromEntries(entregables.map(({ item, max }) => [item.id, max])));
    setError(null);
    setCreando(true);
  }

  async function llamar(url: string, init: RequestInit, mensajes: { exito: string; error: string }) {
    setEnviando(true);
    setError(null);
    try {
      await notificar(pedirApi(url, init, 'Error en la entrega'), mensajes);
      await onCambio();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la entrega');
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function crear(e: FormEvent) {
    e.preventDefault();
    const items = Object.entries(cantidades)
      .filter(([, c]) => c > 0)
      .map(([pedido_item_id, cantidad]) => ({ pedido_item_id, cantidad }));
    const ok = await llamar(
      `/api/pedidos/${pedido.id}/entregas`,
      {
        method: 'POST',
        body: JSON.stringify({
          modalidad,
          encomendista: modalidad === 'encomienda' ? encomendista : undefined,
          agencia_punto: agencia,
          fecha_programada: fecha || undefined,
          nota,
          items,
        }),
      },
      { exito: 'Entrega programada', error: 'No se pudo programar la entrega' }
    );
    if (ok) {
      setCreando(false);
      setEncomendista('');
      setAgencia('');
      setFecha('');
      setNota('');
    }
  }

  const totalSeleccionado = Object.values(cantidades).reduce((s, c) => s + c, 0);

  return (
    <Panel
      title={`Entregas${pedido.entregas.length ? ` (${pedido.entregas.length})` : ''}`}
      action={
        !creando &&
        entregables.length > 0 && (
          <Button type="button" variant="secondary" onClick={abrirFormulario}>
            <Plus size={15} /> Nueva entrega
          </Button>
        )
      }
    >
      {pedido.entregas.length === 0 && !creando && (
        <p className="text-sm text-muted-light">
          {entregables.length > 0
            ? 'Hay productos recibidos listos para entregar.'
            : 'Las entregas se habilitan cuando los productos se reciben en buen estado.'}
        </p>
      )}

      {creando && (
        <form onSubmit={crear} className="mb-4 flex flex-col gap-3 rounded-xl border border-dashed border-border p-4">
          <div className="grid grid-cols-2 gap-2">
            {(['punto_propio', 'encomienda'] as ModalidadEntrega[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={modalidad === m}
                onClick={() => setModalidad(m)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors ${
                  modalidad === m ? 'border-primary bg-secondary/40 text-primary' : 'border-border text-muted hover:border-primary/30'
                }`}
              >
                {m === 'punto_propio' ? <Store size={15} /> : <MapPin size={15} />}
                {MODALIDAD_ENTREGA[m]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-light">
            {modalidad === 'punto_propio'
              ? 'El cliente recoge en el punto propio; no paga envío.'
              : 'El cliente le paga el envío directo a la encomendista: no es ingreso ni costo del negocio.'}
          </p>
          {modalidad === 'encomienda' && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input label="Encomendista" value={encomendista} onChange={(e) => setEncomendista(e.target.value)} />
              <Input label="Agencia / punto de entrega" value={agencia} onChange={(e) => setAgencia(e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input label="Fecha programada (opcional)" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted">Productos a entregar</p>
            {entregables.map(({ item, max }) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-ink">{item.nombre}</span>
                <span className="text-xs text-muted-light">de {max}</span>
                <QuantityStepper
                  value={cantidades[item.id] ?? 0}
                  onChange={(n) => setCantidades((prev) => ({ ...prev, [item.id]: Math.min(Math.max(n, 0), max) }))}
                  min={0}
                  max={max}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={enviando || totalSeleccionado === 0 || (modalidad === 'encomienda' && !encomendista.trim())}
            >
              <PackageCheck size={15} /> {enviando ? 'Guardando…' : `Crear entrega (${totalSeleccionado} u.)`}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreando(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {pedido.entregas.length > 0 && (
        <ul className="flex flex-col gap-3">
          {pedido.entregas.map((ent) => {
            const est = ESTADO_ENTREGA[ent.estado];
            return (
              <li key={ent.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    {ent.modalidad === 'punto_propio' ? <Store size={14} /> : <MapPin size={14} />}
                    {MODALIDAD_ENTREGA[ent.modalidad]}
                    {ent.encomendista && <span className="font-normal text-muted">· {ent.encomendista}</span>}
                    {ent.agencia_punto && <span className="font-normal text-muted">· {ent.agencia_punto}</span>}
                    <Badge variant={est.badge}>{est.label}</Badge>
                  </span>
                  <span className="text-xs text-muted-light">
                    {ent.fecha_entrega
                      ? `Entregada ${formatDateTime(ent.fecha_entrega)}`
                      : ent.fecha_programada
                        ? `Programada ${formatDia(ent.fecha_programada)}`
                        : `Creada ${formatDateTime(ent.fecha_creacion)}`}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {ent.items.map((i) => `${nombrePorItem.get(i.pedido_item_id) ?? 'Producto'} × ${i.cantidad}`).join(' · ')}
                </p>
                {ent.nota && <p className="mt-1 text-xs text-muted-light">{ent.nota}</p>}
                {(siguientesEstadosEntrega(ent.modalidad, ent.estado).length > 0 || ent.estado === 'pendiente') && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {siguientesEstadosEntrega(ent.modalidad, ent.estado).map((s) => (
                      <Button
                        key={s}
                        type="button"
                        variant={s === 'entregada' ? 'primary' : 'secondary'}
                        disabled={enviando}
                        onClick={() =>
                          llamar(
                            `/api/entregas/${ent.id}`,
                            { method: 'PATCH', body: JSON.stringify({ estado: s }) },
                            { exito: `Entrega marcada como "${ESTADO_ENTREGA[s].label}"`, error: 'No se pudo actualizar la entrega' }
                          )
                        }
                      >
                        {ACCION_ENTREGA[s]}
                      </Button>
                    ))}
                    {ent.estado === 'pendiente' && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={enviando}
                        onClick={() =>
                          llamar(
                            `/api/entregas/${ent.id}`,
                            { method: 'DELETE' },
                            { exito: 'Entrega borrada', error: 'No se pudo borrar la entrega' }
                          )
                        }
                        aria-label="Borrar entrega"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-negative">
          {error}
        </p>
      )}
    </Panel>
  );
}
