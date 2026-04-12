-- =============================================================================
-- Migration 003 — Correction du trigger handle_new_user
-- Différencie les utilisateurs anonymes (guests) des inscriptions normales
-- Anonyme (pas d'email) → role='guest', invitation_status='approved'
-- Inscription normale   → role='editor', invitation_status='pending'
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, invitation_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN NEW.email IS NULL OR NEW.email = '' THEN 'guest' ELSE 'editor' END,
    CASE WHEN NEW.email IS NULL OR NEW.email = '' THEN 'approved' ELSE 'pending' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
