"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPlaces,
  fetchPlace,
  createPlace,
  updatePlace,
  deletePlace,
  fetchPlaceFilterOptions,
  type Place,
  type PlaceFilters,
} from "@/lib/supabase/queries/places";

export function usePlaces(envId: string, filters?: PlaceFilters) {
  return useQuery({
    queryKey: ["places", envId, filters],
    queryFn: () => fetchPlaces(envId, filters),
    enabled: !!envId,
  });
}

export function usePlace(placeId: string) {
  return useQuery({
    queryKey: ["place", placeId],
    queryFn: () => fetchPlace(placeId),
    enabled: !!placeId,
  });
}

export function usePlaceFilterOptions(envId: string) {
  return useQuery({
    queryKey: ["placeFilterOptions", envId],
    queryFn: () => fetchPlaceFilterOptions(envId),
    enabled: !!envId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreatePlace(envId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Omit<Place, "id" | "environment_id" | "created_by" | "created_at" | "updated_at">
    ) => createPlace(envId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places", envId] });
      queryClient.invalidateQueries({ queryKey: ["peopleStats", envId] });
    },
  });
}

export function useUpdatePlace(envId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Place, "id" | "environment_id" | "created_by" | "created_at" | "updated_at">>;
    }) => updatePlace(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["places", envId] });
      queryClient.invalidateQueries({ queryKey: ["place", id] });
    },
  });
}

export function useDeletePlace(envId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePlace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places", envId] });
      queryClient.invalidateQueries({ queryKey: ["peopleStats", envId] });
    },
  });
}
