'use client';

import { FormEvent, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ImagenArticulo } from '@/components/pedidos/ImagenArticulo';
import { PedidoItemDetalle, ResolucionDefecto } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';

export interface AjusteClientePayload {
  resolucion: ResolucionDefecto;
  monto_reembolso?: number;
  nombre?: string;
  precio_venta?: number;
  url?: string;
  imagen_url?: string;
}

const MOTIVO: Partial<Record<PedidoItemDetalle['estado_item'], string>> = {
  defectuoso: 'Defectuoso',
  con_incidencia: 'Llegó con incidencia',
  en_devolucion: 'En devolución a la plataforma',
  pendiente_reposicion: 'Esperando reposición',
  reembolsado: 'La plataforma lo reembolsó',
  desistido: 'El cliente desistió',
  recibido_parcial: 'Llegó incompleto',
};

// Ajuste con el CLIENTE de un producto con problema: devolverle dinero ya
// abonado, rebajarle lo que debe, o (solo sin embarques, legado) cambiarlo
// por otro artículo. Lo que pasa con la plataforma se lleva en el embarque.
export function AjusteClientePanel({
  item,
  saldoPendiente,
  onResolver,
}: {
  item: PedidoItemDetalle;
  saldoPendiente: number;
  onResolver: (payload: AjusteClientePayload) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(item.estado_item === 'defectuoso' || item.estado_item === 'reembolsado');
  const [modo, setModo] = useState<ResolucionDefecto | null>(null);
  const [monto, setMonto] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState(String(item.precio_venta));
  const [url, setUrl] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disponible = item.precio_venta * item.cantidad - item.monto_reembolsado;
  const sinLogistica = item.lineas.length === 0;
  if (disponible <= 0) return null;

  async function ejecutar(payload: AjusteClientePayload) {
    setEnviando(true);
    setError(null);
    try {
      await onResolver(payload);
      setModo(null);
      setMonto('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ajustar el producto');
    } finally {
      setEnviando(false);
    }
  }

  function handleMonto(e: FormEvent) {
    e.preventDefault();
    const valor = Number(monto);
    if (!(valor > 0) || !modo) return;
    ejecutar({ resolucion: modo, monto_reembolso: valor });
  }

  function handleCambio(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    ejecutar({
      resolucion: 'cambio',
      nombre: nombre.trim(),
      precio_venta: Number(precio) || 0,
      url: url.trim() || undefined,
      imagen_url: imagenUrl || undefined,
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-2 flex w-fit items-center gap-1.5 text-xs font-medium text-warning hover:underline"
      >
        <AlertTriangle size={12} /> Ajustar cobro con el cliente
      </button>
    );
  }

  const maxMonto = modo === 'descuento' ? Math.min(disponible, Math.max(saldoPendiente, 0)) : disponible;

  return (
    <div className="mt-2 flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning-surface p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
        <AlertTriangle size={13} /> {MOTIVO[item.estado_item] ?? 'Ajuste'} — {formatCurrency(disponible)} cobrados por este
        producto
      </p>

      {modo === null && (
        <div className="flex flex-wrap gap-2">
          {sinLogistica && (
            <Button type="button" variant="secondary" onClick={() => setModo('cambio')} disabled={enviando}>
              Cambio de producto
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => ejecutar({ resolucion: 'reembolso_total' })}
            disabled={enviando}
          >
            {enviando ? 'Procesando…' : `Devolver todo (${formatCurrency(disponible)})`}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setModo('reembolso_parcial')} disabled={enviando}>
            Devolver parte
          </Button>
          {saldoPendiente > 0 && (
            <Button type="button" variant="secondary" onClick={() => setModo('descuento')} disabled={enviando}>
              Descontar de lo que debe
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => setAbierto(false)} disabled={enviando}>
            Cerrar
          </Button>
        </div>
      )}

      {(modo === 'reembolso_parcial' || modo === 'descuento') && (
        <form onSubmit={handleMonto} className="flex flex-col gap-2">
          <p className="text-xs text-muted">
            {modo === 'descuento'
              ? 'Rebaja lo que el cliente debe, sin mover dinero:'
              : 'Dinero que se le devuelve al cliente (sale como egreso):'}
          </p>
          <Input
            placeholder={`Máx. ${formatCurrency(maxMonto)}`}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            max={maxMonto}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="sm:max-w-[160px]"
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={enviando || !(Number(monto) > 0) || Number(monto) > maxMonto}>
              {enviando ? 'Guardando…' : 'Confirmar'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setModo(null)} disabled={enviando}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {modo === 'cambio' && (
        <form onSubmit={handleCambio} className="flex flex-col gap-2">
          <p className="text-xs text-muted">Se reemplaza por otro artículo:</p>
          <Input placeholder="Producto de reemplazo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Input placeholder="URL del artículo (opcional)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <ImagenArticulo imagenUrl={imagenUrl} onImagenChange={setImagenUrl} />
          <Input
            placeholder="Precio venta (c/u)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            className="sm:max-w-[160px]"
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Confirmar cambio'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setModo(null)} disabled={enviando}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-xs text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
