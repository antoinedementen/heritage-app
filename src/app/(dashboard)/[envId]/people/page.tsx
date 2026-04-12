"use client";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, SlidersHorizontal, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePeople, useCreatePerson } from "@/hooks/usePeople";
import { useToast } from "@/hooks/useToast";
import { PersonCard } from "@/components/people/PersonCard";
import { AddPersonModal } from "@/components/people/AddPersonModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Gender, PeopleFilters, Person } from "@/lib/supabase/queries/people";

export default function PeoplePage({
  params,
}: {
  params: Promise<{ envId: string }>;
}) {
  const { envId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { isGuest } = useAuth();

  // Filters state
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<PeopleFilters["sortBy"]>("name");

  // Read ?filter=incomplete from URL (set by dashboard CTA)
  useEffect(() => {
    if (searchParams.get("filter") === "incomplete") {
      setIncompleteOnly(true);
    }
  }, [searchParams]);

  const filters: PeopleFilters = {
    search: search || undefined,
    gender: gender || undefined,
    incompleteOnly,
    sortBy,
  };

  const { data: people = [], isLoading } = usePeople(envId, filters);
  const [addOpen, setAddOpen] = useState(false);

  function handlePersonCreated(person: Person) {
    toast.success(`${person.first_name} ${person.last_name} ajouté${person.gender === "female" ? "e" : ""} !`);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-heritage-dark">Personnes</h1>
          <p className="mt-0.5 text-sm text-heritage-brown">
            {isLoading ? "…" : `${people.length} personne${people.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {!isGuest && (
          <Button icon={Plus} onClick={() => setAddOpen(true)}>
            Ajouter une personne
          </Button>
        )}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            icon={Search}
            placeholder="Rechercher par nom, prénom…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={gender}
          onChange={(e) => setGender(e.target.value as Gender | "")}
          options={[
            { value: "", label: "Tous les genres" },
            { value: "male", label: "Hommes" },
            { value: "female", label: "Femmes" },
            { value: "other", label: "Autre" },
          ]}
          className="w-44"
        />
        <Select
          value={sortBy ?? "name"}
          onChange={(e) => setSortBy(e.target.value as PeopleFilters["sortBy"])}
          options={[
            { value: "name", label: "Trier : A → Z" },
            { value: "created_at", label: "Trier : Récents" },
            { value: "completeness", label: "Trier : Complétude" },
          ]}
          className="w-44"
        />
        <button
          onClick={() => setIncompleteOnly((v) => !v)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors
            ${incompleteOnly
              ? "border-heritage-gold bg-heritage-gold/10 text-heritage-dark"
              : "border-heritage-sand bg-heritage-white text-heritage-brown hover:border-heritage-forest/30"
            }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Incomplets
        </button>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : people.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            search || gender || incompleteOnly
              ? "Aucune personne ne correspond aux filtres"
              : "Aucune personne dans cet arbre"
          }
          description={
            search || gender || incompleteOnly
              ? "Modifiez les filtres pour voir plus de résultats."
              : "Commencez par ajouter une personne à l'arbre familial."
          }
          action={
            !isGuest && !search && !gender && !incompleteOnly
              ? {
                  label: "Ajouter une personne",
                  onClick: () => setAddOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onClick={() => router.push(`/${envId}/people/${person.id}`)}
            />
          ))}
        </div>
      )}

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      <AddPersonModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        envId={envId}
        onCreated={handlePersonCreated}
      />
    </div>
  );
}
