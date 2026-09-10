import { createClient } from '@supabase/supabase-js';

// Cliente con service role — solo para uso server-side (API routes).
// Nunca importar este módulo desde código que se ejecute en el navegador.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
