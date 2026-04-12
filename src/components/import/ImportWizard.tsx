"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, ChevronRight, ChevronLeft, Check, AlertTriangle, X, FileText, Table2 } from "lucide-react";
import { parseExcelFile, applyMapping, type ExcelParseResult, type ColumnMapping, type ImportPerson, IMPORT_FIELD_LABELS, type ImportField } from "@/lib/import/excel-parser";
import { parseGedcom, type GedcomParseResult } from "@/lib/import/gedcom-parser";
import { importGedcom, type GedcomImportReport, type GedcomImportProgress } from "@/lib/import/gedcom-importer";
import { checkDuplicates, createPerson } from "@/lib/supabase/queries/people";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";

// ─── Types ────────────────────────────────────────────────────────────────────

type FileMode = "excel" | "gedcom" | null;
type WizardStep = 1 | 2 | 3 | 4 | 5;

interface ImportReport {
  imported: number;
  skipped: number;
  errors: string[];
  // GEDCOM-specific extras
  relationshipsCreated?: number;
  eventsCreated?: number;
  placesCreated?: number;
}

interface ImportWizardProps {
  envId: string;
  onClose?: () => void;
  onComplete?: () => void;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ["Fichier", "Aperçu", "Doublons", "Confirmer", "Rapport"];

function StepBar({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEP_LABELS.map((label, i) => {
        const step = (i + 1) as WizardStep;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center gap-1 flex-1 min-w-0">
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
                  ${done ? "bg-heritage-forest text-white" : active ? "bg-heritage-dark text-white" : "bg-heritage-sand text-heritage-brown"}`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : step}
              </div>
              <span className={`text-[9px] font-medium hidden sm:block ${active ? "text-heritage-dark" : "text-heritage-brown/60"}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`h-px flex-1 mx-1 transition-colors ${done ? "bg-heritage-forest" : "bg-heritage-sand"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Upload ───────────────────────────────────────────────────────────

function Step1Upload({
  onExcel,
  onGedcom,
}: {
  onExcel: (result: ExcelParseResult, file: File) => void;
  onGedcom: (result: GedcomParseResult) => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    const name = file.name.toLowerCase();
    setLoading(true);
    try {
      if (name.endsWith(".ged")) {
        const text = await file.text();
        const result = parseGedcom(text);
        if (result.people.length === 0) throw new Error("Aucune personne trouvée dans ce fichier GEDCOM.");
        onGedcom(result);
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
        const result = await parseExcelFile(file);
        if (result.rows.length === 0) throw new Error("Le fichier ne contient pas de données.");
        onExcel(result, file);
      } else {
        throw new Error("Format non supporté. Utilisez .xlsx, .csv ou .ged");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la lecture du fichier.");
    } finally {
      setLoading(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []); // eslint-disable-line

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv,.ged"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <button
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        disabled={loading}
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 text-sm transition-colors
          ${dragOver ? "border-heritage-forest bg-heritage-forest/5 text-heritage-forest"
            : "border-heritage-sand text-heritage-brown hover:border-heritage-forest/40 hover:text-heritage-forest"
          } ${loading ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
      >
        {loading ? (
          <div className="h-8 w-8 rounded-full border-2 border-heritage-forest border-t-transparent animate-spin" />
        ) : (
          <Upload className="h-8 w-8" />
        )}
        <div className="text-center">
          <p className="font-medium">{loading ? "Lecture en cours…" : "Glisser-déposer ou cliquer pour choisir"}</p>
          <p className="text-xs opacity-70 mt-0.5">Formats acceptés : .xlsx, .csv (Excel) • .ged (GEDCOM)</p>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-heritage-sand bg-heritage-beige/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Table2 className="h-4 w-4 text-heritage-forest shrink-0" />
            <span className="text-xs font-semibold text-heritage-dark">Excel / CSV</span>
          </div>
          <p className="text-xs text-heritage-brown">Import depuis un tableur. Vous associerez les colonnes à chaque champ.</p>
        </div>
        <div className="rounded-lg border border-heritage-sand bg-heritage-beige/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-heritage-forest shrink-0" />
            <span className="text-xs font-semibold text-heritage-dark">GEDCOM</span>
          </div>
          <p className="text-xs text-heritage-brown">Format standard des logiciels de généalogie (Ancestry, MyHeritage…)</p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2 (Excel): Mapping ──────────────────────────────────────────────────

const FIELD_OPTIONS: Array<{ value: ImportField; label: string }> = (
  Object.entries(IMPORT_FIELD_LABELS) as [ImportField, string][]
).map(([value, label]) => ({ value, label }));

function Step2ExcelMapping({
  parseResult,
  mapping,
  onMappingChange,
}: {
  parseResult: ExcelParseResult;
  mapping: ColumnMapping;
  onMappingChange: (m: ColumnMapping) => void;
}) {
  const { columns, rows } = parseResult;
  const preview = rows.slice(0, 5);

  return (
    <div className="space-y-4">
      <p className="text-sm text-heritage-brown">
        {rows.length} ligne{rows.length !== 1 ? "s" : ""} détectée{rows.length !== 1 ? "s" : ""}. Associez chaque colonne au bon champ.
      </p>

      <div className="overflow-x-auto rounded-xl border border-heritage-sand">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-heritage-beige border-b border-heritage-sand">
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left min-w-[130px]">
                  <div className="font-semibold text-heritage-dark truncate mb-1">{col.key}</div>
                  <Select
                    value={mapping[col.key] ?? "ignore"}
                    onChange={(e) => onMappingChange({ ...mapping, [col.key]: e.target.value as ImportField })}
                    options={FIELD_OPTIONS}
                    className="text-xs"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className="border-b border-heritage-sand/50 last:border-0 hover:bg-heritage-beige/30">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-1.5 text-heritage-brown truncate max-w-[160px]">
                    {row[col.key] || <span className="text-heritage-sand italic">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 5 && (
        <p className="text-xs text-heritage-brown/60 text-center">
          … et {rows.length - 5} autre{rows.length - 5 !== 1 ? "s" : ""} ligne{rows.length - 5 !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

// ─── Step 2 (GEDCOM): Preview ─────────────────────────────────────────────────

function Step2GedcomPreview({ result }: { result: GedcomParseResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Personnes", value: result.people.length },
          { label: "Familles", value: result.families.length },
          { label: "Lieux", value: result.placeNames.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-heritage-sand bg-heritage-beige/50 p-3 text-center">
            <div className="font-serif text-2xl font-semibold text-heritage-dark">{value}</div>
            <div className="text-xs text-heritage-brown mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="overflow-y-auto max-h-64 rounded-xl border border-heritage-sand">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 bg-heritage-beige border-b border-heritage-sand">
            <tr>
              <th className="px-3 py-2 text-left text-heritage-dark">Prénom</th>
              <th className="px-3 py-2 text-left text-heritage-dark">Nom</th>
              <th className="px-3 py-2 text-left text-heritage-dark">Naissance</th>
              <th className="px-3 py-2 text-left text-heritage-dark">Décès</th>
            </tr>
          </thead>
          <tbody>
            {result.people.slice(0, 50).map((p) => (
              <tr key={p.gedId} className="border-b border-heritage-sand/40 last:border-0">
                <td className="px-3 py-1.5 text-heritage-dark">{p.first_name || <span className="text-heritage-sand italic">—</span>}</td>
                <td className="px-3 py-1.5 text-heritage-dark">{p.last_name || <span className="text-heritage-sand italic">—</span>}</td>
                <td className="px-3 py-1.5 text-heritage-brown">{p.birth_date ?? "—"}</td>
                <td className="px-3 py-1.5 text-heritage-brown">{p.death_date ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.people.length > 50 && (
          <p className="text-xs text-heritage-brown/60 text-center py-2">… et {result.people.length - 50} autres</p>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Duplicates ───────────────────────────────────────────────────────

function Step3Duplicates({
  people,
  onSkipAll,
  onSkip,
}: {
  people: ImportPerson[];
  onSkipAll: () => void;
  onSkip: (rowIndex: number) => void;
}) {
  const dups = people.filter((p) => p.isDuplicate);
  if (dups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="h-12 w-12 rounded-full bg-heritage-forest/10 flex items-center justify-center">
          <Check className="h-6 w-6 text-heritage-forest" />
        </div>
        <p className="font-medium text-heritage-dark">Aucun doublon détecté !</p>
        <p className="text-sm text-heritage-brown">Toutes les personnes semblent nouvelles dans votre base.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-heritage-brown">
          <span className="font-semibold text-heritage-red">{dups.length}</span> doublon{dups.length !== 1 ? "s" : ""} potentiel{dups.length !== 1 ? "s" : ""} détecté{dups.length !== 1 ? "s" : ""}.
        </p>
        <Button variant="ghost" size="sm" onClick={onSkipAll}>Ignorer tous</Button>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {dups.map((p) => (
          <div
            key={p.rowIndex}
            className="flex items-center gap-3 rounded-lg border border-heritage-red/30 bg-heritage-red/5 px-3 py-2"
          >
            <AlertTriangle className="h-4 w-4 text-heritage-red shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-heritage-dark truncate">
                {p.first_name} {p.last_name}
              </p>
              {p.birth_date && <p className="text-xs text-heritage-brown">Né le {p.birth_date}</p>}
            </div>
            <button
              onClick={() => onSkip(p.rowIndex)}
              className="rounded-lg border border-heritage-sand px-2 py-1 text-xs text-heritage-brown hover:bg-heritage-beige transition-colors shrink-0"
            >
              Ignorer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4: Confirm ──────────────────────────────────────────────────────────

function Step4Confirm({
  people,
  onConfirm,
  loading,
  isGedcom = false,
  gedcomResult,
}: {
  people: ImportPerson[];
  onConfirm: () => void;
  loading: boolean;
  isGedcom?: boolean;
  gedcomResult?: GedcomParseResult | null;
}) {
  const toImport = people.filter((p) => !p.isDuplicate);
  const skipped = people.filter((p) => p.isDuplicate);

  if (isGedcom && gedcomResult) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-heritage-brown">Les données suivantes vont être importées :</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Personnes", value: toImport.length },
            { label: "Familles", value: gedcomResult.families.length },
            { label: "Lieux", value: gedcomResult.placeNames.length },
            { label: "Doublons ignorés", value: skipped.length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-heritage-sand bg-heritage-beige/50 p-3 text-center">
              <div className="font-serif text-2xl font-semibold text-heritage-dark">{value}</div>
              <div className="text-xs text-heritage-brown mt-0.5">{label}</div>
            </div>
          ))}
        </div>
        <Button onClick={onConfirm} loading={loading} fullWidth size="lg" disabled={loading}>
          {loading ? "Import en cours…" : `Lancer l'import GEDCOM`}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-heritage-forest/30 bg-heritage-forest/5 p-4 text-center">
          <div className="font-serif text-3xl font-semibold text-heritage-forest">{toImport.length}</div>
          <div className="text-xs text-heritage-brown mt-1">personne{toImport.length !== 1 ? "s" : ""} à importer</div>
        </div>
        <div className="rounded-xl border border-heritage-sand bg-heritage-beige/50 p-4 text-center">
          <div className="font-serif text-3xl font-semibold text-heritage-brown">{skipped.length}</div>
          <div className="text-xs text-heritage-brown mt-1">doublon{skipped.length !== 1 ? "s" : ""} ignoré{skipped.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {toImport.length === 0 ? (
        <p className="text-sm text-heritage-brown text-center py-4">Aucune personne à importer.</p>
      ) : (
        <Button onClick={onConfirm} loading={loading} fullWidth size="lg">
          Importer {toImport.length} personne{toImport.length !== 1 ? "s" : ""}
        </Button>
      )}
    </div>
  );
}

// ─── Step 5: Report ───────────────────────────────────────────────────────────

function Step5Report({ report, onClose }: { report: ImportReport; onClose?: () => void }) {
  const stats = [
    { label: "Personnes importées", value: report.imported, show: true },
    { label: "Doublons ignorés", value: report.skipped, show: report.skipped > 0 },
    { label: "Relations créées", value: report.relationshipsCreated ?? 0, show: (report.relationshipsCreated ?? 0) > 0 },
    { label: "Événements créés", value: report.eventsCreated ?? 0, show: (report.eventsCreated ?? 0) > 0 },
    { label: "Lieux créés", value: report.placesCreated ?? 0, show: (report.placesCreated ?? 0) > 0 },
  ].filter((s) => s.show);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="h-14 w-14 rounded-full bg-heritage-forest/10 flex items-center justify-center">
          <Check className="h-7 w-7 text-heritage-forest" />
        </div>
        <p className="font-serif text-xl font-semibold text-heritage-dark">Import terminé</p>
      </div>

      <div className={`grid gap-3 ${stats.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-heritage-sand bg-heritage-beige/50 p-3 text-center">
            <div className="font-serif text-2xl font-semibold text-heritage-dark">{value}</div>
            <div className="text-xs text-heritage-brown mt-0.5 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {report.errors.length > 0 && (
        <div className="rounded-lg border border-heritage-red/30 bg-heritage-red/5 p-3 max-h-40 overflow-y-auto">
          <p className="text-xs font-semibold text-heritage-red mb-2">
            {report.errors.length} erreur{report.errors.length !== 1 ? "s" : ""}
          </p>
          <ul className="space-y-1">
            {report.errors.map((e, i) => (
              <li key={i} className="text-xs text-heritage-red/80">• {e}</li>
            ))}
          </ul>
        </div>
      )}

      {onClose && (
        <Button onClick={onClose} fullWidth>Fermer</Button>
      )}
    </div>
  );
}

// ─── Wizard orchestrator ──────────────────────────────────────────────────────

export function ImportWizard({ envId, onClose, onComplete }: ImportWizardProps) {
  const toast = useToast();
  const [step, setStep] = useState<WizardStep>(1);
  const [mode, setMode] = useState<FileMode>(null);

  // Excel state
  const [excelResult, setExcelResult] = useState<ExcelParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});

  // GEDCOM state
  const [gedcomResult, setGedcomResult] = useState<GedcomParseResult | null>(null);

  // Shared state
  const [people, setPeople] = useState<ImportPerson[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<GedcomImportProgress | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [checkingDups, setCheckingDups] = useState(false);

  // ── Step 1 → 2 ───────────────────────────────────────────────────────────

  function handleExcel(result: ExcelParseResult) {
    setExcelResult(result);
    setMapping(result.autoMapping);
    setMode("excel");
    setStep(2);
  }

  function handleGedcom(result: GedcomParseResult) {
    setGedcomResult(result);
    setMode("gedcom");
    setStep(2);
  }

  // ── Step 2 → 3 ───────────────────────────────────────────────────────────

  async function handlePreviewNext() {
    setCheckingDups(true);
    try {
      let raw: ImportPerson[] = [];

      if (mode === "excel" && excelResult) {
        raw = applyMapping(excelResult.rows, mapping);
      } else if (mode === "gedcom" && gedcomResult) {
        raw = gedcomResult.people.map((p, i) => ({
          first_name: p.first_name,
          last_name: p.last_name,
          gender: p.gender,
          birth_date: p.birth_date,
          birth_place: p.birth_place,
          death_date: p.death_date,
          death_place: p.death_place,
          is_alive: p.is_alive,
          profession: null,
          bio: null,
          rowIndex: i,
        }));
      }

      // Check duplicates for each person
      const withDups = await Promise.all(
        raw.map(async (p) => {
          try {
            const dups = await checkDuplicates(envId, p.first_name, p.last_name, p.birth_date ?? undefined);
            return { ...p, isDuplicate: dups.length > 0, duplicateId: dups[0]?.id };
          } catch {
            return p;
          }
        })
      );

      setPeople(withDups);
      setStep(3);
    } catch (err) {
      toast.error("Erreur lors de la vérification des doublons.");
      console.error(err);
    } finally {
      setCheckingDups(false);
    }
  }

  // ── Step 3 actions ────────────────────────────────────────────────────────

  function skipAll() {
    setPeople((prev) => prev.map((p) => (p.isDuplicate ? { ...p, isDuplicate: true } : p)));
  }

  function skipOne(rowIndex: number) {
    setPeople((prev) => prev.map((p) => p.rowIndex === rowIndex ? { ...p, isDuplicate: true } : p));
  }

  // ── Step 4: Do import ─────────────────────────────────────────────────────

  async function runImport() {
    setImporting(true);

    // ── GEDCOM: full import (people + relationships + events + places) ──────
    if (mode === "gedcom" && gedcomResult) {
      try {
        const gedReport = await importGedcom(envId, gedcomResult, (progress) => {
          setImportProgress(progress);
        });
        setReport({
          imported: gedReport.peopleImported,
          skipped: gedReport.peopleDuplicatesSkipped,
          errors: gedReport.errors,
          relationshipsCreated: gedReport.relationshipsCreated,
          eventsCreated: gedReport.eventsCreated,
          placesCreated: gedReport.placesCreated,
        });
      } catch (err) {
        toast.error("L'import GEDCOM a échoué.");
        console.error(err);
        setImporting(false);
        return;
      }
      setImporting(false);
      setImportProgress(null);
      setStep(5);
      onComplete?.();
      return;
    }

    // ── Excel/CSV: people only ──────────────────────────────────────────────
    const toImport = people.filter((p) => !p.isDuplicate);
    if (toImport.length === 0) {
      toast.error("Aucune personne à importer.");
      setImporting(false);
      return;
    }

    const errors: string[] = [];
    let imported = 0;

    for (const p of toImport) {
      try {
        await createPerson(envId, {
          first_name: p.first_name || "Inconnu",
          last_name: p.last_name || "Inconnu",
          gender: p.gender,
          birth_date: p.birth_date,
          death_date: p.death_date,
          birth_place: p.birth_place,
          profession: p.profession,
          bio: p.bio,
          photo_url: null,
          is_alive: p.is_alive,
        });
        imported++;
      } catch {
        errors.push(`${p.first_name} ${p.last_name} — ligne ${p.rowIndex + 2}`);
      }
    }

    setImporting(false);
    setReport({ imported, skipped: people.filter((p) => p.isDuplicate).length, errors });
    setStep(5);
    onComplete?.();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const canGoNext =
    (step === 2 && mode === "excel" && Object.values(mapping).some((v) => v !== "ignore")) ||
    (step === 2 && mode === "gedcom") ||
    step === 3;

  return (
    <div className="space-y-0">
      <StepBar current={step} />

      {step === 1 && <Step1Upload onExcel={handleExcel} onGedcom={handleGedcom} />}

      {step === 2 && mode === "excel" && excelResult && (
        <Step2ExcelMapping parseResult={excelResult} mapping={mapping} onMappingChange={setMapping} />
      )}

      {step === 2 && mode === "gedcom" && gedcomResult && (
        <Step2GedcomPreview result={gedcomResult} />
      )}

      {step === 3 && (
        <Step3Duplicates people={people} onSkipAll={skipAll} onSkip={skipOne} />
      )}

      {step === 4 && (
        <>
          <Step4Confirm
            people={people}
            onConfirm={runImport}
            loading={importing}
            isGedcom={mode === "gedcom"}
            gedcomResult={gedcomResult}
          />
          {importing && importProgress && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-heritage-brown">
                <span>
                  {importProgress.stage === "people" && "Import des personnes…"}
                  {importProgress.stage === "places" && "Import des lieux…"}
                  {importProgress.stage === "relationships" && "Import des relations…"}
                  {importProgress.stage === "events" && "Import des événements…"}
                  {importProgress.stage === "done" && "Finalisation…"}
                </span>
                <span>{importProgress.current} / {importProgress.total}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-heritage-beige">
                <div
                  className="h-full rounded-full bg-heritage-forest transition-all duration-300"
                  style={{
                    width: importProgress.total > 0
                      ? `${Math.round((importProgress.current / importProgress.total) * 100)}%`
                      : "0%"
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {step === 5 && report && (
        <Step5Report report={report} onClose={onClose} />
      )}

      {/* Navigation */}
      {step !== 1 && step !== 5 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-heritage-sand">
          <Button
            variant="ghost"
            icon={ChevronLeft}
            onClick={() => setStep((s) => (s - 1) as WizardStep)}
            disabled={importing || checkingDups}
          >
            Retour
          </Button>

          {step < 4 && (
            <Button
              onClick={step === 2 ? handlePreviewNext : () => setStep((s) => (s + 1) as WizardStep)}
              disabled={!canGoNext}
              loading={checkingDups}
            >
              {step === 2 ? "Vérifier les doublons" : "Continuer"}
              {!checkingDups && <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
