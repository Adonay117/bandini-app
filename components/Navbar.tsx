'use client';

import { Menu } from 'lucide-react';

// Barra superior solo para móvil: en desktop la navegación y la cuenta viven
// por completo en el Sidebar.
export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2.5 bg-primary px-4 text-white shadow-sm lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="-ml-1.5 rounded-lg p-1.5 text-white/80 active:bg-white/10"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>
      <span className="text-[15px] font-semibold tracking-tight">Bandini</span>
    </header>
  );
}
