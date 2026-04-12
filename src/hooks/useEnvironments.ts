"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchEnvironments,
  fetchGlobalStats,
  createEnvironment,
  deleteEnvironment,
} from "@/lib/supabase/queries/environments";

export function useEnvironments() {
  return useQuery({
    queryKey: ["environments"],
    queryFn: fetchEnvironments,
  });
}

export function useGlobalStats() {
  return useQuery({
    queryKey: ["globalStats"],
    queryFn: fetchGlobalStats,
  });
}

export function useCreateEnvironment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      createEnvironment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });
}

export function useDeleteEnvironment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEnvironment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });
}
