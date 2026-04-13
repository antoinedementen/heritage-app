"use client";

import { redirect, useParams } from "next/navigation";
import { useState } from "react";
import {
  Settings, Users, Mail, Trash2, Check, ChevronLeft,
  UserCheck, UserX, Shield, Copy, Save,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEnvironment, useUpdateEnvironment } from "@/hooks/useEnvironments";
import { useEnvironments } from "@/hooks/useEnvironments";
import { useProfilesByEnv, useUpdateProfileFull, useDeleteProfile } from "@/hooks/useProfiles";
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
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/Table";
import type { ProfileWithEnvironment, ProfileRole, InvitationStatus } from "@/lib/supabase/queries/profiles";
import Link from "next/link";

// ── Badges ────────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "info" | "neutral" }> = {
    super_admin:  { label: "Super Admin",    variant: "warning" },
    family_admin: { label: "Admin famille",  variant: "success" },
    editor:       { label: "Éditeur",        variant: "info" },
    guest:        { label: "Invité",         variant: "neutral" },
  };
  const { label, variant } = map[role] ?? { label: role, variant: "neutral" };
  return <Badge variant={variant}>{label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
    approved: { label: "Approuvé",    variant: "success" },
    pending:  { label: "En attente", variant: "warning" },
    rejected: { label: "Refusé",     variant: "danger" },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "neutral" };
  return <Badge variant={variant}>{label}</Badge>;
}

