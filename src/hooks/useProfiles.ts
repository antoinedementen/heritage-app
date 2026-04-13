"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProfiles,
  fetchProfilesByEnv,
  updateProfileRole,
  updateInvitationStatus,
  updateProfileFull,
  deleteProfile,
  type ProfileRole,
  type InvitationStatus,
} from "@/lib/supabase/queries/profiles";

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });
}

export function useProfilesByEnv(envId: string | null) {
  return useQuery({
    queryKey: ["profiles", "env", envId],
    queryFn: () => fetchProfilesByEnv(envId!),
    enabled: !!envId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
      status,
    }: {
      userId: string;
      role?: ProfileRole;
      status?: InvitationStatus;
    }) => {
      if (role) return updateProfileRole(userId, role);
      if (status) return updateInvitationStatus(userId, status);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });
}

export function useUpdateProfileFull() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      ...payload
    }: {
      userId: string;
      role?: ProfileRole;
      invitation_status?: InvitationStatus;
      environment_id?: string | null;
      full_name?: string;
      email?: string;
    }) => updateProfileFull(userId, payload),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
      // Invalidate all env-scoped profile queries
      queryClient.invalidateQueries({ queryKey: ["profiles", "env"] });
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteProfile(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
      queryClient.invalidateQueries({ queryKey: ["profiles", "env"] });
    },
  });
}
