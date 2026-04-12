"use client";

import { redirect } from "next/navigation";
import { Globe, Users, UserCheck, Copy, Trash2, Plus, Eye, RotateCcw, Check } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEnvironments, useCreateEnvironment, useDeleteEnvironment, useGlobalStats } from "@/hooks/useEnvironments";
import { useProfiles, useUpdateProfile, useDeleteProfile } from "@/hooks/useProfiles";
import { useAuditLogs, useRestoreAuditLog } from "@/hooks/useAuditLogs";
import { useToast } from "@/hooks/useToast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import type { EnvironmentWithStats } from "@/lib/supabase/queries/environments";
import type { AuditLogEntry } from "@/lib/supabase/queries/audit";

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-heritage-forest/10">
        <Icon className="h-6 w-6 text-heritage-forest" />
      </div>
      <div>
        <p className="text-sm text-heritage-brown">{label}</p>
        {loading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <p className="font-serif text-3xl font-semibold text-heritage-dark">
            {value}
          </p>
        )}
      </div>
    </Card>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "info" | "neutral" }> = {
    super_admin: { label: "Super Admin", variant: "warning" },
    family_admin: { label: "Admin famille", variant: "success" },
    editor:       { label: "Éditeur", variant: "info" },
    guest:        { label: "Invité", variant: "neutral" },
  };
  const { label, variant } = map[role] ?? { label: role, variant: "neutral" };
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
    approved: { label: "Approuvé", variant: "success" },
    pending:  { label: "En attente", variant: "warning" },
    rejected: { label: "Refusé", variant: "danger" },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "neutral" };
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Action badge ─────────────────────────────────────────────────────────────
function ActionBadge({ action }: { action: string }) {
  const map: Record<string, "success" | "warning" | "danger"> = {
    INSERT: "success",
    UPDATE: "warning",
    DELETE: "danger",
  };
  return <Badge variant={map[action] ?? "neutral"}>{action}</Badge>;
}

