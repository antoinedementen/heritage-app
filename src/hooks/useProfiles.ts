"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProfiles,
  updateProfileRole,
  updateInvitationStatus,
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

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteProfile(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });
}
