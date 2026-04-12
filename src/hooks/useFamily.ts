"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEnvironment,
  fetchPeopleStats,
  fetchRecentActivity,
  fetchCompleteness,
  fetchDuplicates,
  fetchEnvironmentMembers,
} from "@/lib/supabase/queries/family";
import {
  updateProfileRole,
  updateInvitationStatus,
  type ProfileRole,
} from "@/lib/supabase/queries/profiles";

export function useEnvironment(envId: string) {
  return useQuery({
    queryKey: ["environment", envId],
    queryFn: () => fetchEnvironment(envId),
    enabled: !!envId,
  });
}

export function usePeopleStats(envId: string) {
  return useQuery({
    queryKey: ["peopleStats", envId],
    queryFn: () => fetchPeopleStats(envId),
    enabled: !!envId,
  });
}

export function useRecentActivity(envId: string) {
  return useQuery({
    queryKey: ["recentActivity", envId],
    queryFn: () => fetchRecentActivity(envId),
    enabled: !!envId,
  });
}

export function useCompleteness(envId: string) {
  return useQuery({
    queryKey: ["completeness", envId],
    queryFn: () => fetchCompleteness(envId),
    enabled: !!envId,
  });
}

export function useDuplicates(envId: string) {
  return useQuery({
    queryKey: ["duplicates", envId],
    queryFn: () => fetchDuplicates(envId),
    enabled: !!envId,
    staleTime: 10 * 60 * 1000, // duplicates don't change often
  });
}

export function useEnvironmentMembers(envId: string) {
  return useQuery({
    queryKey: ["environmentMembers", envId],
    queryFn: () => fetchEnvironmentMembers(envId),
    enabled: !!envId,
  });
}

export function useApproveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "approved" | "rejected" }) =>
      updateInvitationStatus(userId, status),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["environmentMembers"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProfileRole }) =>
      updateProfileRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environmentMembers"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

export function useInviteMember(envId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, envId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Invitation échouée");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environmentMembers", envId] });
    },
  });
}
