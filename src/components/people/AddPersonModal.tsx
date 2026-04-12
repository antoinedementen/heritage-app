"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, UserRound, Smile, Upload, AlertTriangle, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { type Gender, type Person, checkDuplicates, uploadPersonPhoto } from "@/lib/supabase/queries/people";

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  envId: string;
  onCreated: (person: Person) => void;
}

type Step = 1 | 2 | 3 | "duplicate" | "done";

const INITIAL_FORM = {
  gender: "" as Gender | "",
  first_name: "",
  last_name: "",
  birth_date: "",
  birth_place: "",
  profession: "",
  bio: "",
  photo_file: null as File | null,
  photo_preview: null as string | null,
};

export function AddPersonModal({ isOpen, onClose, envId, onCreated }: AddPersonModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [duplicates, setDuplicates] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [createdPerson, setCreatedPerson] = useState<Person | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep(1);
    setForm(INITIAL_FORM);
    setDuplicates([]);
    setCreatedPerson(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function setField<K extends keyof typeof INITIAL_FORM>(key: K, value: (typeof INITIAL_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Step 1 → 2
  async function goToStep2() {
    if (!form.gender) return;
    setStep(2);
  }

  // Step 2 → check duplicates → 3
  async function goToStep3() {
    if (!form.first_name.trim() || !form.last_name.trim()) return;
    setLoading(true);
    try {
      const found = await checkDuplicates(
        envId,
        form.first_name.trim(),
        form.last_name.trim(),
        form.birth_date || undefined
      );
      if (found.length > 0) {
        setDuplicates(found);
        setStep("duplicate");
      } else {
        setStep(3);
      }
    } finally {
      setLoading(false);
    }
  }

  // Handle photo pick
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setField("photo_file", file);
    const url = URL.createObjectURL(file);
    setField("photo_preview", url);
  }

  // Final create
  async function handleCreate(skipPhotoUpload = false) {
    setLoading(true);
    try {
      let photo_url: string | null = null;
      // We need a temp ID — we'll upload after creation, then update
      // For simplicity, create first, then upload photo
      const { createPerson: createPersonFn } = await import("@/lib/supabase/queries/people");
      const person = await createPersonFn(envId, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gender: form.gender as Gender,
        birth_date: form.birth_date || null,
        birth_place: form.birth_place.trim() || null,
        profession: form.profession.trim() || null,
        bio: form.bio.trim() || null,
        photo_url: null,
        death_date: null,
        is_alive: true,
      });

      if (!skipPhotoUpload && form.photo_file) {
        try {
          photo_url = await uploadPersonPhoto(form.photo_file, person.id);
          const { updatePerson } = await import("@/lib/supabase/queries/people");
          await updatePerson(person.id, { photo_url });
          person.photo_url = photo_url;
        } catch {
          // photo upload failed, continue without photo
        }
      }

      setCreatedPerson(person);
      setStep("done");
      onCreated(person);
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<string | number, string> = {
    1: "Ajouter une personne — Genre",
    2: "Ajouter une personne — Identité",
    3: "Ajouter une personne — Détails",
    duplicate: "Doublon potentiel détecté",
    done: "Personne ajoutée !",
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={titles[step]} size="md">
      {/* ── Step 1 : Genre ──────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-heritage-brown">
            Commencez par choisir le genre de la personne.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { value: "male", label: "Homme", Icon: User, color: "text-blue-500 border-blue-200 hover:border-blue-400 hover:bg-blue-50" },
                { value: "female", label: "Femme", Icon: UserRound, color: "text-pink-500 border-pink-200 hover:border-pink-400 hover:bg-pink-50" },
                { value: "other", label: "Autre", Icon: Smile, color: "text-heritage-brown border-heritage-sand hover:border-heritage-brown hover:bg-heritage-beige" },
              ] as const
            ).map(({ value, label, Icon, color }) => (
              <button
                key={value}
                onClick={() => setField("gender", value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all
                  ${form.gender === value
                    ? value === "male" ? "border-blue-500 bg-blue-50" : value === "female" ? "border-pink-400 bg-pink-50" : "border-heritage-brown bg-heritage-beige"
                    : `border-heritage-sand bg-heritage-white ${color}`
                  }`}
              >
                <Icon className={`h-8 w-8 ${form.gender === value ? (value === "male" ? "text-blue-500" : value === "female" ? "text-pink-500" : "text-heritage-brown") : "text-heritage-sand"}`} />
                <span className={`text-sm font-medium ${form.gender === value ? "text-heritage-dark" : "text-heritage-brown"}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={goToStep2} disabled={!form.gender}>
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2 : Identité ──────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prénom *"
              value={form.first_name}
              onChange={(e) => setField("first_name", e.target.value)}
              placeholder="Jean"
              autoFocus
            />
            <Input
              label="Nom *"
              value={form.last_name}
              onChange={(e) => setField("last_name", e.target.value)}
              placeholder="Dupont"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date de naissance"
              type="date"
              value={form.birth_date}
              onChange={(e) => setField("birth_date", e.target.value)}
            />
            <Input
              label="Lieu de naissance"
              value={form.birth_place}
              onChange={(e) => setField("birth_place", e.target.value)}
              placeholder="Paris, France"
            />
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Retour
            </Button>
            <Button
              onClick={goToStep3}
              loading={loading}
              disabled={!form.first_name.trim() || !form.last_name.trim()}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* ── Step "duplicate" ───────────────────────────────────────────── */}
      {step === "duplicate" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-heritage-gold/30 bg-heritage-gold/5 p-3">
            <AlertTriangle className="h-5 w-5 text-heritage-gold shrink-0 mt-0.5" />
            <p className="text-sm text-heritage-dark">
              {duplicates.length === 1
                ? "Une personne similaire existe déjà dans cet arbre :"
                : `${duplicates.length} personnes similaires existent déjà :`}
            </p>
          </div>
          <div className="space-y-2">
            {duplicates.map((dup) => (
              <div
                key={dup.id}
                className="flex items-center justify-between rounded-lg bg-heritage-cream p-3"
              >
                <div>
                  <p className="text-sm font-medium text-heritage-dark">
                    {dup.first_name} {dup.last_name}
                  </p>
                  {dup.birth_date && (
                    <p className="text-xs text-heritage-brown">Né(e) le {dup.birth_date}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    handleClose();
                    router.push(`/${envId}/people/${dup.id}`);
                  }}
                >
                  Éditer la fiche
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Retour
            </Button>
            <Button onClick={() => setStep(3)}>
              Créer quand même
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3 : Détails ───────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <Input
            label="Profession"
            value={form.profession}
            onChange={(e) => setField("profession", e.target.value)}
            placeholder="Ingénieur, Médecin…"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-heritage-dark">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setField("bio", e.target.value)}
              rows={3}
              placeholder="Quelques mots sur cette personne…"
              className="w-full rounded-lg border border-heritage-sand bg-heritage-white px-3 py-2.5
                text-sm text-heritage-dark placeholder:text-heritage-brown/50 resize-none
                focus:outline-none focus:ring-2 focus:ring-heritage-forest focus:border-transparent"
            />
          </div>

          {/* Photo upload */}
          <div>
            <p className="mb-2 text-sm font-medium text-heritage-dark">Photo (optionnel)</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {form.photo_preview ? (
              <div className="relative w-20 h-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.photo_preview}
                  alt="preview"
                  className="h-20 w-20 rounded-full object-cover border-2 border-heritage-sand"
                />
                <button
                  onClick={() => { setField("photo_file", null); setField("photo_preview", null); }}
                  className="absolute -top-1 -right-1 rounded-full bg-heritage-red text-white p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border-2 border-dashed border-heritage-sand
                  px-4 py-3 text-sm text-heritage-brown hover:border-heritage-forest/40
                  hover:text-heritage-forest transition-colors"
              >
                <Upload className="h-4 w-4" />
                Choisir une photo
              </button>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Retour
            </Button>
            <Button onClick={() => handleCreate()} loading={loading}>
              Créer la fiche
            </Button>
          </div>
        </div>
      )}

      {/* ── Done ───────────────────────────────────────────────────────── */}
      {step === "done" && createdPerson && (
        <div className="space-y-4">
          <div className="rounded-lg bg-heritage-forest/5 border border-heritage-forest/20 p-4 text-sm text-heritage-dark">
            <p className="font-medium">
              ✓ {createdPerson.first_name} {createdPerson.last_name} a été ajouté{createdPerson.gender === "female" ? "e" : ""} avec succès.
            </p>
          </div>
          <p className="text-sm text-heritage-brown">
            Souhaitez-vous lier cette personne à quelqu'un de l'arbre ?
          </p>
          <div className="flex flex-col gap-2 sm:flex-row justify-end">
            <Button variant="secondary" onClick={handleClose}>
              Terminer
            </Button>
            <Button
              onClick={() => {
                handleClose();
                router.push(`/${envId}/people/${createdPerson.id}#relations`);
              }}
            >
              Ajouter des relations
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
