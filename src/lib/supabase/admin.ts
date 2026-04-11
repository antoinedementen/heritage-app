// Client admin Supabase — côté serveur UNIQUEMENT
// Utilise la service role key : bypasse toutes les policies RLS.
// Intentionnellement non typé avec Database (opérations privilégiées, pas de user-facing queries).
// Ne jamais exposer ce client côté client (pas de "use client").
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): ReturnType<typeof createClient<any>> {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
