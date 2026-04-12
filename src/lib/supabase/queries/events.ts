import { createClient } from "@/lib/supabase/client";

export type EventType =
  | "birth" | "death" | "marriage" | "divorce" | "baptism"
  | "property" | "residence" | "education" | "career"
  | "military" | "immigration" | "other";

export interface FamilyEvent {
  id: string;
  environment_id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  event_date: string | null;
  end_date: string | null;
  person_id: string | null;
  place_id: string | null;
  created_by: string | null;
  created_at: string;
  // enriched
  person_name?: string | null;
  person_photo?: string | null;
  place_name?: string | null;
}

export interface EventFilters {
  type?: EventType | "";
  personId?: string;
  placeId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Default titles per event type ───────────────────────────────────────────
export const EVENT_DEFAULT_TITLES: Record<EventType, string> = {
  birth:       "Naissance",
  death:       "Décès",
  marriage:    "Mariage",
  divorce:     "Divorce",
  baptism:     "Baptême",
  property:    "Acquisition de propriété",
  residence:   "Résidence",
  education:   "Éducation",
  career:      "Carrière",
  military:    "Service militaire",
  immigration: "Immigration",
  other:       "Événement",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  birth: "Naissance", death: "Décès", marriage: "Mariage", divorce: "Divorce",
  baptism: "Baptême", property: "Propriété", residence: "Résidence",
  education: "Éducation", career: "Carrière", military: "Militaire",
  immigration: "Immigration", other: "Autre",
};

export const EVENT_TYPE_COLORS: Record<EventType, { dot: string; badge: string }> = {
  birth:       { dot: "bg-green-500",          badge: "bg-green-100 text-green-700" },
  death:       { dot: "bg-gray-400",           badge: "bg-gray-100 text-gray-600" },
  marriage:    { dot: "bg-pink-400",           badge: "bg-pink-100 text-pink-700" },
  divorce:     { dot: "bg-orange-400",         badge: "bg-orange-100 text-orange-700" },
  baptism:     { dot: "bg-blue-400",           badge: "bg-blue-100 text-blue-700" },
  property:    { dot: "bg-heritage-gold",      badge: "bg-amber-100 text-amber-700" },
  residence:   { dot: "bg-sky-400",            badge: "bg-sky-100 text-sky-700" },
  education:   { dot: "bg-purple-400",         badge: "bg-purple-100 text-purple-700" },
  career:      { dot: "bg-indigo-400",         badge: "bg-indigo-100 text-indigo-700" },
  military:    { dot: "bg-heritage-dark",      badge: "bg-slate-100 text-slate-700" },
  immigration: { dot: "bg-teal-400",           badge: "bg-teal-100 text-teal-700" },
  other:       { dot: "bg-heritage-brown",     badge: "bg-heritage-beige text-heritage-brown" },
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function enrichEvents(events: FamilyEvent[]): Promise<FamilyEvent[]> {
  const supabase = createClient();
  const personIds = [...new Set(events.map((e) => e.person_id).filter(Boolean))] as string[];
  const placeIds = [...new Set(events.map((e) => e.place_id).filter(Boolean))] as string[];

  const [personsRes, placesRes] = await Promise.all([
    personIds.length > 0
      ? supabase.from("people").select("id, first_name, last_name, photo_url").in("id", personIds)
      : Promise.resolve({ data: [] }),
    placeIds.length > 0
      ? supabase.from("places").select("id, name").in("id", placeIds)
      : Promise.resolve({ data: [] }),
  ]);

  const personMap = Object.fromEntries(
    ((personsRes as any).data ?? []).map((p: any) => [
      p.id,
      { name: `${p.first_name} ${p.last_name}`, photo: p.photo_url },
    ])
  );
  const placeMap = Object.fromEntries(
    ((placesRes as any).data ?? []).map((l: any) => [l.id, l.name])
  );

  return events.map((e) => ({
    ...e,
    person_name: e.person_id ? personMap[e.person_id]?.name ?? null : null,
    person_photo: e.person_id ? personMap[e.person_id]?.photo ?? null : null,
    place_name: e.place_id ? placeMap[e.place_id] ?? null : null,
  }));
}

export async function fetchEvents(
  envId: string,
  filters?: EventFilters
): Promise<FamilyEvent[]> {
  const supabase = createClient();

  let query = supabase
    .from("events")
    .select("*")
    .eq("environment_id", envId)
    .order("event_date", { ascending: true });

  if (filters?.type) query = query.eq("event_type", filters.type);
  if (filters?.personId) query = query.eq("person_id", filters.personId);
  if (filters?.placeId) query = query.eq("place_id", filters.placeId);
  if (filters?.dateFrom) query = query.gte("event_date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("event_date", filters.dateTo);

  const { data, error } = await query;
  if (error) throw error;

  return enrichEvents((data ?? []) as FamilyEvent[]);
}

export async function fetchPersonEvents(personId: string): Promise<FamilyEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("person_id", personId)
    .order("event_date", { ascending: true });
  if (error) throw error;
  return enrichEvents((data ?? []) as FamilyEvent[]);
}

export async function fetchPlaceEvents(placeId: string): Promise<FamilyEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("place_id", placeId)
    .order("event_date", { ascending: true });
  if (error) throw error;
  return enrichEvents((data ?? []) as FamilyEvent[]);
}

export async function createEvent(
  envId: string,
  data: Omit<FamilyEvent, "id" | "environment_id" | "created_by" | "created_at" | "person_name" | "person_photo" | "place_name">
): Promise<FamilyEvent> {
  const supabase = createClient();
  const { data: result, error } = await supabase
    .from("events")
    .insert({ ...data, environment_id: envId })
    .select()
    .single();
  if (error) throw error;
  return result as FamilyEvent;
}

export async function updateEvent(
  id: string,
  data: Partial<Omit<FamilyEvent, "id" | "environment_id" | "created_by" | "created_at" | "person_name" | "person_photo" | "place_name">>
): Promise<FamilyEvent> {
  const supabase = createClient();
  const { data: result, error } = await supabase
    .from("events")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result as FamilyEvent;
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}
