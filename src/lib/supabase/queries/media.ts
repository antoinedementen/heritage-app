import { createClient } from "@/lib/supabase/client";

export type FileType = "photo" | "video" | "document";

export interface MediaItem {
  id: string;
  environment_id: string;
  person_id: string | null;
  place_id: string | null;
  event_id: string | null;
  file_url: string;
  file_type: FileType;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
  // enriched
  person_name?: string | null;
  place_name?: string | null;
}

export interface MediaFilters {
  fileType?: FileType | "";
  personId?: string;
  placeId?: string;
}

async function enrichMedia(items: MediaItem[]): Promise<MediaItem[]> {
  const supabase = createClient();
  const personIds = [...new Set(items.map((m) => m.person_id).filter(Boolean))] as string[];
  const placeIds = [...new Set(items.map((m) => m.place_id).filter(Boolean))] as string[];

  const [pr, lr] = await Promise.all([
    personIds.length > 0
      ? supabase.from("people").select("id, first_name, last_name").in("id", personIds)
      : Promise.resolve({ data: [] }),
    placeIds.length > 0
      ? supabase.from("places").select("id, name").in("id", placeIds)
      : Promise.resolve({ data: [] }),
  ]);

  const pm = Object.fromEntries(((pr as any).data ?? []).map((p: any) => [p.id, `${p.first_name} ${p.last_name}`]));
  const lm = Object.fromEntries(((lr as any).data ?? []).map((l: any) => [l.id, l.name]));

  return items.map((m) => ({
    ...m,
    person_name: m.person_id ? pm[m.person_id] ?? null : null,
    place_name: m.place_id ? lm[m.place_id] ?? null : null,
  }));
}

export async function fetchMedia(
  envId: string,
  filters?: MediaFilters
): Promise<MediaItem[]> {
  const supabase = createClient();

  let query = supabase
    .from("media")
    .select("*")
    .eq("environment_id", envId)
    .order("created_at", { ascending: false });

  if (filters?.fileType) query = query.eq("file_type", filters.fileType);
  if (filters?.personId) query = query.eq("person_id", filters.personId);
  if (filters?.placeId) query = query.eq("place_id", filters.placeId);

  const { data, error } = await query;
  if (error) throw error;
  return enrichMedia((data ?? []) as MediaItem[]);
}

export async function fetchPersonMedia(personId: string): Promise<MediaItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return enrichMedia((data ?? []) as MediaItem[]);
}

export async function uploadMedia(
  envId: string,
  file: File,
  meta: {
    person_id?: string;
    place_id?: string;
    event_id?: string;
    caption?: string;
  }
): Promise<MediaItem> {
  const supabase = createClient();

  // Detect file type
  let file_type: FileType = "document";
  if (file.type.startsWith("image/")) file_type = "photo";
  else if (file.type.startsWith("video/")) file_type = "video";

  const ext = file.name.split(".").pop();
  const filename = `${envId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(filename, file);
  if (uploadError) throw uploadError;

  // Get URL (signed for private bucket)
  const { data: signedData } = await supabase.storage
    .from("media")
    .createSignedUrl(filename, 60 * 60 * 24 * 365); // 1 year
  const file_url = signedData?.signedUrl ?? filename;

  // Insert record
  const { data: record, error: insertError } = await supabase
    .from("media")
    .insert({
      environment_id: envId,
      file_url,
      file_type,
      caption: meta.caption?.trim() || null,
      person_id: meta.person_id ?? null,
      place_id: meta.place_id ?? null,
      event_id: meta.event_id ?? null,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  return record as MediaItem;
}

export async function deleteMedia(item: MediaItem): Promise<void> {
  const supabase = createClient();
  // Extract storage path from URL
  const url = new URL(item.file_url);
  const storagePath = url.pathname.split("/media/")[1];
  if (storagePath) {
    await supabase.storage.from("media").remove([storagePath]);
  }
  const { error } = await supabase.from("media").delete().eq("id", item.id);
  if (error) throw error;
}