// ─── Format date ──────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const { role, isLoading: authLoading } = useAuth();

  // Redirect non-super_admins once auth is ready
  if (!authLoading && role !== "super_admin") {
    redirect("/");
  }

  const toast = useToast();

  // Data
  const { data: stats, isLoading: statsLoading } = useGlobalStats();
  const { data: environments = [], isLoading: envsLoading } = useEnvironments();
  const { data: profiles = [], isLoading: profilesLoading } = useProfiles();
  const { data: logs = [], isLoading: logsLoading } = useAuditLogs();

  // Mutations
  const createEnv = useCreateEnvironment();
  const deleteEnv = useDeleteEnvironment();
  const updateProfile = useUpdateProfile();
  const deleteProfileMutation = useDeleteProfile();
  const restoreLog = useRestoreAuditLog();

  // Modals
  const [createEnvOpen, setCreateEnvOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [newEnvDesc, setNewEnvDesc] = useState("");
  const [createdEnv, setCreatedEnv] = useState<{ name: string; access_code: string } | null>(null);

  const [deleteEnvTarget, setDeleteEnvTarget] = useState<EnvironmentWithStats | null>(null);
  const [deleteProfileTarget, setDeleteProfileTarget] = useState<string | null>(null);

  const [auditDetailLog, setAuditDetailLog] = useState<AuditLogEntry | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AuditLogEntry | null>(null);

  // Copy to clipboard
  const [copiedId, setCopiedId] = useState<string | null>(null);
  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Create environment
  async function handleCreateEnv() {
    if (!newEnvName.trim()) return;
    try {
      const env = await createEnv.mutateAsync({ name: newEnvName.trim(), description: newEnvDesc.trim() || undefined });
      setCreatedEnv({ name: env.name, access_code: env.access_code });
      setNewEnvName("");
      setNewEnvDesc("");
      toast.success("Environnement créé avec succès !");
    } catch {
      toast.error("Impossible de créer l'environnement.");
    }
  }

  // Delete environment
  async function handleDeleteEnv() {
    if (!deleteEnvTarget) return;
    try {
      await deleteEnv.mutateAsync(deleteEnvTarget.id);
      toast.success(`Environnement "${deleteEnvTarget.name}" supprimé.`);
      setDeleteEnvTarget(null);
    } catch {
      toast.error("Impossible de supprimer l'environnement.");
    }
  }

  // Delete profile
  async function handleDeleteProfile() {
    if (!deleteProfileTarget) return;
    try {
      await deleteProfileMutation.mutateAsync(deleteProfileTarget);
      toast.success("Utilisateur supprimé.");
      setDeleteProfileTarget(null);
    } catch {
      toast.error("Impossible de supprimer l'utilisateur.");
    }
  }

  // Restore audit log
  async function handleRestore() {
    if (!restoreTarget) return;
    try {
      await restoreLog.mutateAsync(restoreTarget.id);
      toast.success("Données restaurées avec succès !");
      setRestoreTarget(null);
    } catch {
      toast.error("Impossible de restaurer les données.");
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-semibold text-heritage-dark">
          Super Admin
        </h1>
        <p className="mt-1 text-sm text-heritage-brown">
          Vue d'ensemble de toutes les données de l'application.
        </p>
      </div>

      {/* ── Section 1 : Stats ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Globe} label="Environnements" value={stats?.environments ?? 0} loading={statsLoading} />
        <StatCard icon={Users} label="Utilisateurs" value={stats?.users ?? 0} loading={statsLoading} />
        <StatCard icon={UserCheck} label="Fiches personnes" value={stats?.people ?? 0} loading={statsLoading} />
      </div>

      {/* ── Section 2 : Environnements ────────────────────────────────────── */}
      <Card
        title="Environnements"
        action={
          <Button
            size="sm"
            icon={Plus}
            onClick={() => { setCreatedEnv(null); setCreateEnvOpen(true); }}
          >
            Créer un environnement
          </Button>
        }
      >
        {envsLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : environments.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="Aucun environnement"
            description="Créez votre premier environnement familial."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Famille</TableHead>
                <TableHead>Code d'accès</TableHead>
                <TableHead>Personnes</TableHead>
                <TableHead>Membres</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {environments.map((env) => (
                <TableRow key={env.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-heritage-dark">{env.name}</p>
                      {env.description && (
                        <p className="text-xs text-heritage-brown line-clamp-1">{env.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <code className="rounded bg-heritage-beige px-2 py-0.5 text-xs font-mono text-heritage-dark">
                        {env.access_code}
                      </code>
                      <button
                        onClick={() => copyCode(env.access_code, env.id)}
                        className="rounded p-1 text-heritage-brown hover:bg-heritage-beige hover:text-heritage-dark transition-colors"
                        title="Copier"
                      >
                        {copiedId === env.id ? (
                          <Check className="h-3.5 w-3.5 text-heritage-forest" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>{env.people_count}</TableCell>
                  <TableCell>{env.members_count}</TableCell>
                  <TableCell>{formatDate(env.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => setDeleteEnvTarget(env)}
                      className="rounded p-1.5 text-heritage-red/70 hover:bg-heritage-red/10 hover:text-heritage-red transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── Section 3 : Utilisateurs ──────────────────────────────────────── */}
      <Card title="Utilisateurs">
        {profilesLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : profiles.length === 0 ? (
          <EmptyState icon={Users} title="Aucun utilisateur" description="" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Environnement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={profile.avatar_url ?? undefined}
                        firstName={profile.full_name?.split(" ")[0]}
                        lastName={profile.full_name?.split(" ").slice(1).join(" ")}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium text-heritage-dark">
                          {profile.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-heritage-brown">{profile.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={profile.role} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-heritage-brown">
                      {profile.environment_name ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={profile.invitation_status} />
                      {profile.invitation_status === "pending" && (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() =>
                              updateProfile.mutate({ userId: profile.id, status: "approved" })
                            }
                            className="rounded px-2 py-0.5 text-xs bg-heritage-forest/10 text-heritage-forest hover:bg-heritage-forest/20 transition-colors"
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() =>
                              updateProfile.mutate({ userId: profile.id, status: "rejected" })
                            }
                            className="rounded px-2 py-0.5 text-xs bg-heritage-red/10 text-heritage-red hover:bg-heritage-red/20 transition-colors"
                          >
                            Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={profile.role}
                        onChange={(e) =>
                          updateProfile.mutate({ userId: profile.id, role: e.target.value as any })
                        }
                        options={[
                          { value: "super_admin", label: "Super Admin" },
                          { value: "family_admin", label: "Admin famille" },
                          { value: "editor", label: "Éditeur" },
                          { value: "guest", label: "Invité" },
                        ]}
                        className="w-36"
                      />
                      <button
                        onClick={() => setDeleteProfileTarget(profile.id)}
                        className="rounded p-1.5 text-heritage-red/70 hover:bg-heritage-red/10 hover:text-heritage-red transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── Section 4 : Logs d'audit ──────────────────────────────────────── */}
      <Card title="Logs d'audit (50 dernières actions)">
        {logsLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : logs.length === 0 ? (
          <EmptyState icon={Eye} title="Aucune action enregistrée" description="" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead className="text-right">Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <span className="text-xs text-heritage-brown whitespace-nowrap">
                      {formatDateTime(log.performed_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-heritage-dark">
                      {log.performer_name ?? log.performer_email ?? "Système"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={log.action} />
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-heritage-beige px-1.5 py-0.5 text-xs font-mono">
                      {log.table_name}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setAuditDetailLog(log)}
                        className="rounded px-2 py-1 text-xs text-heritage-forest hover:bg-heritage-forest/10 transition-colors"
                      >
                        Voir
                      </button>
                      {(log.action === "UPDATE" || log.action === "DELETE") && !!log.old_data && (
                        <button
                          onClick={() => setRestoreTarget(log)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-heritage-brown hover:bg-heritage-beige transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restaurer
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── Modal : Créer environnement ───────────────────────────────────── */}
      <Modal
        isOpen={createEnvOpen}
        onClose={() => { setCreateEnvOpen(false); setCreatedEnv(null); }}
        title="Créer un environnement"
        size="md"
      >
        {createdEnv ? (
          <div className="space-y-4">
            <p className="text-sm text-heritage-brown">
              L'environnement <strong className="text-heritage-dark">{createdEnv.name}</strong> a été créé avec succès.
            </p>
            <div className="rounded-lg border border-heritage-sand bg-heritage-cream p-4">
              <p className="mb-1 text-xs font-medium text-heritage-brown uppercase tracking-wide">Code d'accès invité</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-heritage-white px-3 py-2 text-xl font-mono font-semibold text-heritage-forest tracking-widest border border-heritage-sand">
                  {createdEnv.access_code}
                </code>
                <button
                  onClick={() => copyCode(createdEnv.access_code, "new")}
                  className="rounded-lg p-2 text-heritage-brown hover:bg-heritage-beige transition-colors"
                >
                  {copiedId === "new" ? <Check className="h-4 w-4 text-heritage-forest" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-heritage-brown">
                Partagez ce code pour permettre l'accès en lecture seule à la famille.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { setCreateEnvOpen(false); setCreatedEnv(null); }}>
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Nom de la famille"
              placeholder="Ex : Famille Dupont"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
            />
            <Input
              label="Description (optionnel)"
              placeholder="Une courte description..."
              value={newEnvDesc}
              onChange={(e) => setNewEnvDesc(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setCreateEnvOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleCreateEnv}
                loading={createEnv.isPending}
                disabled={!newEnvName.trim()}
              >
                Créer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal : Confirmer suppression environnement ───────────────────── */}
      <Modal
        isOpen={!!deleteEnvTarget}
        onClose={() => setDeleteEnvTarget(null)}
        title="Supprimer l'environnement"
        size="sm"
      >
        <p className="text-sm text-heritage-brown">
          Êtes-vous sûr de vouloir supprimer l'environnement{" "}
          <strong className="text-heritage-dark">{deleteEnvTarget?.name}</strong> ?
          Cette action est irréversible.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteEnvTarget(null)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleDeleteEnv} loading={deleteEnv.isPending}>
            Supprimer
          </Button>
        </div>
      </Modal>

      {/* ── Modal : Confirmer suppression utilisateur ─────────────────────── */}
      <Modal
        isOpen={!!deleteProfileTarget}
        onClose={() => setDeleteProfileTarget(null)}
        title="Supprimer l'utilisateur"
        size="sm"
      >
        <p className="text-sm text-heritage-brown">
          Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteProfileTarget(null)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleDeleteProfile} loading={deleteProfileMutation.isPending}>
            Supprimer
          </Button>
        </div>
      </Modal>

      {/* ── Modal : Détail log d'audit ────────────────────────────────────── */}
      <Modal
        isOpen={!!auditDetailLog}
        onClose={() => setAuditDetailLog(null)}
        title="Détail de l'action"
        size="lg"
      >
        {auditDetailLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-heritage-cream p-3">
                <p className="mb-1 text-xs font-medium text-heritage-brown uppercase">Table</p>
                <code className="font-mono text-heritage-dark">{auditDetailLog.table_name}</code>
              </div>
              <div className="rounded-lg bg-heritage-cream p-3">
                <p className="mb-1 text-xs font-medium text-heritage-brown uppercase">Action</p>
                <ActionBadge action={auditDetailLog.action} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-heritage-brown uppercase">Avant</p>
                <pre className="overflow-auto rounded-lg bg-heritage-dark p-3 text-xs text-heritage-cream max-h-64">
                  {auditDetailLog.old_data
                    ? JSON.stringify(auditDetailLog.old_data, null, 2)
                    : "—"}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-heritage-brown uppercase">Après</p>
                <pre className="overflow-auto rounded-lg bg-heritage-dark p-3 text-xs text-heritage-cream max-h-64">
                  {auditDetailLog.new_data
                    ? JSON.stringify(auditDetailLog.new_data, null, 2)
                    : "—"}
                </pre>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {(auditDetailLog.action === "UPDATE" || auditDetailLog.action === "DELETE") &&
                !!auditDetailLog.old_data && (
                  <Button
                    variant="secondary"
                    icon={RotateCcw}
                    onClick={() => { setAuditDetailLog(null); setRestoreTarget(auditDetailLog); }}
                  >
                    Restaurer
                  </Button>
                )}
              <Button onClick={() => setAuditDetailLog(null)}>Fermer</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal : Confirmer restauration ────────────────────────────────── */}
      <Modal
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        title="Confirmer la restauration"
        size="sm"
      >
        <p className="text-sm text-heritage-brown">
          Voulez-vous restaurer les données de la table{" "}
          <strong className="text-heritage-dark">{restoreTarget?.table_name}</strong> à leur état
          avant cette action ? La modification actuelle sera écrasée.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRestoreTarget(null)}>
            Annuler
          </Button>
          <Button
            icon={RotateCcw}
            onClick={handleRestore}
            loading={restoreLog.isPending}
          >
            Restaurer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
