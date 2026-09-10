import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Cliente público — usado en el navegador (hooks, subscripciones real-time,
// login). Usa createBrowserClient (no createClient) para que la sesión se
// guarde en cookies y no solo en localStorage: así el middleware (que corre
// en el servidor) puede leerla y proteger páginas/API routes.
// Se crea de forma perezosa: si se instanciara a nivel de módulo, el build de
// Next.js fallaría al prerenderizar páginas server-side sin NEXT_PUBLIC_* seteadas.
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
