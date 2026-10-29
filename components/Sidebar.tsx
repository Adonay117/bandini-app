'use client';

import { FocusEvent, MouseEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { useNotificacionesPendientes } from '@/lib/hooks/useNotificacionesPendientes';
import { notificar } from '@/lib/notificar';

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
    label: 'Logística',
    items: [
      { href: '/embarques', label: 'Embarques', icon: Truck },
      { href: '/incidencias', label: 'Incidencias', icon: AlertTriangle },
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

const CLAVE_COLAPSADO = 'bandini:sidebar-colapsado';

/** Preferencia de colapsado (solo escritorio), recordada por navegador. */
function useColapsado() {
  const [colapsado, setColapsado] = useState(false);
  // Hasta leer la preferencia no se anima el ancho: así un sidebar guardado
  // como colapsado no "se cierra" en cada carga.
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      setColapsado(localStorage.getItem(CLAVE_COLAPSADO) === '1');
    } catch {
      // Sin acceso a localStorage (modo privado, bloqueado): queda expandido.
    }
    const id = requestAnimationFrame(() => setListo(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const alternar = useCallback(() => {
    setColapsado((prev) => {
      try {
        localStorage.setItem(CLAVE_COLAPSADO, prev ? '0' : '1');
      } catch {
        // idem
      }
      return !prev;
    });
  }, []);

  return { colapsado, alternar, listo };
}

/** Tooltip a la derecha del sidebar colapsado. Va con position fixed porque
 * la lista de navegación tiene scroll y recortaría un tooltip absoluto. */
interface Tooltip {
  texto: string;
  top: number;
  left: number;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const notifPendientes = useNotificacionesPendientes();
  const [email, setEmail] = useState<string | null>(null);
  const { colapsado, alternar, listo } = useColapsado();
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  // Se detecta en el cliente para no desalinear el HTML del servidor.
  const [atajo, setAtajo] = useState('Ctrl+B');

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setAtajo('⌘B');
  }, []);

  useEffect(() => {
    getSupabaseClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  // Ctrl+B / ⌘B alterna el sidebar, salvo mientras se escribe en un campo.
  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'b' || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      alternar();
    }
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [alternar]);

  // Al expandir no debe quedar un tooltip colgado.
  useEffect(() => {
    if (!colapsado) setTooltip(null);
  }, [colapsado]);

  async function cerrarSesion() {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) {
      notificar.error('No se pudo cerrar sesión', error.message);
      return;
    }
    notificar.info('Sesión cerrada');
    router.push('/login');
    router.refresh();
  }

  function mostrarTooltip(texto: string) {
    return (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
      if (!colapsado) return;
      const caja = e.currentTarget.getBoundingClientRect();
      setTooltip({ texto, top: caja.top + caja.height / 2, left: caja.right + 10 });
    };
  }
  const ocultarTooltip = () => setTooltip(null);
  const conTooltip = (texto: string) => ({
    onMouseEnter: mostrarTooltip(texto),
    onFocus: mostrarTooltip(texto),
    onMouseLeave: ocultarTooltip,
    onBlur: ocultarTooltip,
  });

  const inicial = (email?.[0] ?? 'A').toUpperCase();
  // Las variantes "colapsadas" solo aplican en escritorio (lg); en móvil el
  // sidebar es un cajón y siempre va expandido.
  const c = (clases: string) => (colapsado ? clases : '');

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
        aria-label="Navegación principal"
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] shrink-0 -translate-x-full flex-col bg-primary text-white lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
          colapsado ? 'lg:w-[72px]' : 'lg:w-60'
        } ${listo ? 'transition-[transform,width] duration-200 ease-out' : ''} ${open ? 'translate-x-0' : ''}`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/[0.08]"
        />

        {/* Contraer/expandir: en el borde, solo escritorio. */}
        <button
          type="button"
          onClick={alternar}
          aria-expanded={!colapsado}
          aria-label={colapsado ? 'Expandir menú' : 'Contraer menú'}
          {...conTooltip(`Expandir menú · ${atajo}`)}
          title={colapsado ? undefined : `Contraer menú (${atajo})`}
          className="absolute top-7 -right-3 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-white text-muted shadow-[var(--shadow-card)] transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none lg:flex"
        >
          <ChevronLeft size={14} strokeWidth={2.5} className={`transition-transform duration-200 ${colapsado ? 'rotate-180' : ''}`} />
        </button>

        <div className={`relative flex h-full flex-col px-3 py-4 lg:py-5 ${c('lg:px-2')}`}>
          {/* Marca */}
          <div className={`mb-5 flex items-center gap-2.5 px-2 ${c('lg:justify-center lg:px-0')}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/12 text-base font-semibold">
              B
            </span>
            <div className={`min-w-0 flex-1 ${c('lg:hidden')}`}>
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
          <div className="-mx-1 flex-1 overflow-x-hidden overflow-y-auto px-1" onScroll={ocultarTooltip}>
            {GRUPOS.map((grupo, i) => (
              <div key={grupo.label} className="mb-1">
                <p
                  className={`px-3 pt-3 pb-1.5 text-[10px] font-semibold tracking-wider whitespace-nowrap text-white/40 uppercase ${c(
                    'lg:hidden'
                  )}`}
                >
                  {grupo.label}
                </p>
                {/* Colapsado, el título del grupo se vuelve una línea divisoria. */}
                {colapsado && i > 0 && <div aria-hidden className="mx-2.5 my-2.5 hidden h-px bg-white/10 lg:block" />}
                <div className="flex flex-col gap-0.5">
                  {grupo.items.map((item) => {
                    const active = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    const conBadge = item.badge && notifPendientes > 0;
                    const badge = notifPendientes > 99 ? '99+' : notifPendientes;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        aria-label={colapsado ? item.label + (conBadge ? ` (${badge} pendientes)` : '') : undefined}
                        {...conTooltip(item.label)}
                        className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${c(
                          'lg:mx-auto lg:h-10 lg:w-10 lg:justify-center lg:gap-0 lg:px-0 lg:py-0'
                        )} ${
                          active
                            ? 'bg-white font-semibold text-primary shadow-[0_1px_2px_rgba(20,15,35,0.12)]'
                            : 'font-medium text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon size={colapsado ? 18 : 17} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
                        <span className={`flex-1 truncate ${c('lg:hidden')}`}>{item.label}</span>
                        {conBadge && (
                          <span
                            className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums ${
                              active ? 'bg-primary text-white' : 'bg-white text-primary'
                            } ${c(
                              'lg:absolute lg:-top-1 lg:-right-1 lg:h-4 lg:min-w-4 lg:text-[10px] lg:ring-2 lg:ring-primary'
                            )}`}
                          >
                            {badge}
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
            <div className={`flex items-center gap-2.5 px-2 py-1 ${c('lg:flex-col lg:gap-1.5 lg:px-0')}`}>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold"
                {...conTooltip(email ?? 'Admin')}
              >
                {inicial}
              </span>
              <div className={`min-w-0 flex-1 ${c('lg:hidden')}`}>
                <p className="truncate text-sm font-medium">Admin</p>
                {email && <p className="truncate text-xs text-white/55">{email}</p>}
              </div>
              <button
                type="button"
                onClick={cerrarSesion}
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Cerrar sesión"
                title={colapsado ? undefined : 'Cerrar sesión'}
                {...conTooltip('Cerrar sesión')}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {tooltip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 hidden -translate-y-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-[var(--shadow-pop)] lg:block"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          {tooltip.texto}
        </div>
      )}
    </>
  );
}
