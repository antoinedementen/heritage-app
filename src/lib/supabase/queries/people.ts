import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Gender = "male" | "female" | "other";
export type RelationshipType =
  | "parent_child"
  | "spouse"
  | "sibling"
  | "godparent"
  | "adoptive_parent"
  | "guardian";

export interface Person {
  id: string;
  environment_id: string;
  first_name: string;
  last_name: string;
  gender: Gender;
  birth_date: string | null;
  death_date: string | null;
  birth_place: string | null;
  profession: string | null;
  bio: string | null;
  photo_url: string | null;
  is_alive: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelationshipWithPerson {
  id: string;
  type: RelationshipType;
  status: "active" | "dissolved";
  notes: string | null;
  direction: "a_to_b" | "b_to_a"; // whether current person is person_a or person_b
  related_person: Person;
}

export interface EventEntry {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string | null;
  end_date: string | null;
  place_id: string | null;
  created_at: string;
}

export interface MediaEntry {
  id: string;
  file_url: string;
  file_type: "photo" | "video" | "document";
  caption: string | null;
  created_at: string;
}

export interface PersonDetail extends Person {
  relationships: RelationshipWithPerson[];
  events: EventEntry[];
  media: MediaEntry[];
}

export interface PeopleFilters {
  search?: string;
  gender?: Gender | "";
  incompleteOnly?: boolean;
  sortBy?: "name" | "created_at" | "completeness";
}

// ─── Completeness helper (shared with UI) ─────────────────────────────────────

const COMPLETENESS_FIELDS: Array<{ key: keyof Person; label: string }> = [
  { key: "first_name",  label: "Prénom" },
  { key: "last_name",   label: "Nom" },
  { key: "gender",      label: "Genre" },
  { key: "birth_date",  label: "Date de naissance" },
  { key: "birth_place", label: "Lieu de naissance" },
  { key: "profession",  label: "Profession" },
];

export function getPersonCompleteness(person: Person): {
  pct: number;
  filled: string[];
  missing: string[];
} {
  const filled: string[] = [];
  const missing: string[] = [];
  for (const f of COMPLETENESS_FIELDS) {
    if (person[f.key]) filled.push(f.label);
    else missing.push(f.label);
  }
  return { pct: Math.round((filled.length / COMPLETENESS_FIELDS.length) * 100), filled, missing };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchPeople(
  envId: string,
  filters?: PeopleFilters
): Promise<Person[]> {
  const supabase = createClient();

  let query = supabase
    .from("people")
    .select("*")
    .eq("environment_id", envId);

  if (filters?.gender) {
    query = query.eq("gender", filters.gender);
  }

  const sortBy = filters?.sortBy ?? "name";
  if (sortBy === "name") {
    query = query.order("last_name").order("first_name");
  } else if (sortBy === "created_at") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("last_name").order("first_name");
  }

  const { data, error } = await query;
  if (error) throw error;
  let people = (data ?? []) as Person[];

  // Client-side filters
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    people = people.filter(
      (p) =>
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q)
    );
  }

  if (filters?.incompleteOnly) {
    people = people.filter((p) => getPersonCompleteness(p).pct < 100);
  }

  if (sortBy === "completeness") {
    people = people.sort(
      (a, b) => getPersonCompleteness(a).pct - getPersonCompleteness(b).pct
    );
  }

  return people;
}

export async function fetchPerson(personId: string): Promise<PersonDetail> {
  const supabase = createClient();

  const [personRes, relsARes, relsBRes, eventsRes, mediaRes] = await Promise.all([
    supabase.from("people").select("*").eq("id", personId).single(),
    // Relationships where this person is person_a
    supabase
      .from("relationships")
      .select("id, type, status, notes, person_b_id")
      .eq("person_a_id", personId),
    // Relationships where this person is person_b
    supabase
      .from("relationships")
      .select("id, type, status, notes, person_a_id")
      .eq("person_b_id", personId),
    supabase
      .from("events")
      .select("id, title, description, event_type, event_date, end_date, place_id, created_at")
      .eq("person_id", personId)
      .order("event_date", { ascending: true }),
    supabase
      .from("media")
      .select("id, file_url, file_type, caption, created_at")
      .eq("person_id", personId)
      .order("created_at", { ascending: false }),
  ]);

  if (personRes.error) throw personRes.error;

  // Gather all related person IDs
  const relatedIds = [
    ...(relsARes.data ?? []).map((r: any) => r.person_b_id),
    ...(relsBRes.data ?? []).map((r: any) => r.person_a_id),
  ].filter(Boolean) as string[];

  let relatedPeopleMap: Record<string, Person> = {};
  if (relatedIds.length > 0) {
    const { data: rp } = await supabase
      .from("people")
      .select("*")
      .in("id", relatedIds);
    relatedPeopleMap = Object.fromEntries((rp ?? []).map((p: any) => [p.id, p as Person]));
  }

  const relationships: RelationshipWithPerson[] = [
    ...(relsARes.data ?? []).map((r: any) => ({
      id: r.id,
      type: r.type as RelationshipType,
      status: r.status ?? "active",
      notes: r.notes ?? null,
      direction: "a_to_b" as const,
      related_person: relatedPeopleMap[r.person_b_id],
    })),
    ...(relsBRes.data ?? []).map((r: any) => ({
      id: r.id,
      type: r.type as RelationshipType,
      status: r.status ?? "active",
      notes: r.notes ?? null,
      direction: "b_to_a" as const,
      related_person: relatedPeopleMap[r.person_a_id],
    })),
  ].filter((r) => r.related_person != null);

  return {
    ...(personRes.data as Person),
    relationships,
    events: (eventsRes.data ?? []) as EventEntry[],
    media: (mediaRes.data ?? []) as MediaEntry[],
  };
}

export async function createPerson(
  envId: string,
  data: Omit<Person, "id" | "environment_id" | "created_by" | "created_at" | "updated_at">
): Promise<Person> {
  const supabase = createClient();
  const { data: result, error } = await supabase
    .from("people")
    .insert({ ...data, environment_id: envId })
    .select()
    .single();
  if (error) throw error;
  return result as Person;
}

export async function updatePerson(
  id: string,
  data: Partial<Omit<Person, "id" | "environment_id" | "created_by" | "created_at" | "updated_at">>
): Promise<Person> {
  const supabase = createClient();
  const { data: result, error } = await supabase
    .from("people")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result as Person;
}

export async function deletePerson(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("people").delete().eq("id", id);
  if (error) throw error;
}

export async function createRelationship(data: {
  environment_id: string;
  person_a_id: string;
  person_b_id: string;
  type: RelationshipType;
  notes?: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("relationships").insert(data);
  if (error) throw error;
}

export async function deleteRelationship(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("relationships").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadPersonPhoto(
  file: File,
  personId: string
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `people/${personId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

// Check for potential duplicates among existing people
export async function checkDuplicates(
  envId: string,
  firstName: string,
  lastName: string,
  birthDate?: string
): Promise<Person[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("environment_id", envId);

  if (error) throw error;
  if (!data) return [];

  return (data as Person[]).filter((p) => {
    let score = 0;
    if (p.last_name.toLowerCase() === lastName.toLowerCase()) score++;
    if (p.first_name.toLowerCase() === firstName.toLowerCase()) score++;
    if (birthDate && p.birth_date && p.birth_date === birthDate) score++;
    return score >= 2;
  });
}
