/**
 * Relationship calculator — BFS-based graph traversal with French nomenclature.
 * Accepts a flat list of people + relationships and computes the kinship
 * between any two individuals.
 */

import type { Person, RelationshipWithPerson } from "@/lib/supabase/queries/people";

// ─── Graph types ──────────────────────────────────────────────────────────────

export interface RelGraph {
  /** personId → list of adjacent nodes */
  adj: Map<string, Array<{ id: string; type: string; direction: "up" | "down" | "lateral" }>>;
}

/** One step along a path between two people */
export interface PathStep {
  personId: string;
  label: string; // e.g. "père", "fils"
}

export interface RelationshipResult {
  /** French label, e.g. "cousin germain", "arrière-grand-père" */
  label: string;
  /** Path from A to B (intermediate nodes + labels) */
  path: string[]; // person IDs
  /** Number of generations up from A to common ancestor */
  generationsUp: number;
  /** Number of generations down from common ancestor to B */
  generationsDown: number;
  /** Whether they are related at all */
  related: boolean;
}

// ─── Build adjacency graph ────────────────────────────────────────────────────

/**
 * Build a traversal graph from a people list with embedded relationships.
 * Each relationship appears as edges in both directions for BFS.
 */
export function buildRelGraph(
  people: Array<Person & { relationships: RelationshipWithPerson[] }>
): RelGraph {
  const adj = new Map<string, Array<{ id: string; type: string; direction: "up" | "down" | "lateral" }>>();

  for (const person of people) {
    if (!adj.has(person.id)) adj.set(person.id, []);

    for (const rel of person.relationships) {
      if (!rel.related_person) continue;
      const otherId = rel.related_person.id;

      if (!adj.has(otherId)) adj.set(otherId, []);

      // parent_child: person_a is parent of person_b (a_to_b → person is parent)
      if (rel.type === "parent_child") {
        if (rel.direction === "a_to_b") {
          // current person is parent of related_person
          adj.get(person.id)!.push({ id: otherId, type: "parent_child", direction: "down" });
          adj.get(otherId)!.push({ id: person.id, type: "parent_child", direction: "up" });
        } else {
          // current person is child of related_person
          adj.get(person.id)!.push({ id: otherId, type: "parent_child", direction: "up" });
          adj.get(otherId)!.push({ id: person.id, type: "parent_child", direction: "down" });
        }
      } else if (rel.type === "adoptive_parent") {
        if (rel.direction === "a_to_b") {
          adj.get(person.id)!.push({ id: otherId, type: "adoptive_parent", direction: "down" });
          adj.get(otherId)!.push({ id: person.id, type: "adoptive_parent", direction: "up" });
        } else {
          adj.get(person.id)!.push({ id: otherId, type: "adoptive_parent", direction: "up" });
          adj.get(otherId)!.push({ id: person.id, type: "adoptive_parent", direction: "down" });
        }
      } else {
        // spouse / sibling / godparent / guardian → lateral
        adj.get(person.id)!.push({ id: otherId, type: rel.type, direction: "lateral" });
        adj.get(otherId)!.push({ id: person.id, type: rel.type, direction: "lateral" });
      }
    }
  }

  // Deduplicate edges
  for (const [id, edges] of adj) {
    const seen = new Set<string>();
    adj.set(
      id,
      edges.filter((e) => {
        const key = `${e.id}:${e.direction}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    );
  }

  return { adj };
}

// ─── BFS ──────────────────────────────────────────────────────────────────────

interface BfsNode {
  id: string;
  path: string[];
  /** signed: negative = up, positive = down, 0 = lateral */
  genDelta: number;
  edgeTypes: string[];
}

/** Returns the shortest path between two nodes, or null if unreachable. */
function bfs(graph: RelGraph, fromId: string, toId: string): BfsNode | null {
  if (fromId === toId) return { id: toId, path: [fromId], genDelta: 0, edgeTypes: [] };

  const visited = new Set<string>();
  const queue: BfsNode[] = [{ id: fromId, path: [fromId], genDelta: 0, edgeTypes: [] }];
  visited.add(fromId);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const neighbors = graph.adj.get(cur.id) ?? [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor.id)) continue;
      visited.add(neighbor.id);

      const delta =
        neighbor.direction === "up" ? cur.genDelta - 1
        : neighbor.direction === "down" ? cur.genDelta + 1
        : cur.genDelta;

      const node: BfsNode = {
        id: neighbor.id,
        path: [...cur.path, neighbor.id],
        genDelta: delta,
        edgeTypes: [...cur.edgeTypes, `${neighbor.type}:${neighbor.direction}`],
      };

      if (neighbor.id === toId) return node;
      queue.push(node);
    }
  }

  return null;
}

// ─── French nomenclature ──────────────────────────────────────────────────────

function ordinal(n: number): string {
  if (n === 1) return "ième";
  return `ième`;
}

function prefix(n: number): string {
  if (n === 1) return "arrière-";
  if (n === 2) return "arrière-arrière-";
  return `${"arrière-".repeat(n)}`;
}

function frenchLabel(
  up: number,
  down: number,
  gender: "male" | "female" | "other",
  isSelf: boolean
): string {
  const m = gender === "male";

  if (isSelf) return "vous-même";

  // Direct line up (ancestors)
  if (down === 0) {
    if (up === 1) return m ? "père" : "mère";
    if (up === 2) return m ? "grand-père" : "grand-mère";
    if (up === 3) return m ? "arrière-grand-père" : "arrière-grand-mère";
    return `${prefix(up - 2)}grand-${m ? "père" : "mère"}`;
  }

  // Direct line down (descendants)
  if (up === 0) {
    if (down === 1) return m ? "fils" : "fille";
    if (down === 2) return m ? "petit-fils" : "petite-fille";
    if (down === 3) return m ? "arrière-petit-fils" : "arrière-petite-fille";
    return `${prefix(down - 2)}petit-${m ? "fils" : "fille"}`;
  }

  // Siblings (same parents)
  if (up === 1 && down === 1) return m ? "frère" : "sœur";

  // Uncle / Aunt (up 2, down 1)
  if (up === 2 && down === 1) return m ? "oncle" : "tante";

  // Nephew / Niece (up 1, down 2)
  if (up === 1 && down === 2) return m ? "neveu" : "nièce";

  // Cousins
  if (up === down) {
    const degree = up - 1;
    if (degree === 1) return m ? "cousin germain" : "cousine germaine";
    return m ? `cousin au ${degree}${ordinal(degree)} degré` : `cousine au ${degree}${ordinal(degree)} degré`;
  }

  // Great uncle / great aunt (up 3, down 1)
  if (up === 3 && down === 1) return m ? "grand-oncle" : "grand-tante";
  if (up === 1 && down === 3) return m ? "grand-neveu" : "grand-nièce";

  // Generic fallback
  const smaller = Math.min(up, down);
  const larger = Math.max(up, down);
  const extra = larger - smaller;
  if (up > down) {
    return m
      ? `cousin éloigné (${extra} génération${extra > 1 ? "s" : ""} d'écart)`
      : `cousine éloignée (${extra} génération${extra > 1 ? "s" : ""} d'écart)`;
  }
  return m
    ? `cousin éloigné (descendant, ${extra} génération${extra > 1 ? "s" : ""} d'écart)`
    : `cousine éloignée (descendante, ${extra} génération${extra > 1 ? "s" : ""} d'écart)`;
}

function spouseLabel(gender: "male" | "female" | "other"): string {
  return gender === "male" ? "époux" : gender === "female" ? "épouse" : "conjoint";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate the relationship between person A and person B.
 * `people` must include relationship data (relationships field populated).
 */
export function calculateRelationship(
  graph: RelGraph,
  personAId: string,
  personBId: string,
  personBGender: "male" | "female" | "other"
): RelationshipResult {
  if (personAId === personBId) {
    return { label: "vous-même", path: [personAId], generationsUp: 0, generationsDown: 0, related: true };
  }

  const result = bfs(graph, personAId, personBId);
  if (!result) {
    return { label: "Aucun lien trouvé", path: [], generationsUp: 0, generationsDown: 0, related: false };
  }

  // Check if they are direct spouses (single lateral edge)
  if (result.path.length === 2 && result.edgeTypes[0]?.includes("spouse")) {
    return {
      label: spouseLabel(personBGender),
      path: result.path,
      generationsUp: 0,
      generationsDown: 0,
      related: true,
    };
  }

  // Count generations up and down along the path
  let up = 0;
  let down = 0;
  for (const edge of result.edgeTypes) {
    if (edge.includes(":up")) up++;
    else if (edge.includes(":down")) down++;
  }

  const label = frenchLabel(up, down, personBGender, false);

  return {
    label,
    path: result.path,
    generationsUp: up,
    generationsDown: down,
    related: true,
  };
}
