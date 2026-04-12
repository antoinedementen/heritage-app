"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TreeDeciduous, Users, MapPin, Image as ImageIcon,
  Calendar, GitBranch, ArrowRight, Lock, Globe, Star,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-heritage-sand bg-heritage-white p-5 shadow-[0_2px_12px_rgba(74,55,40,0.05)]">
      <div className="h-10 w-10 rounded-xl bg-heritage-forest/10 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-heritage-forest" />
      </div>
      <h3 className="font-semibold text-heritage-dark mb-1">{title}</h3>
      <p className="text-sm text-heritage-brown leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    setLoading(true);
    try {
      router.push(`/invite/${code.trim().toUpperCase()}`);
    } catch {
      setError("Code invalide. Vérifiez le code et réessayez.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-heritage-cream flex flex-col">
      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-heritage-sand/60 bg-heritage-cream/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-serif text-xl font-semibold text-heritage-forest">Heritage</span>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Connexion</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Créer un compte</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-20 sm:py-28 text-center">
          {/* Decorative line */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-heritage-gold/60" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-heritage-brown/60">Généalogie</span>
            <div className="h-px w-12 bg-heritage-gold/60" />
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-semibold text-heritage-dark leading-[1.1] tracking-tight">
            L&apos;histoire de votre{" "}
            <span className="text-heritage-forest italic">famille</span>,
            <br />
            préservée.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-heritage-brown max-w-2xl mx-auto leading-relaxed">
            Heritage vous permet de construire, enrichir et partager votre arbre généalogique
            en famille — avec photos, événements, lieux et documents.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="min-w-[180px]">
                Commencer gratuitement
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="min-w-[180px]">
                Se connecter
              </Button>
            </Link>
          </div>

          {/* Join with code */}
          <div className="mt-8 inline-block">
            <form
              onSubmit={handleJoin}
              className="flex items-center gap-2 rounded-2xl border border-heritage-sand bg-heritage-white px-4 py-3 shadow-sm"
            >
              <Lock className="h-4 w-4 text-heritage-brown/50 shrink-0" />
              <input
                className="w-36 sm:w-48 bg-transparent text-sm font-mono tracking-widest text-heritage-dark placeholder:text-heritage-brown/40 outline-none"
                placeholder="Code d'accès"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={12}
              />
              <Button type="submit" size="sm" loading={loading} disabled={!code.trim()}>
                Rejoindre
              </Button>
            </form>
            {error && <p className="mt-1.5 text-xs text-heritage-red text-center">{error}</p>}
            <p className="mt-2 text-xs text-heritage-brown/50 text-center">
              Invité(e) par un membre ? Entrez votre code d&apos;accès.
            </p>
          </div>
        </section>

        {/* ── Features grid ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="font-serif text-3xl font-semibold text-heritage-dark text-center mb-10">
            Tout ce dont vous avez besoin
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={TreeDeciduous}
              title="Arbre interactif"
              desc="Visualisez votre généalogie en arbre interactif, naviguez entre générations et trouvez vos ancêtres."
            />
            <FeatureCard
              icon={Users}
              title="Fiches personnages"
              desc="Créez des fiches détaillées : dates, lieux, profession, biographie et photos."
            />
            <FeatureCard
              icon={MapPin}
              title="Carte des lieux"
              desc="Retrouvez tous les lieux importants de votre famille — naissances, mariages, décès."
            />
            <FeatureCard
              icon={Calendar}
              title="Chronologie d'événements"
              desc="Suivez mariages, naissances, migrations et autres moments clés sur une frise chronologique."
            />
            <FeatureCard
              icon={ImageIcon}
              title="Médiathèque"
              desc="Photos, vidéos et documents de famille classés et accessibles à tous les membres."
            />
            <FeatureCard
              icon={GitBranch}
              title="Calculateur de parenté"
              desc="Découvrez instantanément le lien de parenté entre deux membres de l'arbre."
            />
          </div>
        </section>

        {/* ── Privacy callout ───────────────────────────────────────────── */}
        <section className="bg-heritage-forest text-white">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center">
            <Globe className="h-10 w-10 mx-auto mb-4 opacity-80" />
            <h2 className="font-serif text-3xl font-semibold mb-3">Privé par défaut</h2>
            <p className="text-white/70 max-w-xl mx-auto leading-relaxed">
              Chaque espace est protégé par un code d&apos;accès. Seules les personnes que vous invitez
              peuvent consulter ou modifier votre arbre généalogique.
            </p>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-2xl px-4 py-20 text-center">
          <Star className="h-8 w-8 text-heritage-gold mx-auto mb-4 opacity-80" />
          <h2 className="font-serif text-4xl font-semibold text-heritage-dark mb-4">
            Commencez dès aujourd&apos;hui
          </h2>
          <p className="text-heritage-brown mb-8">
            Créez votre espace familial en moins d&apos;une minute.
          </p>
          <Link href="/register">
            <Button size="lg">
              Créer mon espace famille
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-heritage-sand px-4 py-6 text-center text-xs text-heritage-brown/50">
        <div className="flex items-center justify-center gap-1">
          <span className="font-serif text-sm text-heritage-brown/70 font-semibold">Heritage</span>
          <span>— Votre histoire familiale, préservée.</span>
        </div>
      </footer>
    </div>
  );
}
