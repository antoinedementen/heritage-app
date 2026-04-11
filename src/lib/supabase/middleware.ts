import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Rafraîchit le token — NE PAS retirer cet appel
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/pending");

  // Utilisateur non connecté → redirige vers /login pour les routes protégées
  if (!user && !isAuthRoute && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Utilisateur connecté sur /login → redirige vers son dashboard
  if (user && isLoginPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, environment_id, invitation_status")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();

    if (profile?.role === "super_admin") {
      url.pathname = "/admin";
    } else if (
      profile?.environment_id &&
      (profile?.invitation_status === "approved" || profile?.role === "guest")
    ) {
      url.pathname = `/${profile.environment_id}`;
    } else {
      url.pathname = "/pending";
    }

    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
