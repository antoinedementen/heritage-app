"use client";

import { useState, useMemo } from "react";
import { GitBranch, ArrowRight, X, Search, TreeDeciduous } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePeople } from "@/hooks/usePeople";
import { buildRelGraph, calculateRelationship } from "@/lib/tree/relationship-calculator";
import { useTreeStore } from "@/stores/treeStore";
import type { Person, RelationshipWithPerson } from "@/lib/supabase/queries/people";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

type PersonWithRels = Person & { relationships: RelationshipWithPerson[] };

// ─── Person picker ────────────────────────────────────────────────────────────

function PersonPicker({
  people,
  selected,
  onSelect,
  label,
  exclude,
}: {
  people: Person[];
  selected: Person | null;
  onSelect: (p: Person | null) => void;
  label: string;
  exclude?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () =>
      people
        .filter((p) => p.id !== exclude)
        .filter(
          (p) =>
            !query ||
            `${p.first_name} ${p.last_name}`.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8),
    [people, query, exclude]
  );

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-heritage-forest/40 bg-heritage-forest/5 px-3 py-2">
        <Avatar firstName={selected.first_name} lastName={selected.last_name} src={selected.photo_url} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-heritage-dark truncate">
            {selected.first_name} {selected.last_name}
          </p>
        </div>
        <button
          onClick={() => onSelect(null)}
          className="rounded p-0.5 text-heritage-brown hover:text-heritage-red transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 rounded-xl border border-heritage-sand bg-heritage-white px-3 py-2 cursor-text"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 text-heritage-brown/50 shrink-0" />
        <input
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-heritage-brown/40 text-heritage-dark"
          placeholder={label}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border border-heritage-sand bg-heritage-white shadow-lg overflow-hidden">
          {filtered.map((p) => (
            <button
              key={p.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(p); setQuery(""); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-heritage-beige transition-colors"
            >
              <Avatar firstName={p.first_name} lastName={p.last_name} src={p.photo_url} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-heritage-dark truncate">{p.first_name} {p.last_name}</p>
                {p.birth_date && <p className="text-xs text-heritage-brown">né{p.gender === "female" ? "e" : ""} {p.birth_date.slice(0, 4)}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Path visualisation ───────────────────────────────────────────────────────

function PathViz({ path, peopleMap }: { path: string[]; peopleMap: Map<string, Person> }) {
  if (path.length <= 2) return null;
  const intermediate = path.slice(1, -1);

  return (
    <div className="rounded-xl border border-heritage-sand bg-heritage-beige/40 p-3">
      <p className="text-xs font-semibold text-heritage-brown mb-2 uppercase tracking-wide">Chemin de parenté</p>
      <div className="flex flex-wrap items-center gap-1">
        {path.map((id, i) => {
          const p = peopleMap.get(id);
          const isIntermediate = intermediate.includes(id);
          return (
            <div key={id} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs
                ${isIntermediate ? "bg-heritage-gold/20 text-heritage-dark" : "bg-heritage-dark text-white"}`}>
                {p ? (
                  <>
                    <Avatar firstName={p.first_name} lastName={p.last_name} src={p.photo_url} size="sm" />
                    <span className="font-medium">{p.first_name} {p.last_name}</span>
                  </>
                ) : (
                  <span className="font-mono text-[10px]">{id.slice(0, 8)}…</span>
                )}
              </div>
              {i < path.length - 1 && <ArrowRight className="h-3 w-3 text-heritage-brown/40 shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RelationshipFinderProps {
  envId: string;
  /** If true, show "Voir dans l'arbre" button that navigates to /tree */
  showTreeButton?: boolean;
  /** Called after "Voir dans l'arbre" is clicked (e.g. to close a modal) */
  onViewInTree?: () => void;
}

export function RelationshipFinder({ envId, showTreeButton = false, onViewInTree }: RelationshipFinderProps) {
  const router = useRouter();
  const { data: people = [] } = usePeople(envId);
  const [personA, setPersonA] = useState<Person | null>(null);
  const [personB, setPersonB] = useState<Person | null>(null);
  const { setPath } = useTreeStore();

  const graph = useMemo(() => {
    return buildRelGraph(people as PersonWithRels[]);
  }, [people]);

  const peopleMap = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const result = useMemo(() => {
    if (!personA || !personB) return null;
    return calculateRelationship(graph, personA.id, personB.id, personB.gender);
  }, [graph, personA, personB]);

  function handleViewInTree() {
    if (!result?.path?.length) return;
    // Set path in store — tree page will highlight these nodes in gold
    const ancestorId = result.path[Math.floor(result.path.length / 2)];
    setPath(result.path, ancestorId);
    onViewInTree?.();
    router.push(`/${envId}/tree`);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-heritage-brown uppercase tracking-wide">Personne A</label>
          <PersonPicker
            people={people}
            selected={personA}
            onSelect={setPersonA}
            label="Chercher une personne…"
            exclude={personB?.id}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-heritage-brown uppercase tracking-wide">Personne B</label>
          <PersonPicker
            people={people}
            selected={personB}
            onSelect={setPersonB}
            label="Chercher une personne…"
            exclude={personA?.id}
          />
        </div>
      </div>

      {result && personA && personB && (
        <div className="rounded-xl border border-heritage-sand overflow-hidden">
          {result.related ? (
            <div className="bg-heritage-forest/5 px-4 py-4 text-center border-b border-heritage-sand">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-heritage-dark">{personA.first_name}</span>
                <Badge variant="info" className="text-sm px-3 py-1 font-semibold">
                  {result.label}
                </Badge>
                <span className="text-sm font-medium text-heritage-dark">de {personB.first_name}</span>
              </div>
              {result.generationsUp > 0 || result.generationsDown > 0 ? (
                <p className="text-xs text-heritage-brown mt-1.5">
                  {result.generationsUp} génération{result.generationsUp !== 1 ? "s" : ""} en remontant
                  {result.generationsDown > 0 ? `, ${result.generationsDown} en descendant` : ""}
                </p>
              ) : null}
              {(showTreeButton || result.path.length > 1) && (
                <button
                  onClick={handleViewInTree}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-heritage-gold/20 px-3 py-1.5 text-xs font-medium text-heritage-dark hover:bg-heritage-gold/30 transition-colors"
                >
                  <TreeDeciduous className="h-3.5 w-3.5" />
                  Voir dans l&apos;arbre
                </button>
              )}
            </div>
          ) : (
            <div className="bg-heritage-beige px-4 py-4 text-center border-b border-heritage-sand">
              <p className="text-sm text-heritage-brown font-medium">Aucun lien de parenté trouvé</p>
              <p className="text-xs text-heritage-brown/60 mt-0.5">Ces personnes ne semblent pas être reliées dans votre arbre.</p>
            </div>
          )}

          {result.related && result.path.length > 2 && (
            <div className="p-3">
              <PathViz path={result.path} peopleMap={peopleMap} />
            </div>
          )}
        </div>
      )}

      {!personA && !personB && (
        <div className="flex flex-col items-center gap-2 py-6 text-center text-heritage-brown/60">
          <GitBranch className="h-8 w-8 opacity-40" />
          <p className="text-sm">Sélectionnez deux personnes pour calculer leur lien de parenté.</p>
        </div>
      )}
    </div>
  );
}