// ── Edit user modal ───────────────────────────────────────────────────────────
function EditUserModal({
  profile,
  environments,
  onClose,
  onSave,
  saving,
}: {
  profile: ProfileWithEnvironment;
  environments: { id: string; name: string }[];
  onClose: () => void;
  onSave: (data: {
    full_name: string;
    email: string;
    role: ProfileRole;
    invitation_status: InvitationStatus;
    environment_id: string | null;
  }) => void;
  saving: boolean;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [role, setRole] = useState<ProfileRole>(profile.role);
  const [status, setStatus] = useState<InvitationStatus>(profile.invitation_status);
  const [envId, setEnvId] = useState<string>(profile.environment_id ?? "");

  return (
    <Modal isOpen onClose={onClose} title="Modifier l'utilisateur" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nom complet"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Rôle"
            value={role}
            onChange={(e) => setRole(e.target.value as ProfileRole)}
            options={[
              { value: "super_admin",  label: "Super Admin" },
              { value: "family_admin", label: "Admin famille" },
              { value: "editor",       label: "Éditeur" },
              { value: "guest",        label: "Invité" },
            ]}
          />
          <Select
            label="Statut"
            value={status}
            onChange={(e) => setStatus(e.target.value as InvitationStatus)}
            options={[
              { value: "approved", label: "Approuvé" },
              { value: "pending",  label: "En attente" },
              { value: "rejected", label: "Refusé" },
            ]}
          />
        </div>
        <Select
          label="Environnement"
          value={envId}
          onChange={(e) => setEnvId(e.target.value)}
          options={[
            { value: "", label: "— Aucun —" },
            ...environments.map((e) => ({ value: e.id, label: e.name })),
          ]}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button
            icon={Save}
            loading={saving}
            onClick={() =>
              onSave({
                full_name: fullName,
                email,
                role,
                invitation_status: status,
                environment_id: envId || null,
              })
            }
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EnvironmentAdminPage() {
  const params = useParams();
  const adminEnvId = params?.envId as string;
  const { role, isLoading: authLoading } = useAuth();
  const toast = useToast();

  if (!authLoading && role !== "super_admin") redirect("/");

  const { data: env, isLoading: envLoading } = useEnvironment(adminEnvId);
  const { data: allEnvs = [] } = useEnvironments();
  const { data: members = [], isLoading: membersLoading } = useProfilesByEnv(adminEnvId);
  const updateEnv = useUpdateEnvironment();
  const updateProfileFull = useUpdateProfileFull();
  const deleteProfileMutation = useDeleteProfile();

  // Env settings form
  const [envName, setEnvName] = useState("");
  const [envDesc, setEnvDesc] = useState("");
  const [envEditing, setEnvEditing] = useState(false);
  function startEditEnv() {
    setEnvName(env?.name ?? "");
    setEnvDesc(env?.description ?? "");
    setEnvEditing(true);
  }

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"family_admin" | "editor">("family_admin");
  const [inviting, setInviting] = useState(false);

  // Edit user modal
  const [editUser, setEditUser] = useState<ProfileWithEnvironment | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Copy code
  const [copied, setCopied] = useState(false);
  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveEnv() {
    if (!envName.trim()) return;
    try {
      await updateEnv.mutateAsync({ id: adminEnvId, name: envName.trim(), description: envDesc.trim() || undefined });
      toast.success("Environnement mis à jour.");
      setEnvEditing(false);
    } catch {
      toast.error("Impossible de mettre à jour l'environnement.");
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), envId: adminEnvId, role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Invitation envoyée à ${inviteEmail.trim()}`);
      setInviteEmail("");
      setInviteOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur d'invitation.");
    } finally {
      setInviting(false);
    }
  }

  async function handleSaveUser(data: {
    full_name: string;
    email: string;
    role: ProfileRole;
    invitation_status: InvitationStatus;
    environment_id: string | null;
  }) {
    if (!editUser) return;
    try {
      await updateProfileFull.mutateAsync({ userId: editUser.id, ...data });
      toast.success("Utilisateur mis à jour.");
      setEditUser(null);
    } catch {
      toast.error("Impossible de mettre à jour l'utilisateur.");
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    try {
      await deleteProfileMutation.mutateAsync(deleteTarget);
      toast.success("Utilisateur supprimé.");
      setDeleteTarget(null);
    } catch {
      toast.error("Impossible de supprimer l'utilisateur.");
    }
  }

  if (authLoading || envLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!env) {
    return <EmptyState icon={Settings} title="Environnement introuvable" description="" />;
  }

  const admins = members.filter((m) => m.role === "family_admin" || m.role === "super_admin");
  const otherMembers = members.filter((m) => m.role !== "family_admin" && m.role !== "super_admin");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-heritage-brown hover:text-heritage-dark transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour Super Admin
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-heritage-dark">
              {env.name}
            </h1>
            {env.description && (
              <p className="mt-1 text-sm text-heritage-brown">{env.description}</p>
            )}
          </div>
          <Button variant="secondary" icon={Settings} onClick={startEditEnv}>
            Modifier
          </Button>
        </div>
      </div>

      {/* ── Section 1 : Paramètres de l'environnement ────────────────────── */}
      <Card title="Paramètres de l'environnement">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-heritage-sand bg-heritage-cream p-4">
            <p className="mb-1 text-xs font-medium text-heritage-brown uppercase tracking-wide">Nom</p>
            <p className="text-heritage-dark font-medium">{env.name}</p>
          </div>
          <div className="rounded-lg border border-heritage-sand bg-heritage-cream p-4">
            <p className="mb-1 text-xs font-medium text-heritage-brown uppercase tracking-wide">Description</p>
            <p className="text-heritage-dark">{env.description || <span className="text-heritage-brown/50 italic">Aucune</span>}</p>
          </div>
          <div className="rounded-lg border border-heritage-sand bg-heritage-cream p-4 sm:col-span-2">
            <p className="mb-2 text-xs font-medium text-heritage-brown uppercase tracking-wide">Code d'accès</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-heritage-white px-3 py-2 text-lg font-mono font-semibold text-heritage-forest tracking-widest border border-heritage-sand">
                {env.access_code}
              </code>
              <button
                onClick={() => copyCode(env.access_code)}
                className="rounded-lg p-2 text-heritage-brown hover:bg-heritage-beige transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-heritage-forest" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Section 2 : Administrateurs ──────────────────────────────────── */}
      <Card
        title="Administrateurs"
        action={
          <Button size="sm" icon={Mail} onClick={() => setInviteOpen(true)}>
            Inviter un admin
          </Button>
        }
      >
        {membersLoading ? (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        ) : admins.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="Aucun administrateur"
            description="Invitez un administrateur pour gérer cet espace famille."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={m.avatar_url ?? undefined}
                        firstName={m.full_name?.split(" ")[0]}
                        lastName={m.full_name?.split(" ").slice(1).join(" ")}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium text-heritage-dark">{m.full_name ?? "—"}</p>
                        <p className="text-xs text-heritage-brown">{m.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><RoleBadge role={m.role} /></TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={m.invitation_status} />
                      {m.invitation_status === "pending" && (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => updateProfileFull.mutate({ userId: m.id, invitation_status: "approved" })}
                            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-heritage-forest/10 text-heritage-forest hover:bg-heritage-forest/20 transition-colors"
                          >
                            <UserCheck className="h-3 w-3" /> Approuver
                          </button>
                          <button
                            onClick={() => updateProfileFull.mutate({ userId: m.id, invitation_status: "rejected" })}
                            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-heritage-red/10 text-heritage-red hover:bg-heritage-red/20 transition-colors"
                          >
                            <UserX className="h-3 w-3" /> Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditUser(m)}>Modifier</Button>
                      <button
                        onClick={() => setDeleteTarget(m.id)}
                        className="rounded p-1.5 text-heritage-red/70 hover:bg-heritage-red/10 hover:text-heritage-red transition-colors"
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

      {/* ── Section 3 : Membres ──────────────────────────────────────────── */}
      <Card
        title="Membres"
        action={
          <Button size="sm" icon={Mail} variant="secondary" onClick={() => { setInviteRole("editor"); setInviteOpen(true); }}>
            Inviter un membre
          </Button>
        }
      >
        {membersLoading ? (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        ) : otherMembers.length === 0 ? (
          <EmptyState icon={Users} title="Aucun membre" description="Invitez des membres pour accéder à cet espace famille." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {otherMembers.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={m.avatar_url ?? undefined}
                        firstName={m.full_name?.split(" ")[0]}
                        lastName={m.full_name?.split(" ").slice(1).join(" ")}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium text-heritage-dark">{m.full_name ?? "—"}</p>
                        <p className="text-xs text-heritage-brown">{m.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><RoleBadge role={m.role} /></TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={m.invitation_status} />
                      {m.invitation_status === "pending" && (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => updateProfileFull.mutate({ userId: m.id, invitation_status: "approved" })}
                            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-heritage-forest/10 text-heritage-forest hover:bg-heritage-forest/20 transition-colors"
                          >
                            <UserCheck className="h-3 w-3" /> Approuver
                          </button>
                          <button
                            onClick={() => updateProfileFull.mutate({ userId: m.id, invitation_status: "rejected" })}
                            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-heritage-red/10 text-heritage-red hover:bg-heritage-red/20 transition-colors"
                          >
                            <UserX className="h-3 w-3" /> Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditUser(m)}>Modifier</Button>
                      <button
                        onClick={() => setDeleteTarget(m.id)}
                        className="rounded p-1.5 text-heritage-red/70 hover:bg-heritage-red/10 hover:text-heritage-red transition-colors"
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

      {/* ── Modal : Modifier environnement ───────────────────────────────── */}
      <Modal isOpen={envEditing} onClose={() => setEnvEditing(false)} title="Modifier l'environnement" size="md">
        <div className="space-y-4">
          <Input label="Nom de la famille" value={envName} onChange={(e) => setEnvName(e.target.value)} />
          <Input label="Description" value={envDesc} onChange={(e) => setEnvDesc(e.target.value)} placeholder="Optionnel…" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEnvEditing(false)}>Annuler</Button>
            <Button icon={Save} loading={updateEnv.isPending} onClick={handleSaveEnv} disabled={!envName.trim()}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal : Inviter ───────────────────────────────────────────────── */}
      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} title="Inviter un utilisateur" size="sm">
        <div className="space-y-4">
          <Input
            label="Adresse email"
            type="email"
            placeholder="prenom@exemple.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Select
            label="Rôle"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "family_admin" | "editor")}
            options={[
              { value: "family_admin", label: "Admin famille" },
              { value: "editor",       label: "Éditeur" },
              { value: "guest",        label: "Invité" },
            ]}
          />
          <p className="text-xs text-heritage-brown bg-heritage-cream rounded-lg px-3 py-2 border border-heritage-sand">
            Un email d'invitation sera envoyé. L'utilisateur apparaîtra en statut <strong>En attente</strong> jusqu'à ce qu'il accepte.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Annuler</Button>
            <Button icon={Mail} loading={inviting} onClick={handleInvite} disabled={!inviteEmail.trim()}>
              Envoyer l'invitation
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal : Modifier utilisateur ─────────────────────────────────── */}
      {editUser && (
        <EditUserModal
          profile={editUser}
          environments={allEnvs.map((e) => ({ id: e.id, name: e.name }))}
          onClose={() => setEditUser(null)}
          onSave={handleSaveUser}
          saving={updateProfileFull.isPending}
        />
      )}

      {/* ── Modal : Confirmer suppression ────────────────────────────────── */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Supprimer l'utilisateur" size="sm">
        <p className="text-sm text-heritage-brown">
          Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button variant="danger" onClick={handleDeleteUser} loading={deleteProfileMutation.isPending}>
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
