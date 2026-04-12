/**
 * Excel / CSV parser for Heritage import.
 * Uses SheetJS (xlsx) to read .xlsx and .csv files client-side.
 */

import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

/** One raw row from the spreadsheet — all values as strings. */
export type RawRow = Record<string, string>;

/** A column detected in the spreadsheet. */
export interface SheetColumn {
  key: string;   // original header name
  sample: string; // first non-empty value found
}

/** Fields we can map to. */
export type ImportField =
  | "first_name"
  | "last_name"
  | "gender"
  | "birth_date"
  | "birth_place"
  | "death_date"
  | "death_place"
  | "profession"
  | "bio"
  | "ignore";

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  first_name:  "Prénom",
  last_name:   "Nom de famille",
  gender:      "Genre",
  birth_date:  "Date de naissance",
  birth_place: "Lieu de naissance",
  death_date:  "Date de décès",
  death_place: "Lieu de décès",
  profession:  "Profession",
  bio:         "Biographie",
  ignore:      "Ignorer",
};

/** User-defined mapping: spreadsheet column key → ImportField */
export type ColumnMapping = Record<string, ImportField>;

/** A person ready for import, after mapping is applied. */
export interface ImportPerson {
  first_name: string;
  last_name: string;
  gender: "male" | "female" | "other";
  birth_date: string | null;
  birth_place: string | null;
  death_date: string | null;
  death_place: string | null;
  is_alive: boolean;
  profession: string | null;
  bio: string | null;
  /** Filled after duplicate check */
  isDuplicate?: boolean;
  duplicateId?: string;
  /** Index in the original rows for traceability */
  rowIndex: number;
}

