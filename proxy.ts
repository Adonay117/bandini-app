import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // getClaims valida el JWT de la cookie localmente (con las llaves públicas
  // del proyecto, cacheadas) en vez de llamar a Supabase Auth en cada página
  // y cada /api/*: ahorra un viaje de red por petición. Si el token venció lo
  // refresca; las llaves simétricas (legacy) caen a una verificación remota.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ?? null;

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/login';
  const isApiRoute = pathname.startsWith('/api');

  if (!user && !isLoginPage) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  // Públicos (sin login): assets, PWA (sw, manifest, íconos) y el webhook de push,
  // que se autentica con su propio secreto.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|icons/|api/push/enviar|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
