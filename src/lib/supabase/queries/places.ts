import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Place {
  id: string;
  environment_id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  photo_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string | null;
  end_date: string | null;
  person_id: string | null;
  place_id: string | null;
  created_at: string;
  person_name?: string | null;
  person_photo?: string | null;
}

export interface PlaceDetail extends Place {
  events: PlaceEvent[];
  media: Array<{
    id: string;
    file_url: string;
    file_type: "photo" | "video" | "document";
    caption: string | null;
    created_at: string;
  }>;
  relatedPeople: Array<{
    id: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
    event_count: number;
  }>;
  currentOwner: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
    since: string | null;
  } | null;
  propertyHistory: PlaceEvent[];
}

export interface PlaceFilters {
  search?: string;
  country?: string;
  city?: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchPlaces(
  envId: string,
  filters?: PlaceFilters
): Promise<(Place & { event_count: number })[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("places")
    .select("*")
    .eq("environment_id", envId)
    .order("name");

  if (error) throw error;
  let places = (data ?? []) as Place[];

  // Client-side search filter
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    places = places.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.country?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q)
    );
  }
  if (filters?.country) {
    places = places.filter((p) =>
      p.country?.toLowerCase() === filters.country!.toLowerCase()
    );
  }
  if (filters?.city) {
    places = places.filter((p) =>
      p.city?.toLowerCase().includes(filters.city!.toLowerCase())
    );
  }

  // Fetch event counts for each place
  const counts = await Promise.all(
    places.map((place) =>
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("place_id", place.id)
        .then(({ count }) => ({ id: place.id, count: count ?? 0 }))
    )
  );
  const countMap = Object.fromEntries(counts.map((c) => [c.id, c.count]));

  return places.map((p) => ({ ...p, event_count: countMap[p.id] ?? 0 }));
}

export async function fetchPlace(placeId: string): Promise<PlaceDetail> {
  const supabase = createClient();

  const [placeRes, eventsRes, mediaRes] = await Promise.all([
    supabase.from("places").select("*").eq("id", placeId).single(),
    supabase
      .from("events")
      .select("id, title, description, event_type, event_date, end_date, person_id, place_id, created_at")
      .eq("place_id", placeId)
      .order("event_date", { ascending: true }),
    supabase
      .from("media")
      .select("id, file_url, file_type, caption, created_at")
      .eq("place_id", placeId)
      .order("created_at", { ascending: false }),
  ]);

  if (placeRes.error) throw placeRes.error;

  const events = (eventsRes.data ?? []) as PlaceEvent[];

  // Enrich events with person names
  const personIds = [...new Set(events.map((e) => e.person_id).filter(Boolean))] as string[];
  let personMap: Record<string, { first_name: string; last_name: string; photo_url: string | null }> = {};

  if (personIds.length > 0) {
    const { data: persons } = await supabase
      .from("people")
      .select("id, first_name, last_name, photo_url")
      .in("id", personIds);
    personMap = Object.fromEntries(
      (persons ?? []).map((p: any) => [
        p.id,
        { first_name: p.first_name, last_name: p.last_name, photo_url: p.photo_url },
      ])
    );
  }

  const enrichedEvents: PlaceEvent[] = events.map((e) => ({
    ...e,
    person_name: e.person_id
      ? `${personMap[e.person_id]?.first_name ?? ""} ${personMap[e.person_id]?.last_name ?? ""}`.trim() || null
      : null,
    person_photo: e.person_id ? personMap[e.person_id]?.photo_url ?? null : null,
  }));

  // Property history
  const propertyHistory = enrichedEvents.filter((e) => e.event_type === "property");

  // Current owner: latest property event with no end_date or future end_date
  const today = new Date().toISOString().split("T")[0];
  const activeOwnerEvent = propertyHistory
    .filter((e) => !e.end_date || e.end_date >= today)
    .sort((a, b) => {
      const da = a.event_date ?? "0";
      const db = b.event_date ?? "0";
      return db.localeCompare(da);
    })[0];

  let currentOwner: PlaceDetail["currentOwner"] = null;
  if (activeOwnerEvent?.person_id && personMap[activeOwnerEvent.person_id]) {
    const p = personMap[activeOwnerEvent.person_id];
    currentOwner = {
      id: activeOwnerEvent.person_id,
      first_name: p.first_name,
      last_name: p.last_name,
      photo_url: p.photo_url,
      since: activeOwnerEvent.event_date,
    };
  }

  // Related people (all unique people with events at this place)
  const relatedPeopleMap: Record<string, number> = {};
  for (const e of enrichedEvents) {
    if (e.person_id) {
      relatedPeopleMap[e.person_id] = (relatedPeopleMap[e.person_id] ?? 0) + 1;
    }
  }
  const relatedPeople = Object.entries(relatedPeopleMap)
    .map(([id, count]) => ({
      id,
      first_name: personMap[id]?.first_name ?? "",
      last_name: personMap[id]?.last_name ?? "",
      photo_url: personMap[id]?.photo_url ?? null,
      event_count: count,
    }))
    .filter((p) => p.first_name || p.last_name);

  return {
    ...(placeRes.data as Place),
    events: enrichedEvents,
    media: (mediaRes.data ?? []) as PlaceDetail["media"],
    relatedPeople,
    currentOwner,
    propertyHistory,
  };
}

export async function createPlace(
  envId: string,
  data: Omit<Place, "id" | "environment_id" | "created_by" | "created_at" | "updated_at">
): Promise<Place> {
  const supabase = createClient();
  const { data: result, error } = await supabase
    .from("places")
    .insert({ ...data, environment_id: envId })
    .select()
    .single();
  if (error) throw error;
  return result as Place;
}

export async function updatePlace(
  id: string,
  data: Partial<Omit<Place, "id" | "environment_id" | "created_by" | "created_at" | "updated_at">>
): Promise<Place> {
  const supabase = createClient();
  const { data: result, error } = await supabase
    .from("places")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result as Place;
}

export async function deletePlace(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("places").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadPlacePhoto(file: File, placeId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `places/${placeId}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

// Extract unique country/city values for filter dropdowns
export async function fetchPlaceFilterOptions(envId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("places")
    .select("country, city")
    .eq("environment_id", envId);
  const countries = [...new Set((data ?? []).map((p: any) => p.country).filter(Boolean))].sort() as string[];
  const cities = [...new Set((data ?? []).map((p: any) => p.city).filter(Boolean))].sort() as string[];
  return { countries, cities };
}
