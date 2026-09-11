'use client';

import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', className = '' }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-light"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-11 w-full rounded-xl border border-border bg-white pr-9 pl-10 text-sm text-ink outline-none transition-shadow placeholder:text-muted-light focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-muted-light hover:bg-surface hover:text-muted"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
