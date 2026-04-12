"use client";

import { use, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Search, Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlaces, useCreatePlace, usePlaceFilterOptions } from "@/hooks/usePlaces";
import { useToast } from "@/hooks/useToast";
import { uploadPlacePhoto } from "@/lib/supabase/queries/places";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

// ─── Place card ───────────────────────────────────────────────────────────────
function PlaceCard({
  place,
  onClick,
}: {
  place: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    country: string | null;
    photo_url: string | null;
    description: string | null;
    event_count: number;
  };
  onClick: () => void;
}) {
  const location = [place.address, place.city, place.country].filter(Boolean).join(", ");

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl bg-heritage-white border border-heritage-sand/30
        shadow-[0_2px_12px_rgba(74,55,40,0.06)] overflow-hidden text-left
        hover:shadow-[0_4px_20px_rgba(74,55,40,0.12)] hover:-translate-y-0.5
        transition-all duration-200"
    >
      {/* Photo */}
      <div className="relative h-36 bg-heritage-beige overflow-hidden">
        {place.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.photo_url}
            alt={place.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MapPin className="h-10 w-10 text-heritage-sand" />
          </div>
        )}
        {place.event_count > 0 && (
          <div className="absolute top-2 right-2">
            <Badge variant="neutral">
              {place.event_count} événement{place.event_count > 1 ? "s" : ""}
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="font-serif font-semibold text-heritage-dark truncate">{place.name}</p>
        {location && (
          <p className="mt-0.5 text-xs text-heritage-brown truncate">{location}</p>
        )}
        {place.description && (
          <p className="mt-1 text-xs text-heritage-brown/70 line-clamp-2">{place.description}</p>
        )}
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PlacesPage({
  params,
}: {
  params: Promise<{ envId: string }>;
}) {
  const { envId } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { isGuest } = useAuth();

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const { data: places = [], isLoading } = usePlaces(envId, {
    search: search || undefined,
    country: country || undefined,
    city: city || undefined,
  });
  const { data: filterOptions } = usePlaceFilterOptions(envId);
  const createPlace = useCreatePlace(envId);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    description: "",
    photo_file: null as File | null,
    photo_preview: null as string | null,
  });
  const fileRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setForm({ name: "", address: "", city: "", country: "", description: "", photo_file: null, photo_preview: null });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((p) => ({
      ...p,
      photo_file: file,
      photo_preview: URL.createObjectURL(file),
    }));
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    try {
      const place = await createPlace.mutateAsync({
        name: form.name.trim(),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        description: form.description.trim() || null,
        photo_url: null,
        latitude: null,
        longitude: null,
      });

      // Upload photo if provided
      if (form.photo_file) {
        try {
          const photo_url = await uploadPlacePhoto(form.photo_file, place.id);
          const { updatePlace } = await import("@/lib/supabase/queries/places");
          await updatePlace(place.id, { photo_url });
        } catch {
          // non-blocking
        }
      }

      toast.success(`Lieu "${place.name}" créé !`);
      setCreateOpen(false);
      resetForm();
      router.push(`/${envId}/places/${place.id}`);
    } catch {
      toast.error("Impossible de créer le lieu.");
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-heritage-dark">Lieux</h1>
          <p className="mt-0.5 text-sm text-heritage-brown">
            {isLoading ? "…" : `${places.length} lieu${places.length !== 1 ? "x" : ""}`}
          </p>
        </div>
        {!isGuest && (
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            Ajouter un lieu
          </Button>
        )}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            icon={Search}
            placeholder="Rechercher par nom, ville…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filterOptions && filterOptions.countries.length > 0 && (
          <Select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            options={[
              { value: "", label: "Tous les pays" },
              ...filterOptions.countries.map((c) => ({ value: c, label: c })),
            ]}
            className="w-40"
          />
        )}
        {filterOptions && filterOptions.cities.length > 0 && (
          <Select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            options={[
              { value: "", label: "Toutes les villes" },
              ...filterOptions.cities.map((c) => ({ value: c, label: c })),
            ]}
            className="w-40"
          />
        )}
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : places.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={search || country || city ? "Aucun lieu ne correspond aux filtres" : "Aucun lieu enregistré"}
          description={
            search || country || city
              ? "Modifiez les filtres pour voir plus de résultats."
              : "Commencez par ajouter un lieu à l'arbre familial."
          }
          action={
            !isGuest && !search && !country && !city
              ? { label: "Ajouter un lieu", onClick: () => setCreateOpen(true) }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              onClick={() => router.push(`/${envId}/places/${place.id}`)}
            />
          ))}
        </div>
      )}

      {/* ── Create modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); resetForm(); }}
        title="Ajouter un lieu"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom *"
            placeholder="Château de Versailles"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            autoFocus
          />
          <Input
            label="Adresse"
            placeholder="Place d'Armes"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ville"
              placeholder="Versailles"
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
            />
            <Input
              label="Pays"
              placeholder="France"
              value={form.country}
              onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-heritage-dark">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Description du lieu…"
              className="w-full rounded-lg border border-heritage-sand bg-heritage-white px-3 py-2.5
                text-sm resize-none focus:outline-none focus:ring-2 focus:ring-heritage-forest focus:border-transparent"
            />
          </div>

          {/* Photo */}
          <div>
            <p className="mb-2 text-sm font-medium text-heritage-dark">Photo (optionnel)</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {form.photo_preview ? (
              <div className="relative h-32 w-full rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.photo_preview} alt="preview" className="h-full w-full object-cover" />
                <button
                  onClick={() => setForm((p) => ({ ...p, photo_file: null, photo_preview: null }))}
                  className="absolute top-2 right-2 rounded-full bg-heritage-dark/70 p-1 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed
                  border-heritage-sand px-4 py-6 text-sm text-heritage-brown
                  hover:border-heritage-forest/40 hover:text-heritage-forest transition-colors"
              >
                <Upload className="h-4 w-4" />
                Choisir une photo
              </button>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setCreateOpen(false); resetForm(); }}>
              Annuler
            </Button>
            <Button onClick={handleCreate} loading={createPlace.isPending} disabled={!form.name.trim()}>
              Créer le lieu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
