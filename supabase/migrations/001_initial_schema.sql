-- =============================================================================
-- HERITAGE APP — Migration initiale
-- Exécuter dans l'ordre dans l'éditeur SQL de Supabase
-- =============================================================================

-- Extension UUID (activée par défaut dans Supabase, mais on s'en assure)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- FONCTIONS UTILITAIRES
-- =============================================================================

-- Génère un code d'accès de 5 caractères alphanumériques majuscules (A-Z, 0-9)
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars  text    := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text    := '';
  i      integer;
  code   text;
  found  boolean := true;
BEGIN
  -- Boucle jusqu'à trouver un code unique
  WHILE found LOOP
    result := '';
    FOR i IN 1..5 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;

    -- Vérifie l'unicité dans la table environments
    SELECT EXISTS (
      SELECT 1 FROM public.environments WHERE access_code = result
    ) INTO found;
  END LOOP;

  RETURN result;
END;
$$;


-- Met à jour automatiquement le champ updated_at à chaque UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- TABLE 1 : environments
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.environments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  access_code text        UNIQUE NOT NULL DEFAULT generate_access_code(),
  created_by  uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
CREATE TRIGGER environments_updated_at
  BEFORE UPDATE ON public.environments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- TABLE 2 : profiles
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                 uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email              text        NOT NULL,
  full_name          text,
  avatar_url         text,
  role               text        NOT NULL DEFAULT 'guest'
                                 CHECK (role IN ('super_admin', 'family_admin', 'editor', 'guest')),
  environment_id     uuid        REFERENCES public.environments ON DELETE SET NULL,
  invited_by         uuid        REFERENCES public.profiles ON DELETE SET NULL,
  invitation_status  text        NOT NULL DEFAULT 'approved'
                                 CHECK (invitation_status IN ('pending', 'approved', 'rejected')),
  created_at         timestamptz NOT NULL DEFAULT NOW(),
  updated_at         timestamptz NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Crée automatiquement un profil quand un utilisateur s'inscrit
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- TABLE 3 : people
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.people (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid        NOT NULL REFERENCES public.environments ON DELETE CASCADE,
  first_name     text        NOT NULL,
  last_name      text        NOT NULL,
  gender         text        NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  birth_date     date,
  death_date     date,
  birth_place    text,
  profession     text,
  bio            text,
  photo_url      text,
  is_alive       boolean     NOT NULL DEFAULT true,
  created_by     uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  updated_at     timestamptz NOT NULL DEFAULT NOW()
);

CREATE TRIGGER people_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- TABLE 4 : relationships
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.relationships (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid        NOT NULL REFERENCES public.environments ON DELETE CASCADE,
  person_a_id    uuid        NOT NULL REFERENCES public.people ON DELETE CASCADE,
  person_b_id    uuid        NOT NULL REFERENCES public.people ON DELETE CASCADE,
  type           text        NOT NULL
                             CHECK (type IN ('parent_child', 'spouse', 'sibling', 'godparent', 'adoptive_parent', 'guardian')),
  status         text        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'dissolved')),
  notes          text,
  created_by     uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  updated_at     timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_relationship UNIQUE (person_a_id, person_b_id, type)
);

CREATE TRIGGER relationships_updated_at
  BEFORE UPDATE ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- TABLE 5 : places
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.places (
  id             uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid              NOT NULL REFERENCES public.environments ON DELETE CASCADE,
  name           text              NOT NULL,
  address        text,
  city           text,
  country        text,
  latitude       double precision,
  longitude      double precision,
  description    text,
  photo_url      text,
  created_by     uuid              REFERENCES auth.users ON DELETE SET NULL,
  created_at     timestamptz       NOT NULL DEFAULT NOW(),
  updated_at     timestamptz       NOT NULL DEFAULT NOW()
);

CREATE TRIGGER places_updated_at
  BEFORE UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- TABLE 6 : events
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid        NOT NULL REFERENCES public.environments ON DELETE CASCADE,
  title          text        NOT NULL,
  description    text,
  event_type     text        NOT NULL
                             CHECK (event_type IN (
                               'birth', 'death', 'marriage', 'divorce', 'baptism',
                               'property', 'residence', 'education', 'career',
                               'military', 'immigration', 'other'
                             )),
  event_date     date,
  end_date       date,
  person_id      uuid        REFERENCES public.people ON DELETE SET NULL,
  place_id       uuid        REFERENCES public.places ON DELETE SET NULL,
  created_by     uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  updated_at     timestamptz NOT NULL DEFAULT NOW()
);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- TABLE 7 : audit_logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid        NOT NULL REFERENCES public.environments ON DELETE CASCADE,
  table_name     text        NOT NULL,
  record_id      uuid        NOT NULL,
  action         text        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data       jsonb,
  new_data       jsonb,
  performed_by   uuid        REFERENCES auth.users ON DELETE SET NULL,
  performed_at   timestamptz NOT NULL DEFAULT NOW()
);

