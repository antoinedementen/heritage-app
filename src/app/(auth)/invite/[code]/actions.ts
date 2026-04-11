"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function verifyAccessCode(code: string): Promise<{
  success: boolean;
  environment: { id: string; name: string; description: string | null } | null;
  error?: string;
}> {
  if (!code || code.trim().length === 0) {
    return { success: false, environment: null, error: "Code vide." };
  }

  const supabase = createAdminClient();

  const { data: environment, error } = await supabase
    .from("environments")
    .select("id, name, description")
    .eq("access_code", code.trim().toUpperCase())
    .single();

  if (error || !environment) {
    return {
      success: false,
      environment: null,
      error: "Code d'accès invalide. Vérifiez le code et réessayez.",
    };
  }

  return { success: true, environment };
}

export async function createGuestProfile(
  userId: string,
  environmentId: string
): Promise<{ error: string | null }> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: "",
      role: "guest",
      environment_id: environmentId,
      invitation_status: "approved",
    },
    { onConflict: "id" }
  );

  if (error) return { error: error.message };
  return { error: null };
}
