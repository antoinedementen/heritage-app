"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Pencil, Trash2, Home, Clock,
  Calendar, Users, Image as ImageIcon, X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlace, useUpdatePlace, useDeletePlace } from "@/hooks/usePlaces";
import { useToast } from "@/hooks/useToast";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { formatDate } from "@/lib/utils";
import type { PlaceEvent } from "@/lib/supabase/queries/places";

// ─── Event type config ────────────────────────────────────────────────────────
const EVENT_TYPE_LABELS: Record<string, string> = {
  birth: "Naissance", death: "Décès", marriage: "Mariage", divorce: "Divorce",
  baptism: "Baptême", property: "Propriété", residence: "Résidence",
  education: "Éducation", career: "Carrière", military: "Militaire",
  immigration: "Immigration", other: "Autre",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  birth: "bg-green-100 text-green-700 border-green-200",
  death: "bg-gray-100 text-gray-600 border-gray-200",
  marriage: "bg-pink-100 text-pink-700 border-pink-200",
  property: "bg-heritage-gold/10 text-heritage-gold border-heritage-gold/20",
  residence: "bg-blue-50 text-blue-600 border-blue-100",
  other: "bg-heritage-beige text-heritage-brown border-heritage-sand",
};

function EventTypeBadge({ type }: { type: string }) {
  const cls = EVENT_TYPE_COLORS[type] ?? EVENT_TYPE_COLORS.other;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {EVENT_TYPE_LABELS[type] ?? type}
    </span>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function EventTimeline({
  events,
  envId,
  onPersonClick,
}: {
  events: PlaceEvent[];
  envId: string;
  onPersonClick: (id: string) => void;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-heritage-brown py-2">Aucun événement enregistré.</p>;
  }

  return (
    <ol className="relative border-l border-heritage-sand/60 ml-3 space-y-5">
      {events.map((event) => (
        <li key={event.id} className="ml-5">
          <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-heritage-forest/40 border-2 border-heritage-white" />
          <div className="flex flex-wrap items-start gap-2">
            <EventTypeBadge type={event.event_type} />
            {event.event_date && (
              <span className="text-xs text-heritage-brown">{formatDate(event.event_date)}</span>
            )}
            {event.end_date && (
              <span className="text-xs text-heritage-brown">→ {formatDate(event.end_date)}</span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-heritage-dark">{event.title}</p>
          {event.description && (
            <p className="mt-0.5 text-xs text-heritage-brown">{event.description}</p>
          )}
          {event.person_name && (
            <button
              onClick={() => event.person_id && onPersonClick(event.person_id)}
              className="mt-1 flex items-center gap-1.5 text-xs text-heritage-forest hover:underline"
            >
              <Avatar
                src={event.person_photo ?? null}
                firstName={event.person_name.split(" ")[0]}
                lastName={event.person_name.split(" ").slice(1).join(" ")}
                size="sm"
              />
              {event.person_name}
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────
function EditPlaceModal({
  isOpen,
  onClose,
  place,
  envId,
}: {
  isOpen: boolean;
  onClose: () => void;
  place: { id: string; name: string; address: string | null; city: string | null; country: string | null; description: string | null };
  envId: string;
}) {
  const toast = useToast();
  const updatePlace = useUpdatePlace(envId);
  const [form, setForm] = useState({
    name: place.name,
    address: place.address ?? "",
    city: place.city ?? "",
    country: place.country ?? "",
    description: place.description ?? "",
  });

  async function handleSave() {
    try {
      await updatePlace.mutateAsync({
        id: place.id,
        data: {
          name: form.name.trim(),
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          country: form.country.trim() || null,
          description: form.description.trim() || null,
        },
      });
      toast.success("Lieu mis à jour !");
      onClose();
    } catch {
      toast.error("Impossible de mettre à jour le lieu.");
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifier le lieu" size="md">
      <div className="space-y-4">
        <Input label="Nom *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <Input label="Adresse" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Ville" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          <Input label="Pays" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-heritage-dark">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-heritage-sand bg-heritage-white px-3 py-2.5
              text-sm resize-none focus:outline-none focus:ring-2 focus:ring-heritage-forest focus:border-transparent"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} loading={updatePlace.isPending} disabled={!form.name.trim()}>
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function PlaceDetailPage({
  params,
}: {
  params: Promise<{ envId: string; placeId: string }>;
}) {
  const { envId, placeId } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { isGuest } = useAuth();

  const { data: place, isLoading } = usePlace(placeId);
  const deletePlace = useDeletePlace(envId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  async function handleDelete() {
    try {
      await deletePlace.mutateAsync(placeId);
      toast.success("Lieu supprimé.");
      router.push(`/${envId}/places`);
    } catch {
      toast.error("Impossible de supprimer ce lieu.");
    }
  }

  if (isLoading) return <PageLoader />;
  if (!place) return (
    <div className="text-center py-16">
      <p className="text-heritage-brown">Lieu introuvable.</p>
      <Button variant="secondary" className="mt-4" onClick={() => router.push(`/${envId}/places`)}>
        Retour aux lieux
      </Button>
    </div>
  );

  const fullAddress = [place.address, place.city, place.country].filter(Boolean).join(", ");
  const nonPropertyEvents = place.events.filter((e) => e.event_type !== "property");

  return (
    <div className="space-y-6">
      {/* ── Back ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => router.push(`/${envId}/places`)}
        className="flex items-center gap-1.5 text-sm text-heritage-brown hover:text-heritage-dark transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux lieux
      </button>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative h-52 w-full rounded-2xl overflow-hidden bg-heritage-beige">
        {place.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.photo_url} alt={place.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MapPin className="h-16 w-16 text-heritage-sand" />
          </div>
        )}
        {/* Overlay title */}
        <div className="absolute inset-0 bg-gradient-to-t from-heritage-dark/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-5">
          <h1 className="font-serif text-3xl font-semibold text-white drop-shadow">{place.name}</h1>
          {fullAddress && <p className="mt-0.5 text-sm text-white/80">{fullAddress}</p>}
        </div>
        {!isGuest && (
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="rounded-lg bg-heritage-white/90 p-2 text-heritage-dark hover:bg-heritage-white transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="rounded-lg bg-heritage-white/90 p-2 text-heritage-red hover:bg-heritage-white transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {place.description && (
        <p className="text-heritage-brown">{place.description}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left column ──────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Current owner */}
          <Card title="Propriétaire actuel">
            {place.currentOwner ? (
              <div className="flex items-center gap-3">
                <Avatar
                  src={place.currentOwner.photo_url}
                  firstName={place.currentOwner.first_name}
                  lastName={place.currentOwner.last_name}
                  size="md"
                />
                <div>
                  <button
                    onClick={() => router.push(`/${envId}/people/${place.currentOwner!.id}`)}
                    className="text-sm font-medium text-heritage-forest hover:underline"
                  >
                    {place.currentOwner.first_name} {place.currentOwner.last_name}
                  </button>
                  {place.currentOwner.since && (
                    <p className="text-xs text-heritage-brown">
                      Depuis le {formatDate(place.currentOwner.since)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-heritage-brown">Aucun propriétaire enregistré.</p>
            )}
          </Card>

          {/* Related people */}
          {place.relatedPeople.length > 0 && (
            <Card title="Personnes liées">
              <ul className="space-y-2">
                {place.relatedPeople.map((person) => (
                  <li key={person.id}>
                    <button
                      onClick={() => router.push(`/${envId}/people/${person.id}`)}
                      className="flex items-center gap-2 w-full text-left hover:bg-heritage-beige rounded-lg p-1.5 -mx-1.5 transition-colors"
                    >
                      <Avatar
                        src={person.photo_url}
                        firstName={person.first_name}
                        lastName={person.last_name}
                        size="sm"
                      />
                      <span className="flex-1 text-sm text-heritage-dark">
                        {person.first_name} {person.last_name}
                      </span>
                      <Badge variant="neutral">
                        {person.event_count} év.
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Property history */}
          {place.propertyHistory.length > 0 && (
            <Card title="Historique de propriété">
              <EventTimeline
                events={place.propertyHistory}
                envId={envId}
                onPersonClick={(id) => router.push(`/${envId}/people/${id}`)}
              />
            </Card>
          )}

          {/* All events */}
          <Card title="Événements liés">
            <EventTimeline
              events={nonPropertyEvents}
              envId={envId}
              onPersonClick={(id) => router.push(`/${envId}/people/${id}`)}
            />
          </Card>

          {/* Media */}
          {place.media.length > 0 && (
            <Card title="Documents & archives">
              <div className="grid grid-cols-3 gap-2">
                {place.media.map((m) => (
                  <div key={m.id} className="group relative aspect-square overflow-hidden rounded-lg bg-heritage-beige">
                    {m.file_type === "photo" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.file_url}
                        alt={m.caption ?? ""}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-heritage-brown" />
                      </div>
                    )}
                    {m.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-heritage-dark/60 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {m.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {editOpen && (
        <EditPlaceModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          place={place}
          envId={envId}
        />
      )}

      <Modal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Supprimer le lieu"
        size="sm"
      >
        <p className="text-sm text-heritage-brown">
          Êtes-vous sûr de vouloir supprimer{" "}
          <strong className="text-heritage-dark">{place.name}</strong> ?
          Les événements liés ne seront pas supprimés. Cette action est irréversible.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirm(false)}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} loading={deletePlace.isPending}>
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
