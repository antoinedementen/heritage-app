"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { createGuestProfile, verifyAccessCode } from "./actions";

export default function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: urlCode } = use(params);
  const router = useRouter();

  // "_" est le marqueur pour "pas de code dans l'URL" (vient de /invite)
  const hasRealCode = urlCode && urlCode !== "_";

  type Step = "verifying" | "welcome" | "form" | "joining";

  const [step, setStep] = useState<Step>(hasRealCode ? "verifying" : "form");
  const [code, setCode] = useState(hasRealCode ? urlCode : "");
  const [envName, setEnvName] = useState("");
  const [envId, setEnvId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasRealCode) {
      verify(urlCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(codeToCheck: string) {
    setError(null);
    setLoading(true);
    const result = await verifyAccessCode(codeToCheck);
    setLoading(false);

    if (result.success && result.environment) {
      setEnvId(result.environment.id);
      setEnvName(result.environment.name);
      setStep("welcome");
    } else {
      setError(result.error ?? "Code invalide.");
      setStep("form");
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    await verify(code);
  }

  async function handleJoin() {
    setStep("joining");
    setLoading(true);

    // Import lazy : n'appelle createClient que dans le navigateur
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { data, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError || !data.user) {
      setError("Impossible de créer une session. Réessayez.");
      setStep("welcome");
      setLoading(false);
      return;
    }

    const { error: profileError } = await createGuestProfile(data.user.id, envId);
    if (profileError) {
      setError("Erreur lors de la création du profil.");
      setStep("welcome");
      setLoading(false);
      return;
    }

    router.push(`/${envId}`);
  }

  if (step === "verifying") {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-heritage-sand border-t-heritage-forest" />
          <p className="text-sm text-heritage-brown">Vérification du code…</p>
        </div>
      </AuthShell>
    );
  }

  if (step === "welcome" || step === "joining") {
    return (
      <AuthShell>
        <div className="flex flex-col gap-5">
          <div className="rounded-xl bg-heritage-beige px-4 py-3 text-sm text-heritage-dark">
            <p className="text-xs font-medium uppercase tracking-wide text-heritage-brown mb-1">
              Espace famille
            </p>
            <p className="font-serif text-lg font-semibold">{envName}</p>
          </div>
          <p className="text-sm text-heritage-brown">
            Vous allez accéder à cet espace en mode{" "}
            <span className="font-medium text-heritage-dark">lecture seule</span>.
            Vous pourrez consulter l&apos;arbre généalogique et les fiches.
          </p>
          {error && (
            <p className="rounded-lg bg-heritage-red/10 px-3 py-2 text-sm text-heritage-red">
              {error}
            </p>
          )}
          <Button
            size="lg"
            className="w-full"
            loading={loading || step === "joining"}
            onClick={handleJoin}
          >
            Rejoindre en tant qu&apos;invité
          </Button>
          <button
            onClick={() => { setStep("form"); setError(null); }}
            className="text-sm text-heritage-brown hover:text-heritage-dark text-center"
          >
            Utiliser un autre code
          </button>
        </div>
      </AuthShell>
    );
  }

  // Formulaire de saisie du code
  return (
    <AuthShell>
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-heritage-brown">
          Entrez le code d&apos;accès partagé par votre famille pour consulter
          l&apos;arbre généalogique.
        </p>
        <Input
          label="Code d'accès"
          type="text"
          placeholder="Ex : QMFMV"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={5}
          required
          className="tracking-widest text-center text-lg font-mono uppercase"
          error={error ?? undefined}
        />
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Accéder
        </Button>
        <div className="text-center text-sm text-heritage-brown">
          Vous avez un compte ?{" "}
          <a
            href="/login"
            className="font-medium text-heritage-forest hover:underline"
          >
            Se connecter
          </a>
        </div>
      </form>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-heritage-cream px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-semibold text-heritage-forest">
            Heritage
          </h1>
          <p className="mt-2 font-sans text-sm text-heritage-brown">
            Accès invité
          </p>
        </div>
        <div className="rounded-2xl bg-heritage-white p-8 shadow-[0_4px_24px_rgba(74,55,40,0.08)] border border-heritage-sand/40">
          <h2 className="mb-6 font-serif text-2xl font-semibold text-heritage-dark">
            Rejoindre un espace famille
          </h2>
          {children}
        </div>
      </div>
    </div>
  );
}
