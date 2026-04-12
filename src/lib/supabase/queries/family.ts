import { createClient } from "@/lib/supabase/client";

// ─── Environment ──────────────────────────────────────────────────────────────

export async function fetchEnvironment(envId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("environments")
    .select("*")
    .eq("id", envId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface PeopleStats {
  people: number;
  relationships: number;
  places: number;
  events: number;
}

export async function fetchPeopleStats(envId: string): Promise<PeopleStats> {
  const supabase = createClient();
  const [peopleRes, relRes, placesRes, eventsRes] = await Promise.all([
    supabase.from("people").select("id", { count: "exact", head: true }).eq("environment_id", envId),
    supabase.from("relationships").select("id", { count: "exact", head: true }).eq("environment_id", envId),
    supabase.from("places").select("id", { count: "exact", head: true }).eq("environment_id", envId),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("environment_id", envId),
  ]);
  return {
    people: peopleRes.count ?? 0,
    relationships: relRes.count ?? 0,
    places: placesRes.count ?? 0,
    events: eventsRes.count ?? 0,
  };
}

// ─── Recent Activity ──────────────────────────────────────────────────────────

export interface RecentActivity {
  id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  record_id: string;
  old_data: unknown;
  new_data: unknown;
  performed_by: string | null;
  performed_at: string;
  performer_name: string | null;
  performer_avatar: string | null;
}

export async function fetchRecentActivity(envId: string): Promise<RecentActivity[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("environment_id", envId)
    .order("performed_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  if (!data) return [];

  const userIds = [...new Set(data.map((l) => l.performed_by).filter(Boolean))];
  let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds as string[]);
    profilesMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
    );
  }

  return data.map((log) => ({
    ...log,
    performer_name: log.performed_by ? (profilesMap[log.performed_by]?.full_name ?? null) : null,
    performer_avatar: log.performed_by ? (profilesMap[log.performed_by]?.avatar_url ?? null) : null,
  }));
}

// ─── Completeness ─────────────────────────────────────────────────────────────

export interface PersonRow {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  birth_date: string | null;
  birth_place: string | null;
  profession: string | null;
  bio: string | null;
  photo_url: string | null;
}

export interface CompletenessResult {
  total: number;
  complete: number;
  incomplete: number;
  percentage: number;
  missingFieldsFrequency: Record<string, number>;
  incompletePeople: Array<{ id: string; name: string; missingFields: string[] }>;
}

const REQUIRED_FIELDS: Array<{ key: keyof PersonRow; label: string }> = [
  { key: "first_name",  label: "Prénom" },
  { key: "last_name",   label: "Nom" },
  { key: "gender",      label: "Genre" },
  { key: "birth_date",  label: "Date de naissance" },
  { key: "birth_place", label: "Lieu de naissance" },
  { key: "profession",  label: "Profession" },
];

export async function fetchCompleteness(envId: string): Promise<CompletenessResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, first_name, last_name, gender, birth_date, birth_place, profession, bio, photo_url")
    .eq("environment_id", envId);

  if (error) throw error;
  if (!data || data.length === 0) {
    return { total: 0, complete: 0, incomplete: 0, percentage: 100, missingFieldsFrequency: {}, incompletePeople: [] };
  }

  const missingFieldsFrequency: Record<string, number> = {};
  let completeCount = 0;
  const incompletePeople: CompletenessResult["incompletePeople"] = [];

  for (const person of data as PersonRow[]) {
    const missing = REQUIRED_FIELDS.filter((f) => !person[f.key]).map((f) => f.label);
    if (missing.length === 0) {
      completeCount++;
    } else {
      incompletePeople.push({
        id: person.id,
        name: `${person.first_name} ${person.last_name}`,
        missingFields: missing,
      });
      for (const field of missing) {
        missingFieldsFrequency[field] = (missingFieldsFrequency[field] ?? 0) + 1;
      }
    }
  }

  return {
    total: data.length,
    complete: completeCount,
    incomplete: data.length - completeCount,
    percentage: Math.round((completeCount / data.length) * 100),
    missingFieldsFrequency,
    incompletePeople,
  };
}

// ─── Duplicates ───────────────────────────────────────────────────────────────

export interface DuplicatePair {
  a: PersonRow;
  b: PersonRow;
  matchScore: number;
}

export async function fetchDuplicates(envId: string): Promise<DuplicatePair[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, first_name, last_name, gender, birth_date, birth_place, profession, bio, photo_url")
    .eq("environment_id", envId);

  if (error) throw error;
  if (!data || data.length < 2) return [];

  const people = data as PersonRow[];
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i];
      const b = people[j];
      let score = 0;
      if (a.last_name.toLowerCase() === b.last_name.toLowerCase()) score++;
      if (a.first_name.toLowerCase() === b.first_name.toLowerCase()) score++;
      if (a.birth_date && b.birth_date && a.birth_date === b.birth_date) score++;
      if (score >= 2) {
        pairs.push({ a, b, matchScore: score });
      }
    }
  }

  return pairs;
}

// ─── Members ──────────────────────────────────────────────────────────────────

export interface EnvironmentMember {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  invitation_status: string;
}

export async function fetchEnvironmentMembers(envId: string): Promise<EnvironmentMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, invitation_status")
    .eq("environment_id", envId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EnvironmentMember[];
}

export async function inviteMember(email: string, _envId: string) {
  const supabase = createClient();
  // Supabase Auth invite — only works server-side with service_role key.
  // Here we just trigger via admin API route.
  const res = await fetch("/api/admin/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error ?? "Invitation failed");
  }
  return res.json();
}
