'use client';

import { useRouter } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();

  async function cerrarSesion() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between bg-primary px-4 text-white shadow-sm sm:px-6 lg:px-8">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onMenuClick}
          className="-ml-1.5 rounded-lg p-1.5 text-white/80 active:bg-white/10 lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <span className="text-[15px] font-semibold tracking-tight text-white">Bandini</span>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-medium text-white">
          A
        </span>
        <span className="hidden text-sm text-white/80 sm:inline">Admin</span>
        <button
          type="button"
          onClick={cerrarSesion}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
