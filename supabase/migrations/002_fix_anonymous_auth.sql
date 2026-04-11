-- =============================================================================
-- Migration 002 — Correction du trigger handle_new_user pour les utilisateurs anonymes
-- Les utilisateurs anonymes (signInAnonymously) n'ont pas d'email.
-- Le trigger original échoue sur la contrainte NOT NULL de profiles.email.
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),        -- Chaîne vide pour les utilisateurs anonymes
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;     -- Idempotent si le profil existe déjà
  RETURN NEW;
END;
$$;
