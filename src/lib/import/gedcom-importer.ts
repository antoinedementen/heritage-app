/**
 * Full GEDCOM importer.
 * Takes a GedcomParseResult and persists people, relationships,
 * events (birth/death/marriage) and places into Supabase.
 */

import { createClient } from "@/lib/supabase/client";
import type { GedcomParseResult, GedcomPerson, GedcomFamily } from "./gedcom-parser";
import { createPerson, createRelationship, checkDuplicates } from "@/lib/supabase/queries/people";
import { createPlace } from "@/lib/supabase/queries/places";
import { createEvent } from "@/lib/supabase/queries/events";

export interface GedcomImportProgress {
  stage: "people" | "places" | "relationships" | "events" | "done";
  current: number;
  total: number;
}

export interface GedcomImportReport {
  peopleImported: number;
  peopleDuplicatesSkipped: number;
  placesCreated: number;
  relationshipsCreated: number;
  eventsCreated: number;
  errors: string[];
}

export async function importGedcom(
  envId: string,
  result: GedcomParseResult,
  onProgress?: (p: GedcomImportProgress) => void
): Promise<GedcomImportReport> {
  const report: GedcomImportReport = {
    peopleImported: 0,
    peopleDuplicatesSkipped: 0,
    placesCreated: 0,
    relationshipsCreated: 0,
    eventsCreated: 0,
    errors: [],
  };

  // gedId (@I001@) → Supabase person UUID
  const idMap = new Map<string, string>();
  // place name → Supabase place UUID
  const placeMap = new Map<string, string>();

  // ── 1. Import people ──────────────────────────────────────────────────────

  onProgress?.({ stage: "people", current: 0, total: result.people.length });

  for (let i = 0; i < result.people.length; i++) {
    const gp = result.people[i];
    onProgress?.({ stage: "people", current: i + 1, total: result.people.length });

    try {
      // Duplicate check
      const dups = await checkDuplicates(
        envId,
        gp.first_name,
        gp.last_name,
        gp.birth_date ?? undefined
      );

      if (dups.length > 0) {
        // Map gedId to existing person
        idMap.set(gp.gedId, dups[0].id);
        report.peopleDuplicatesSkipped++;
        continue;
      }

      const person = await createPerson(envId, {
        first_name: gp.first_name || "Inconnu",
        last_name:  gp.last_name  || "Inconnu",
        gender:     gp.gender,
        birth_date: gp.birth_date,
        death_date: gp.death_date,
        birth_place: gp.birth_place,
        is_alive:   gp.is_alive,
        profession: null,
        bio:        null,
        photo_url:  null,
      });

      idMap.set(gp.gedId, person.id);
      report.peopleImported++;
    } catch (err: unknown) {
      report.errors.push(`Personne ${gp.gedId} (${gp.first_name} ${gp.last_name}): ${(err as Error).message}`);
    }
  }

  // ── 2. Import places ──────────────────────────────────────────────────────

  onProgress?.({ stage: "places", current: 0, total: result.placeNames.length });

  for (let i = 0; i < result.placeNames.length; i++) {
    const placeName = result.placeNames[i];
    onProgress?.({ stage: "places", current: i + 1, total: result.placeNames.length });

    if (!placeName) continue;
    try {
      // Check if place already exists in this env
      const supabase = createClient();
      const { data: existing } = await supabase
        .from("places")
        .select("id, name")
        .eq("environment_id", envId)
        .ilike("name", placeName.trim())
        .limit(1)
        .single();

      if (existing) {
        placeMap.set(placeName, existing.id);
        continue;
      }

      // Parse city/country from "City, Country" or "City, State, Country"
      const parts = placeName.split(",").map((s) => s.trim());
      const city = parts[0] ?? null;
      const country = parts[parts.length - 1] ?? null;

      const place = await createPlace(envId, {
        name: placeName,
        address: null,
        city,
        country: country !== city ? country : null,
        latitude: null,
        longitude: null,
        description: null,
        photo_url: null,
      });

      placeMap.set(placeName, place.id);
      report.placesCreated++;
    } catch {
      // Non-critical — just skip place creation
    }
  }

  // ── 3. Import relationships + marriage events ─────────────────────────────

  onProgress?.({ stage: "relationships", current: 0, total: result.families.length });

  for (let i = 0; i < result.families.length; i++) {
    const fam = result.families[i];
    onProgress?.({ stage: "relationships", current: i + 1, total: result.families.length });

    const husbandDbId = fam.husbandId ? idMap.get(fam.husbandId) : null;
    const wifeDbId    = fam.wifeId    ? idMap.get(fam.wifeId)    : null;

    // Spouse relationship
    if (husbandDbId && wifeDbId) {
      try {
        await createRelationship({
          environment_id: envId,
          person_a_id: husbandDbId,
          person_b_id: wifeDbId,
          type: "spouse",
          notes: fam.divorced ? "Divorced" : undefined,
        });
        report.relationshipsCreated++;
      } catch (err: unknown) {
        // Ignore unique constraint violations (rel already exists)
        if (!(err as Error).message?.includes("duplicate")) {
          report.errors.push(`FAM ${fam.gedId} spouse: ${(err as Error).message}`);
        }
      }
    }

    // Parent → child relationships
    for (const childGedId of fam.childIds) {
      const childDbId = idMap.get(childGedId);
      if (!childDbId) continue;

      // Father → child
      if (husbandDbId) {
        try {
          await createRelationship({
            environment_id: envId,
            person_a_id: husbandDbId,
            person_b_id: childDbId,
            type: "parent_child",
          });
          report.relationshipsCreated++;
        } catch {
          // ignore duplicates
        }
      }

      // Mother → child
      if (wifeDbId) {
        try {
          await createRelationship({
            environment_id: envId,
            person_a_id: wifeDbId,
            person_b_id: childDbId,
            type: "parent_child",
          });
          report.relationshipsCreated++;
        } catch {
          // ignore duplicates
        }
      }
    }
  }

  // ── 4. Import events (birth, death, marriage) ─────────────────────────────

  // Birth & death events from INDI records
  const eventQueue: Array<{
    type: string;
    personGedId: string | null;
    date: string | null;
    placeName: string | null;
    title: string;
    familyGedId?: string;
    husbandGedId?: string | null;
    wifeGedId?: string | null;
  }> = [];

  for (const gp of result.people) {
    if (gp.birth_date || gp.birth_place) {
      eventQueue.push({
        type: "birth",
        personGedId: gp.gedId,
        date: gp.birth_date,
        placeName: gp.birth_place,
        title: "Naissance",
      });
    }
    if (gp.death_date || gp.death_place) {
      eventQueue.push({
        type: "death",
        personGedId: gp.gedId,
        date: gp.death_date,
        placeName: gp.death_place,
        title: "Décès",
      });
    }
  }

  // Marriage events from FAM records
  for (const fam of result.families) {
    if (fam.marriageDate || fam.marriagePlace) {
      eventQueue.push({
        type: "marriage",
        personGedId: fam.husbandId,
        date: fam.marriageDate,
        placeName: fam.marriagePlace,
        title: "Mariage",
        familyGedId: fam.gedId,
        husbandGedId: fam.husbandId,
        wifeGedId: fam.wifeId,
      });
    }
  }

  onProgress?.({ stage: "events", current: 0, total: eventQueue.length });

  for (let i = 0; i < eventQueue.length; i++) {
    const ev = eventQueue[i];
    onProgress?.({ stage: "events", current: i + 1, total: eventQueue.length });

    const personDbId = ev.personGedId ? idMap.get(ev.personGedId) ?? null : null;
    const placeDbId  = ev.placeName   ? placeMap.get(ev.placeName) ?? null : null;

    try {
      await createEvent(envId, {
        title: ev.title,
        description: null,
        event_type: ev.type as any,
        event_date: ev.date,
        end_date: null,
        person_id: personDbId,
        place_id: placeDbId,
      });
      report.eventsCreated++;
    } catch {
      // Non-critical
    }
  }

  onProgress?.({ stage: "done", current: 1, total: 1 });
  return report;
}