-- Pas de updated_at (les logs sont immuables)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- TABLE 8 : media
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.media (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid        NOT NULL REFERENCES public.environments ON DELETE CASCADE,
  person_id      uuid        REFERENCES public.people ON DELETE SET NULL,
  place_id       uuid        REFERENCES public.places ON DELETE SET NULL,
  event_id       uuid        REFERENCES public.events ON DELETE SET NULL,
  file_url       text        NOT NULL,
  file_type      text        NOT NULL CHECK (file_type IN ('photo', 'video', 'document')),
  caption        text,
  uploaded_by    uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- TRIGGER AUDIT — people, relationships, places, events
-- =============================================================================

-- Fonction générique d'audit
CREATE OR REPLACE FUNCTION log_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_environment_id uuid;
  v_record_id      uuid;
  v_old_data       jsonb := NULL;
  v_new_data       jsonb := NULL;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record_id      := OLD.id;
    v_environment_id := OLD.environment_id;
    v_old_data       := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id      := NEW.id;
    v_environment_id := NEW.environment_id;
    v_new_data       := to_jsonb(NEW);
  ELSE -- UPDATE
    v_record_id      := NEW.id;
    v_environment_id := NEW.environment_id;
    v_old_data       := to_jsonb(OLD);
    v_new_data       := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_logs (
    environment_id, table_name, record_id, action,
    old_data, new_data, performed_by
  )
  VALUES (
    v_environment_id,
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    v_old_data,
    v_new_data,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attache le trigger d'audit à chaque table concernée
CREATE TRIGGER people_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.people
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER relationships_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER places_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.places
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER events_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION log_audit();


-- =============================================================================
-- INDEX
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_people_environment_id       ON public.people (environment_id);
CREATE INDEX IF NOT EXISTS idx_people_name                 ON public.people (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_relationships_environment   ON public.relationships (environment_id);
CREATE INDEX IF NOT EXISTS idx_relationships_person_a      ON public.relationships (person_a_id);
CREATE INDEX IF NOT EXISTS idx_relationships_person_b      ON public.relationships (person_b_id);
CREATE INDEX IF NOT EXISTS idx_events_environment_id       ON public.events (environment_id);
CREATE INDEX IF NOT EXISTS idx_events_person_id            ON public.events (person_id);
CREATE INDEX IF NOT EXISTS idx_events_place_id             ON public.events (place_id);
CREATE INDEX IF NOT EXISTS idx_places_environment_id       ON public.places (environment_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_lookup           ON public.audit_logs (environment_id, table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_media_environment_id        ON public.media (environment_id);
CREATE INDEX IF NOT EXISTS idx_media_person_id             ON public.media (person_id);


-- =============================================================================
-- HELPER FUNCTION — Récupère le profil de l'utilisateur courant
-- (évite les requêtes N+1 dans les policies)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;


-- =============================================================================
-- POLICIES RLS
-- =============================================================================

-- ---- Helper : l'utilisateur est super_admin ----
-- (utilisé dans chaque policy pour éviter la répétition)

-- ---- environments ----

-- SELECT : super_admin voit tout, sinon seulement son environnement
CREATE POLICY "environments_select"
  ON public.environments FOR SELECT
  USING (
    (get_my_profile()).role = 'super_admin'
    OR id = (get_my_profile()).environment_id
  );

-- INSERT : super_admin uniquement (la création d'env se fait via une fonction serveur)
CREATE POLICY "environments_insert"
  ON public.environments FOR INSERT
  WITH CHECK (
    (get_my_profile()).role = 'super_admin'
  );

-- UPDATE : super_admin ou family_admin de cet environnement
CREATE POLICY "environments_update"
  ON public.environments FOR UPDATE
  USING (
    (get_my_profile()).role = 'super_admin'
    OR (
      id = (get_my_profile()).environment_id
      AND (get_my_profile()).role = 'family_admin'
    )
  );

-- DELETE : super_admin uniquement
CREATE POLICY "environments_delete"
  ON public.environments FOR DELETE
  USING (
    (get_my_profile()).role = 'super_admin'
  );


-- ---- profiles ----

CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  USING (
    (get_my_profile()).role = 'super_admin'
    -- Peut voir les membres de son propre environnement
    OR environment_id = (get_my_profile()).environment_id
    -- Peut toujours voir son propre profil
    OR id = auth.uid()
  );

CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (
    -- Uniquement via le trigger handle_new_user (id = auth.uid())
    id = auth.uid()
    OR (get_my_profile()).role = 'super_admin'
  );

CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  USING (
    (get_my_profile()).role = 'super_admin'
    -- Peut modifier son propre profil
    OR id = auth.uid()
    -- family_admin peut modifier les profils de son environnement
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role = 'family_admin'
    )
  );

CREATE POLICY "profiles_delete"
  ON public.profiles FOR DELETE
  USING (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role = 'family_admin'
    )
  );


-- ---- people ----

CREATE POLICY "people_select"
  ON public.people FOR SELECT
  USING (
    (get_my_profile()).role = 'super_admin'
    OR environment_id = (get_my_profile()).environment_id
  );

CREATE POLICY "people_insert"
  ON public.people FOR INSERT
  WITH CHECK (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role IN ('family_admin', 'editor')
      AND (get_my_profile()).invitation_status = 'approved'
    )
  );

CREATE POLICY "people_update"
  ON public.people FOR UPDATE
  USING (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role IN ('family_admin', 'editor')
      AND (get_my_profile()).invitation_status = 'approved'
    )
  );

CREATE POLICY "people_delete"
  ON public.people FOR DELETE
  USING (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role = 'family_admin'
    )
  );


-- ---- relationships ----

CREATE POLICY "relationships_select"
  ON public.relationships FOR SELECT
  USING (
    (get_my_profile()).role = 'super_admin'
    OR environment_id = (get_my_profile()).environment_id
  );

CREATE POLICY "relationships_insert"
  ON public.relationships FOR INSERT
  WITH CHECK (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role IN ('family_admin', 'editor')
      AND (get_my_profile()).invitation_status = 'approved'
    )
  );

