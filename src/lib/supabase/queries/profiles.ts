import { createClient } from "@/lib/supabase/client";

export type ProfileRole = "super_admin" | "family_admin" | "editor" | "guest";
export type InvitationStatus = "pending" | "approved" | "rejected";

export interface ProfileWithEnvironment {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  environment_id: string | null;
  invitation_status: InvitationStatus;
  created_at: string;
  updated_at: string;
  environment_name?: string | null;
}

export async function fetchProfiles(): Promise<ProfileWithEnvironment[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *,
      environments ( name )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((p: any) => ({
    ...p,
    environment_name: p.environments?.name ?? null,
    environments: undefined,
  }));
}

export async function updateProfileRole(
  userId: string,
  role: ProfileRole
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) throw error;
}

export async function updateInvitationStatus(
  userId: string,
  status: InvitationStatus
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ invitation_status: status })
    .eq("id", userId);
  if (error) throw error;
}

export async function fetchProfilesByEnv(
  envId: string
): Promise<ProfileWithEnvironment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(`*, environments ( name )`)
    .eq("environment_id", envId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data) return [];
  return data.map((p: any) => ({
    ...p,
    environment_name: p.environments?.name ?? null,
    environments: undefined,
  }));
}

export async function updateProfileFull(
  userId: string,
  payload: {
    role?: ProfileRole;
    invitation_status?: InvitationStatus;
    environment_id?: string | null;
    full_name?: string;
    email?: string;
  }
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId);
  if (error) throw error;
}

export async function deleteProfile(userId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").delete().eq("id", userId);
  if (error) throw error;
}
