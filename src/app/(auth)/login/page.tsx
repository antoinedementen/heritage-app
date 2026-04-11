"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Import lazy : n'appelle createClient que dans le navigateur
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      { email, password }
    );

    if (signInError || !data.user) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, environment_id, invitation_status")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "super_admin") {
      router.push("/admin");
    } else if (
      profile?.environment_id &&
      (profile?.invitation_status === "approved" || profile?.role === "guest")
    ) {
      router.push(`/${profile.environment_id}`);
    } else {
      router.push("/pending");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-heritage-cream px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-semibold text-heritage-forest">
            Heritage
          </h1>
          <p className="mt-2 font-sans text-sm text-heritage-brown">
            Préservez et partagez l&apos;histoire de votre famille
          </p>
        </div>

        <div className="rounded-2xl bg-heritage-white p-8 shadow-[0_4px_24px_rgba(74,55,40,0.08)] border border-heritage-sand/40">
          <h2 className="mb-6 font-serif text-2xl font-semibold text-heritage-dark">
            Connexion
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Adresse email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="rounded-lg bg-heritage-red/10 px-3 py-2 text-sm text-heritage-red">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Se connecter
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-3 border-t border-heritage-sand pt-6 text-center text-sm">
            <p className="text-heritage-brown">
              Pas encore de compte ?{" "}
              <Link
                href="/register"
                className="font-medium text-heritage-forest hover:underline"
              >
                Créer un compte
              </Link>
            </p>
            <Link
              href="/invite/_"
              className="font-medium text-heritage-forest hover:underline"
            >
              Accéder en tant qu&apos;invité →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
