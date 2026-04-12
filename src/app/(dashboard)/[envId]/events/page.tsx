"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEvents } from "@/hooks/useEvents";
import { useToast } from "@/hooks/useToast";
import { Timeline } from "@/components/ui/Timeline";
import { AddEventModal } from "@/components/events/AddEventModal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  EVENT_TYPE_LABELS,
  type EventType,
} from "@/lib/supabase/queries/events";

const EVENT_TYPES: EventType[] = [
  "birth", "death", "marriage", "divorce", "baptism",
  "property", "residence", "education", "career", "military", "immigration", "other",
];

export default function EventsPage({
  params,
}: {
  params: Promise<{ envId: string }>;
}) {
  const { envId } = use(params);
  const router = useRouter();
  const { isGuest } = useAuth();

  const [typeFilter, setTypeFilter] = useState<EventType | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data: events = [], isLoading } = useEvents(envId, {
    type: typeFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-heritage-dark">Événements</h1>
          <p className="mt-0.5 text-sm text-heritage-brown">
            {isLoading ? "…" : `${events.length} événement${events.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {!isGuest && (
          <Button icon={Plus} onClick={() => setAddOpen(true)}>
            Ajouter un événement
          </Button>
        )}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as EventType | "")}
          options={[
            { value: "", label: "Tous les types" },
            ...EVENT_TYPES.map((t) => ({ value: t, label: EVENT_TYPE_LABELS[t] })),
          ]}
          className="w-44"
        />
        <Input
          type="date"
          placeholder="Depuis"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
        />
        <Input
          type="date"
          placeholder="Jusqu'à"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
        />
        {(typeFilter || dateFrom || dateTo) && (
          <button
            onClick={() => { setTypeFilter(""); setDateFrom(""); setDateTo(""); }}
            className="rounded-lg border border-heritage-sand px-3 py-2 text-sm text-heritage-brown hover:bg-heritage-beige transition-colors"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={typeFilter || dateFrom || dateTo ? "Aucun événement ne correspond aux filtres" : "Aucun événement enregistré"}
          description={
            typeFilter || dateFrom || dateTo
              ? "Modifiez les filtres pour voir plus de résultats."
              : "Commencez par ajouter un événement à l'arbre familial."
          }
          action={
            !isGuest && !typeFilter && !dateFrom && !dateTo
              ? { label: "Ajouter un événement", onClick: () => setAddOpen(true) }
              : undefined
          }
        />
      ) : (
        <div className="max-w-2xl">
          <Timeline
            events={events}
            onPersonClick={(id) => router.push(`/${envId}/people/${id}`)}
            onPlaceClick={(id) => router.push(`/${envId}/places/${id}`)}
          />
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      <AddEventModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        envId={envId}
      />
    </div>
  );
}
