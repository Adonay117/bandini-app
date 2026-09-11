'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { useNotificacionesPendientes } from '@/lib/hooks/useNotificacionesPendientes';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: boolean;
}

const GRUPOS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operación',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/clientes', label: 'Clientes', icon: Users },
      { href: '/productos', label: 'Productos', icon: Package },
      { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
      { href: '/pedidos', label: 'Pedidos', icon: ClipboardList },
    ],
  },
  {
    label: 'Finanzas',
    items: [{ href: '/transacciones', label: 'Ingresos y egresos', icon: Wallet }],
  },
  {
    label: 'Avisos',
    items: [{ href: '/notificaciones', label: 'Notificaciones', icon: Bell, badge: true }],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const notifPendientes = useNotificacionesPendientes();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function cerrarSesion() {
    await getSupabaseClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const inicial = (email?.[0] ?? 'A').toUpperCase();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <nav
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] shrink-0 -translate-x-full flex-col bg-primary text-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-60 lg:translate-x-0 ${
          open ? 'translate-x-0' : ''
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/[0.08]"
        />

        <div className="relative flex h-full flex-col px-3 py-4 lg:py-5">
          {/* Marca */}
          <div className="mb-5 flex items-center gap-2.5 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/12 text-base font-semibold">
              B
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-tight font-semibold">Bandini</p>
              <p className="text-[11px] leading-tight text-white/50">Panel de administración</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navegación */}
          <div className="-mx-1 flex-1 overflow-y-auto px-1">
            {GRUPOS.map((grupo) => (
              <div key={grupo.label} className="mb-1">
                <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold tracking-wider text-white/40 uppercase">
                  {grupo.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {grupo.items.map((item) => {
                    const active = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                          active
                            ? 'bg-white font-semibold text-primary shadow-[0_1px_2px_rgba(20,15,35,0.12)]'
                            : 'font-medium text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon size={17} strokeWidth={active ? 2.4 : 2} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && notifPendientes > 0 && (
                          <span
                            className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums ${
                              active ? 'bg-primary text-white' : 'bg-white text-primary'
                            }`}
                          >
                            {notifPendientes > 99 ? '99+' : notifPendientes}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Cuenta */}
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="flex items-center gap-2.5 px-2 py-1">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
                {inicial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Admin</p>
                {email && <p className="truncate text-xs text-white/55">{email}</p>}
              </div>
              <button
                type="button"
                onClick={cerrarSesion}
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
