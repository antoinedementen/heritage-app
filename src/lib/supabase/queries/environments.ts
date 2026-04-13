import { createClient } from "@/lib/supabase/client";

export interface EnvironmentWithStats {
  id: string;
  name: string;
  description: string | null;
  access_code: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  people_count: number;
  members_count: number;
}

export async function fetchEnvironments(): Promise<EnvironmentWithStats[]> {
  const supabase = createClient();

  const { data: envs, error } = await supabase
    .from("environments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!envs) return [];

  // Fetch counts for each environment in parallel
  const withStats = await Promise.all(
    envs.map(async (env) => {
      const [peopleRes, membersRes] = await Promise.all([
        supabase
          .from("people")
          .select("id", { count: "exact", head: true })
          .eq("environment_id", env.id),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("environment_id", env.id),
      ]);

      return {
        ...env,
        people_count: peopleRes.count ?? 0,
        members_count: membersRes.count ?? 0,
      };
    })
  );

  return withStats;
}

export async function fetchEnvironmentById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("environments")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createEnvironment(payload: {
  name: string;
  description?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("environments")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEnvironment(
  id: string,
  payload: { name?: string; description?: string }
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("environments")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEnvironment(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("environments").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchGlobalStats() {
  const supabase = createClient();
  const [envsRes, usersRes, peopleRes] = await Promise.all([
    supabase.from("environments").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("people").select("id", { count: "exact", head: true }),
  ]);
  return {
    environments: envsRes.count ?? 0,
    users: usersRes.count ?? 0,
    people: peopleRes.count ?? 0,
  };
}
