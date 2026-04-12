"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useCreateEvent } from "@/hooks/useEvents";
import { useToast } from "@/hooks/useToast";
import {
  EVENT_DEFAULT_TITLES,
  EVENT_TYPE_LABELS,
  type EventType,
} from "@/lib/supabase/queries/events";
import { createClient } from "@/lib/supabase/client";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  envId: string;
  defaultPersonId?: string;
  defaultPlaceId?: string;
  onCreated?: () => void;
}

const EVENT_TYPES: EventType[] = [
  "birth", "death", "marriage", "divorce", "baptism",
  "property", "residence", "education", "career", "military", "immigration", "other",
];

export function AddEventModal({
  isOpen,
  onClose,
  envId,
  defaultPersonId,
  defaultPlaceId,
  onCreated,
}: AddEventModalProps) {
  const toast = useToast();
  const createEvent = useCreateEvent(envId);

  const [form, setForm] = useState({
    event_type: "" as EventType | "",
    title: "",
    description: "",
    event_date: "",
    end_date: "",
    person_id: defaultPersonId ?? "",
    place_id: defaultPlaceId ?? "",
  });

  // People & places for autocomplete
  const [people, setPeople] = useState<Array<{ id: string; name: string }>>([]);
  const [places, setPlaces] = useState<Array<{ id: string; name: string }>>([]);
  const [personSearch, setPersonSearch] = useState("");
  const [placeSearch, setPlaceSearch] = useState("");

  useEffect(() => {
    if (!isOpen || !envId) return;
    const supabase = createClient();
    supabase.from("people").select("id, first_name, last_name").eq("environment_id", envId)
      .then(({ data }) => setPeople((data ?? []).map((p: any) => ({ id: p.id, name: `${p.first_name} ${p.last_name}` }))));
    supabase.from("places").select("id, name").eq("environment_id", envId)
      .then(({ data }) => setPlaces((data ?? []).map((l: any) => ({ id: l.id, name: l.name }))));
  }, [isOpen, envId]);

  // Auto-fill title when type changes
  useEffect(() => {
    if (form.event_type) {
      setForm((p) => ({ ...p, title: EVENT_DEFAULT_TITLES[form.event_type as EventType] ?? "" }));
    }
  }, [form.event_type]);

  function resetForm() {
    setForm({ event_type: "", title: "", description: "", event_date: "", end_date: "", person_id: defaultPersonId ?? "", place_id: defaultPlaceId ?? "" });
    setPersonSearch("");
    setPlaceSearch("");
  }

  async function handleCreate() {
    if (!form.event_type || !form.title.trim()) return;
    try {
      await createEvent.mutateAsync({
        event_type: form.event_type as EventType,
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_date: form.event_date || null,
        end_date: form.end_date || null,
        person_id: form.person_id || null,
        place_id: form.place_id || null,
      });
      toast.success("Événement créé !");
      resetForm();
      onCreated?.();
      onClose();
    } catch {
      toast.error("Impossible de créer l'événement.");
    }
  }

  const filteredPeople = personSearch
    ? people.filter((p) => p.name.toLowerCase().includes(personSearch.toLowerCase()))
    : people;
  const filteredPlaces = placeSearch
    ? places.filter((l) => l.name.toLowerCase().includes(placeSearch.toLowerCase()))
    : places;

  const selectedPerson = people.find((p) => p.id === form.person_id);
  const selectedPlace = places.find((l) => l.id === form.place_id);

  return (
    <Modal isOpen={isOpen} onClose={() => { resetForm(); onClose(); }} title="Ajouter un événement" size="md">
      <div className="space-y-4">
        {/* Type */}
        <Select
          label="Type *"
          value={form.event_type}
          onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value as EventType }))}
          placeholder="Choisir un type…"
          options={EVENT_TYPES.map((t) => ({ value: t, label: EVENT_TYPE_LABELS[t] }))}
        />

        {/* Title */}
        <Input
          label="Titre *"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="Titre de l'événement"
        />

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            value={form.event_date}
            onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))}
          />
          <Input
            label="Date de fin"
            type="date"
            value={form.end_date}
            onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-heritage-dark">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-heritage-sand bg-heritage-white px-3 py-2 text-sm resize-none
              focus:outline-none focus:ring-2 focus:ring-heritage-forest focus:border-transparent"
          />
        </div>

        {/* Person */}
        {!defaultPersonId && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-heritage-dark">Personne liée</label>
            <Select
              value={form.person_id}
              onChange={(e) => setForm((p) => ({ ...p, person_id: e.target.value }))}
              placeholder="Aucune personne"
              options={[
                { value: "", label: "— Aucune personne —" },
                ...people.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
        )}

        {/* Place */}
        {!defaultPlaceId && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-heritage-dark">Lieu lié</label>
            <Select
              value={form.place_id}
              onChange={(e) => setForm((p) => ({ ...p, place_id: e.target.value }))}
              placeholder="Aucun lieu"
              options={[
                { value: "", label: "— Aucun lieu —" },
                ...places.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => { resetForm(); onClose(); }}>Annuler</Button>
          <Button
            onClick={handleCreate}
            loading={createEvent.isPending}
            disabled={!form.event_type || !form.title.trim()}
          >
            Créer l'événement
          </Button>
        </div>
      </div>
    </Modal>
  );
}
