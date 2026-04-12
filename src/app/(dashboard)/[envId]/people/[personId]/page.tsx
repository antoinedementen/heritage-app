"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Pencil, Trash2, Plus, X, Check,
  Users, Calendar, Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  usePerson,
  useUpdatePerson,
  useDeletePerson,
  useCreateRelationship,
  useDeleteRelationship,
} from "@/hooks/usePeople";
import { usePeople } from "@/hooks/usePeople";
import { useToast } from "@/hooks/useToast";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner, PageLoader } from "@/components/ui/LoadingSpinner";
import { getPersonCompleteness, type RelationshipType, type Person } from "@/lib/supabase/queries/people";
import { formatDate } from "@/lib/utils";

// ─── Simple markdown renderer (bold, italic, newlines) ───────────────────────
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-sm text-heritage-dark leading-relaxed">
      {lines.map((line, i) => {
        // Bold **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });
        return <p key={i}>{parts}</p>;
      })}
    </div>
  );
}

// ─── Completeness mini panel ──────────────────────────────────────────────────
function CompletenessPanel({ person }: { person: Person }) {
  const { pct, filled, missing } = getPersonCompleteness(person);
  const color = pct >= 80 ? "bg-heritage-forest" : pct >= 50 ? "bg-heritage-gold" : "bg-heritage-red";
  const message =
    pct >= 80
      ? "Fiche bien renseignée, continuez comme ça !"
      : pct >= 50
      ? "Quelques informations manquent encore."
      : "Cette fiche mérite d'être enrichie.";

  return (
    <Card title={`Complétude — ${pct}%`}>
      <div className="mb-3 h-2 w-full rounded-full bg-heritage-beige overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mb-3 text-xs text-heritage-brown">{message}</p>
      <div className="space-y-1">
        {filled.map((f) => (
          <div key={f} className="flex items-center gap-2 text-xs">
            <Check className="h-3.5 w-3.5 text-heritage-forest shrink-0" />
            <span className="text-heritage-dark">{f}</span>
          </div>
        ))}
        {missing.map((f) => (
          <div key={f} className="flex items-center gap-2 text-xs">
            <X className="h-3.5 w-3.5 text-heritage-sand shrink-0" />
            <span className="text-heritage-brown">{f}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Relation group labels ────────────────────────────────────────────────────
const RELATION_LABELS: Record<string, string> = {
  parent_child_parent:    "Parents",
  parent_child_child:     "Enfants",
  spouse:                 "Conjoint(e)s",
  sibling:                "Frères & Sœurs",
  godparent_godparent:    "Parrains / Marraines",
  godparent_godchild:     "Filleul(e)s",
  adoptive_parent_parent: "Parents adoptifs",
  adoptive_parent_child:  "Enfants adoptifs",
  guardian:               "Tuteurs / Pupilles",
};

function getRelationGroup(type: RelationshipType, direction: "a_to_b" | "b_to_a"): string {
  if (type === "parent_child") {
    // person_a = parent, person_b = child
    return direction === "a_to_b" ? "parent_child_child" : "parent_child_parent";
  }
  if (type === "godparent") {
    return direction === "a_to_b" ? "godparent_godchild" : "godparent_godparent";
  }
  if (type === "adoptive_parent") {
    return direction === "a_to_b" ? "adoptive_parent_child" : "adoptive_parent_parent";
  }
  return type;
}

// ─── Edit person modal ────────────────────────────────────────────────────────
function EditPersonModal({
  isOpen,
  onClose,
  person,
  envId,
}: {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  envId: string;
}) {
  const toast = useToast();
  const updatePerson = useUpdatePerson(envId);
  const [form, setForm] = useState({
    first_name: person.first_name,
    last_name: person.last_name,
    birth_date: person.birth_date ?? "",
    death_date: person.death_date ?? "",
    birth_place: person.birth_place ?? "",
    profession: person.profession ?? "",
    bio: person.bio ?? "",
    is_alive: person.is_alive,
  });

  async function handleSave() {
    try {
      await updatePerson.mutateAsync({
        id: person.id,
        data: {
          ...form,
          birth_date: form.birth_date || null,
          death_date: form.death_date || null,
          birth_place: form.birth_place || null,
          profession: form.profession || null,
          bio: form.bio || null,
          is_alive: form.is_alive,
        },
      });
      toast.success("Fiche mise à jour !");
      onClose();
    } catch {
      toast.error("Impossible de mettre à jour la fiche.");
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifier la fiche" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom *" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
          <Input label="Nom *" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date de naissance" type="date" value={form.birth_date} onChange={(e) => setForm((p) => ({ ...p, birth_date: e.target.value }))} />
          <Input label="Lieu de naissance" value={form.birth_place} onChange={(e) => setForm((p) => ({ ...p, birth_place: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date de décès" type="date" value={form.death_date} onChange={(e) => setForm((p) => ({ ...p, death_date: e.target.value }))} />
          <Input label="Profession" value={form.profession} onChange={(e) => setForm((p) => ({ ...p, profession: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-heritage-dark">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
            rows={4}
            className="w-full rounded-lg border border-heritage-sand bg-heritage-white px-3 py-2.5
              text-sm resize-y focus:outline-none focus:ring-2 focus:ring-heritage-forest focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-heritage-dark cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_alive}
            onChange={(e) => setForm((p) => ({ ...p, is_alive: e.target.checked }))}
            className="rounded border-heritage-sand"
          />
          Personne vivante
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} loading={updatePerson.isPending}>Enregistrer</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Add relation modal ───────────────────────────────────────────────────────
function AddRelationModal({
  isOpen,
  onClose,
  person,
  envId,
}: {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  envId: string;
}) {
  const toast = useToast();
  const { data: allPeople = [] } = usePeople(envId);
  const createRel = useCreateRelationship(person.id);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [type, setType] = useState<RelationshipType>("parent_child");
  const [direction, setDirection] = useState<"a_to_b" | "b_to_a">("b_to_a");

  const filtered = allPeople.filter(
    (p) =>
      p.id !== person.id &&
      (`${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleAdd() {
    if (!selectedId) return;
    const personAId = direction === "a_to_b" ? person.id : selectedId;
    const personBId = direction === "a_to_b" ? selectedId : person.id;
    try {
      await createRel.mutateAsync({
        environment_id: envId,
        person_a_id: personAId,
        person_b_id: personBId,
        type,
      });
      toast.success("Relation ajoutée !");
      onClose();
      setSearch(""); setSelectedId(""); setType("parent_child"); setDirection("b_to_a");
    } catch {
      toast.error("Impossible d'ajouter cette relation.");
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter une relation" size="md">
      <div className="space-y-4">
        <Input
          icon={Users}
          label="Rechercher une personne"
          placeholder="Nom, prénom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <div className="max-h-40 overflow-y-auto rounded-lg border border-heritage-sand divide-y divide-heritage-sand/50">
            {filtered.length === 0 ? (
              <p className="p-3 text-sm text-heritage-brown">Aucun résultat</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedId(p.id); setSearch(`${p.first_name} ${p.last_name}`); }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-heritage-beige transition-colors
                    ${selectedId === p.id ? "bg-heritage-forest/5 text-heritage-forest" : "text-heritage-dark"}`}
                >
                  {p.first_name} {p.last_name}
                  {p.birth_date && <span className="ml-2 text-xs text-heritage-brown">({p.birth_date.split("-")[0]})</span>}
                </button>
              ))
            )}
          </div>
        )}
        <Select
          label="Type de relation"
          value={type}
          onChange={(e) => setType(e.target.value as RelationshipType)}
          options={[
            { value: "parent_child", label: "Parent / Enfant" },
            { value: "spouse", label: "Conjoint(e)" },
            { value: "sibling", label: "Frère / Sœur" },
            { value: "godparent", label: "Parrain / Marraine" },
            { value: "adoptive_parent", label: "Parent adoptif" },
            { value: "guardian", label: "Tuteur / Pupille" },
          ]}
        />
        {type === "parent_child" && (
          <Select
            label={`Rôle de ${person.first_name}`}
            value={direction}
            onChange={(e) => setDirection(e.target.value as "a_to_b" | "b_to_a")}
            options={[
              { value: "a_to_b", label: `${person.first_name} est le parent` },
              { value: "b_to_a", label: `${person.first_name} est l'enfant` },
            ]}
          />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={handleAdd} loading={createRel.isPending} disabled={!selectedId}>
            Ajouter
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main detail page ─────────────────────────────────────────────────────────
export default function PersonDetailPage({
  params,
}: {
  params: Promise<{ envId: string; personId: string }>;
}) {
  const { envId, personId } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { isGuest } = useAuth();

  const { data: person, isLoading } = usePerson(personId);
  const deletePerson = useDeletePerson(envId);

  const [editOpen, setEditOpen] = useState(false);
  const [addRelOpen, setAddRelOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const deleteRel = useDeleteRelationship(personId);

  async function handleDelete() {
    try {
      await deletePerson.mutateAsync(personId);
      toast.success("Fiche supprimée.");
      router.push(`/${envId}/people`);
    } catch {
      toast.error("Impossible de supprimer cette fiche.");
    }
  }

  if (isLoading) return <PageLoader />;
  if (!person) return (
    <div className="text-center py-16">
      <p className="text-heritage-brown">Personne introuvable.</p>
      <Button variant="secondary" className="mt-4" onClick={() => router.push(`/${envId}/people`)}>
        Retour à la liste
      </Button>
    </div>
  );

  // Group relationships
  const grouped: Record<string, typeof person.relationships> = {};
  for (const rel of person.relationships) {
    const key = getRelationGroup(rel.type, rel.direction);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(rel);
  }

  const dateStr = (() => {
    if (person.birth_date && person.death_date) {
      return `${formatDate(person.birth_date)} — ${formatDate(person.death_date)}`;
    }
    if (person.birth_date) {
      return `Né${person.gender === "female" ? "e" : ""} le ${formatDate(person.birth_date)}`;
    }
    return null;
  })();

  return (
    <div className="space-y-6">
      {/* ── Back ───────────────────────────────────────────────────────── */}
      <button
        onClick={() => router.push(`/${envId}/people`)}
        className="flex items-center gap-1.5 text-sm text-heritage-brown hover:text-heritage-dark transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux personnes
      </button>

      {/* ── Main layout ────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col items-center text-center">
              <Avatar
                src={person.photo_url}
                firstName={person.first_name}
                lastName={person.last_name}
                size="xl"
              />
              <h1 className="mt-3 font-serif text-2xl font-semibold text-heritage-dark">
                {person.first_name} {person.last_name}
              </h1>
              {dateStr && (
                <p className="mt-1 text-sm text-heritage-brown">{dateStr}</p>
              )}
              <div className="mt-2">
                {person.is_alive ? (
                  <Badge variant="success">En vie</Badge>
                ) : (
                  <Badge variant="neutral">Décédé{person.gender === "female" ? "e" : ""}</Badge>
                )}
              </div>
              {person.profession && (
                <p className="mt-2 text-sm text-heritage-brown">{person.profession}</p>
              )}
            </div>
            {!isGuest && (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Pencil}
                  fullWidth
                  onClick={() => setEditOpen(true)}
                >
                  Modifier
                </Button>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="rounded-lg border border-heritage-sand p-2 text-heritage-red/70 hover:bg-heritage-red/10 hover:text-heritage-red transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </Card>

          {/* Completeness */}
          <CompletenessPanel person={person} />
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Bio */}
          {person.bio && (
            <Card title="Biographie">
              <SimpleMarkdown text={person.bio} />
            </Card>
          )}

          {/* Relations */}
          <Card
            title="Relations"
            action={
              !isGuest ? (
                <Button size="sm" icon={Plus} onClick={() => setAddRelOpen(true)}>
                  Ajouter
                </Button>
              ) : undefined
            }
          >
            {Object.keys(grouped).length === 0 ? (
              <p className="text-sm text-heritage-brown py-2">Aucune relation renseignée.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([group, rels]) => (
                  <div key={group}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-heritage-brown">
                      {RELATION_LABELS[group] ?? group}
                    </p>
                    <ul className="space-y-2">
                      {rels.map((rel) => (
                        <li
                          key={rel.id}
                          className="flex items-center justify-between rounded-lg bg-heritage-cream px-3 py-2"
                        >
                          <button
                            onClick={() => router.push(`/${envId}/people/${rel.related_person.id}`)}
                            className="flex items-center gap-2 text-sm text-heritage-forest hover:underline"
                          >
                            <Avatar
                              src={rel.related_person.photo_url}
                              firstName={rel.related_person.first_name}
                              lastName={rel.related_person.last_name}
                              size="sm"
                            />
                            {rel.related_person.first_name} {rel.related_person.last_name}
                          </button>
                          {!isGuest && (
                            <button
                              onClick={() => deleteRel.mutate(rel.id)}
                              className="rounded p-1 text-heritage-brown/50 hover:text-heritage-red transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Events */}
          <Card title="Événements">
            {person.events.length === 0 ? (
              <p className="text-sm text-heritage-brown py-2">Aucun événement enregistré.</p>
            ) : (
              <ol className="relative border-l border-heritage-sand/60 ml-3 space-y-4">
                {person.events.map((event) => (
                  <li key={event.id} className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-heritage-forest/40 border-2 border-heritage-white" />
                    <p className="text-xs text-heritage-brown mb-0.5">
                      {event.event_date ? formatDate(event.event_date) : "Date inconnue"}
                    </p>
                    <p className="text-sm font-medium text-heritage-dark">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-heritage-brown mt-0.5">{event.description}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {/* Media */}
          {person.media.length > 0 && (
            <Card title="Médias">
              <div className="grid grid-cols-3 gap-2">
                {person.media.map((m) => (
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

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {editOpen && (
        <EditPersonModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          person={person}
          envId={envId}
        />
      )}

      <AddRelationModal
        isOpen={addRelOpen}
        onClose={() => setAddRelOpen(false)}
        person={person}
        envId={envId}
      />

      <Modal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Supprimer la fiche"
        size="sm"
      >
        <p className="text-sm text-heritage-brown">
          Êtes-vous sûr de vouloir supprimer la fiche de{" "}
          <strong className="text-heritage-dark">
            {person.first_name} {person.last_name}
          </strong>{" "}
          ? Cette action est irréversible.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirm(false)}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} loading={deletePerson.isPending}>
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
