"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/lib/supabase/queries/audit";
import { restoreFromAuditLog } from "@/lib/supabase/audit";

export function useAuditLogs(environmentId?: string) {
  return useQuery({
    queryKey: ["auditLogs", environmentId ?? "all"],
    queryFn: () => fetchAuditLogs(environmentId),
  });
}

export function useRestoreAuditLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => restoreFromAuditLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
    },
  });
}
