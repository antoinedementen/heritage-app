"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPeople,
  fetchPerson,
  createPerson,
  updatePerson,
  deletePerson,
  createRelationship,
  deleteRelationship,
  type Person,
  type PeopleFilters,
  type RelationshipType,
} from "@/lib/supabase/queries/people";

export function usePeople(envId: string, filters?: PeopleFilters) {
  return useQuery({
    queryKey: ["people", envId, filters],
    queryFn: () => fetchPeople(envId, filters),
    enabled: !!envId,
  });
}

export function usePerson(personId: string) {
  return useQuery({
    queryKey: ["person", personId],
    queryFn: () => fetchPerson(personId),
    enabled: !!personId,
  });
}

export function useCreatePerson(envId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Omit<Person, "id" | "environment_id" | "created_by" | "created_at" | "updated_at">
    ) => createPerson(envId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people", envId] });
      queryClient.invalidateQueries({ queryKey: ["peopleStats", envId] });
      queryClient.invalidateQueries({ queryKey: ["completeness", envId] });
      queryClient.invalidateQueries({ queryKey: ["duplicates", envId] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });
}

export function useUpdatePerson(envId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Person, "id" | "environment_id" | "created_by" | "created_at" | "updated_at">>;
    }) => updatePerson(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["people", envId] });
      queryClient.invalidateQueries({ queryKey: ["person", id] });
      queryClient.invalidateQueries({ queryKey: ["completeness", envId] });
    },
  });
}

export function useDeletePerson(envId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePerson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people", envId] });
      queryClient.invalidateQueries({ queryKey: ["peopleStats", envId] });
      queryClient.invalidateQueries({ queryKey: ["completeness", envId] });
      queryClient.invalidateQueries({ queryKey: ["duplicates", envId] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });
}

export function useCreateRelationship(personId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      environment_id: string;
      person_a_id: string;
      person_b_id: string;
      type: RelationshipType;
      notes?: string;
    }) => createRelationship(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["person", personId] });
      queryClient.invalidateQueries({ queryKey: ["peopleStats"] });
    },
  });
}

export function useDeleteRelationship(personId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRelationship(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["person", personId] });
    },
  });
}
