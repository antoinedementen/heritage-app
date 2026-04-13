"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchEnvironments,
  fetchEnvironmentById,
  fetchGlobalStats,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
} from "@/lib/supabase/queries/environments";

export function useEnvironments() {
  return useQuery({
    queryKey: ["environments"],
    queryFn: fetchEnvironments,
  });
}

export function useEnvironment(id: string | null) {
  return useQuery({
    queryKey: ["environment", id],
    queryFn: () => fetchEnvironmentById(id!),
    enabled: !!id,
  });
}

export function useUpdateEnvironment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; description?: string }) =>
      updateEnvironment(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      queryClient.invalidateQueries({ queryKey: ["environment", id] });
    },
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
