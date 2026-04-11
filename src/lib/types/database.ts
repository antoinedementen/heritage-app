// =============================================================================
// Types TypeScript générés depuis le schéma Supabase — Heritage App
// Pour regénérer automatiquement :
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID \
//     --schema public > src/lib/types/database.ts
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type UserRole = "super_admin" | "family_admin" | "editor" | "guest";
export type InvitationStatus = "pending" | "approved" | "rejected";
export type Gender = "male" | "female" | "other";
export type RelationshipType =
  | "parent_child"
  | "spouse"
  | "sibling"
  | "godparent"
  | "adoptive_parent"
  | "guardian";
export type RelationshipStatus = "active" | "dissolved";
export type EventType =
  | "birth"
  | "death"
  | "marriage"
  | "divorce"
  | "baptism"
  | "property"
  | "residence"
  | "education"
  | "career"
  | "military"
  | "immigration"
  | "other";
export type AuditAction = "INSERT" | "UPDATE" | "DELETE";
export type FileType = "photo" | "video" | "document";

// ---------------------------------------------------------------------------
// Row types (lecture depuis la DB)
// ---------------------------------------------------------------------------

export interface EnvironmentRow {
  id: string;
  name: string;
  description: string | null;
  access_code: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  environment_id: string | null;
  invited_by: string | null;
  invitation_status: InvitationStatus;
  created_at: string;
  updated_at: string;
}

