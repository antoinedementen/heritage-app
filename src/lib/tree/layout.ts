import type { Node, Edge } from "reactflow";
import type { Person } from "@/lib/supabase/queries/people";

// ─── Constants ────────────────────────────────────────────────────────────────
const NODE_W = 168;
const NODE_H = 84;
const H_GAP = 48;       // horizontal gap between nodes
const V_GAP = 140;      // vertical gap between generations
const COUPLE_SIZE = 10; // couple junction dot size

export interface Relationship {
  id: string;
  person_a_id: string;
  person_b_id: string;
  type: string;
  status: "active" | "dissolved";
}

export interface TreeNode extends Node {
  data: {
    person?: Person;
    dissolved?: boolean;
    showDates?: boolean;
    isFocus?: boolean;
  };
}

export type TreeEdge = Edge & {
  data?: { dissolved?: boolean; type?: "spouse" | "parent" };
};

// ─── Layout builder ───────────────────────────────────────────────────────────

export function buildTreeLayout(
  allPeople: Person[],
  allRelationships: Relationship[],
  focusPersonId: string,
  showDates = true
): { nodes: TreeNode[]; edges: TreeEdge[] } {
  const peopleMap = new Map(allPeople.map((p) => [p.id, p]));

  // ── Build adjacency maps ──────────────────────────────────────────────────
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  const spousesOf = new Map<string, Array<{ id: string; status: "active" | "dissolved"; relId: string }> >();

  for (const rel of allRelationships) {
    if (rel.type === "parent_child") {
      // person_a = parent, person_b = child
      if (!childrenOf.has(rel.person_a_id)) childrenOf.set(rel.person_a_id, []);
      childrenOf.get(rel.person_a_id)!.push(rel.person_b_id);
      if (!parentsOf.has(rel.person_b_id)) parentsOf.set(rel.person_b_id, []);
      parentsOf.get(rel.person_b_id)!.push(rel.person_a_id);
    } else if (rel.type === "spouse") {
      const entry = { id: rel.person_b_id, status: rel.status, relId: rel.id };
      const entryRev = { id: rel.person_a_id, status: rel.status, relId: rel.id };
      if (!spousesOf.has(rel.person_a_id)) spousesOf.set(rel.person_a_id, []);
      spousesOf.get(rel.person_a_id)!.push(entry);
      if (!spousesOf.has(rel.person_b_id)) spousesOf.set(rel.person_b_id, []);
      spousesOf.get(rel.person_b_id)!.push(entryRev);
    }
  }

  // ── BFS: find people within ±2 generations from focus ────────────────────
  const personGen = new Map<string, number>();
  personGen.set(focusPersonId, 0);

  const queue: Array<{ id: string; gen: number }> = [{ id: focusPersonId, gen: 0 }];
  const visited = new Set<string>([focusPersonId]);

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    if (!peopleMap.has(id)) continue;

    // Go up (parents)
    if (gen > -2) {
      for (const parentId of parentsOf.get(id) ?? []) {
        if (!visited.has(parentId) && peopleMap.has(parentId)) {
          visited.add(parentId);
          personGen.set(parentId, gen - 1);
          queue.push({ id: parentId, gen: gen - 1 });
        }
      }
    }

    // Go down (children)
    if (gen < 2) {
      for (const childId of childrenOf.get(id) ?? []) {
        if (!visited.has(childId) && peopleMap.has(childId)) {
          visited.add(childId);
          personGen.set(childId, gen + 1);
          queue.push({ id: childId, gen: gen + 1 });
        }
      }
    }

    // Include spouses at same generation
    for (const spouse of spousesOf.get(id) ?? []) {
      if (!visited.has(spouse.id) && peopleMap.has(spouse.id)) {
        visited.add(spouse.id);
        personGen.set(spouse.id, gen);
        queue.push({ id: spouse.id, gen });
      }
    }
  }

  // ── Group by generation ───────────────────────────────────────────────────
  const byGen = new Map<number, string[]>();
  for (const [pid, gen] of personGen.entries()) {
    if (!byGen.has(gen)) byGen.set(gen, []);
    byGen.get(gen)!.push(pid);
  }

  // ── Find couple pairs within each generation ──────────────────────────────
  // A couple = two spouses in the same generation who share at least one child,
  // or are linked by a spouse relationship.
  interface CouplePair {
    id: string; // couple node id
    personAId: string;
    personBId: string;
    generation: number;
    relId: string;
    dissolved: boolean;
  }

  const couples: CouplePair[] = [];
  const coupledPersons = new Set<string>(); // persons already in a couple pair

  for (const [gen, personIds] of byGen.entries()) {
    for (const pid of personIds) {
      for (const spouse of spousesOf.get(pid) ?? []) {
        if (personIds.includes(spouse.id) && !coupledPersons.has(pid) && !coupledPersons.has(spouse.id)) {
          const coupleId = `couple-${[pid, spouse.id].sort().join("-")}`;
          couples.push({
            id: coupleId,
            personAId: pid,
            personBId: spouse.id,
            generation: gen,
            relId: spouse.relId,
            dissolved: spouse.status === "dissolved",
          });
          coupledPersons.add(pid);
          coupledPersons.add(spouse.id);
        }
      }
    }
  }

  // ── Position people per generation ───────────────────────────────────────
  // We build ordered slots for each generation: [person | couple-group | person, ...]
  // A couple-group occupies: [personA, couple_dot, personB]
  // width of a slot: NODE_W + H_GAP
  // width of a couple-group: NODE_W + H_GAP/2 + COUPLE_SIZE + H_GAP/2 + NODE_W

  const positions = new Map<string, { x: number; y: number }>();

  for (const [gen, personIds] of byGen.entries()) {
    // Build an ordered list of items for this row
    // First separate coupled and uncoupled persons in this generation
    const coupleGroupsInGen = couples.filter((c) => c.generation === gen);
    const singlePersonIds = personIds.filter((pid) => !coupledPersons.has(pid) || !coupleGroupsInGen.some((c) => c.personAId === pid || c.personBId === pid));

    // Items: { type: 'person', id } | { type: 'couple', couple }
    type Item =
      | { type: "person"; id: string }
      | { type: "couple"; couple: CouplePair };

    const items: Item[] = [];

    // Sort: put focus person first, then couples, then singles
    // For the focus generation (gen 0), center on focus person
    if (gen === 0) {
      // Focus person
      const focusCoupleGroup = coupleGroupsInGen.find(
        (c) => c.personAId === focusPersonId || c.personBId === focusPersonId
      );
      if (focusCoupleGroup) {
        items.push({ type: "couple", couple: focusCoupleGroup });
      } else {
        items.push({ type: "person", id: focusPersonId });
      }
      // Other coupled persons in this gen
      const firstCouple = items[0] && items[0].type === "couple" ? (items[0] as { type: "couple"; couple: CouplePair }).couple : null;
      for (const cg of coupleGroupsInGen) {
        if (cg !== firstCouple) {
          items.push({ type: "couple", couple: cg });
        }
      }
      // Uncoupled singles
      for (const pid of singlePersonIds) {
        if (pid !== focusPersonId) items.push({ type: "person", id: pid });
      }
    } else {
      // Other generations: couples first, then singles
      for (const cg of coupleGroupsInGen) {
        items.push({ type: "couple", couple: cg });
      }
      for (const pid of singlePersonIds) {
        items.push({ type: "person", id: pid });
      }
    }

    // Calculate total width
    let totalWidth = 0;
    for (const item of items) {
      if (item.type === "person") {
        totalWidth += NODE_W;
      } else {
        // couple group: personA + gap + dot + gap + personB
        totalWidth += NODE_W * 2 + COUPLE_SIZE + H_GAP;
      }
    }
    totalWidth += H_GAP * (items.length - 1);

    const startX = -totalWidth / 2;
    const y = gen * (NODE_H + V_GAP);
    let curX = startX;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type === "person") {
        positions.set(item.id, { x: curX, y });
        curX += NODE_W + H_GAP;
      } else {
        const { couple } = item;
        // personA
        positions.set(couple.personAId, { x: curX, y });
        curX += NODE_W + COUPLE_SIZE / 2 + H_GAP / 2;
        // couple dot (centered between the two persons)
        positions.set(couple.id, {
          x: curX - COUPLE_SIZE / 2,
          y: y + NODE_H / 2 - COUPLE_SIZE / 2,
        });
        curX += COUPLE_SIZE / 2 + H_GAP / 2;
        // personB
        positions.set(couple.personBId, { x: curX, y });
        curX += NODE_W + H_GAP;
      }
    }
  }

  // ── Build ReactFlow nodes ─────────────────────────────────────────────────
  const nodes: TreeNode[] = [];

  for (const [pid, gen] of personGen.entries()) {
    const person = peopleMap.get(pid);
    if (!person) continue;
    const pos = positions.get(pid) ?? { x: 0, y: gen * (NODE_H + V_GAP) };
    nodes.push({
      id: pid,
      type: "person",
      position: pos,
      data: {
        person,
        showDates,
        isFocus: pid === focusPersonId,
      },
      draggable: false,
    });
  }

  for (const couple of couples) {
    const pos = positions.get(couple.id) ?? { x: 0, y: 0 };
    nodes.push({
      id: couple.id,
      type: "couple",
      position: pos,
      data: { dissolved: couple.dissolved },
      draggable: false,
      selectable: false,
    });
  }

  // ── Build ReactFlow edges ─────────────────────────────────────────────────
  const edges: TreeEdge[] = [];

  // Spouse → couple junction edges
  for (const couple of couples) {
    const dissolved = couple.dissolved;
    edges.push({
      id: `spouse-a-${couple.id}`,
      source: couple.personAId,
      target: couple.id,
      type: "spouse",
      animated: false,
      data: { dissolved, type: "spouse" },
      sourceHandle: "right",
      targetHandle: "left",
    });
    edges.push({
      id: `spouse-b-${couple.id}`,
      source: couple.personBId,
      target: couple.id,
      type: "spouse",
      animated: false,
      data: { dissolved, type: "spouse" },
      sourceHandle: "left",
      targetHandle: "right",
    });
  }

  // Parent → child edges (via couple node or direct)
  for (const rel of allRelationships) {
    if (rel.type !== "parent_child") continue;
    const parentId = rel.person_a_id;
    const childId = rel.person_b_id;
    if (!personGen.has(parentId) || !personGen.has(childId)) continue;

    // Find if this parent is part of a couple in this tree
    const parentCouple = couples.find(
      (c) => (c.personAId === parentId || c.personBId === parentId) && c.generation === personGen.get(parentId)
    );

    const sourceId = parentCouple ? parentCouple.id : parentId;

    // Avoid duplicate edges from same couple to same child
    const edgeId = `parent-${sourceId}-${childId}`;
    if (!edges.find((e) => e.id === edgeId)) {
      edges.push({
        id: edgeId,
        source: sourceId,
        target: childId,
        type: "parent",
        data: { type: "parent" },
        sourceHandle: parentCouple ? "bottom" : "bottom",
        targetHandle: "top",
      });
    }
  }

  return { nodes, edges };
}
