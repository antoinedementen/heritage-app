"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users, Link2, MapPin, Calendar, Copy, Check, Settings,
  UserPlus, Clock, TreePine, AlertTriangle, ChevronRight, Mail,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useEnvironment,
  usePeopleStats,
  useRecentActivity,
  useCompleteness,
  useDuplicates,
  useEnvironmentMembers,
  useApproveMember,
  useUpdateMemberRole,
  useInviteMember,
} from "@/hooks/useFamily";
import { useToast } from "@/hooks/useToast";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatAuditAction, formatRelativeDate } from "@/lib/utils/audit";
import type { DuplicatePair } from "@/lib/supabase/queries/family";

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  href,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  href?: string;
  loading: boolean;
}) {
  const inner = (
    <div className="flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-heritage-forest/10">
        <Icon className="h-5 w-5 text-heritage-forest" />
      </div>
      <div>
        <p className="text-xs text-heritage-brown">{label}</p>
        {loading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <p className="font-serif text-2xl font-semibold text-heritage-dark">{value}</p>
        )}
      </div>
      {href && (
        <ChevronRight className="ml-auto h-4 w-4 text-heritage-sand shrink-0" />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href}>
        <Card hoverable>{inner}</Card>
      </Link>
    );
  }
  return <Card>{inner}</Card>;
}

