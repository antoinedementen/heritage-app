import { createClient } from "@/lib/supabase/client";

/**
 * Restores a record to its state before a given audit log entry.
 * Works for UPDATE (restores old_data) and DELETE (re-inserts old_data).
 * After restoration, a new audit log entry is created automatically via the trigger.
 */
export async function restoreFromAuditLog(logId: string): Promise<void> {
  const supabase = createClient();

  // 1. Fetch the audit log entry
  const { data: log, error: logError } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("id", logId)
    .single();

  if (logError) throw logError;
  if (!log) throw new Error("Audit log entry not found");
  if (!log.old_data) throw new Error("No old_data to restore");
  if (log.action === "INSERT") throw new Error("Cannot restore an INSERT action");

  const tableName = log.table_name as
    | "people"
    | "relationships"
    | "places"
    | "events"
    | "media";

  // 2. UPSERT old_data back into the original table
  // We cast to any to avoid strict table typing since we are working dynamically
  const { error: upsertError } = await (supabase as any)
    .from(tableName)
    .upsert(log.old_data, { onConflict: "id" });

  if (upsertError) throw upsertError;
}
