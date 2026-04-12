"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildTreeLayout, type Relationship } from "@/lib/tree/layout";
import type { Person } from "@/lib/supabase/queries/people";

async function fetchTreeData(envId: string): Promise<{
  people: Person[];
  relationships: Relationship[];
}> {
  const supabase = createClient();
  const [peopleRes, relsRes] = await Promise.all([
    supabase
      .from("people")
      .select("*")
      .eq("environment_id", envId),
    supabase
      .from("relationships")
      .select("id, person_a_id, person_b_id, type, status")
      .eq("environment_id", envId),
  ]);
  if (peopleRes.error) throw peopleRes.error;
  if (relsRes.error) throw relsRes.error;

  return {
    people: (peopleRes.data ?? []) as Person[],
    relationships: (relsRes.data ?? []) as Relationship[],
  };
}

export function useTreeData(
  envId: string,
  focusPersonId: string | null,
  showDates = true
) {
  const query = useQuery({
    queryKey: ["treeData", envId],
    queryFn: () => fetchTreeData(envId),
    enabled: !!envId,
  });

  const { nodes, edges } = useMemo(() => {
    const { people = [], relationships = [] } = query.data ?? {};
    if (!focusPersonId || people.length === 0) return { nodes: [], edges: [] };
    try {
      return buildTreeLayout(people, relationships, focusPersonId, showDates);
    } catch {
      return { nodes: [], edges: [] };
    }
  }, [query.data, focusPersonId, showDates]);

  // Find the natural center person (most relationships)
  const defaultFocusId = useMemo(() => {
    const { people = [], relationships = [] } = query.data ?? {};
    if (people.length === 0) return null;

    const relCount = new Map<string, number>();
    for (const rel of relationships) {
      relCount.set(rel.person_a_id, (relCount.get(rel.person_a_id) ?? 0) + 1);
      relCount.set(rel.person_b_id, (relCount.get(rel.person_b_id) ?? 0) + 1);
    }

    let maxId = people[0].id;
    let maxCount = 0;
    for (const person of people) {
      const count = relCount.get(person.id) ?? 0;
      if (count > maxCount) { maxCount = count; maxId = person.id; }
    }
    return maxId;
  }, [query.data]);

  return {
    nodes,
    edges,
    allPeople: query.data?.people ?? [],
    isLoading: query.isLoading,
    defaultFocusId,
  };
}