// ─── Completeness bar ─────────────────────────────────────────────────────────
function CompletenessBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-heritage-forest" : pct >= 50 ? "bg-heritage-gold" : "bg-heritage-red";
  return (
    <div className="h-2 w-full rounded-full bg-heritage-beige overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FamilyDashboardPage({
  params,
}: {
  params: Promise<{ envId: string }>;
}) {
  const { envId } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { role, isGuest, isLoading: authLoading } = useAuth();

  // Data hooks
  const { data: env, isLoading: envLoading } = useEnvironment(envId);
  const { data: stats, isLoading: statsLoading } = usePeopleStats(envId);
  const { data: activity = [], isLoading: activityLoading } = useRecentActivity(envId);
  const { data: completeness, isLoading: completenessLoading } = useCompleteness(envId);
  const { data: allDuplicates = [] } = useDuplicates(envId);
  const { data: members = [], isLoading: membersLoading } = useEnvironmentMembers(envId);

  // Mutations
  const approveMember = useApproveMember();
  const updateRole = useUpdateMemberRole();
  const inviteMember = useInviteMember(envId);

  // Locally ignored duplicate pairs (stored in localStorage)
  const [ignoredPairs, setIgnoredPairs] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(`ignored-duplicates-${envId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Sync ignored pairs to localStorage
  useEffect(() => {
    localStorage.setItem(
      `ignored-duplicates-${envId}`,
      JSON.stringify([...ignoredPairs])
    );
  }, [ignoredPairs, envId]);

  function pairKey(pair: DuplicatePair) {
    const ids = [pair.a.id, pair.b.id].sort();
    return ids.join("|");
  }

  const visibleDuplicates = allDuplicates.filter((p) => !ignoredPairs.has(pairKey(p)));

  function ignorePair(pair: DuplicatePair) {
    setIgnoredPairs((prev) => new Set([...prev, pairKey(pair)]));
  }

  // Copy invite link
  const [copied, setCopied] = useState(false);
  function copyInviteLink() {
    if (!env) return;
    const url = `${window.location.origin}/invite/${env.access_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    try {
      await inviteMember.mutateAsync(inviteEmail.trim());
      toast.success(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail("");
      setInviteOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast.error(msg);
    }
  }

  const isAdmin = role === "family_admin" || role === "super_admin";

  if (authLoading || envLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Guest banner ──────────────────────────────────────────────────── */}
      {isGuest && (
        <div className="flex items-center gap-2 rounded-lg border border-heritage-sand bg-heritage-beige/60 px-4 py-2.5 text-sm text-heritage-brown">
          <span className="h-2 w-2 rounded-full bg-heritage-gold shrink-0" />
          Vous consultez cet arbre en mode lecture seule.
        </div>
      )}

      {/* ── Section 1 : En-tête ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-heritage-dark">
            {env?.name ?? "Chargement…"}
          </h1>
          {env?.description && (
            <p className="mt-1 text-heritage-brown">{env.description}</p>
          )}
          {env && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-heritage-brown">Lien d'accès invité :</span>
              <code className="rounded bg-heritage-beige px-2 py-0.5 text-sm font-mono text-heritage-dark">
                {env.access_code}
              </code>
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-heritage-forest hover:bg-heritage-forest/10 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copié !" : "Copier le lien"}
              </button>
            </div>
          )}
        </div>
        {isAdmin && (
          <Link href={`/${envId}/settings`}>
            <Button variant="secondary" size="sm" icon={Settings}>
              Paramètres
            </Button>
          </Link>
        )}
      </div>

      {/* ── Section 2 : Statistiques ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Personnes"
          value={stats?.people ?? 0}
          href={`/${envId}/people`}
          loading={statsLoading}
        />
        <StatCard
          icon={Link2}
          label="Relations"
          value={stats?.relationships ?? 0}
          loading={statsLoading}
        />
        <StatCard
          icon={MapPin}
          label="Lieux"
          value={stats?.places ?? 0}
          loading={statsLoading}
        />
        <StatCard
          icon={Calendar}
          label="Événements"
          value={stats?.events ?? 0}
          loading={statsLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Section 3 : Activité récente ────────────────────────────────── */}
        <Card title="Dernières modifications">
          {activityLoading ? (
            <div className="flex justify-center py-6"><LoadingSpinner /></div>
          ) : activity.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Aucune activité"
              description="Les modifications apparaîtront ici."
            />
          ) : (
            <ul className="space-y-4">
              {activity.map((log) => (
                <li key={log.id} className="flex items-start gap-3">
                  <Avatar
                    src={log.performer_avatar}
                    firstName={log.performer_name?.split(" ")[0]}
                    lastName={log.performer_name?.split(" ").slice(1).join(" ")}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-heritage-dark leading-snug">
                      {formatAuditAction(log)}
                    </p>
                    <p className="text-xs text-heritage-brown mt-0.5">
                      {formatRelativeDate(log.performed_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ── Section 4 : Complétude ────────────────────────────────────────── */}
        <Card title="Complétude des fiches">
          {completenessLoading ? (
            <div className="flex justify-center py-6"><LoadingSpinner /></div>
          ) : !completeness || completeness.total === 0 ? (
            <EmptyState
              icon={TreePine}
              title="Aucune fiche"
              description="Commencez par ajouter des personnes."
            />
          ) : (
            <div className="space-y-4">
              {/* Progress */}
              <div>
                <div className="mb-2 flex items-end justify-between">
                  <span className="text-2xl font-serif font-semibold text-heritage-dark">
                    {completeness.percentage}%
                  </span>
                  <span className="text-xs text-heritage-brown">
                    {completeness.complete} / {completeness.total} fiches complètes
                  </span>
                </div>
                <CompletenessBar pct={completeness.percentage} />
                <p className="mt-1.5 text-xs text-heritage-brown">
                  {completeness.percentage >= 80
                    ? "Excellent travail ! L'arbre est bien renseigné."
                    : completeness.percentage >= 50
                    ? "Bonne progression, quelques fiches méritent d'être enrichies."
                    : "De nombreuses fiches sont incomplètes — enrichissons l'arbre !"}
                </p>
              </div>

              {/* Most missing fields */}
              {Object.keys(completeness.missingFieldsFrequency).length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-heritage-brown uppercase tracking-wide">
                    Champs les plus manquants
                  </p>
                  <ul className="space-y-1">
                    {Object.entries(completeness.missingFieldsFrequency)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 4)
                      .map(([field, count]) => (
                        <li key={field} className="flex items-center justify-between text-sm">
                          <span className="text-heritage-dark">{field}</span>
                          <Badge variant="neutral">{count} fiche{count > 1 ? "s" : ""}</Badge>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              {completeness.incomplete > 0 && !isGuest && (
                <Link href={`/${envId}/people?filter=incomplete`}>
                  <Button variant="secondary" size="sm" fullWidth>
                    Voir les {completeness.incomplete} fiches incomplètes
                  </Button>
                </Link>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── Section 5 : Doublons potentiels ─────────────────────────────────── */}
      {visibleDuplicates.length > 0 && (
        <Card title={`Doublons potentiels détectés (${visibleDuplicates.length})`}>
          <p className="mb-4 text-sm text-heritage-brown">
            Ces paires de personnes partagent au moins 2 critères identiques (nom, prénom, date de naissance).
            Vérifiez s'il s'agit de doublons.
          </p>
          <div className="space-y-4">
            {visibleDuplicates.map((pair) => (
              <div
                key={pairKey(pair)}
                className="flex flex-col gap-3 rounded-lg border border-heritage-sand/60 bg-heritage-cream p-4 sm:flex-row sm:items-center"
              >
                {/* Person A */}
                <div className="flex-1 rounded-lg bg-heritage-white p-3 text-sm">
                  <p className="font-medium text-heritage-dark">
                    {pair.a.first_name} {pair.a.last_name}
                  </p>
                  {pair.a.birth_date && (
                    <p className="text-xs text-heritage-brown">Né(e) le {pair.a.birth_date}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-heritage-gold" />
                </div>

                {/* Person B */}
                <div className="flex-1 rounded-lg bg-heritage-white p-3 text-sm">
                  <p className="font-medium text-heritage-dark">
                    {pair.b.first_name} {pair.b.last_name}
                  </p>
                  {pair.b.birth_date && (
                    <p className="text-xs text-heritage-brown">Né(e) le {pair.b.birth_date}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <button
                    onClick={() => ignorePair(pair)}
                    className="rounded px-2 py-1 text-xs text-heritage-brown hover:bg-heritage-beige transition-colors"
                  >
                    Personnes différentes
                  </button>
                  {!isGuest && (
                    <Link
                      href={`/${envId}/people?edit=${pair.a.id}`}
                      className="rounded px-2 py-1 text-xs text-heritage-forest hover:bg-heritage-forest/10 transition-colors"
                    >
                      Éditer la fiche
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Section 6 : Membres (admins seulement) ───────────────────────────── */}
      {isAdmin && (
        <Card
          title="Membres de l'environnement"
          action={
            <Button size="sm" icon={UserPlus} onClick={() => setInviteOpen(true)}>
              Inviter un éditeur
            </Button>
          }
        >
          {membersLoading ? (
            <div className="flex justify-center py-6"><LoadingSpinner /></div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun membre"
              description="Invitez des éditeurs pour enrichir l'arbre."
            />
          ) : (
            <ul className="divide-y divide-heritage-sand/30">
              {members.map((member) => (
                <li key={member.id} className="flex items-center gap-3 py-3">
                  <Avatar
                    src={member.avatar_url}
                    firstName={member.full_name?.split(" ")[0]}
                    lastName={member.full_name?.split(" ").slice(1).join(" ")}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-heritage-dark truncate">
                      {member.full_name ?? "—"}
                    </p>
                    <p className="text-xs text-heritage-brown truncate">{member.email}</p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 shrink-0">
                    {member.invitation_status === "pending" ? (
                      <>
                        <button
                          onClick={() => approveMember.mutate({ userId: member.id, status: "approved" })}
                          className="rounded px-2 py-0.5 text-xs bg-heritage-forest/10 text-heritage-forest hover:bg-heritage-forest/20 transition-colors"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() => approveMember.mutate({ userId: member.id, status: "rejected" })}
                          className="rounded px-2 py-0.5 text-xs bg-heritage-red/10 text-heritage-red hover:bg-heritage-red/20 transition-colors"
                        >
                          Refuser
                        </button>
                      </>
                    ) : (
                      <Select
                        value={member.role}
                        onChange={(e) =>
                          updateRole.mutate({ userId: member.id, role: e.target.value as any })
                        }
                        options={[
                          { value: "family_admin", label: "Admin" },
                          { value: "editor", label: "Éditeur" },
                          { value: "guest", label: "Invité" },
                        ]}
                        className="w-28"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* ── Modal : Inviter un éditeur ────────────────────────────────────────── */}
      <Modal
        isOpen={inviteOpen}
        onClose={() => { setInviteOpen(false); setInviteEmail(""); }}
        title="Inviter un éditeur"
        size="sm"
      >
        <p className="mb-4 text-sm text-heritage-brown">
          Un email d'invitation sera envoyé à l'adresse indiquée. L'utilisateur devra créer un compte pour accéder à l'arbre.
        </p>
        <Input
          label="Adresse email"
          type="email"
          icon={Mail}
          placeholder="prenom.nom@exemple.fr"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleInvite()}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setInviteOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleInvite}
            loading={inviteMember.isPending}
            disabled={!inviteEmail.trim()}
          >
            Envoyer l'invitation
          </Button>
        </div>
      </Modal>
    </div>
  );
}
