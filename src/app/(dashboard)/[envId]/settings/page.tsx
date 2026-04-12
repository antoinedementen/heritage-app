"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings, Upload, GitBranch, Copy, Check, Trash2,
  ChevronDown, ChevronUp, Users, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useEnvironments, useDeleteEnvironment } from "@/hooks/useEnvironments";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ImportWizard } from "@/components/import/ImportWizard";
import { RelationshipFinder } from "@/components/tree/RelationshipFinder";

// ─── Access code copy widget ──────────────────────────────────────────────────

function AccessCodeWidget({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-heritage-sand bg-heritage-beige/50 px-4 py-3">
      <span className="font-mono text-lg font-semibold tracking-widest text-heritage-dark flex-1">
        {code}
      </span>
      <button
        onClick={copy}
        className="flex items-center gap-1.5 rounded-lg border border-heritage-sand bg-heritage-white px-3 py-1.5 text-xs font-medium text-heritage-brown hover:bg-heritage-beige transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-heritage-forest" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copié !" : "Copier"}
      </button>
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  description,
  badge,
  defaultOpen = false,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-heritage-sand bg-heritage-white shadow-[0_2px_12px_rgba(74,55,40,0.04)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-heritage-beige/40 transition-colors"
      >
        <div className="h-9 w-9 rounded-lg bg-heritage-forest/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-heritage-forest" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-heritage-dark">{title}</span>
            {badge && <Badge variant="neutral" className="text-[10px] px-1.5 py-0.5">{badge}</Badge>}
          </div>
          {description && <p className="text-xs text-heritage-brown mt-0.5">{description}</p>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-heritage-brown shrink-0" /> : <ChevronDown className="h-4 w-4 text-heritage-brown shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-heritage-sand">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage({
  params,
}: {
  params: Promise<{ envId: string }>;
}) {
  const { envId } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { isGuest, isAdmin } = useAuth();
  const { data: environments = [] } = useEnvironments();
  const deleteEnv = useDeleteEnvironment();

  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const env = environments.find((e) => e.id === envId);

  async function handleDeleteEnv() {
    try {
      await deleteEnv.mutateAsync(envId);
      toast.success("Environnement supprimé.");
      router.push("/");
    } catch {
      toast.error("Impossible de supprimer cet environnement.");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-serif text-3xl font-semibold text-heritage-dark">Paramètres</h1>
        <p className="mt-0.5 text-sm text-heritage-brown">
          Gestion et configuration de {env?.name ?? "cet environnement"}.
        </p>
      </div>

      {/* ── Access code ────────────────────────────────────────────────── */}
      {env && (
        <Card title="Code d'accès" padding="md">
          <p className="text-sm text-heritage-brown mb-3">
            Partagez ce code pour inviter des membres à rejoindre cet espace.
          </p>
          <AccessCodeWidget code={env.access_code} />
          <div className="mt-3 flex items-center gap-4 text-xs text-heritage-brown">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {env.members_count} membre{env.members_count !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              {env.people_count} personne{env.people_count !== 1 ? "s" : ""} dans l&apos;arbre
            </span>
          </div>
        </Card>
      )}

      {/* ── Import ─────────────────────────────────────────────────────── */}
      {!isGuest && (
        <Section
          icon={Upload}
          title="Importer des données"
          description="Importez un fichier Excel, CSV ou GEDCOM pour alimenter votre arbre."
          badge="Excel · CSV · GEDCOM"
        >
          <div className="pt-3">
            <Button onClick={() => setImportOpen(true)} icon={Upload}>
              Lancer l&apos;import
            </Button>
          </div>
        </Section>
      )}

      {/* ── Relationship finder ─────────────────────────────────────────── */}
      <Section
        icon={GitBranch}
        title="Calculateur de parenté"
        description="Trouvez le lien de parenté entre deux personnes de votre arbre."
        defaultOpen
      >
        <div className="pt-3">
          <RelationshipFinder envId={envId} />
        </div>
      </Section>

      {/* ── Danger zone ────────────────────────────────────────────────── */}
      {isAdmin() && (
        <div className="rounded-xl border border-heritage-red/30 bg-heritage-red/5 p-5">
          <h3 className="font-semibold text-heritage-red mb-1">Zone de danger</h3>
          <p className="text-sm text-heritage-red/70 mb-4">
            La suppression de cet environnement est irréversible et entraîne la perte de toutes les données.
          </p>
          <Button variant="danger" icon={Trash2} onClick={() => setDeleteOpen(true)}>
            Supprimer cet environnement
          </Button>
        </div>
      )}

      {/* ── Import modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importer des données"
        size="lg"
      >
        <ImportWizard
          envId={envId}
          onClose={() => setImportOpen(false)}
          onComplete={() => {}}
        />
      </Modal>

      {/* ── Delete confirm ─────────────────────────────────────────────── */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer l'environnement"
        size="sm"
      >
        <p className="text-sm text-heritage-brown">
          Êtes-vous certain de vouloir supprimer <strong>{env?.name}</strong> ? Toutes les personnes, événements, médias et relations seront définitivement supprimés.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Annuler</Button>
          <Button variant="danger" onClick={handleDeleteEnv} loading={deleteEnv.isPending}>
            Supprimer définitivement
          </Button>
        </div>
      </Modal>
    </div>
  );
}
