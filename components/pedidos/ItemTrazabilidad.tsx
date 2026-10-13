import Link from 'next/link';
import { CornerDownRight, Repeat, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PedidoItemDetalle } from '@/lib/types';
import { formatCurrency, formatDia } from '@/lib/utils/formatters';
import {
  ESTADO_DEVOLUCION,
  ESTADO_INCIDENCIA,
  ESTADO_RECEPCION,
  ESTADO_REPOSICION,
  RESOLUCION_DEVOLUCION,
  TIPO_INCIDENCIA,
  codigoDevolucion,
  codigoEmbarque,
} from '@/lib/utils/logistica';

function Contador({ label, valor, total, tono }: { label: string; valor: number; total?: number; tono?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[11px] tabular-nums ${tono ?? 'text-muted'}`}>
      {label} <strong className="font-semibold">{total != null ? `${valor}/${total}` : valor}</strong>
    </span>
  );
}

// Resumen de cantidades del producto + la cadena completa por la que pasó:
// cada embarque (original o reposición), su recepción, incidencias,
// devoluciones a la plataforma y reposiciones.
export function ItemTrazabilidad({ item }: { item: PedidoItemDetalle }) {
  const log = item.logistica;
  if (!log || (item.lineas.length === 0 && log.cantidad_entregada === 0 && log.cantidad_en_entrega === 0)) return null;

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <Contador label="Embarcado" valor={log.cantidad_embarcada} total={item.cantidad} />
        <Contador label="Recibido OK" valor={log.cantidad_ok} total={item.cantidad} />
        <Contador label="Entregado" valor={log.cantidad_entregada} total={item.cantidad} tono={log.cantidad_entregada > 0 ? 'text-positive' : undefined} />
        {log.cantidad_en_entrega > 0 && <Contador label="En entrega" valor={log.cantidad_en_entrega} />}
        {log.cantidad_reembolsada_plataforma > 0 && (
          <Contador label="Reemb. plataforma" valor={log.cantidad_reembolsada_plataforma} tono="text-warning" />
        )}
        {log.cantidad_perdida > 0 && <Contador label="Pérdida" valor={log.cantidad_perdida} tono="text-negative" />}
      </div>

      {item.lineas.length > 0 && (
        <ol className="flex flex-col gap-1.5 border-l-2 border-secondary/70 pl-3">
          {[...item.lineas]
            .sort((a, b) => a.embarque.numero - b.embarque.numero)
            .map((linea) => {
              const rec = ESTADO_RECEPCION[linea.estado_recepcion];
              return (
                <li key={linea.id} className="text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {linea.reposicion_id ? (
                      <Repeat size={12} className="text-primary" />
                    ) : (
                      <Truck size={12} className="text-muted-light" />
                    )}
                    <Link href={`/embarques/${linea.embarque.id}`} className="font-semibold text-primary hover:underline">
                      {codigoEmbarque(linea.embarque.numero)}
                    </Link>
                    <span className="text-muted-light">
                      {linea.reposicion_id ? 'reposición · ' : ''}
                      {linea.cantidad_esperada} u. · {formatDia(linea.embarque.fecha_envio)}
                    </span>
                    <Badge variant={rec.badge}>
                      {rec.label}
                      {linea.cantidad_recibida != null && linea.estado_recepcion !== 'correcto' && ` (${linea.cantidad_ok}/${linea.cantidad_esperada} OK)`}
                    </Badge>
                    {linea.costo_importacion != null && linea.costo_importacion > 0 && (
                      <span className="text-muted-light tabular-nums">envío {formatCurrency(linea.costo_importacion)}</span>
                    )}
                  </div>

                  {(linea.incidencias ?? []).map((inc) => (
                    <div key={inc.id} className="mt-1 ml-4 flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CornerDownRight size={11} className="text-muted-light" />
                        <span className="text-ink">
                          {TIPO_INCIDENCIA[inc.tipo]} × {inc.cantidad}
                        </span>
                        <Badge variant={ESTADO_INCIDENCIA[inc.estado].badge}>{ESTADO_INCIDENCIA[inc.estado].label}</Badge>
                        {inc.descripcion && <span className="text-muted-light">“{inc.descripcion}”</span>}
                      </div>
                      {(inc.devoluciones ?? []).map((dev) => (
                        <div key={dev.id} className="ml-4 flex flex-wrap items-center gap-1.5">
                          <CornerDownRight size={11} className="text-muted-light" />
                          <span className="font-medium text-ink">{codigoDevolucion(dev.numero)}</span>
                          <span className="text-muted">
                            {RESOLUCION_DEVOLUCION[dev.resolucion]} × {dev.cantidad}
                          </span>
                          <Badge variant={ESTADO_DEVOLUCION[dev.estado].badge}>{ESTADO_DEVOLUCION[dev.estado].label}</Badge>
                          {dev.monto_reembolso != null && (
                            <span className="text-muted-light tabular-nums">plataforma devolvió {formatCurrency(dev.monto_reembolso)}</span>
                          )}
                          {(dev.reposiciones ?? []).map((r) => (
                            <Badge key={r.id} variant={ESTADO_REPOSICION[r.estado].badge}>
                              Reposición: {ESTADO_REPOSICION[r.estado].label}
                            </Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </li>
              );
            })}
        </ol>
      )}
    </div>
  );
}