CREATE POLICY "relationships_update"
  ON public.relationships FOR UPDATE
  USING (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role IN ('family_admin', 'editor')
      AND (get_my_profile()).invitation_status = 'approved'
    )
  );

CREATE POLICY "relationships_delete"
  ON public.relationships FOR DELETE
  USING (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role = 'family_admin'
    )
  );


-- ---- places ----

CREATE POLICY "places_select"
  ON public.places FOR SELECT
  USING (
    (get_my_profile()).role = 'super_admin'
    OR environment_id = (get_my_profile()).environment_id
  );

CREATE POLICY "places_insert"
  ON public.places FOR INSERT
  WITH CHECK (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role IN ('family_admin', 'editor')
      AND (get_my_profile()).invitation_status = 'approved'
    )
  );

CREATE POLICY "places_update"
  ON public.places FOR UPDATE
  USING (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role IN ('family_admin', 'editor')
      AND (get_my_profile()).invitation_status = 'approved'
    )
  );

CREATE POLICY "places_delete"
  ON public.places FOR DELETE
  USING (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role = 'family_admin'
    )
  );


-- ---- events ----

CREATE POLICY "events_select"
  ON public.events FOR SELECT
  USING (
    (get_my_profile()).role = 'super_admin'
    OR environment_id = (get_my_profile()).environment_id
  );

CREATE POLICY "events_insert"
  ON public.events FOR INSERT
  WITH CHECK (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role IN ('family_admin', 'editor')
      AND (get_my_profile()).invitation_status = 'approved'
    )
  );

CREATE POLICY "events_update"
  ON public.events FOR UPDATE
  USING (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role IN ('family_admin', 'editor')
      AND (get_my_profile()).invitation_status = 'approved'
    )
  );

CREATE POLICY "events_delete"
  ON public.events FOR DELETE
  USING (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role = 'family_admin'
    )
  );


-- ---- media ----

CREATE POLICY "media_select"
  ON public.media FOR SELECT
  USING (
    (get_my_profile()).role = 'super_admin'
    OR environment_id = (get_my_profile()).environment_id
  );

CREATE POLICY "media_insert"
  ON public.media FOR INSERT
  WITH CHECK (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role IN ('family_admin', 'editor')
      AND (get_my_profile()).invitation_status = 'approved'
    )
  );

CREATE POLICY "media_update"
  ON public.media FOR UPDATE
  USING (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role IN ('family_admin', 'editor')
      AND (get_my_profile()).invitation_status = 'approved'
    )
  );

CREATE POLICY "media_delete"
  ON public.media FOR DELETE
  USING (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role = 'family_admin'
    )
  );


-- ---- audit_logs ----

-- SELECT : super_admin ou family_admin de l'environnement
CREATE POLICY "audit_logs_select"
  ON public.audit_logs FOR SELECT
  USING (
    (get_my_profile()).role = 'super_admin'
    OR (
      environment_id = (get_my_profile()).environment_id
      AND (get_my_profile()).role = 'family_admin'
    )
  );

-- INSERT : bloqué directement (seul le trigger SECURITY DEFINER peut insérer)
CREATE POLICY "audit_logs_insert_denied"
  ON public.audit_logs FOR INSERT
  WITH CHECK (false);

-- UPDATE/DELETE : interdits pour tout le monde
CREATE POLICY "audit_logs_update_denied"
  ON public.audit_logs FOR UPDATE
  USING (false);

CREATE POLICY "audit_logs_delete_denied"
  ON public.audit_logs FOR DELETE
  USING (false);


-- =============================================================================
-- STORAGE BUCKETS
-- (À exécuter séparément dans l'éditeur SQL ou via le dashboard Supabase)
-- =============================================================================

-- Bucket "avatars" : public, images uniquement, max 2 MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB en octets
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket "media" : privé, images + vidéos + PDF, max 50 MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  52428800,  -- 50 MB en octets
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Policies Storage — bucket "avatars" (public en lecture)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() = owner
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() = owner
  );

-- Policies Storage — bucket "media" (privé, signed URLs)
CREATE POLICY "media_auth_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "media_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "media_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media'
    AND auth.uid() = owner
  );
