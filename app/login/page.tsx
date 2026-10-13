'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, Boxes, Eye, EyeOff, Layers, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getSupabaseClient } from '@/lib/supabase';
import { notificar } from '@/lib/notificar';

const features = [
  { icon: Boxes, text: 'Pedidos organizados de principio a fin' },
  { icon: Layers, text: 'Todas tus plataformas en un solo lugar' },
  { icon: Award, text: 'Stickers y premios bajo control' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      await notificar(
        async () => {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
        },
        { cargando: 'Iniciando sesión…', exito: 'Sesión iniciada', error: 'No se pudo iniciar sesión' }
      );
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Correo o contraseña incorrectos');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Panel de marca — oculto en móvil, protagonista en escritorio */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(46rem 46rem at 10% -10%, rgba(216, 209, 241, 0.25), transparent 60%), radial-gradient(40rem 40rem at 100% 110%, rgba(63, 54, 91, 0.7), transparent 55%)',
          }}
        />

        <div className="relative text-sm font-semibold tracking-[0.3em] text-white/70">BANDINI SV</div>

        <div className="relative">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-secondary/80">Varieties &amp; Imports</p>
          <h2 className="max-w-sm text-3xl font-semibold leading-snug tracking-tight">
            Gestiona tus variedades e importaciones desde un solo panel.
          </h2>

          <ul className="mt-8 flex flex-col gap-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon size={15} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-white/50">© {new Date().getFullYear()} Bandini SV — Varieties &amp; Imports</div>
      </div>

      {/* Panel de formulario */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted lg:hidden">Bandini SV</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-primary lg:mt-0">Bienvenido de nuevo</h1>
            <p className="mt-1 text-sm text-muted">Ingresa a tu panel de administración</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-muted">
                Correo
              </label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-light" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="min-h-11 w-full rounded-xl border border-secondary bg-white py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition-shadow placeholder:text-muted-light focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-muted">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="min-h-11 w-full rounded-xl border border-secondary bg-white py-2.5 pl-3.5 pr-11 text-sm text-ink outline-none transition-shadow placeholder:text-muted-light focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-light transition-colors hover:text-muted"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={submitting} className="mt-1 w-full py-2.5">
              {submitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
