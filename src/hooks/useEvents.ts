"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEvents,
  fetchPersonEvents,
  fetchPlaceEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  type FamilyEvent,
  type EventFilters,
  type EventType,
} from "@/lib/supabase/queries/events";

export function useEvents(envId: string, filters?: EventFilters) {
  return useQuery({
    queryKey: ["events", envId, filters],
    queryFn: () => fetchEvents(envId, filters),
    enabled: !!envId,
  });
}

export function usePersonEvents(personId: string) {
  return useQuery({
    queryKey: ["personEvents", personId],
    queryFn: () => fetchPersonEvents(personId),
    enabled: !!personId,
  });
}

export function usePlaceEvents(placeId: string) {
  return useQuery({
    queryKey: ["placeEvents", placeId],
    queryFn: () => fetchPlaceEvents(placeId),
    enabled: !!placeId,
  });
}

export function useCreateEvent(envId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Omit<FamilyEvent, "id" | "environment_id" | "created_by" | "created_at" | "person_name" | "person_photo" | "place_name">
    ) => createEvent(envId, data),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ["events", envId] });
      queryClient.invalidateQueries({ queryKey: ["peopleStats", envId] });
      if (event.person_id) {
        queryClient.invalidateQueries({ queryKey: ["personEvents", event.person_id] });
        queryClient.invalidateQueries({ queryKey: ["person", event.person_id] });
      }
      if (event.place_id) {
        queryClient.invalidateQueries({ queryKey: ["placeEvents", event.place_id] });
        queryClient.invalidateQueries({ queryKey: ["place", event.place_id] });
      }
    },
  });
}

export function useDeleteEvent(envId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", envId] });
      queryClient.invalidateQueries({ queryKey: ["peopleStats", envId] });
      queryClient.invalidateQueries({ queryKey: ["personEvents"] });
      queryClient.invalidateQueries({ queryKey: ["placeEvents"] });
    },
  });
}
