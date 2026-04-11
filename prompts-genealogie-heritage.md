# 🌳 Prompts Claude Code — Application Généalogique "Heritage"

> **Mode d'emploi :** Lance chaque prompt dans l'ordre. Attends que le précédent soit terminé et fonctionnel avant de passer au suivant. Si un prompt échoue ou produit un résultat inattendu, copie l'erreur et demande à Claude Code de corriger avant d'avancer.

---

## PHASE 1 — Fondations & Admin (Le Cœur)

---

### 🔷 PROMPT 1.0 — Initialisation du projet Next.js

📌 **Ce que ça fait :** Crée le squelette du projet avec toutes les dépendances nécessaires, la structure de dossiers, et la configuration de base.

⚙️ **Prérequis :** Aucun (c'est le point de départ).

```
Initialise un nouveau projet Next.js (App Router) avec les spécifications suivantes :

COMMANDES D'INSTALLATION :
- npx create-next-app@latest heritage-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
- cd heritage-app
- npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query @tanstack/react-query-devtools lucide-react reactflow zustand
- npm install -D @types/node

STRUCTURE DE DOSSIERS à créer dans /src :
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── invite/[code]/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── admin/
│   │   │   └── page.tsx          # Super Admin
│   │   └── [envId]/
│   │       ├── page.tsx          # Family Dashboard
│   │       ├── tree/page.tsx
│   │       ├── people/page.tsx
│   │       └── settings/page.tsx
│   ├── layout.tsx
│   ├── page.tsx                  # Landing / Redirection
│   └── globals.css
├── components/
│   ├── ui/                       # Composants réutilisables (Button, Input, Card, Modal, Badge, Avatar)
│   ├── layout/                   # Sidebar, Header, Navigation
│   ├── tree/                     # Composants react-flow (plus tard)
│   └── people/                   # Fiches personnes (plus tard)
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Client navigateur
│   │   ├── server.ts             # Client serveur (Server Components)
│   │   └── middleware.ts         # Auth middleware
│   ├── types/
│   │   └── database.ts           # Types TypeScript des tables Supabase
│   └── utils.ts                  # Fonctions utilitaires
├── hooks/                        # Custom hooks (useAuth, useEnvironment, etc.)
└── providers/
    ├── query-provider.tsx        # TanStack Query
    └── auth-provider.tsx         # Contexte d'authentification
```

CONFIGURATION TAILWIND (tailwind.config.ts) — Thème "Heritage" :
- Étends les couleurs avec une palette personnalisée :
  - heritage-cream: '#F5F0E8' (fond principal)
  - heritage-beige: '#E8DFD0' (fond secondaire)
  - heritage-sand: '#D4C5A9' (bordures, séparateurs)
  - heritage-brown: '#8B7355' (texte secondaire)
  - heritage-dark: '#4A3728' (texte principal)
  - heritage-forest: '#2D5016' (accent principal, boutons primaires)
  - heritage-leaf: '#4A7C2E' (accent secondaire, hover)
  - heritage-gold: '#B8960C' (accent tertiaire, badges, highlights)
  - heritage-red: '#9B2C2C' (erreurs, suppressions)
  - heritage-white: '#FDFCFA' (cartes, modales)
- Étends les fontFamily :
  - sans: ['DM Sans', 'sans-serif']
  - serif: ['Playfair Display', 'serif']
  - mono: ['JetBrains Mono', 'monospace']
- Ajoute les Google Fonts "DM Sans" (400, 500, 600, 700) et "Playfair Display" (400, 600, 700) dans le layout.tsx principal via next/font/google.

FICHIER globals.css :
- Applique un fond heritage-cream au body.
- Définis les styles de base pour la typographie (titres en serif/Playfair, corps en sans/DM Sans).
- Ajoute une scrollbar personnalisée fine aux couleurs du thème.

FICHIER .env.local (template) :
- NEXT_PUBLIC_SUPABASE_URL=
- NEXT_PUBLIC_SUPABASE_ANON_KEY=

Crée des pages placeholder pour chaque route avec juste un <h1> indiquant le nom de la page. Assure-toi que le projet compile sans erreur avec `npm run dev`.
```

---

### 🔷 PROMPT 1.1 — Configuration Supabase (Tables & RLS)

📌 **Ce que ça fait :** Crée toute la base de données dans Supabase : les tables, les relations entre elles, et les règles de sécurité qui contrôlent qui peut voir ou modifier quoi.

⚙️ **Prérequis :** Prompt 1.0 terminé. Tu dois avoir créé un projet Supabase (https://supabase.com) et récupéré l'URL + la clé anon pour les mettre dans `.env.local`.

```
Configure la base de données Supabase pour l'application de généalogie. Crée un fichier SQL de migration dans /supabase/migrations/ (ou à la racine si pas de CLI Supabase) que je pourrai exécuter dans l'éditeur SQL de Supabase.

IMPORTANT : Chaque table doit avoir `created_at` et `updated_at` (avec trigger auto-update). Utilise des UUID pour tous les ID primaires. Active RLS sur toutes les tables.

--- TABLE 1 : environments ---
- id (uuid, PK, default gen_random_uuid())
- name (text, NOT NULL) — Nom de la famille/environnement
- description (text, nullable)
- access_code (text, UNIQUE, NOT NULL) — Code d'accès invité (ex: "QMFMV"), généré automatiquement en 5 caractères alphanumériques majuscules
- created_by (uuid, FK → auth.users)
- created_at, updated_at

--- TABLE 2 : profiles ---
- id (uuid, PK, FK → auth.users ON DELETE CASCADE)
- email (text, NOT NULL)
- full_name (text)
- avatar_url (text, nullable)
- role (text, CHECK IN ('super_admin', 'family_admin', 'editor', 'guest'), default 'guest')
- environment_id (uuid, FK → environments, nullable) — NULL pour super_admin
- invited_by (uuid, FK → profiles, nullable)
- invitation_status (text, CHECK IN ('pending', 'approved', 'rejected'), default 'approved')
- created_at, updated_at

--- TABLE 3 : people ---
- id (uuid, PK)
- environment_id (uuid, FK → environments, NOT NULL)
- first_name (text, NOT NULL)
- last_name (text, NOT NULL)
- gender (text, CHECK IN ('male', 'female', 'other'), NOT NULL)
- birth_date (date, nullable)
- death_date (date, nullable)
- birth_place (text, nullable)
- profession (text, nullable)
- bio (text, nullable) — Champ texte libre
- photo_url (text, nullable)
- is_alive (boolean, default true)
- created_by (uuid, FK → auth.users)
- created_at, updated_at

--- TABLE 4 : relationships ---
- id (uuid, PK)
- environment_id (uuid, FK → environments, NOT NULL)
- person_a_id (uuid, FK → people, NOT NULL)
- person_b_id (uuid, FK → people, NOT NULL)
- type (text, CHECK IN ('parent_child', 'spouse', 'sibling', 'godparent', 'adoptive_parent', 'guardian'), NOT NULL)
- status (text, CHECK IN ('active', 'dissolved'), default 'active') — Permet de gérer mariage → divorce
- notes (text, nullable)
- created_by (uuid, FK → auth.users)
- created_at, updated_at
- CONSTRAINT unique_relationship UNIQUE(person_a_id, person_b_id, type)

--- TABLE 5 : places ---
- id (uuid, PK)
- environment_id (uuid, FK → environments, NOT NULL)
- name (text, NOT NULL)
- address (text, nullable)
- city (text, nullable)
- country (text, nullable)
- latitude (double precision, nullable)
- longitude (double precision, nullable)
- description (text, nullable)
- photo_url (text, nullable)
- created_by (uuid, FK → auth.users)
- created_at, updated_at

--- TABLE 6 : events ---
- id (uuid, PK)
- environment_id (uuid, FK → environments, NOT NULL)
- title (text, NOT NULL)
- description (text, nullable)
- event_type (text, CHECK IN ('birth', 'death', 'marriage', 'divorce', 'baptism', 'property', 'residence', 'education', 'career', 'military', 'immigration', 'other'), NOT NULL)
- event_date (date, nullable)
- end_date (date, nullable) — Pour les événements avec durée (propriété, résidence...)
- person_id (uuid, FK → people, nullable)
- place_id (uuid, FK → places, nullable)
- created_by (uuid, FK → auth.users)
- created_at, updated_at

--- TABLE 7 : audit_logs ---
- id (uuid, PK)
- environment_id (uuid, FK → environments, NOT NULL)
- table_name (text, NOT NULL)
- record_id (uuid, NOT NULL)
- action (text, CHECK IN ('INSERT', 'UPDATE', 'DELETE'), NOT NULL)
- old_data (jsonb, nullable) — Snapshot complet de la ligne AVANT modification
- new_data (jsonb, nullable) — Snapshot complet de la ligne APRÈS modification
- performed_by (uuid, FK → auth.users)
- performed_at (timestamptz, default now())

--- TABLE 8 : media ---
- id (uuid, PK)
- environment_id (uuid, FK → environments, NOT NULL)
- person_id (uuid, FK → people, nullable)
- place_id (uuid, FK → places, nullable)
- event_id (uuid, FK → events, nullable)
- file_url (text, NOT NULL)
- file_type (text, CHECK IN ('photo', 'video', 'document'), NOT NULL)
- caption (text, nullable)
- uploaded_by (uuid, FK → auth.users)
- created_at

--- FONCTIONS & TRIGGERS ---

1. Fonction `generate_access_code()` : génère un code unique de 5 caractères (A-Z, 0-9). Utilisée comme DEFAULT sur environments.access_code.

2. Fonction `update_updated_at()` : met à jour le champ updated_at à NOW() à chaque UPDATE. Crée un trigger sur chaque table concernée.

3. Fonction `log_audit()` : trigger AFTER INSERT, UPDATE, DELETE sur les tables people, relationships, places, events. Insère automatiquement dans audit_logs avec old_data = OLD (en jsonb), new_data = NEW (en jsonb), et l'utilisateur courant via auth.uid().

--- POLICIES RLS ---

Logique générale :
- Un super_admin voit et modifie TOUT.
- Un family_admin voit et modifie tout dans SON environnement (WHERE environment_id match).
- Un editor (invitation_status = 'approved') voit et modifie tout dans son environnement.
- Un guest (accès par code) voit tout dans l'environnement mais ne peut rien modifier (SELECT only).

Pour chaque table (sauf audit_logs) :
- SELECT : autorisé si l'utilisateur est super_admin OU si son environment_id correspond OU s'il est guest avec accès à cet environnement.
- INSERT/UPDATE : autorisé si super_admin OU si (environment_id match ET role IN ('family_admin', 'editor') ET invitation_status = 'approved').
- DELETE : autorisé si super_admin OU family_admin de l'environnement.

Pour audit_logs :
- SELECT : autorisé si super_admin OU family_admin de l'environnement.
- INSERT : autorisé via la fonction trigger uniquement (pas d'insert direct).
- UPDATE/DELETE : interdit pour tout le monde.

--- INDEX ---
Crée des index sur :
- people(environment_id)
- people(last_name, first_name)
- relationships(environment_id)
- relationships(person_a_id)
- relationships(person_b_id)
- events(environment_id)
- events(person_id)
- events(place_id)
- places(environment_id)
- audit_logs(environment_id, table_name, record_id)

--- STORAGE BUCKETS ---
Crée le SQL ou les instructions pour configurer 2 buckets Supabase Storage :
- "avatars" : public, max 2MB, types image/* uniquement
- "media" : privé (accès via signed URLs), max 50MB, types image/*, video/*, application/pdf

Génère le fichier SQL complet, commenté en français, prêt à être exécuté dans l'éditeur SQL de Supabase. Génère aussi le fichier /src/lib/types/database.ts avec les types TypeScript correspondant à chaque table.
```

---

### 🔷 PROMPT 1.2 — Authentification & Middleware

📌 **Ce que ça fait :** Met en place tout le système de connexion : inscription par email, connexion, accès invité par code, et protection des routes.

⚙️ **Prérequis :** Prompts 1.0 et 1.1 terminés. Variables d'environnement Supabase renseignées dans `.env.local`.

```
Implémente le système d'authentification complet de l'application Heritage.

--- 1. CLIENT SUPABASE ---
Configure les fichiers dans /src/lib/supabase/ :
- client.ts : client Supabase pour le navigateur (createBrowserClient de @supabase/ssr)
- server.ts : client pour les Server Components (createServerClient avec cookies)
- middleware.ts : logique de rafraîchissement de session

--- 2. MIDDLEWARE NEXT.JS ---
Crée /src/middleware.ts qui :
- Rafraîchit la session Supabase à chaque requête.
- Redirige vers /login si l'utilisateur n'est pas connecté et tente d'accéder à /admin ou /[envId]/*.
- Redirige vers le dashboard approprié si l'utilisateur est déjà connecté et va sur /login.
- Laisse passer librement les routes /invite/[code].

--- 3. AUTH PROVIDER ---
Crée /src/providers/auth-provider.tsx :
- Un contexte React qui expose : user, profile (avec rôle), loading, signOut.
- Au montage, récupère le profil de l'utilisateur connecté depuis la table profiles.
- Écoute les changements d'état d'authentification (onAuthStateChange).

--- 4. PAGE D'INSCRIPTION (/register) ---
Formulaire avec : email, mot de passe, confirmation mot de passe, nom complet.
- Utilise Supabase Auth signUp.
- Après inscription, crée automatiquement une entrée dans la table profiles avec role='editor' et invitation_status='pending'.
- Affiche un message : "Votre compte a été créé. Un administrateur doit approuver votre accès."
- Style : thème Heritage. Carte centrée sur fond cream. Logo/titre "Heritage" en Playfair Display en haut.

--- 5. PAGE DE CONNEXION (/login) ---
Formulaire avec : email, mot de passe.
- Utilise Supabase Auth signInWithPassword.
- Après connexion, redirige selon le rôle :
  - super_admin → /admin
  - family_admin ou editor (approved) → /[environment_id]
  - editor (pending) → page d'attente "En attente d'approbation"
- Lien vers /register et vers "Accéder en tant qu'invité".
- Style : même style que register, cohérent thème Heritage.

--- 6. PAGE D'ACCÈS INVITÉ (/invite/[code]) ---
- L'URL contient le code d'accès (ex: /invite/QMFMV).
- Vérifie si le code correspond à un environnement existant.
- Si oui : crée une session anonyme Supabase (signInAnonymously) ou utilise un cookie pour identifier l'invité. Stocke le environment_id et le rôle 'guest' dans le contexte.
- Redirige vers /[envId] en mode lecture seule.
- Si non : affiche "Code d'accès invalide" avec un champ pour réessayer.
- Page simple avec un champ de saisie du code + bouton "Accéder" pour les invités qui arrivent sans code dans l'URL.

--- 7. HOOK useAuth ---
Crée /src/hooks/useAuth.ts qui expose :
- user, profile, role, environmentId, isGuest, isLoading
- signIn(email, password), signUp(email, password, fullName), signOut()
- Fonctions utilitaires : canEdit() (true si editor approved ou admin), isAdmin() (true si family_admin ou super_admin)

--- STYLE GÉNÉRAL DES PAGES AUTH ---
- Fond heritage-cream, carte centrée en heritage-white avec ombre douce.
- Titre "Heritage" en Playfair Display, taille grande, couleur heritage-forest.
- Sous-titre descriptif en DM Sans, couleur heritage-brown.
- Boutons primaires en heritage-forest, hover heritage-leaf, texte blanc.
- Inputs avec bordure heritage-sand, focus ring heritage-forest.
- Liens en heritage-forest avec underline au hover.
- Messages d'erreur en heritage-red.
- Responsive : pleine largeur sur mobile, carte max-w-md sur desktop.

Assure-toi que toute la navigation fonctionne : inscription → message d'attente, connexion → redirection correcte, code invité → mode lecture seule.
```

---

### 🔷 PROMPT 1.3 — Composants UI de base & Layout

📌 **Ce que ça fait :** Crée la bibliothèque de composants réutilisables et le layout principal (sidebar + header) pour toutes les pages du dashboard.

⚙️ **Prérequis :** Prompts 1.0 à 1.2 terminés.

```
Crée la bibliothèque de composants UI et le layout principal de l'application Heritage.

--- 1. COMPOSANTS UI (/src/components/ui/) ---

Crée chaque composant avec TypeScript, Tailwind, et des props bien typées. Tous les composants suivent le thème Heritage.

**Button.tsx** :
- Variantes : primary (bg heritage-forest), secondary (bg heritage-beige), danger (bg heritage-red), ghost (transparent).
- Tailles : sm, md, lg.
- Props : loading (affiche un spinner), disabled, icon (composant Lucide en début), fullWidth.

**Input.tsx** :
- Input texte stylé Heritage (bordure sand, focus forest).
- Props : label, error (message d'erreur en rouge en dessous), icon (Lucide à gauche), hint (texte d'aide).
- Variante textarea.

**Card.tsx** :
- Fond heritage-white, bordure fine heritage-sand/10, ombre douce.
- Props : title (optionnel, affiché en Playfair), padding, hoverable (légère élévation au hover).

**Modal.tsx** :
- Overlay semi-transparent, carte centrée avec animation d'entrée (fade + scale).
- Props : isOpen, onClose, title, size (sm, md, lg).
- Fermeture au clic sur l'overlay et touche Escape.

**Badge.tsx** :
- Variantes : success (forest), warning (gold), danger (red), neutral (sand).
- Tailles : sm, md.

**Avatar.tsx** :
- Rond, affiche l'image ou les initiales sur fond heritage-forest.
- Tailles : sm (32px), md (40px), lg (64px), xl (96px).

**Select.tsx** :
- Menu déroulant stylé Heritage.
- Props : options (tableau {value, label}), label, error.

**Table.tsx** :
- Composant de tableau stylé avec header en heritage-beige, lignes alternées.
- Sous-composants : Table, TableHeader, TableBody, TableRow, TableCell.

**EmptyState.tsx** :
- Icône Lucide au centre + titre + description + bouton d'action optionnel.
- Utilisé quand une liste est vide.

**LoadingSpinner.tsx** :
- Spinner simple aux couleurs heritage-forest, tailles sm/md/lg.

**Toast / Notification system** :
- Composant de notifications éphémères (success, error, info).
- Positionné en haut à droite.
- Auto-disparition après 4 secondes.
- Utilise un hook useToast() pour déclencher depuis n'importe quel composant.

--- 2. LAYOUT DASHBOARD (/src/app/(dashboard)/layout.tsx) ---

Structure : Sidebar fixe à gauche + zone de contenu à droite.

**Sidebar (composant /src/components/layout/Sidebar.tsx)** :
- Largeur : 260px sur desktop, drawer sur mobile (toggle avec bouton hamburger).
- En haut : Logo "Heritage" en Playfair Display + nom de l'environnement actif en petit.
- Navigation avec icônes Lucide :
  - 🏠 Tableau de bord (LayoutDashboard)
  - 🌳 Arbre familial (GitBranch)
  - 👥 Personnes (Users)
  - 📍 Lieux (MapPin)
  - 📅 Événements (Calendar)
  - 📸 Médias (Image)
  - ⚙️ Paramètres (Settings)
- Lien actif : fond heritage-forest/10, texte heritage-forest, barre latérale gauche de 3px en heritage-forest.
- En bas : Avatar + nom de l'utilisateur + bouton de déconnexion.
- Si rôle = guest : afficher un badge "Lecture seule" sous le nom.

**Header (composant /src/components/layout/Header.tsx)** :
- Barre supérieure dans la zone de contenu.
- À gauche : fil d'Ariane (Breadcrumb) dynamique selon la route.
- À droite : Champ de recherche globale (Omnisearch - placeholder pour l'instant) + Bouton notifications.
- Sur mobile : bouton hamburger pour ouvrir la sidebar.

--- 3. PROVIDER TANSTACK QUERY ---
Crée /src/providers/query-provider.tsx qui wrappe l'app avec QueryClientProvider.
Configure le QueryClient avec :
- staleTime: 5 minutes
- retry: 1
- refetchOnWindowFocus: false

--- 4. ASSEMBLAGE ---
Le layout (dashboard)/layout.tsx doit :
- Vérifier l'authentification (rediriger si non connecté).
- Wrapper avec AuthProvider et QueryProvider.
- Afficher Sidebar + Header + {children}.
- Passer l'environmentId au contexte.

Assure-toi que la navigation fonctionne entre toutes les pages placeholder et que le layout est responsive (sidebar en drawer sur mobile).
```

---

### 🔷 PROMPT 1.4 — Dashboard Super Admin

📌 **Ce que ça fait :** Crée la page d'administration globale où le Super Admin gère tous les environnements et les utilisateurs.

⚙️ **Prérequis :** Prompts 1.0 à 1.3 terminés.

```
Implémente la page Super Admin (/src/app/(dashboard)/admin/page.tsx) de l'application Heritage.

Cette page n'est accessible qu'aux utilisateurs avec role = 'super_admin'. Si un autre rôle tente d'y accéder, redirige vers son dashboard.

--- SECTION 1 : Vue d'ensemble ---
En haut de la page, affiche 3 cartes de statistiques :
- Nombre total d'environnements (icône Globe).
- Nombre total d'utilisateurs (icône Users).
- Nombre total de fiches personnes (icône UserCheck).
Utilise TanStack Query pour fetcher ces données avec des requêtes Supabase count.

--- SECTION 2 : Liste des environnements ---
Un tableau (composant Table) affichant tous les environnements avec les colonnes :
- Nom de la famille
- Code d'accès (avec bouton copier)
- Nombre de membres (personnes dans people)
- Nombre d'utilisateurs (profiles liés)
- Date de création
- Actions : Éditer, Supprimer (avec confirmation modale)

Bouton "Créer un environnement" en haut à droite :
- Ouvre une modale avec formulaire : Nom, Description.
- Le code d'accès est généré automatiquement (affiché après création).
- Après création, le super_admin peut désigner un family_admin parmi les utilisateurs existants.

--- SECTION 3 : Gestion des utilisateurs ---
Un tableau listant tous les utilisateurs avec :
- Avatar + Nom complet
- Email
- Rôle (avec badge coloré : super_admin=gold, family_admin=forest, editor=leaf, guest=sand)
- Environnement associé
- Statut d'invitation (badge : approved=vert, pending=orange, rejected=rouge)
- Actions : Changer le rôle (menu select), Approuver/Rejeter (si pending), Supprimer

--- SECTION 4 : Logs d'audit ---
Un tableau des 50 dernières actions avec :
- Date/heure
- Utilisateur qui a fait l'action
- Action (INSERT/UPDATE/DELETE avec badge coloré)
- Table concernée
- Lien "Voir détails" → ouvre une modale affichant old_data et new_data en JSON formaté côte à côte.
- Bouton "Restaurer" sur les UPDATE/DELETE → après confirmation, restaure old_data dans la table d'origine.

Fonctionnalité de restauration :
- Crée une fonction utilitaire restoreFromAuditLog(logId) dans /src/lib/supabase/audit.ts.
- Cette fonction lit le log, prend old_data, et fait un UPSERT dans la table d'origine.
- Après restauration, un nouveau log d'audit est créé (action = 'UPDATE', indiquant que c'est une restauration).

--- TOUTES LES REQUÊTES via TanStack Query ---
Crée les hooks dans /src/hooks/ :
- useEnvironments() : liste tous les environnements avec stats.
- useProfiles() : liste tous les profils.
- useAuditLogs(environmentId?) : liste les logs filtrés.
- Mutations : useCreateEnvironment(), useUpdateProfile(), useDeleteEnvironment(), useRestoreAuditLog().

Chaque hook utilise les fonctions de /src/lib/supabase/queries/ pour les appels effectifs.
```

---

### 🔷 PROMPT 1.5 — Dashboard Family Admin

📌 **Ce que ça fait :** Crée le tableau de bord que voit un administrateur de famille quand il accède à son environnement.

⚙️ **Prérequis :** Prompts 1.0 à 1.4 terminés.

```
Implémente le Dashboard Family Admin (/src/app/(dashboard)/[envId]/page.tsx).

Cette page est le tableau de bord principal pour un environnement familial donné. Accessible aux rôles family_admin, editor (approved), et guest (lecture seule).

--- SECTION 1 : En-tête de l'environnement ---
- Nom de la famille en grand (Playfair Display).
- Description en dessous (DM Sans, couleur heritage-brown).
- Code d'accès invité avec bouton "Copier le lien" (compose l'URL complète /invite/CODE).
- Visible uniquement aux admins : bouton "Paramètres de la famille".

--- SECTION 2 : Cartes de statistiques ---
4 cartes sur une ligne :
- 👥 Nombre de personnes (lien vers /[envId]/people)
- 🔗 Nombre de relations
- 📍 Nombre de lieux
- 📅 Nombre d'événements

--- SECTION 3 : Dernières modifications ---
Timeline des 10 dernières actions (depuis audit_logs pour cet environnement) :
- Avatar de l'utilisateur + nom + action en langage naturel.
  Exemples : "Marie a ajouté Jean Dupont", "Pierre a modifié la fiche de Louise Martin".
- Traduire les actions techniques en phrases lisibles via une fonction utilitaire formatAuditAction(log).
- Affiche la date relative (il y a 2 heures, hier, etc.).

--- SECTION 4 : Fiche de complétude de l'arbre ---
Un encart qui analyse les fiches de l'environnement et affiche :
- Nombre de fiches complètes (au moins : nom, prénom, genre, date de naissance, lieu de naissance, profession renseignés).
- Nombre de fiches incomplètes avec la liste des champs manquants les plus fréquents.
- Barre de progression visuelle (pourcentage de complétude global).
- Bouton "Voir les fiches incomplètes" → redirige vers /[envId]/people avec un filtre.

--- SECTION 5 : Détection de doublons potentiels ---
Visible uniquement si des doublons sont détectés.
- Algorithme : 2 personnes sont des doublons potentiels si au moins 2 critères sur 3 matchent :
  1. Même nom de famille (insensible à la casse).
  2. Même prénom (insensible à la casse).
  3. Même date de naissance.
- Affiche chaque paire de doublons dans une carte avec les infos côte à côte.
- Boutons : "Ce sont des personnes différentes" (ignore définitivement cette paire) ou "Éditer la fiche" (redirige vers la fiche de la personne).
- Stocke les paires ignorées dans localStorage pour ne pas les afficher à nouveau (en attendant une table dédiée).

--- SECTION 6 (admin seulement) : Gestion des membres ---
Liste des utilisateurs de cet environnement :
- Avatar + Nom + Email + Rôle + Statut.
- Actions : Approuver (si pending), Changer le rôle, Retirer de l'environnement.
- Bouton "Inviter un éditeur" : ouvre une modale avec champ email. Envoie un email via Supabase Auth inviteUserByEmail() avec le rôle 'editor' et invitation_status='pending'.

--- GESTION DU MODE LECTURE SEULE (INVITÉS) ---
Si le rôle est 'guest' :
- Masquer tous les boutons d'action (créer, modifier, supprimer, inviter).
- Masquer la section "Gestion des membres".
- Afficher un bandeau discret en haut : "Vous consultez cet arbre en mode lecture seule."

--- HOOKS TANSTACK QUERY ---
Crée :
- useEnvironment(envId) : détails de l'environnement.
- usePeopleStats(envId) : statistiques des personnes.
- useRecentActivity(envId) : dernières actions formatées.
- useCompleteness(envId) : analyse de complétude.
- useDuplicates(envId) : détection de doublons.
- useEnvironmentMembers(envId) : liste des membres.
- Mutations : useInviteMember(), useApproveMember(), useUpdateMemberRole().
```

---

## PHASE 2 — L'Arbre & la Navigation

---

### 🔷 PROMPT 2.0 — Liste des personnes & Fiches

📌 **Ce que ça fait :** Crée la page de listing de toutes les personnes de l'environnement avec la fonctionnalité CRUD complète.

⚙️ **Prérequis :** Phase 1 complète.

```
Implémente la page Personnes (/src/app/(dashboard)/[envId]/people/page.tsx).

--- LISTE DES PERSONNES ---
Affichage en grille de cartes (et non en tableau) :
- Chaque carte montre : photo (ou avatar avec initiales), prénom + nom, dates (naissance - décès ou "née en..."), genre (icône discrète), profession.
- En dessous de chaque carte : mini jauge de complétude (barre fine colorée : vert si >80%, orange si 50-80%, rouge si <50%). Au hover, affiche les champs manquants dans un tooltip.
- Carte cliquable → ouvre la fiche détaillée.

Filtres en haut de la page :
- Recherche textuelle (nom, prénom).
- Filtre par genre.
- Filtre "Fiches incomplètes uniquement" (toggle).
- Tri par : Nom (A-Z), Date d'ajout, Complétude.

Bouton "Ajouter une personne" (masqué si guest) :
- Ouvre une modale en plusieurs étapes :
  1. Étape 1 : Genre (choix obligatoire : Homme, Femme, Autre — avec icônes visuelles).
  2. Étape 2 : Nom, Prénom (obligatoires), Date de naissance, Lieu de naissance.
  3. Étape 3 : Profession, Bio (texte libre), Photo (upload vers Supabase Storage bucket "avatars").
- DÉTECTION DE DOUBLONS : Après l'étape 2, vérifie si un doublon potentiel existe (2 critères sur 3 : nom, prénom, date de naissance). Si oui, affiche une alerte : "Une personne similaire existe déjà : [Prénom Nom]. Voulez-vous éditer sa fiche ou continuer la création ?"
  - Bouton "Éditer la fiche existante" → ferme la modale et navigue vers la fiche.
  - Bouton "Créer quand même" → continue.
- Après création, propose d'ajouter des relations ("Voulez-vous lier cette personne à quelqu'un ?").

--- FICHE DÉTAILLÉE (modale large ou page /[envId]/people/[personId]) ---
Layout en 2 colonnes sur desktop, 1 colonne mobile :

Colonne gauche (1/3) :
- Grande photo (ou avatar XL avec initiales).
- Nom complet en Playfair Display.
- Dates : "12 mars 1945 — 3 janvier 2020" ou "Née le 12 mars 1945".
- Badge "En vie" (vert) ou "Décédé(e)" (gris).
- Profession.
- Bouton "Modifier" (crayon, masqué si guest).

Colonne droite (2/3) :
- Bio (texte libre, rendu Markdown basique).
- Section "Relations" : liste les relations avec lien vers chaque personne liée, groupées par type (Parents, Conjoint, Enfants, Frères/Sœurs, Parrains/Marraines).
  - Bouton "Ajouter une relation" → modale avec : sélection de la personne (recherche autocomplete) + type de relation.
- Section "Événements" : timeline des événements liés à cette personne, triés par date.
  - Bouton "Ajouter un événement" → modale.
- Section "Médias" : galerie photo/vidéo/documents liés.

Sous la fiche : mini fiche de complétude (comme décidé) :
- Liste les champs remplis (✓ vert) et manquants (✗ gris).
- Barre de progression.
- Texte "Fiche complète à X%" — encourageant si >80%, incitatif si <50%.

--- HOOKS ---
- usePeople(envId, filters?) : liste paginée avec filtres.
- usePerson(personId) : détail d'une personne avec relations et événements.
- useCreatePerson(), useUpdatePerson(), useDeletePerson().
- useCreateRelationship(), useDeleteRelationship().
```

---

### 🔷 PROMPT 2.1 — Moteur d'arbre react-flow

📌 **Ce que ça fait :** Crée l'arbre généalogique interactif avec react-flow, le cœur visuel de l'application.

⚙️ **Prérequis :** Prompt 2.0 terminé.

```
Implémente la vue Arbre Familial (/src/app/(dashboard)/[envId]/tree/page.tsx) avec react-flow.

--- CONCEPT DE L'ARBRE ---
L'arbre affiche les personnes comme des nœuds et les relations comme des connexions. Le focus est sur 2 générations au-dessus et 2 générations en dessous de la personne sélectionnée.

--- NŒUDS PERSONNALISÉS (Custom Nodes) ---
Crée /src/components/tree/PersonNode.tsx :
- Carte compacte affichant : photo (ou initiales), prénom + nom, dates de naissance/décès.
- Bordure colorée selon le genre : heritage-forest pour homme, heritage-gold pour femme, heritage-brown pour autre.
- Nœud sélectionné : ombre plus marquée + bordure plus épaisse.
- Au clic : ouvre un panneau latéral (drawer) avec la fiche résumée de la personne.
- Double-clic : recentre l'arbre sur cette personne (elle devient le focus).

Crée /src/components/tree/CoupleNode.tsx :
- Nœud invisible/petit qui sert de point de jonction entre 2 conjoints.
- Les enfants partent de ce nœud de couple, pas des parents individuels.

--- CONNEXIONS PERSONNALISÉES (Custom Edges) ---
- Parent → Enfant : ligne droite verticale, couleur heritage-dark, épaisseur 2px.
- Conjoint : ligne horizontale en pointillés entre les 2 personnes, couleur heritage-gold.
- Si relation dissoute (status = 'dissolved') : ligne barrée ou grisée.

--- ALGORITHME DE LAYOUT ---
Crée /src/lib/tree/layout.ts :
- Fonction buildTreeLayout(people, relationships, focusPersonId) :
  1. À partir de la personne focus, identifie 2 générations ascendantes et 2 descendantes via les relations parent_child.
  2. Organise les nœuds en rangées horizontales par génération.
  3. Les couples sont placés côte à côte avec un nœud de jonction.
  4. Les frères/sœurs sont alignés horizontalement.
  5. Retourne un tableau de nodes et edges compatible react-flow.
- L'algorithme doit gérer : familles recomposées (un parent avec plusieurs conjoints), personnes sans parents connus, branches incomplètes.

--- INTERFACE DE L'ARBRE ---
La page contient :
1. En haut : barre d'outils avec :
   - Sélecteur de personne focus (autocomplete) : "Centrer sur : [recherche]".
   - Boutons de zoom +/- et "Recentrer".
   - Toggle "Afficher les dates" / "Compact".
   - Bouton "Ajouter une personne" (masqué si guest).

2. Zone principale : le canvas react-flow prenant tout l'espace restant.
   - Fond avec motif subtil (grille légère ou texture papier).
   - Zoom et pan activés (molette + drag).
   - Mini-map en bas à droite.

3. Panneau latéral droit (drawer) : s'ouvre au clic sur un nœud.
   - Fiche résumée de la personne (photo, nom, dates, profession).
   - Boutons rapides : "Voir la fiche complète", "Ajouter un parent", "Ajouter un enfant", "Ajouter un conjoint".
   - Ces boutons ouvrent une modale de création de personne + relation automatique.

--- INTERACTIONS ---
- Au chargement : si aucune personne focus, prendre la personne avec le plus de relations (le "centre" naturel de l'arbre).
- Double-clic sur un nœud : recentre l'arbre sur cette personne (recalcule le layout ±2 générations).
- Drag and drop des nœuds désactivé (positions calculées automatiquement).
- Animation fluide lors du recentrage (transition 500ms).

--- HOOKS ---
- useTreeData(envId, focusPersonId) : retourne nodes et edges calculés.
- useTreeFocus() : gère la personne actuellement au focus.
```

---

### 🔷 PROMPT 2.2 — Omnisearch

📌 **Ce que ça fait :** Implémente la recherche globale accessible depuis le header, permettant de trouver rapidement personnes et lieux.

⚙️ **Prérequis :** Prompts 2.0 et 2.1 terminés.

```
Implémente la fonctionnalité Omnisearch dans le Header de l'application Heritage.

--- COMPOSANT OMNISEARCH (/src/components/layout/Omnisearch.tsx) ---

Champ de recherche dans le header avec les comportements suivants :

OUVERTURE :
- Raccourci clavier Ctrl+K (ou Cmd+K sur Mac) pour ouvrir la recherche.
- Clic sur le champ dans le header.
- S'ouvre comme un overlay/modale centrée en haut de l'écran (style Command Palette, comme VS Code ou Spotlight).

RECHERCHE :
- Recherche en temps réel dès 2 caractères tapés (debounce 300ms).
- Cherche simultanément dans :
  - Personnes : prénom, nom, profession.
  - Lieux : nom, ville, adresse.
- Les résultats sont groupés par catégorie ("Personnes" et "Lieux") avec un titre de section.
- Chaque résultat affiche : icône (User ou MapPin), nom, info secondaire (dates pour les personnes, ville pour les lieux).
- Navigation au clavier : flèches haut/bas pour naviguer, Entrée pour sélectionner, Escape pour fermer.

ACTION AU CLIC :
- Sur une personne : navigue vers /[envId]/people/[personId] OU ouvre la fiche dans un drawer.
- Sur un lieu : navigue vers /[envId]/places/[placeId] (quand la page existera).
- Ferme l'omnisearch après sélection.

MODE "HIGHLIGHT FAMILLE" :
- Si l'utilisateur est sur la page Arbre (/tree) et sélectionne une personne via l'Omnisearch :
  - Au lieu de naviguer, recentre l'arbre sur cette personne.
  - Met en surbrillance (highlight) le nœud correspondant avec une animation pulse dorée pendant 2 secondes.

STYLE :
- Overlay avec backdrop flou (backdrop-blur).
- Input large, typographie DM Sans.
- Résultats dans une liste avec hover en heritage-beige.
- Badge "⌘K" à droite du champ dans le header.
- Animation d'ouverture : fade + slide down.

--- IMPLÉMENTATION ---
- Crée un hook useOmnisearch(envId) qui gère la requête Supabase :
  - Utilise .or() pour chercher dans plusieurs colonnes.
  - Utilise .ilike() pour la recherche insensible à la casse.
  - Limite à 5 résultats par catégorie.
- Utilise un state global (zustand ou contexte) pour communiquer avec le composant Tree quand le mode Highlight est actif.
```

---

## PHASE 3 — Contenu Riche

---

### 🔷 PROMPT 3.0 — Pages et fiches Lieux

📌 **Ce que ça fait :** Crée la page de gestion des lieux, leurs fiches détaillées, et la logique de propriétaire actuel.

⚙️ **Prérequis :** Phase 2 complète.

```
Implémente la page Lieux (/src/app/(dashboard)/[envId]/places/page.tsx).

--- LISTE DES LIEUX ---
Affichage en grille de cartes :
- Photo du lieu (ou placeholder avec icône MapPin).
- Nom du lieu.
- Adresse / Ville / Pays.
- Badge "Propriétaire actuel : [Nom]" si applicable.
- Nombre d'événements liés.

Filtres : recherche textuelle, filtre par pays/ville.
Bouton "Ajouter un lieu" (masqué si guest).

Modale de création :
- Champs : Nom (obligatoire), Adresse, Ville, Pays, Description, Photo (upload).
- Pas de géocodage pour l'instant (latitude/longitude laissés vides).

--- FICHE LIEU DÉTAILLÉE (/[envId]/places/[placeId]) ---
Layout :
- En haut : grande photo (ou placeholder), nom en Playfair, adresse complète.
- Section "Propriétaire actuel" :
  - Logique : le propriétaire est la dernière personne liée à un événement de type 'property' sur ce lieu, dont le end_date est NULL ou dans le futur.
  - Affiche la carte de la personne avec lien vers sa fiche.
  - Si aucun propriétaire : "Aucun propriétaire enregistré".
- Section "Historique de propriété" : timeline des événements 'property' sur ce lieu, triés par date.
- Section "Événements liés" : tous les événements (naissance, mariage, résidence...) ayant eu lieu ici.
- Section "Documents et archives" : galerie des médias liés à ce lieu.
- Section "Personnes liées" : liste des personnes ayant au moins un événement lié à ce lieu.

--- HOOKS ---
- usePlaces(envId, filters?)
- usePlace(placeId) avec relations, événements, propriétaire.
- useCreatePlace(), useUpdatePlace(), useDeletePlace().
- useCurrentOwner(placeId) : calcule le propriétaire actuel.
```

---

### 🔷 PROMPT 3.1 — Système d'événements & Timelines

📌 **Ce que ça fait :** Crée le système complet d'événements avec les timelines visuelles pour les personnes et les lieux.

⚙️ **Prérequis :** Prompt 3.0 terminé.

```
Implémente le système d'événements et les timelines visuelles.

--- PAGE ÉVÉNEMENTS (/[envId]/events/page.tsx) ---
Liste de tous les événements de l'environnement.
- Affichage en timeline verticale (pas en tableau).
- Chaque événement affiche : date, icône selon le type (Birth=Baby, Death=Cross, Marriage=Heart, etc.), titre, personne liée (lien), lieu lié (lien).
- Filtres : par type d'événement, par personne, par lieu, par période (date range).
- Bouton "Ajouter un événement".

Modale de création d'événement :
- Type (select avec les 12 types définis).
- Titre (pré-rempli selon le type, ex: "Naissance de..." si type=birth).
- Date de début, Date de fin (optionnelle).
- Description (texte libre).
- Personne liée (autocomplete parmi les personnes de l'environnement).
- Lieu lié (autocomplete parmi les lieux de l'environnement, avec bouton "Créer un lieu" inline).

--- COMPOSANT TIMELINE RÉUTILISABLE (/src/components/ui/Timeline.tsx) ---
Composant générique de timeline verticale :
- Ligne verticale à gauche, points colorés pour chaque événement.
- Couleur du point selon le type d'événement.
- Au survol d'un point : mini carte avec les détails.
- Utilisé dans : fiche personne (ses événements), fiche lieu (ses événements), page événements.

--- INTÉGRATION ---
- Ajoute la timeline dans la fiche personne (Prompt 2.0) dans la section "Événements".
- Ajoute la timeline dans la fiche lieu (Prompt 3.0) dans les sections "Historique" et "Événements liés".
- Ajoute le lien "Événements" dans la sidebar de navigation.

--- HOOKS ---
- useEvents(envId, filters?)
- usePersonEvents(personId)
- usePlaceEvents(placeId)
- useCreateEvent(), useUpdateEvent(), useDeleteEvent()
```

---

### 🔷 PROMPT 3.2 — Système de médias & Albums

📌 **Ce que ça fait :** Crée le système d'upload, de galerie et de gestion des médias (photos, vidéos, documents).

⚙️ **Prérequis :** Prompt 3.1 terminé.

```
Implémente le système de médias de l'application Heritage.

--- PAGE MÉDIAS (/[envId]/media/page.tsx) ---
Galerie de tous les médias de l'environnement.
- Affichage en grille masonry (photos de tailles variées).
- Filtres : par type (photo, vidéo, document), par personne, par lieu.
- Chaque média affiche : miniature, caption, personne/lieu lié.
- Clic → lightbox plein écran avec navigation gauche/droite.

--- COMPOSANT UPLOAD (/src/components/media/MediaUploader.tsx) ---
- Drag & drop ou clic pour sélectionner.
- Upload vers Supabase Storage (bucket "media").
- Barre de progression visible pendant l'upload.
- Après upload : formulaire pour ajouter caption, lier à une personne et/ou un lieu et/ou un événement.
- Validation : types acceptés (image/*, video/mp4, application/pdf), taille max 50MB.
- Génération automatique d'une miniature pour les images (via canvas côté client).

--- MODE "STORIES" DANS LES FICHES PERSONNES ---
Dans la fiche d'une personne, la section "Médias" s'affiche comme un album :
- Miniatures rondes en ligne horizontale (style Stories Instagram).
- Clic sur une miniature → ouvre le lightbox à partir de cette image.
- Bouton "Ajouter un média" pour uploader directement lié à cette personne.

--- LIGHTBOX (/src/components/media/Lightbox.tsx) ---
- Plein écran avec fond noir.
- Navigation : flèches gauche/droite, swipe sur mobile, touches clavier.
- Affiche : média en grand, caption en bas, nom de la personne/lieu lié.
- Pour les documents PDF : affiche un aperçu avec lien "Télécharger".
- Pour les vidéos : lecteur vidéo intégré.
- Fermeture : bouton X ou touche Escape.

--- HOOKS ---
- useMedia(envId, filters?)
- usePersonMedia(personId)
- usePlaceMedia(placeId)
- useUploadMedia() : gère l'upload vers Supabase Storage + insertion dans la table media.
- useDeleteMedia() : supprime le fichier du storage + l'entrée en base.
```

---

## PHASE 4 — Outils Avancés & Finitions

---

### 🔷 PROMPT 4.0 — Import Excel & GEDCOM

📌 **Ce que ça fait :** Permet d'importer des données existantes depuis des fichiers Excel ou GEDCOM (format standard de généalogie).

⚙️ **Prérequis :** Phase 3 complète.

```
Implémente les fonctionnalités d'import de données dans Heritage.

--- IMPORT EXCEL (/[envId]/settings → section Import) ---
1. Upload d'un fichier .xlsx ou .csv.
2. Parsing côté client avec la librairie SheetJS (xlsx).
3. Écran de mapping : l'utilisateur associe les colonnes du fichier aux champs de la base :
   - Colonne "Nom" → last_name
   - Colonne "Prénom" → first_name
   - Colonne "Date de naissance" → birth_date (avec parsing intelligent des formats de date)
   - etc.
4. Prévisualisation des 5 premières lignes mappées.
5. Détection de doublons pour chaque ligne (même logique 2/3 critères).
6. Import avec barre de progression.
7. Rapport final : X personnes importées, Y doublons ignorés, Z erreurs.

--- IMPORT GEDCOM ---
1. Upload d'un fichier .ged.
2. Parsing du format GEDCOM (crée un parser dans /src/lib/import/gedcom-parser.ts) :
   - Parse les individus (INDI) → people.
   - Parse les familles (FAM) → relationships.
   - Parse les événements (BIRT, DEAT, MARR) → events.
   - Parse les lieux (PLAC) → places.
3. Écran de prévisualisation avant import :
   - Nombre de personnes, familles, événements détectés.
   - Liste des 10 premiers individus pour vérification.
   - Alerte si des doublons sont détectés avec l'existant.
4. Import avec barre de progression.
5. Rapport final détaillé.

--- COMPOSANT PARTAGÉ ImportWizard ---
Crée un composant wizard (étapes) réutilisable :
Étape 1 : Upload du fichier.
Étape 2 : Parsing + mapping (Excel) ou prévisualisation (GEDCOM).
Étape 3 : Revue des doublons détectés.
Étape 4 : Confirmation + import.
Étape 5 : Rapport.
```

---

### 🔷 PROMPT 4.1 — Calculateur de liens de parenté

📌 **Ce que ça fait :** Permet de calculer et afficher le lien de parenté entre deux personnes sélectionnées.

⚙️ **Prérequis :** Prompt 4.0 terminé.

```
Implémente un calculateur de liens de parenté dans Heritage.

--- ACCÈS ---
- Bouton "Calculer un lien" dans la barre d'outils de l'arbre.
- Accessible aussi via un onglet dans la page Personnes.

--- INTERFACE ---
1. Deux champs de sélection de personne (autocomplete).
   - "Personne A : [recherche]"
   - "Personne B : [recherche]"
2. Bouton "Calculer le lien".
3. Résultat affiché :
   - Le lien en langage naturel : "Jean est l'oncle de Marie" ou "Pierre et Paul sont cousins germains".
   - Le chemin dans l'arbre : Jean → [père de] → Robert → [frère de] → Michel → [père de] → Marie.
   - Visualisation du chemin : les nœuds du chemin sont mis en surbrillance dans l'arbre.

--- ALGORITHME (/src/lib/tree/relationship-calculator.ts) ---
1. Construire un graphe non orienté à partir des relations parent_child.
2. BFS (parcours en largeur) pour trouver le chemin le plus court entre A et B.
3. Analyser le chemin pour déterminer la nature du lien :
   - Compter les générations montantes (vers l'ancêtre commun) et descendantes.
   - Appliquer la nomenclature française :
     - 0 montée, 1 descente = parent/enfant
     - 1 montée, 1 descente = frère/sœur
     - 1 montée, 2 descentes = oncle/tante - neveu/nièce
     - 2 montées, 2 descentes = cousin germain
     - 2 montées, 3 descentes = petit-cousin / cousin issu de germain
     - etc.
   - Gérer le genre (oncle vs tante, neveu vs nièce) via le champ gender.
4. Si aucun chemin n'existe : "Aucun lien de parenté trouvé entre ces deux personnes."

--- INTÉGRATION ARBRE ---
- Quand un lien est calculé, proposer "Voir dans l'arbre" : recentre sur l'ancêtre commun et highlight le chemin en couleur heritage-gold.
```

---

### 🔷 PROMPT 4.2 — Finitions UI/UX & Thème Heritage

📌 **Ce que ça fait :** Passe de finition sur toute l'application pour un rendu professionnel et cohérent.

⚙️ **Prérequis :** Tous les prompts précédents terminés.

```
Effectue une passe de finition complète sur l'application Heritage.

--- 1. THÈME "HERITAGE" — FINITIONS ---
Parcours TOUTES les pages et composants pour vérifier la cohérence visuelle :
- Tous les titres de pages en Playfair Display, couleur heritage-dark.
- Tous les textes de corps en DM Sans, couleur heritage-brown.
- Tous les boutons primaires en heritage-forest, hover heritage-leaf.
- Toutes les cartes en heritage-white avec bordure heritage-sand/20.
- Toutes les modales avec le même style (overlay, animation fade+scale).
- Icônes Lucide partout (pas de mix avec d'autres jeux d'icônes).
- Espacements cohérents : utiliser les espacements Tailwind de manière consistante (p-4, p-6, gap-4, gap-6).

--- 2. ANIMATIONS & MICRO-INTERACTIONS ---
Ajoute des animations subtiles partout :
- Transitions de page : fade in (150ms).
- Cartes : légère élévation au hover (shadow transition 200ms).
- Boutons : scale 0.98 au clic (active state).
- Modales : fade + scale à l'ouverture, fade à la fermeture.
- Toasts : slide in depuis la droite.
- Chargement des données : skeleton loading (formes grises animées) au lieu de spinners bruts.
- Listes : stagger animation à l'apparition (chaque élément arrive avec un léger délai).

--- 3. RESPONSIVE ---
Vérifie chaque page sur mobile (< 640px) :
- Sidebar → drawer avec overlay.
- Grilles de cartes → 1 colonne.
- Tableau → cartes empilées.
- Arbre → zoom adapté, panneau latéral en bottom sheet.
- Modales → plein écran sur mobile.
- Omnisearch → plein écran.

--- 4. ÉTATS VIDES & ERREURS ---
Vérifie que CHAQUE liste a un EmptyState approprié :
- Page Personnes vide : icône Users + "Aucune personne dans cet arbre. Commencez par ajouter le premier membre de la famille."
- Page Lieux vide : icône MapPin + "Aucun lieu enregistré."
- Page Événements vide : icône Calendar + "Aucun événement."
- Page Médias vide : icône Image + "Aucun média."
- Erreurs de chargement : composant ErrorState avec bouton "Réessayer".

--- 5. ACCESSIBILITÉ ---
- Tous les boutons et liens ont un aria-label descriptif.
- Les modales ont un focus trap.
- Les couleurs respectent un ratio de contraste suffisant (vérifier heritage-brown sur heritage-cream).
- Navigation au clavier fonctionnelle partout.
- Alt text sur les images.

--- 6. SEO & META ---
- Titre de page dynamique : "Heritage — [Nom de la famille]" ou "Heritage — Admin".
- Favicon aux couleurs du thème (arbre stylisé vert forêt).
- Meta description pour la page de login/register.

--- 7. PAGE D'ACCUEIL (/) ---
Crée une landing page simple pour les visiteurs non connectés :
- Grand titre "Heritage" en Playfair Display.
- Sous-titre : "Votre histoire familiale, préservée pour les générations futures."
- Illustration ou pattern décoratif aux couleurs Heritage.
- Deux boutons : "Se connecter" et "Accéder en tant qu'invité" (avec champ de code).
- En bas : "Créé avec soin pour préserver la mémoire familiale."
```

---

## Notes importantes pour l'exécution

1. **Après chaque prompt**, lance `npm run build` pour vérifier qu'il n'y a pas d'erreurs de compilation.
2. **Teste chaque fonctionnalité** avant de passer au prompt suivant.
3. **Si un prompt est trop long** et que Claude Code semble "oublier" des éléments en fin de prompt, découpe-le en 2 et lance les parties séparément.
4. **Commite régulièrement** sur GitHub entre chaque prompt (`git add . && git commit -m "Phase X.Y — [description]"`).
5. **Pour le déploiement Vercel** : connecte le repo GitHub à Vercel, ajoute les variables d'environnement Supabase dans les settings Vercel, et le déploiement sera automatique à chaque push.
