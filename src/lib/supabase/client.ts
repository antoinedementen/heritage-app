import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Guard: ne pas initialiser si les variables sont absentes (ex: build statique)
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required."
    );
  }

  client = createBrowserClient<Database>(url, key);
  return client;
}
