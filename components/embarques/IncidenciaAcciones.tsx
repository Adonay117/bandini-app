'use client';

import { FormEvent, useState } from 'react';
import { CornerDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IncidenciaConDevoluciones, ResolucionDevolucion } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import {
  ESTADO_DEVOLUCION,
  ESTADO_INCIDENCIA,
  ESTADO_REPOSICION,
  RESOLUCION_DEVOLUCION,
  TIPO_INCIDENCIA,
  codigoDevolucion,
} from '@/lib/utils/logistica';
import { pedirApi } from '@/lib/api';
import { notificar } from '@/lib/notificar';

async function enviar(url: string, method: string, body: unknown) {
  await pedirApi(url, { method, body: JSON.stringify(body) }, 'Error al guardar');
}

// Una incidencia y su resolución con la plataforma:
//   Incidencia → Devolución/reclamo (parcial o total; reembolso o reposición)
//   → aceptada/rechazada → reembolso recibido | reposición (queda por embarcar)
// o bien el negocio asume la pérdida.
export function IncidenciaAcciones({
  incidencia,
  precioCompraUnitario,
  onCambio,
}: {
  incidencia: IncidenciaConDevoluciones;
  precioCompraUnitario?: number | null;
  onCambio: () => Promise<void>;
}) {
  const [reclamando, setReclamando] = useState(false);
  const [cantidad, setCantidad] = useState('');
  const [resolucion, setResolucion] = useState<ResolucionDevolucion>('reposicion');
  const [referencia, setReferencia] = useState('');
  const [reembolsoDe, setReembolsoDe] = useState<string | null>(null);
  const [montoReembolso, setMontoReembolso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reclamado = (incidencia.devoluciones ?? []).filter((d) => d.estado !== 'rechazada').reduce((s, d) => s + d.cantidad, 0);
  const sinReclamar = incidencia.cantidad - reclamado;
  const abierta = incidencia.estado === 'abierta' || incidencia.estado === 'en_reclamo';
  const est = ESTADO_INCIDENCIA[incidencia.estado];

  async function accion(fn: () => Promise<void>, exito: string) {
    setEnviando(true);
    setError(null);
    try {
      await notificar(fn, { exito, error: 'No se pudo guardar' });
      await onCambio();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function crearDevolucion(e: FormEvent) {
    e.preventDefault();
    const ok = await accion(() =>
      enviar(`/api/incidencias/${incidencia.id}/devoluciones`, 'POST', {
        cantidad: Number(cantidad || sinReclamar),
        resolucion,
        referencia,
      }),
      resolucion === 'reposicion' ? 'Reclamo de reposición creado' : 'Reclamo de reembolso creado'
    );
    if (ok) {
      setReclamando(false);
      setCantidad('');
      setReferencia('');
    }
  }

  async function registrarReembolso(e: FormEvent, devolucionId: string) {
    e.preventDefault();
    const ok = await accion(() =>
      enviar(`/api/devoluciones/${devolucionId}`, 'PATCH', { accion: 'reembolso', monto: Number(montoReembolso) }),
      `Reembolso de ${formatCurrency(Number(montoReembolso))} registrado`
    );
    if (ok) {
      setReembolsoDe(null);
      setMontoReembolso('');
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface/50 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1.5">
          <strong className="text-sm font-semibold text-ink">
            {TIPO_INCIDENCIA[incidencia.tipo]} × {incidencia.cantidad}
          </strong>
          <Badge variant={est.badge}>{est.label}</Badge>
          <span className="text-muted-light">{formatDate(incidencia.fecha)}</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {abierta && sinReclamar > 0 && !reclamando && (
            <Button type="button" variant="secondary" className="!min-h-9 !py-1.5" onClick={() => setReclamando(true)} disabled={enviando}>
              Reclamar a plataforma
            </Button>
          )}
          {incidencia.estado === 'abierta' && (
            <Button
              type="button"
              variant="ghost"
              className="!min-h-9 !py-1.5"
              disabled={enviando}
              onClick={() => accion(() => enviar(`/api/incidencias/${incidencia.id}`, 'PATCH', { accion: 'absorber' }), 'Pérdida asumida')}
              title="El negocio asume la pérdida y el producto deja de esperarse"
            >
              Asumir pérdida
            </Button>
          )}
          {incidencia.estado === 'absorbida' && (
            <Button
              type="button"
              variant="ghost"
              className="!min-h-9 !py-1.5"
              disabled={enviando}
              onClick={() => accion(() => enviar(`/api/incidencias/${incidencia.id}`, 'PATCH', { accion: 'reabrir' }), 'Incidencia reabierta')}
            >
              Reabrir
            </Button>
          )}
        </div>
      </div>
      {incidencia.descripcion && <p className="text-muted">“{incidencia.descripcion}”</p>}

      {reclamando && (
        <form onSubmit={crearDevolucion} className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-white p-3">
          <div className="grid grid-cols-2 gap-2">
            {(['reposicion', 'reembolso'] as ResolucionDevolucion[]).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={resolucion === r}
                onClick={() => setResolucion(r)}
                className={`min-h-10 rounded-lg border text-sm font-medium ${
                  resolucion === r ? 'border-primary bg-secondary/40 text-primary' : 'border-border text-muted'
                }`}
              >
                Pedir {RESOLUCION_DEVOLUCION[r].toLowerCase()}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              label={`Unidades (${sinReclamar === incidencia.cantidad ? 'total' : 'parcial'}: máx. ${sinReclamar})`}
              type="number"
              inputMode="numeric"
              min={1}
              max={sinReclamar}
              placeholder={String(sinReclamar)}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
            <Input label="Nº de caso en la plataforma" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={enviando}>
              Registrar reclamo
            </Button>
            <Button type="button" variant="ghost" onClick={() => setReclamando(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {(incidencia.devoluciones ?? []).map((dev) => {
        const estDev = ESTADO_DEVOLUCION[dev.estado];
        const activa = dev.estado === 'solicitada' || dev.estado === 'aceptada';
        return (
          <div key={dev.id} className="ml-2 flex flex-col gap-1.5 border-l-2 border-secondary pl-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <CornerDownRight size={12} className="text-muted-light" />
              <strong className="font-semibold text-ink">{codigoDevolucion(dev.numero)}</strong>
              <span className="text-muted">
                {RESOLUCION_DEVOLUCION[dev.resolucion]} × {dev.cantidad}
                {dev.cantidad < incidencia.cantidad ? ' (parcial)' : ''}
              </span>
              <Badge variant={estDev.badge}>{estDev.label}</Badge>
              {dev.referencia && <span className="text-muted-light">caso {dev.referencia}</span>}
              {dev.monto_reembolso != null && (
                <span className="text-positive tabular-nums">+{formatCurrency(dev.monto_reembolso)} de la plataforma</span>
              )}
              {(dev.reposiciones ?? []).map((r) => (
                <Badge key={r.id} variant={ESTADO_REPOSICION[r.estado].badge}>
                  Reposición: {ESTADO_REPOSICION[r.estado].label}
                </Badge>
              ))}
            </div>
            {activa && (
              <div className="flex flex-wrap gap-1.5">
                {dev.estado === 'solicitada' && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="!min-h-9 !py-1.5"
                    disabled={enviando}
                    onClick={() => accion(() => enviar(`/api/devoluciones/${dev.id}`, 'PATCH', { accion: 'aceptar' }), 'Reclamo aceptado por la plataforma')}
                  >
                    Plataforma aceptó
                  </Button>
                )}
                {dev.resolucion === 'reposicion' ? (
                  <Button
                    type="button"
                    className="!min-h-9 !py-1.5"
                    disabled={enviando}
                    onClick={() => accion(() => enviar(`/api/devoluciones/${dev.id}`, 'PATCH', { accion: 'reposicion' }), 'Reposición confirmada')}
                  >
                    Confirmar reposición
                  </Button>
                ) : reembolsoDe === dev.id ? (
                  <form onSubmit={(e) => registrarReembolso(e, dev.id)} className="flex items-end gap-1.5">
                    <Input
                      aria-label="Monto reembolsado por la plataforma"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      autoFocus
                      value={montoReembolso}
                      onChange={(e) => setMontoReembolso(e.target.value)}
                      className="!min-h-9 w-28 !py-1.5"
                    />
                    <Button type="submit" className="!min-h-9 !py-1.5" disabled={enviando || montoReembolso === ''}>
                      Guardar
                    </Button>
                  </form>
                ) : (
                  <Button
                    type="button"
                    className="!min-h-9 !py-1.5"
                    disabled={enviando}
                    onClick={() => {
                      setReembolsoDe(dev.id);
                      setMontoReembolso(precioCompraUnitario != null ? (precioCompraUnitario * dev.cantidad).toFixed(2) : '');
                    }}
                  >
                    Registrar reembolso
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="!min-h-9 !py-1.5"
                  disabled={enviando}
                  onClick={() => accion(() => enviar(`/api/devoluciones/${dev.id}`, 'PATCH', { accion: 'rechazar' }), 'Reclamo marcado como rechazado')}
                >
                  Rechazada
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <p role="alert" className="text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
