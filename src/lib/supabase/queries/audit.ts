import { createClient } from "@/lib/supabase/client";

export interface AuditLogEntry {
  id: string;
  environment_id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  // JSON from Supabase can be any JSON value; we cast to object when needed
  old_data: unknown;
  new_data: unknown;
  performed_by: string | null;
  performed_at: string;
  performer_name?: string | null;
  performer_email?: string | null;
}

export async function fetchAuditLogs(
  environmentId?: string,
  limit = 50
): Promise<AuditLogEntry[]> {
  const supabase = createClient();

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("performed_at", { ascending: false })
    .limit(limit);

  if (environmentId) {
    query = query.eq("environment_id", environmentId);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data) return [];

  // Enrich with performer info
  const userIds = [...new Set(data.map((l) => l.performed_by).filter(Boolean))];

  let profilesMap: Record<string, { full_name: string | null; email: string }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds as string[]);

    profilesMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }])
    );
  }

  return data.map((log) => ({
    ...log,
    performer_name: log.performed_by
      ? profilesMap[log.performed_by]?.full_name ?? null
      : null,
    performer_email: log.performed_by
      ? profilesMap[log.performed_by]?.email ?? null
      : null,
  }));
}
