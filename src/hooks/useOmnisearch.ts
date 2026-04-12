"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PersonResult {
  kind: "person";
  id: string;
  full_name: string;
  birth_date: string | null;
  death_date: string | null;
  profession: string | null;
  photo_url: string | null;
  gender: string;
}

export interface PlaceResult {
  kind: "place";
  id: string;
  name: string;
  city: string | null;
  country: string | null;
}

export type OmnisearchResult = PersonResult | PlaceResult;

export function useOmnisearch(envId: string | null) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce 300ms
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  // Fetch results
  useEffect(() => {
    if (!envId || debouncedQuery.length < 2) {
      setPeople([]);
      setPlaces([]);
      return;
    }

    const q = debouncedQuery.trim();
    setLoading(true);

    const supabase = createClient();

    Promise.all([
      supabase
        .from("people")
        .select("id, first_name, last_name, birth_date, death_date, profession, photo_url, gender")
        .eq("environment_id", envId)
        .or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,profession.ilike.%${q}%`
        )
        .limit(5),

      supabase
        .from("places")
        .select("id, name, city, country")
        .eq("environment_id", envId)
        .or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`)
        .limit(5),
    ])
      .then(([pRes, lRes]) => {
        setPeople(
          (pRes.data ?? []).map((p: any) => ({
            kind: "person" as const,
            id: p.id,
            full_name: `${p.first_name} ${p.last_name}`,
            birth_date: p.birth_date,
            death_date: p.death_date,
            profession: p.profession,
            photo_url: p.photo_url,
            gender: p.gender,
          }))
        );
        setPlaces(
          (lRes.data ?? []).map((l: any) => ({
            kind: "place" as const,
            id: l.id,
            name: l.name,
            city: l.city,
            country: l.country,
          }))
        );
      })
      .catch(() => {
        setPeople([]);
        setPlaces([]);
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery, envId]);

  function clear() {
    setQuery("");
    setDebouncedQuery("");
    setPeople([]);
    setPlaces([]);
  }

  const allResults: OmnisearchResult[] = [...people, ...places];

  return { query, setQuery, people, places, allResults, loading, clear };
}
