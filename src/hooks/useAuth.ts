"use client";

import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/providers/auth-provider";

export function useAuth() {
  const { user, profile, loading, signOut, refreshProfile } = useAuthContext();
  const supabase = createClient();

  const role = profile?.role ?? null;
  const environmentId = profile?.environment_id ?? null;
  const isGuest = role === "guest";
  const isLoading = loading;

  function canEdit(): boolean {
    if (!profile) return false;
    return (
      role === "super_admin" ||
      role === "family_admin" ||
      (role === "editor" && profile.invitation_status === "approved")
    );
  }

  function isAdmin(): boolean {
    return role === "super_admin" || role === "family_admin";
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    return { data, error };
  }

  async function signInWithCode(code: string) {
    // Connexion anonyme pour les invités
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) return { data: null, error };

    // Upsert du profil invité
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      email: "",
      role: "guest",
      environment_id: code, // remplacé par l'envId résolu dans la page
      invitation_status: "approved",
    });

    if (profileError) return { data: null, error: profileError };
    return { data, error: null };
  }

  return {
    user,
    profile,
    role,
    environmentId,
    isGuest,
    isLoading,
    signIn,
    signUp,
    signOut,
    signInWithCode,
    canEdit,
    isAdmin,
    refreshProfile,
  };
}
