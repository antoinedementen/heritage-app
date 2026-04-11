"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user?.id) {
      await fetch("/api/auth/set-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.user.id, fullName }),
      });
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-heritage-cream px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="font-serif text-4xl font-semibold text-heritage-forest">
              Heritage
            </h1>
          </div>
          <div className="rounded-2xl bg-heritage-white p-8 shadow-[0_4px_24px_rgba(74,55,40,0.08)] border border-heritage-sand/40 text-center">
            <div className="mb-4 text-4xl">🌳</div>
            <h2 className="font-serif text-2xl font-semibold text-heritage-dark mb-3">
              Compte créé !
            </h2>
            <p className="text-sm text-heritage-brown leading-relaxed">
              Votre compte a été créé. Vérifiez votre email pour confirmer votre
              adresse, puis attendez qu&apos;un administrateur approuve votre
              accès.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm font-medium text-heritage-forest hover:underline"
            >
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
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
            Créer un compte
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nom complet"
              type="text"
              placeholder="Marie Dupont"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
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
              autoComplete="new-password"
              hint="Minimum 8 caractères"
            />
            <Input
              label="Confirmer le mot de passe"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            {error && (
              <p className="rounded-lg bg-heritage-red/10 px-3 py-2 text-sm text-heritage-red">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Créer mon compte
            </Button>
          </form>

          <div className="mt-6 border-t border-heritage-sand pt-6 text-center text-sm">
            <p className="text-heritage-brown">
              Déjà un compte ?{" "}
              <Link
                href="/login"
                className="font-medium text-heritage-forest hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
