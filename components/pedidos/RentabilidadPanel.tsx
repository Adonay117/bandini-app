import { Info } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { StatTile } from '@/components/ui/StatTile';
import { EstadoPedido, RentabilidadPedido } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';

// Ganancia real = ventas − costo de productos − costo de importación.
// Los números salen de la vista v_pedidos_rentabilidad (base de datos).
export function RentabilidadPanel({ r, estado }: { r: RentabilidadPedido; estado: EstadoPedido }) {
  const ganancia = Number(r.ganancia);
  const cerradoSinVenta = estado === 'desistido' || estado === 'cancelado';
  return (
    <Panel title="Rentabilidad">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Ventas"
          value={formatCurrency(Number(r.ventas))}
          hint={cerradoSinVenta ? 'solo lo pagado' : undefined}
        />
        <StatTile
          label="Costo productos"
          value={formatCurrency(Number(r.costo_productos))}
          hint={Number(r.reembolsos_plataforma) > 0 ? `neto de ${formatCurrency(Number(r.reembolsos_plataforma))} reemb.` : undefined}
        />
        <StatTile label="Importación" value={formatCurrency(Number(r.costo_importacion))} hint="envío a El Salvador" />
        <StatTile
          label="Ganancia real"
          value={formatCurrency(ganancia)}
          tone={ganancia > 0 ? 'positive' : ganancia < 0 ? 'negative' : 'default'}
        />
      </div>
      {r.productos_sin_costo > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-warning">
          <Info size={13} />
          {r.productos_sin_costo === 1 ? '1 producto no tiene' : `${r.productos_sin_costo} productos no tienen`} precio de
          compra: la ganancia está sobrestimada.
        </p>
      )}
    </Panel>
  );
}
