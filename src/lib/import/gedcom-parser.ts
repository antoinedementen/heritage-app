/**
 * Lightweight GEDCOM parser for Heritage.
 * Supports INDI (individuals), FAM (families), events (BIRT, DEAT, MARR), PLAC.
 */

export interface GedcomPerson {
  gedId: string;      // e.g. "@I001@"
  first_name: string;
  last_name: string;
  gender: "male" | "female" | "other";
  birth_date: string | null;
  birth_place: string | null;
  death_date: string | null;
  death_place: string | null;
  is_alive: boolean;
}

export interface GedcomFamily {
  gedId: string;       // e.g. "@F001@"
  husbandId: string | null;
  wifeId: string | null;
  childIds: string[];
  marriageDate: string | null;
  marriagePlace: string | null;
  divorced: boolean;
}

export interface GedcomParseResult {
  people: GedcomPerson[];
  families: GedcomFamily[];
  placeNames: string[];
}

// ─── Date normaliser ──────────────────────────────────────────────────────────
const MONTH_MAP: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04",
  MAY: "05", JUN: "06", JUL: "07", AUG: "08",
  SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

function parseGedcomDate(raw: string): string | null {
  if (!raw) return null;
  raw = raw.trim().replace(/^(ABT|EST|BEF|AFT|CAL)\s+/i, "");
  // "12 JAN 1920"
  const parts = raw.split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = MONTH_MAP[parts[1].toUpperCase()];
    const year = parts[2];
    if (month && year) return `${year}-${month}-${day}`;
  }
  // "JAN 1920"
  if (parts.length === 2) {
    const month = MONTH_MAP[parts[0].toUpperCase()];
    const year = parts[1];
    if (month && year) return `${year}-${month}-01`;
  }
  // "1920"
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) return `${parts[0]}-01-01`;
  return null;
}

// ─── Main parser ──────────────────────────────────────────────────────────────
export function parseGedcom(content: string): GedcomParseResult {
  const lines = content.split(/\r?\n/);

  type Block = { level: number; tag: string; value: string; children: Block[] };

  // Build a tree of records
  const records: Block[] = [];
  const stack: Block[] = [];

  for (const rawLine of lines) {
    const match = rawLine.match(/^(\d+)\s+(\S+)(?:\s+(.*))?$/);
    if (!match) continue;
    const level = parseInt(match[1]);
    const tag = match[2];
    const value = (match[3] ?? "").trim();
    const block: Block = { level, tag, value, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    if (stack.length === 0) {
      records.push(block);
    } else {
      stack[stack.length - 1].children.push(block);
    }
    stack.push(block);
  }

  function child(block: Block, tag: string): Block | undefined {
    return block.children.find((c) => c.tag === tag);
  }
  function children(block: Block, tag: string): Block[] {
    return block.children.filter((c) => c.tag === tag);
  }
  function grandchild(block: Block, tag: string, subtag: string): string | null {
    return child(child(block, tag) ?? { level: 0, tag: "", value: "", children: [] }, subtag)?.value ?? null;
  }

  const people: GedcomPerson[] = [];
  const families: GedcomFamily[] = [];
  const placeSet = new Set<string>();

  for (const rec of records) {
    // ── INDI ──────────────────────────────────────────────────────────────
    if (rec.tag.startsWith("@") && rec.value === "INDI") {
      const gedId = rec.tag;
      const nameParts = (child(rec, "NAME")?.value ?? "").split("/");
      const first_name = nameParts[0]?.trim() ?? "";
      const last_name = (nameParts[1] ?? nameParts[2] ?? "").trim();
      const sexRaw = child(rec, "SEX")?.value?.toUpperCase() ?? "";
      const gender = sexRaw === "M" ? "male" : sexRaw === "F" ? "female" : "other";

      const birtBlock = child(rec, "BIRT");
      const birth_date = birtBlock ? parseGedcomDate(child(birtBlock, "DATE")?.value ?? "") : null;
      const birth_place = birtBlock ? child(birtBlock, "PLAC")?.value ?? null : null;

      const deatBlock = child(rec, "DEAT");
      const death_date = deatBlock ? parseGedcomDate(child(deatBlock, "DATE")?.value ?? "") : null;
      const death_place = deatBlock ? child(deatBlock, "PLAC")?.value ?? null : null;
      const is_alive = !deatBlock;

      if (birth_place) placeSet.add(birth_place);
      if (death_place) placeSet.add(death_place);

      people.push({ gedId, first_name, last_name, gender, birth_date, birth_place, death_date, death_place, is_alive });
    }

    // ── FAM ───────────────────────────────────────────────────────────────
    if (rec.tag.startsWith("@") && rec.value === "FAM") {
      const gedId = rec.tag;
      const husbandId = child(rec, "HUSB")?.value ?? null;
      const wifeId = child(rec, "WIFE")?.value ?? null;
      const childIds = children(rec, "CHIL").map((c) => c.value);
      const marrBlock = child(rec, "MARR");
      const marriageDate = marrBlock ? parseGedcomDate(child(marrBlock, "DATE")?.value ?? "") : null;
      const marriagePlace = marrBlock ? child(marrBlock, "PLAC")?.value ?? null : null;
      const divorced = !!child(rec, "DIV");
      if (marriagePlace) placeSet.add(marriagePlace);
      families.push({ gedId, husbandId, wifeId, childIds, marriageDate, marriagePlace, divorced });
    }
  }

  return { people, families, placeNames: [...placeSet] };
}
