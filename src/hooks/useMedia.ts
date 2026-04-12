"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMedia,
  fetchPersonMedia,
  uploadMedia,
  deleteMedia,
  type MediaItem,
  type MediaFilters,
} from "@/lib/supabase/queries/media";

export function useMedia(envId: string, filters?: MediaFilters) {
  return useQuery({
    queryKey: ["media", envId, filters],
    queryFn: () => fetchMedia(envId, filters),
    enabled: !!envId,
  });
}

export function usePersonMedia(personId: string) {
  return useQuery({
    queryKey: ["personMedia", personId],
    queryFn: () => fetchPersonMedia(personId),
    enabled: !!personId,
  });
}

export function useUploadMedia(envId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      meta,
    }: {
      file: File;
      meta: { person_id?: string; place_id?: string; event_id?: string; caption?: string };
    }) => uploadMedia(envId, file, meta),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["media", envId] });
      if (item.person_id) queryClient.invalidateQueries({ queryKey: ["personMedia", item.person_id] });
      if (item.place_id) queryClient.invalidateQueries({ queryKey: ["placeMedia", item.place_id] });
    },
  });
}

export function useDeleteMedia(envId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: MediaItem) => deleteMedia(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", envId] });
      queryClient.invalidateQueries({ queryKey: ["personMedia"] });
    },
  });
}
