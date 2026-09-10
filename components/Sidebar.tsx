'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Package, ShoppingCart, Bell, ClipboardList, Wallet, X } from 'lucide-react';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/productos', label: 'Productos', icon: Package },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/notificaciones', label: 'Notificaciones', icon: Bell },
  { href: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/transacciones', label: 'Ingresos y Egresos', icon: Wallet },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-primary/30 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <nav
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 -translate-x-full flex-col gap-0.5 border-r border-secondary/70 bg-white px-3 py-4 transition-transform duration-200 lg:static lg:z-auto lg:w-60 lg:translate-x-0 lg:py-6 ${
          open ? 'translate-x-0' : ''
        }`}
      >
        <div className="mb-2 flex items-center justify-between px-1 lg:hidden">
          <span className="text-sm font-semibold text-ink">Menú</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-light hover:bg-surface hover:text-ink"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'border-primary bg-secondary/60 font-medium text-primary'
                  : 'border-transparent font-normal text-muted hover:bg-surface hover:text-ink'
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