export interface PersonRow {
  id: string;
  environment_id: string;
  first_name: string;
  last_name: string;
  gender: Gender;
  birth_date: string | null;
  death_date: string | null;
  birth_place: string | null;
  profession: string | null;
  bio: string | null;
  photo_url: string | null;
  is_alive: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelationshipRow {
  id: string;
  environment_id: string;
  person_a_id: string;
  person_b_id: string;
  type: RelationshipType;
  status: RelationshipStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceRow {
  id: string;
  environment_id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  photo_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: string;
  environment_id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  event_date: string | null;
  end_date: string | null;
  person_id: string | null;
  place_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  environment_id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_data: Json | null;
  new_data: Json | null;
  performed_by: string | null;
  performed_at: string;
}

export interface MediaRow {
  id: string;
  environment_id: string;
  person_id: string | null;
  place_id: string | null;
  event_id: string | null;
  file_url: string;
  file_type: FileType;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Insert types (champs obligatoires seulement, les defaults sont optionnels)
// ---------------------------------------------------------------------------

export type EnvironmentInsert = Pick<EnvironmentRow, "name"> &
  Partial<Pick<EnvironmentRow, "description" | "access_code" | "created_by">>;

export type ProfileInsert = Pick<ProfileRow, "id" | "email"> &
  Partial<Pick<ProfileRow, "full_name" | "avatar_url" | "role" | "environment_id" | "invited_by" | "invitation_status">>;

export type PersonInsert = Pick<PersonRow, "environment_id" | "first_name" | "last_name" | "gender"> &
  Partial<Pick<PersonRow, "birth_date" | "death_date" | "birth_place" | "profession" | "bio" | "photo_url" | "is_alive" | "created_by">>;

export type RelationshipInsert = Pick<RelationshipRow, "environment_id" | "person_a_id" | "person_b_id" | "type"> &
  Partial<Pick<RelationshipRow, "status" | "notes" | "created_by">>;

export type PlaceInsert = Pick<PlaceRow, "environment_id" | "name"> &
  Partial<Pick<PlaceRow, "address" | "city" | "country" | "latitude" | "longitude" | "description" | "photo_url" | "created_by">>;

export type EventInsert = Pick<EventRow, "environment_id" | "title" | "event_type"> &
  Partial<Pick<EventRow, "description" | "event_date" | "end_date" | "person_id" | "place_id" | "created_by">>;

export type MediaInsert = Pick<MediaRow, "environment_id" | "file_url" | "file_type"> &
  Partial<Pick<MediaRow, "person_id" | "place_id" | "event_id" | "caption" | "uploaded_by">>;

// ---------------------------------------------------------------------------
// Update types (tous les champs sont optionnels sauf id)
// ---------------------------------------------------------------------------

export type EnvironmentUpdate = Partial<Omit<EnvironmentRow, "id" | "created_at" | "created_by">>;
export type ProfileUpdate     = Partial<Omit<ProfileRow,     "id" | "created_at">>;
export type PersonUpdate      = Partial<Omit<PersonRow,      "id" | "created_at" | "created_by" | "environment_id">>;
export type RelationshipUpdate = Partial<Omit<RelationshipRow, "id" | "created_at" | "created_by" | "environment_id">>;
export type PlaceUpdate       = Partial<Omit<PlaceRow,       "id" | "created_at" | "created_by" | "environment_id">>;
export type EventUpdate       = Partial<Omit<EventRow,       "id" | "created_at" | "created_by" | "environment_id">>;
export type MediaUpdate       = Partial<Omit<MediaRow,       "id" | "created_at" | "uploaded_by" | "environment_id">>;

// Utilitaire interne : force la compatibilité avec Record<string, unknown>
// requis par la contrainte GenericTable de @supabase/supabase-js
type DBRow<T> = T & Record<string, unknown>;

// ---------------------------------------------------------------------------
// Database interface (compatible avec le client Supabase typé)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      environments: {
        Row:           DBRow<EnvironmentRow>;
        Insert:        DBRow<EnvironmentInsert>;
        Update:        DBRow<EnvironmentUpdate>;
        Relationships: never[];
      };
      profiles: {
        Row:           DBRow<ProfileRow>;
        Insert:        DBRow<ProfileInsert>;
        Update:        DBRow<ProfileUpdate>;
        Relationships: never[];
      };
      people: {
        Row:           DBRow<PersonRow>;
        Insert:        DBRow<PersonInsert>;
        Update:        DBRow<PersonUpdate>;
        Relationships: never[];
      };
      relationships: {
        Row:           DBRow<RelationshipRow>;
        Insert:        DBRow<RelationshipInsert>;
        Update:        DBRow<RelationshipUpdate>;
        Relationships: never[];
      };
      places: {
        Row:           DBRow<PlaceRow>;
        Insert:        DBRow<PlaceInsert>;
        Update:        DBRow<PlaceUpdate>;
        Relationships: never[];
      };
      events: {
        Row:           DBRow<EventRow>;
        Insert:        DBRow<EventInsert>;
        Update:        DBRow<EventUpdate>;
        Relationships: never[];
      };
      audit_logs: {
        Row:           DBRow<AuditLogRow>;
        Insert:        Record<string, never>; // insertions bloquées (trigger uniquement)
        Update:        Record<string, never>;
        Relationships: never[];
      };
      media: {
        Row:           DBRow<MediaRow>;
        Insert:        DBRow<MediaInsert>;
        Update:        DBRow<MediaUpdate>;
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_access_code: {
        Args:    Record<string, never>;
        Returns: string;
      };
      get_my_profile: {
        Args:    Record<string, never>;
        Returns: ProfileRow;
      };
    };
    Enums: {
      user_role:           "super_admin" | "family_admin" | "editor" | "guest";
      invitation_status:   "pending" | "approved" | "rejected";
      gender:              "male" | "female" | "other";
      relationship_type:   "parent_child" | "spouse" | "sibling" | "godparent" | "adoptive_parent" | "guardian";
      relationship_status: "active" | "dissolved";
      event_type:          "birth" | "death" | "marriage" | "divorce" | "baptism" | "property" | "residence" | "education" | "career" | "military" | "immigration" | "other";
      audit_action:        "INSERT" | "UPDATE" | "DELETE";
      file_type:           "photo" | "video" | "document";
    };
    CompositeTypes: Record<string, never>;
  };
}