// ─── Date normaliser ──────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, string> = {
  janvier: "01", février: "02", mars: "03", avril: "04",
  mai: "05", juin: "06", juillet: "07", août: "08",
  septembre: "09", octobre: "10", novembre: "11", décembre: "12",
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
  jan: "01", feb: "02", mar: "03", apr: "04",
  jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export function normaliseDate(raw: string | number | null | undefined): string | null {
  if (!raw && raw !== 0) return null;

  // SheetJS sometimes returns a serial number for date cells
  if (typeof raw === "number") {
    const date = XLSX.SSF.parse_date_code(raw);
    if (!date) return null;
    const y = date.y;
    const m = String(date.m).padStart(2, "0");
    const d = String(date.d).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const s = String(raw).trim();
  if (!s) return null;

  // ISO 8601: 1920-01-12 or 1920/01/12
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) {
    return s.replace(/\//g, "-");
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  // MM/DD/YYYY (American)
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy && parseInt(mdy[1]) > 12) {
    // day > 12 → definitely DD/MM/YYYY (handled above), skip
  } else if (mdy) {
    return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  }

  // "12 janvier 1920" or "12 January 1920"
  const longDate = s.match(/^(\d{1,2})\s+([a-záàâéèêëîïôùûüÿœæç]+)\s+(\d{4})$/i);
  if (longDate) {
    const month = MONTH_NAMES[longDate[2].toLowerCase()];
    if (month) return `${longDate[3]}-${month}-${longDate[1].padStart(2, "0")}`;
  }

  // "janvier 1920"
  const monthYear = s.match(/^([a-záàâéèêëîïôùûüÿœæç]+)\s+(\d{4})$/i);
  if (monthYear) {
    const month = MONTH_NAMES[monthYear[1].toLowerCase()];
    if (month) return `${monthYear[2]}-${month}-01`;
  }

  // "1920"
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;

  return null;
}

function normaliseGender(raw: string | null | undefined): "male" | "female" | "other" {
  if (!raw) return "other";
  const v = raw.trim().toLowerCase();
  if (["m", "male", "homme", "h", "masculin"].includes(v)) return "male";
  if (["f", "female", "femme", "féminin"].includes(v)) return "female";
  return "other";
}

// ─── Auto-mapping heuristic ───────────────────────────────────────────────────

const HEADER_HINTS: Array<{ patterns: RegExp[]; field: ImportField }> = [
  { patterns: [/pr[eé]nom/i, /first.?name/i, /given.?name/i],              field: "first_name" },
  { patterns: [/nom(?!\s*de\s*nais)/i, /last.?name/i, /surname/i, /family.?name/i], field: "last_name" },
  { patterns: [/genre/i, /sexe/i, /gender/i, /sex/i],                       field: "gender" },
  { patterns: [/naissance.*date/i, /date.*naissance/i, /birth.*date/i, /date.*birth/i, /born/i], field: "birth_date" },
  { patterns: [/lieu.*naissance/i, /naissance.*lieu/i, /birth.*place/i, /place.*birth/i], field: "birth_place" },
  { patterns: [/d[eé]c[eè]s.*date/i, /date.*d[eé]c[eè]s/i, /death.*date/i, /date.*death/i, /died/i], field: "death_date" },
  { patterns: [/lieu.*d[eé]c[eè]s/i, /d[eé]c[eè]s.*lieu/i, /death.*place/i, /place.*death/i], field: "death_place" },
  { patterns: [/profession/i, /m[eé]tier/i, /occupation/i, /job/i],         field: "profession" },
  { patterns: [/bio/i, /note/i, /description/i, /remarque/i],               field: "bio" },
];

export function autoMap(columns: SheetColumn[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedFields = new Set<ImportField>();

  for (const col of columns) {
    let matched: ImportField = "ignore";
    for (const hint of HEADER_HINTS) {
      if (hint.patterns.some((p) => p.test(col.key)) && !usedFields.has(hint.field)) {
        matched = hint.field;
        usedFields.add(hint.field);
        break;
      }
    }
    mapping[col.key] = matched;
  }

  return mapping;
}

// ─── Main parse function ──────────────────────────────────────────────────────

export interface ExcelParseResult {
  columns: SheetColumn[];
  rows: RawRow[];
  autoMapping: ColumnMapping;
}

export function parseExcelFile(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary", cellDates: false });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        // Convert to array of objects (first row = headers)
        const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
          raw: false, // force string coercion; we handle dates ourselves
        });

        if (rawJson.length === 0) {
          reject(new Error("Le fichier est vide ou ne contient pas de données."));
          return;
        }

        const headerKeys = Object.keys(rawJson[0]);
        const rows: RawRow[] = rawJson.map((r) =>
          Object.fromEntries(headerKeys.map((k) => [k, String(r[k] ?? "").trim()]))
        );

        // Build column descriptors with sample values
        const columns: SheetColumn[] = headerKeys.map((k) => {
          const sample = rows.find((r) => r[k])?.[ k] ?? "";
          return { key: k, sample };
        });

        const autoMapping = autoMap(columns);
        resolve({ columns, rows, autoMapping });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
}

// ─── Apply mapping ────────────────────────────────────────────────────────────

export function applyMapping(rows: RawRow[], mapping: ColumnMapping): ImportPerson[] {
  const result: ImportPerson[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const get = (field: ImportField): string => {
      const col = Object.entries(mapping).find(([, f]) => f === field)?.[0];
      return col ? (row[col] ?? "") : "";
    };

    const first_name = get("first_name").trim();
    const last_name  = get("last_name").trim();

    // Skip completely empty rows
    if (!first_name && !last_name) continue;

    const death_date = normaliseDate(get("death_date")) ?? null;

    result.push({
      first_name,
      last_name,
      gender:       normaliseGender(get("gender")),
      birth_date:   normaliseDate(get("birth_date")) ?? null,
      birth_place:  get("birth_place") || null,
      death_date,
      death_place:  get("death_place") || null,
      is_alive:     !death_date,
      profession:   get("profession") || null,
      bio:          get("bio") || null,
      rowIndex:     i,
    });
  }

  return result;
}
