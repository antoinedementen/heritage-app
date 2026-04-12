import type { RecentActivity } from "@/lib/supabase/queries/family";

/**
 * Converts a raw audit log entry into a human-readable French sentence.
 * e.g. "Marie a ajouté Jean Dupont" / "Pierre a modifié la fiche de Louise Martin"
 */
export function formatAuditAction(log: RecentActivity): string {
  const who = log.performer_name ?? "Quelqu'un";

  const newData = log.new_data as Record<string, unknown> | null;
  const oldData = log.old_data as Record<string, unknown> | null;

  // Try to extract a person name from new_data or old_data
  function getPersonName(d: Record<string, unknown> | null): string | null {
    if (!d) return null;
    const first = d.first_name as string | undefined;
    const last = d.last_name as string | undefined;
    if (first || last) return [first, last].filter(Boolean).join(" ");
    const title = d.title as string | undefined;
    if (title) return title;
    const name = d.name as string | undefined;
    if (name) return name;
    return null;
  }

  const subject =
    getPersonName(newData) ?? getPersonName(oldData) ?? "un enregistrement";

  const tableLabels: Record<string, string> = {
    people:        "la fiche de",
    relationships: "une relation pour",
    places:        "le lieu",
    events:        "l'événement",
    media:         "un média pour",
  };

  const tableLabel = tableLabels[log.table_name] ?? "un enregistrement dans";

  switch (log.action) {
    case "INSERT":
      return `${who} a ajouté ${subject}`;
    case "UPDATE":
      return `${who} a modifié ${tableLabel} ${subject}`;
    case "DELETE":
      return `${who} a supprimé ${tableLabel} ${subject}`;
    default:
      return `${who} a effectué une action sur ${subject}`;
  }
}

/**
 * Returns a human-readable relative date in French.
 * e.g. "il y a 2 heures", "hier", "il y a 3 jours"
 */
export function formatRelativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffH < 24) return `il y a ${diffH} h`;
  if (diffD === 1) return "hier";
  if (diffD < 7) return `il y a ${diffD} jours`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(iso));
}
