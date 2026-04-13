# 🎮 Prompts Claude Code — Module Jeu "Remplissage" pour Heritage

> **Contexte :** Ces prompts s'ajoutent à l'application Heritage (généalogie familiale Next.js + Supabase + react-flow + Tailwind). Ils doivent être exécutés APRÈS au minimum la Phase 2 (personnes + arbre fonctionnels).
>
> **Concept :** "Remplissage" est un jeu en équipes joué en présentiel lors de réunions de famille. Les joueurs reçoivent des missions : compléter des champs vides sur des fiches personnes. Ils doivent aller parler aux membres de la famille pour trouver les réponses. L'objectif secret : compléter la base de données en s'amusant.

---

## PROMPT J.0 — Tables Supabase & Architecture modulaire du Jeu

📌 **Ce que ça fait :** Crée les tables de base de données pour le système de jeu, avec une architecture prévue pour accueillir d'autres types de jeux à l'avenir.

⚙️ **Prérequis :** L'application Heritage est fonctionnelle avec les tables `environments`, `profiles`, `people`, `relationships`, `events`, `places` déjà en place.

```
Ajoute le module Jeu à l'application Heritage. Crée un fichier de migration SQL pour Supabase avec les tables suivantes.

IMPORTANT : L'architecture doit être modulaire. "Remplissage" est le premier jeu d'une série. Chaque type de jeu futur aura sa propre table de missions mais partagera les tables communes (games, teams, players).

--- TABLE 1 : games ---
Table générique pour TOUS les types de jeux.
- id (uuid, PK, default gen_random_uuid())
- environment_id (uuid, FK → environments, NOT NULL)
- game_type (text, NOT NULL, CHECK IN ('remplissage')) — Extensible pour les futurs jeux
- name (text, NOT NULL) — Nom donné par l'admin (ex: "Remplissage Noël 2025")
- status (text, NOT NULL, CHECK IN ('setup', 'lobby', 'active', 'paused', 'finished', 'cancelled'), default 'setup')
  — setup : l'admin configure les paramètres
  — lobby : les joueurs peuvent rejoindre, en attente du lancement
  — active : le jeu est en cours
  — paused : l'admin a mis en pause
  — finished : terminé (timer écoulé ou toutes missions complétées)
  — cancelled : annulé par l'admin
- config (jsonb, NOT NULL, default '{}') — Paramètres spécifiques au type de jeu. Pour "remplissage" :
  {
    "missions_per_player": 10,
    "max_skips_per_player": 2,
    "timer_minutes": 30,
    "target_fields": ["birth_place", "profession", "birth_date"],
    "team_mode": "random"  // "random" ou "manual"
  }
- winning_team_id (uuid, FK → game_teams, nullable) — Rempli à la fin du jeu
- started_at (timestamptz, nullable)
- finished_at (timestamptz, nullable)
- created_by (uuid, FK → auth.users, NOT NULL)
- created_at, updated_at

--- TABLE 2 : game_teams ---
- id (uuid, PK, default gen_random_uuid())
- game_id (uuid, FK → games ON DELETE CASCADE, NOT NULL)
- name (text, NOT NULL) — Ex: "Équipe Chêne", "Équipe Lierre"
- color (text, NOT NULL) — Code hex pour l'affichage (ex: '#2D5016', '#B8960C')
- total_score (integer, default 0) — Mis à jour en temps réel
- created_at

--- TABLE 3 : game_players ---
- id (uuid, PK, default gen_random_uuid())
- game_id (uuid, FK → games ON DELETE CASCADE, NOT NULL)
- team_id (uuid, FK → game_teams ON DELETE CASCADE, nullable) — NULL tant que les équipes ne sont pas formées
- user_id (uuid, FK → auth.users, NOT NULL)
- display_name (text, NOT NULL) — Nom affiché dans le jeu
- avatar_url (text, nullable)
- score (integer, default 0) — Score individuel du joueur
- skips_used (integer, default 0) — Nombre de skips utilisés
- missions_completed (integer, default 0)
- joined_at (timestamptz, default now())
- CONSTRAINT unique_player_per_game UNIQUE(game_id, user_id)

--- TABLE 4 : game_missions ---
Table spécifique au jeu "Remplissage". Les futurs jeux auront leurs propres tables de missions.
- id (uuid, PK, default gen_random_uuid())
- game_id (uuid, FK → games ON DELETE CASCADE, NOT NULL)
- player_id (uuid, FK → game_players ON DELETE CASCADE, NOT NULL)
- person_id (uuid, FK → people, NOT NULL) — La personne de l'arbre concernée
- target_field (text, NOT NULL) — Le champ à compléter : 'birth_place', 'profession', 'birth_date', 'bio', ou 'new_event', 'new_place'
- target_field_label (text, NOT NULL) — Label lisible : "Lieu de naissance", "Profession", etc.
- hint (text, nullable) — Suggestion de question à poser (ex: "Demandez-lui où il/elle est né(e)")
- answer (text, nullable) — Réponse soumise par le joueur
- answer_data (jsonb, nullable) — Données structurées pour les réponses complexes (nouvel événement, nouveau lieu)
- status (text, NOT NULL, CHECK IN ('pending', 'submitted', 'skipped', 'validated', 'rejected'), default 'pending')
  — pending : pas encore répondu
  — submitted : réponse soumise, en attente de validation admin
  — skipped : le joueur a passé cette mission
  — validated : l'admin a approuvé → le champ est mis à jour dans la fiche personne
  — rejected : l'admin a rejeté → rien ne change
- order_index (integer, NOT NULL) — Ordre d'affichage pour ce joueur (1 à 10)
- submitted_at (timestamptz, nullable)
- validated_at (timestamptz, nullable)
- validated_by (uuid, FK → auth.users, nullable)
- created_at

--- POLICIES RLS ---

Pour games :
- SELECT : tout utilisateur de l'environnement (y compris guests).
- INSERT : family_admin ou super_admin uniquement.
- UPDATE : family_admin, super_admin, OU le créateur du jeu.
- DELETE : family_admin ou super_admin.

Pour game_teams :
- SELECT : tout utilisateur de l'environnement.
- INSERT/UPDATE/DELETE : family_admin ou super_admin.

Pour game_players :
- SELECT : tout utilisateur de l'environnement.
- INSERT : tout utilisateur authentifié de l'environnement (on s'inscrit soi-même).
- UPDATE : le joueur lui-même (pour son score), ou family_admin/super_admin.
- DELETE : le joueur lui-même (quitter le jeu) ou admin.

Pour game_missions :
- SELECT : le joueur propriétaire de la mission OU family_admin/super_admin (pour la validation).
- INSERT : uniquement via la fonction de génération (pas d'insert direct).
- UPDATE : le joueur (pour soumettre sa réponse) OU l'admin (pour valider/rejeter).
- DELETE : admin uniquement.

--- FONCTION SQL : generate_remplissage_missions ---
Crée une fonction PostgreSQL `generate_remplissage_missions(game_id uuid)` qui :
1. Lit la config du jeu (missions_per_player, target_fields).
2. Pour chaque joueur du jeu, sélectionne aléatoirement N personnes de l'environnement qui ont des champs vides parmi les target_fields configurés.
3. Pour chaque mission, génère un hint adapté au champ :
   - birth_place → "Demandez à [prénom] où il/elle est né(e)"
   - profession → "Demandez à [prénom] quel est/était son métier"
   - birth_date → "Demandez à [prénom] sa date de naissance"
   - bio → "Demandez à [prénom] de vous raconter un souvenir marquant"
   - new_event → "Demandez à [prénom] un événement important de sa vie"
   - new_place → "Demandez à [prénom] un lieu qui a compté pour lui/elle"
4. Insère les missions avec un order_index de 1 à N.
5. Évite de donner la même personne/champ à deux joueurs différents (sauf si pas assez de champs vides).
6. Retourne le nombre total de missions générées.

--- FONCTION SQL : calculate_team_scores ---
Crée une fonction `calculate_team_scores(game_id uuid)` qui recalcule les scores :
- Score joueur = nombre de missions avec status 'submitted' ou 'validated' (les skips ne comptent pas).
- Score équipe = somme des scores de ses joueurs.
- Met à jour game_players.score, game_players.missions_completed, et game_teams.total_score.

--- INDEX ---
- games(environment_id, status)
- game_players(game_id)
- game_players(user_id)
- game_missions(game_id, player_id)
- game_missions(person_id)

--- TYPES TYPESCRIPT ---
Ajoute les types correspondants dans /src/lib/types/database.ts :
- Game, GameTeam, GamePlayer, GameMission
- GameConfig (type pour le champ jsonb config)
- GameStatus, MissionStatus, TargetField (union types)

Génère le fichier SQL complet, commenté en français, prêt à être exécuté dans l'éditeur SQL de Supabase.
```

---

## PROMPT J.1 — Navigation, hooks et état temps réel

📌 **Ce que ça fait :** Intègre le module Jeu dans la navigation existante, crée les hooks TanStack Query, et met en place la synchronisation temps réel via Supabase Realtime pour que tous les joueurs voient les mises à jour en direct.

⚙️ **Prérequis :** Prompt J.0 terminé (tables créées dans Supabase).

```
Intègre le module Jeu dans l'application Heritage existante.

--- 1. NAVIGATION ---
Ajoute dans la Sidebar existante (/src/components/layout/Sidebar.tsx) un nouvel élément de navigation :
- Icône : Gamepad2 (Lucide)
- Label : "Jeu"
- Route : /[envId]/game
- Si un jeu est actif (status = 'lobby' ou 'active') dans l'environnement :
  - Affiche un badge pulsant (point vert animé) à côté du label "Jeu" pour signaler qu'un jeu est en cours.
  - Le badge affiche le nombre de joueurs connectés.

Crée les pages placeholder :
- /src/app/(dashboard)/[envId]/game/page.tsx — Page principale du jeu
- /src/app/(dashboard)/[envId]/game/[gameId]/page.tsx — Vue d'un jeu spécifique
- /src/app/(dashboard)/[envId]/game/[gameId]/master/page.tsx — Vue Game Master (admin)

--- 2. SUPABASE REALTIME ---
Crée /src/lib/supabase/realtime.ts avec des fonctions pour s'abonner aux changements en temps réel :

subscribeToGame(gameId, callbacks) :
- Écoute les changements sur la table `games` (filtre sur l'id) → callbacks.onGameUpdate(game)
- Écoute les changements sur `game_players` (filtre sur game_id) → callbacks.onPlayerUpdate(players)
- Écoute les changements sur `game_teams` (filtre sur game_id) → callbacks.onTeamUpdate(teams)
- Écoute les changements sur `game_missions` (filtre sur game_id) → callbacks.onMissionUpdate(missions)
- Retourne une fonction unsubscribe() pour le cleanup.

Utilise les Supabase Realtime Channels avec des filtres postgres_changes.

--- 3. HOOKS TANSTACK QUERY (/src/hooks/game/) ---

Crée un dossier /src/hooks/game/ avec les hooks suivants :

useGames(envId) :
- Fetch la liste des jeux de l'environnement, triés par date (récent d'abord).
- Inclut un filtre par status.

useGame(gameId) :
- Fetch les détails d'un jeu avec ses équipes et joueurs.
- S'abonne au Realtime pour les mises à jour en direct.
- Invalide le cache TanStack Query quand un update Realtime arrive.

useGamePlayers(gameId) :
- Liste des joueurs avec leurs équipes et scores.
- Temps réel.

useGameMissions(gameId, playerId?) :
- Si playerId fourni : les missions de ce joueur uniquement.
- Si pas de playerId (admin) : toutes les missions du jeu.
- Temps réel.

useMyMissions(gameId) :
- Raccourci : récupère les missions du joueur connecté.
- Temps réel.

useActiveGame(envId) :
- Retourne le jeu en cours (status = 'lobby' ou 'active') s'il existe, null sinon.
- Utilisé par la Sidebar pour afficher le badge.
- Temps réel.

--- MUTATIONS ---

useCreateGame() :
- Crée un jeu avec config par défaut.
- Crée automatiquement 2 équipes avec des noms thématiques Heritage :
  Paire aléatoire parmi : ("Chêne" / "Lierre"), ("Racines" / "Branches"), ("Encre" / "Parchemin"), ("Aube" / "Crépuscule").
  Couleurs : équipe 1 = heritage-forest (#2D5016), équipe 2 = heritage-gold (#B8960C).

useJoinGame(gameId) :
- Inscrit le joueur connecté au jeu.
- Utilise le profil existant pour display_name et avatar_url.

useLeaveGame(gameId) :
- Retire le joueur du jeu (uniquement en phase lobby).

useStartGame(gameId) :
- Réservé aux admins.
- Change le status en 'active'.
- Appelle la fonction SQL generate_remplissage_missions.
- Enregistre started_at.

usePauseGame(gameId) / useResumeGame(gameId) :
- Pause/reprend le jeu.

useEndGame(gameId) :
- Termine le jeu manuellement.
- Calcule les scores finaux.
- Détermine l'équipe gagnante.

useSubmitAnswer(missionId) :
- Le joueur soumet sa réponse (answer + answer_data si applicable).
- Change le status de la mission en 'submitted'.
- Met à jour submitted_at.
- Recalcule le score du joueur et de l'équipe.

useSkipMission(missionId) :
- Le joueur passe cette mission.
- Vérifie que skips_used < max_skips_per_player (depuis la config du jeu).
- Change le status en 'skipped', incrémente skips_used sur game_players.

useValidateMission(missionId, approved: boolean) :
- Réservé aux admins (post-jeu).
- Si approved : status → 'validated', met à jour le champ correspondant dans la table people (ou crée l'événement/lieu).
- Si rejected : status → 'rejected'.

useBulkValidate(gameId) :
- Réservé aux admins.
- Valide toutes les missions 'submitted' d'un coup.
- Met à jour tous les champs correspondants dans people.

--- 4. CONTEXTE DU JEU ---
Crée /src/providers/game-provider.tsx :
- Un contexte React qui expose : activeGame, isPlayerInGame, myTeam, myMissions, gameTimeRemaining.
- Gère le timer côté client : calcule le temps restant à partir de started_at + timer_minutes.
- Quand le timer atteint 0 : déclenche automatiquement useEndGame.
- Wrappe les pages /game/* avec ce provider.

Assure-toi que tous les hooks fonctionnent et que le Realtime est bien configuré. Pas encore d'UI — on construit la plomberie d'abord.
```

---

## PROMPT J.2 — Page principale du Jeu & Lobby

📌 **Ce que ça fait :** Crée la page d'accueil du module Jeu et l'écran d'attente (lobby) où les joueurs rejoignent avant le lancement.

⚙️ **Prérequis :** Prompt J.1 terminé.

```
Implémente la page principale du Jeu (/src/app/(dashboard)/[envId]/game/page.tsx) et le lobby.

--- PAGE PRINCIPALE DU JEU ---

Cette page a 3 états possibles :

ÉTAT 1 — Aucun jeu actif :
- Titre "Jeu" en Playfair Display.
- Texte : "Aucun jeu en cours pour le moment."
- Si l'utilisateur est admin : bouton "Créer un nouveau jeu" (heritage-forest).
- En dessous : liste des jeux passés (status = 'finished') sous forme de cartes :
  - Nom du jeu, date, type, équipe gagnante, nombre de joueurs, nombre de missions complétées.
  - Clic → page de résultats du jeu.
- Si aucun jeu passé : EmptyState "Aucun jeu n'a encore été joué dans cette famille. Lancez le premier !"

ÉTAT 2 — Un jeu est en phase 'setup' ou 'lobby' :
- Affiche le composant Lobby (voir ci-dessous).

ÉTAT 3 — Un jeu est 'active' :
- Si le joueur est inscrit : redirige automatiquement vers /[envId]/game/[gameId] (vue joueur).
- Si le joueur n'est pas inscrit : affiche "Un jeu est en cours" avec un message "Le jeu a déjà commencé, vous ne pouvez plus le rejoindre."
- Si admin : lien vers la vue Game Master.

--- MODALE DE CRÉATION DE JEU (admin) ---
Formulaire en étapes :

Étape 1 — Paramètres :
- Nom du jeu (input texte, placeholder "Remplissage de Noël 2025").
- Type de jeu (select, pour l'instant seul "Remplissage" est disponible, affiché avec une description courte : "Les joueurs complètent les fiches de l'arbre en interrogeant la famille").
- Nombre de missions par joueur (input numérique, default 10, min 3, max 20).
- Timer (input numérique en minutes, default 30, min 10, max 120). Affiche une aide : "Le jeu se terminera automatiquement après ce délai."
- Maximum de skips par joueur (input numérique, default 2, min 0, max 5).

Étape 2 — Champs ciblés :
- Liste de checkboxes des champs disponibles pour les missions :
  ☑ Lieu de naissance (birth_place)
  ☑ Profession (profession)
  ☑ Date de naissance (birth_date)
  ☐ Biographie / souvenir (bio)
  ☐ Nouvel événement de vie (new_event)
  ☐ Nouveau lieu lié (new_place)
- Au moins un champ doit être sélectionné.
- Sous chaque checkbox, affiche le nombre de champs vides disponibles dans l'arbre pour ce type : "(23 champs vides dans l'arbre)" — pour que l'admin sache s'il y a assez de matière.

Étape 3 — Formation des équipes :
- Choix : "Équipes aléatoires" ou "Équipes manuelles".
- Si aléatoire : les équipes seront formées automatiquement au lancement.
- Si manuel : l'admin pourra assigner les joueurs dans le lobby.

Après validation : le jeu est créé en status 'lobby', la page affiche le lobby.

--- COMPOSANT LOBBY (/src/components/game/Lobby.tsx) ---

Layout en 2 colonnes sur desktop, empilé sur mobile :

Colonne gauche — Infos du jeu + Équipes :
- Nom du jeu en grand (Playfair).
- Badge du type de jeu : "Remplissage" avec icône Puzzle.
- Paramètres visibles : timer, missions par joueur, skips autorisés.
- Deux cartes d'équipe côte à côte :
  - Nom de l'équipe + couleur (bande colorée en haut de la carte).
  - Liste des joueurs dans cette équipe (avatar + nom).
  - Si mode manuel ET admin : drag & drop des joueurs entre les équipes.
  - Si mode aléatoire : les joueurs ne sont assignés à aucune équipe encore, ils apparaissent dans une zone "En attente" commune. Un texte indique "Les équipes seront formées au lancement."

Colonne droite — Liste d'attente :
- Titre "Joueurs connectés" avec compteur.
- Liste des joueurs ayant rejoint (avatar + nom + heure d'arrivée).
- Animation d'entrée quand un nouveau joueur rejoint (slide in + petit son optionnel).

En bas :
- Pour les joueurs non inscrits : gros bouton "Rejoindre le jeu" (heritage-forest, pleine largeur).
- Pour les joueurs inscrits : bouton "Quitter le lobby" (ghost, discret).
- Pour l'admin : bouton "Lancer le jeu !" (heritage-forest, grand, avec icône Play).
  - Désactivé si moins de 2 joueurs.
  - Au clic : modale de confirmation "Lancer le jeu avec X joueurs ? Les équipes seront formées et les missions distribuées."
  - Si mode aléatoire : répartit les joueurs aléatoirement dans les 2 équipes avant de lancer.

Temps réel : la liste des joueurs se met à jour instantanément quand quelqu'un rejoint ou quitte (via Supabase Realtime).

--- STYLE ---
- Cohérent avec le thème Heritage.
- Les cartes d'équipe ont une bordure colorée (forest pour équipe 1, gold pour équipe 2).
- Animation subtile de "pulsation" sur le bouton "Lancer le jeu" pour inciter l'admin.
- Sur mobile : les deux équipes s'empilent verticalement.
```

---

## PROMPT J.3 — Vue Joueur (écran de jeu)

📌 **Ce que ça fait :** Crée l'interface que chaque joueur voit sur son téléphone pendant le jeu. C'est l'écran principal de gameplay.

⚙️ **Prérequis :** Prompt J.2 terminé.

```
Implémente la vue Joueur du jeu Remplissage (/src/app/(dashboard)/[envId]/game/[gameId]/page.tsx).

Cette page est l'écran de jeu que chaque joueur voit sur son téléphone. Elle doit être optimisée mobile-first.

--- HEADER DE JEU (fixe en haut) ---
Barre fixe en haut de l'écran avec :
- À gauche : nom de l'équipe + pastille de couleur.
- Au centre : timer décompte en temps réel (format MM:SS). 
  - Vert si > 10 min restantes.
  - Orange si entre 5 et 10 min.
  - Rouge clignotant si < 5 min.
- À droite : score personnel (ex: "4/10") avec icône étoile.
- Sous la barre : barre de progression fine montrant l'avancement global de l'équipe (somme des missions complétées / total des missions de l'équipe).

--- MISSION COURANTE (centre de l'écran) ---
Le joueur voit ses missions une par une. Il navigue entre elles via swipe ou boutons prev/next.

Pour chaque mission, affiche une carte pleine largeur :

En haut de la carte :
- Badge "Mission 3/10" avec le numéro.
- Badge de statut : "À faire" (gris), "Répondu ✓" (vert), "Passé" (orange).

Section "Qui chercher ?" :
- Photo de la personne en grand (ou avatar avec initiales, taille XL).
- Prénom et Nom en Playfair Display, grande taille.
- Mini-arbre simplifié : 
  Affiche un schéma compact de la personne avec :
  - Ses parents au-dessus (noms uniquement, en petit).
  - Son/ses conjoint(s) à côté.
  - Ses enfants en dessous (noms uniquement, en petit).
  Utilise un composant SVG simple (pas react-flow) pour cet affichage léger.
  But : aider le joueur à identifier la personne en présentiel ("Ah, c'est le père de Marie !").

Section "Votre mission" :
- Le champ à compléter, affiché clairement :
  Icône + texte en gras : "📍 Lieu de naissance" ou "💼 Profession" ou "🎂 Date de naissance" etc.
- Suggestion de question à poser (hint) en italique, couleur heritage-brown :
  "Demandez à Jean où il est né"

Section "Votre réponse" :
- Input adapté au type de champ :
  - birth_place : champ texte libre (placeholder "Ex: Lyon, France")
  - profession : champ texte libre (placeholder "Ex: Institutrice")
  - birth_date : date picker
  - bio : textarea (placeholder "Racontez ce qu'il/elle vous a dit...")
  - new_event : formulaire mini avec : type d'événement (select), titre, date, description
  - new_place : formulaire mini avec : nom du lieu, adresse, ville, pays
- Bouton "Valider ma réponse" (heritage-forest, pleine largeur).
  - Après validation : animation de succès (check vert + confetti subtils), la carte passe en statut "Répondu".
  - Le score se met à jour.
- Bouton "Passer cette mission" (ghost, petit, en dessous).
  - Affiche le nombre de skips restants : "Passer (1 restant)".
  - Si plus de skips : bouton désactivé avec tooltip "Vous avez utilisé tous vos passes."
  - Modale de confirmation : "Êtes-vous sûr ? Cette mission ne rapportera pas de point."

--- NAVIGATION ENTRE MISSIONS ---
- Swipe gauche/droite pour naviguer entre les missions (ou boutons flèche).
- Indicateur de dots en bas (comme un carrousel) montrant la position actuelle.
- Les missions répondues ont un dot vert, les skippées un dot orange, les restantes un dot gris.

--- ÉCRAN DE FIN DE JEU (quand le timer arrive à 0 ou toutes les missions sont faites) ---
Si le joueur a terminé toutes ses missions avant le timer :
- Affiche un écran d'attente : "Bien joué ! 🎉 Vous avez terminé toutes vos missions. En attente de la fin du jeu..."
- Montre la progression de l'équipe en temps réel.

Quand le jeu se termine :
- Transition vers un écran de résultats temporaire :
  - "Temps écoulé !" ou "Toutes les missions sont complétées !"
  - Score de l'équipe.
  - "Résultats complets bientôt disponibles."
  - Bouton "Retour au tableau de bord".

--- GESTION DU JEU EN PAUSE ---
Si l'admin met le jeu en pause :
- Overlay plein écran semi-transparent avec : "⏸ Jeu en pause" + "L'administrateur a mis le jeu en pause. Veuillez patienter."
- Le timer s'arrête.
- Les inputs sont désactivés.

--- CONTRAINTES TECHNIQUES ---
- Mobile-first : tout doit être confortable sur un écran de téléphone.
- Le swipe entre missions utilise un système de carousel basique (CSS scroll-snap ou state React, PAS de librairie lourde).
- Les mises à jour de score sont en temps réel via Supabase Realtime.
- Si la connexion est perdue : afficher un bandeau "Connexion perdue, tentative de reconnexion..." et les réponses sont stockées en mémoire pour être envoyées à la reconnexion.
```

---

## PROMPT J.4 — Vue Game Master (admin)

📌 **Ce que ça fait :** Crée le tableau de bord temps réel que l'admin voit pendant le jeu, conçu pour être projeté sur un écran TV lors de la réunion de famille.

⚙️ **Prérequis :** Prompt J.3 terminé.

```
Implémente la vue Game Master (/src/app/(dashboard)/[envId]/game/[gameId]/master/page.tsx).

Cette page est le tableau de bord admin affiché pendant le jeu. Elle est conçue pour être projetée sur un écran TV en présentiel.

--- ACCÈS ---
Réservée aux family_admin et super_admin. Si un autre rôle tente d'y accéder, redirige vers la vue joueur.
Lien d'accès depuis le lobby (bouton "Ouvrir le tableau de bord Game Master") et depuis la vue joueur (icône Settings en haut à droite, admin only).

--- LAYOUT GAME MASTER ---
Plein écran, pas de sidebar Heritage (mode immersif).
Fond heritage-dark (fond sombre pour un meilleur rendu sur TV).
Texte en heritage-cream/heritage-white pour le contraste.

EN HAUT — Barre de statut :
- À gauche : Nom du jeu en Playfair Display, grand.
- Au centre : Timer géant (format MM:SS), très lisible de loin.
  - Même logique de couleur que la vue joueur (vert → orange → rouge).
- À droite : Boutons admin :
  - ⏸ Pause / ▶ Reprendre
  - ⏹ Terminer le jeu
  - Bouton "Retour" (quitter le mode Game Master).

AU CENTRE — Scoreboard en temps réel :
Layout en 2 colonnes, une par équipe :

Pour chaque équipe :
- Nom de l'équipe en grand + couleur (heritage-forest ou heritage-gold).
- Score total géant (nombre, très grand, animé quand il change — compteur qui s'incrémente).
- Barre de progression circulaire ou barre horizontale montrant le % de missions complétées.
- Liste des joueurs de l'équipe :
  - Avatar + Nom.
  - Score individuel (ex: "7/10").
  - Mini barre de progression individuelle.
  - Indicateur d'activité : point vert si le joueur a soumis une réponse dans les 2 dernières minutes, gris sinon.
- Animation spéciale quand un joueur complète une mission : le score s'incrémente avec un effet de pulse/glow sur la ligne du joueur.

ENTRE LES DEUX ÉQUIPES (au centre) :
- Indicateur visuel de "qui mène" : flèche ou surbrillance sur l'équipe en tête.
- Si les scores sont égaux : affiche "Égalité" avec une icône balance.

EN BAS — Ticker de progression :
- Bandeau défilant (ou feed) des dernières actions :
  "🟢 Marie (Équipe Chêne) a complété : Lieu de naissance de Jean Dupont"
  "🟡 Pierre (Équipe Lierre) a passé une mission"
  "🟢 Sophie (Équipe Lierre) a complété : Profession de Robert Martin"
- Les actions apparaissent avec une animation slide-in.
- Maximum 5 dernières actions visibles.

--- ANIMATIONS & EFFETS ---
- Quand une équipe prend la tête : transition fluide du highlight.
- Quand un joueur complète une mission : pulse sur sa ligne + incrémentation animée du score.
- Timer dans les 5 dernières minutes : fond qui pulse légèrement en rouge.
- Quand le jeu se termine : animation de "TERMINÉ" en grand avec confettis, puis affichage du gagnant avec fanfare visuelle (l'équipe gagnante s'agrandit, couleur dorée).

--- MODE RESPONSIVE ---
Sur un grand écran/TV : layout optimal, textes très grands.
Sur tablette : layout adapté, toujours lisible.
Sur mobile : version compacte (les deux équipes empilées, scores plus petits).

--- TEMPS RÉEL ---
TOUT est en temps réel via Supabase Realtime :
- Scores, barres de progression, ticker d'actions, timer synchronisé.
- Le Game Master ne fait aucun refresh — tout est push.

--- BONUS : EFFETS SONORES (optionnel) ---
Si le temps le permet, ajoute des sons courts via l'API Web Audio ou un simple fichier audio :
- Son de "ding" quand un joueur complète une mission.
- Son de "buzzer" quand le timer se termine.
- Son de "fanfare" pour l'équipe gagnante.
Ces sons sont activables/désactivables via un bouton mute dans la barre admin.
```

---

## PROMPT J.5 — Validation post-jeu & Résultats

📌 **Ce que ça fait :** Crée l'écran de validation admin après le jeu (approuver/rejeter les réponses) et l'écran de résultats détaillés accessible à tous.

⚙️ **Prérequis :** Prompt J.4 terminé.

```
Implémente le système de validation post-jeu et l'écran de résultats.

--- 1. PAGE DE VALIDATION ADMIN (/[envId]/game/[gameId]/validate) ---

Accessible uniquement aux family_admin et super_admin, après la fin du jeu (status = 'finished').
Lien depuis la page de résultats : bouton "Valider les réponses".

Layout :
- Titre : "Validation des réponses — [Nom du jeu]" en Playfair.
- Statistiques en haut : X réponses à valider, Y déjà validées, Z rejetées.
- Barre de progression de la validation.

Liste des missions soumises (status = 'submitted'), groupées par personne de l'arbre :

Pour chaque personne :
- En-tête : Photo + Nom de la personne + lien vers sa fiche.
- Liste de ses missions :
  - Champ ciblé (ex: "Lieu de naissance").
  - Réponse soumise par le joueur (en grand, bien visible).
  - Nom du joueur qui a répondu + son équipe.
  - Deux boutons :
    - ✓ Valider (heritage-forest) → Change le status en 'validated'.
      Action : met à jour le champ correspondant dans la table `people`.
      - Si target_field = 'birth_place' → UPDATE people SET birth_place = answer WHERE id = person_id.
      - Si target_field = 'profession' → UPDATE people SET profession = answer.
      - Si target_field = 'birth_date' → UPDATE people SET birth_date = answer (parse la date).
      - Si target_field = 'bio' → UPDATE people SET bio = answer (concatène si bio existante ? ou remplace ?). Décision : concatène avec un séparateur "---" si la bio existait déjà.
      - Si target_field = 'new_event' → INSERT dans la table events avec les données de answer_data.
      - Si target_field = 'new_place' → INSERT dans la table places avec answer_data, puis crée un événement liant la personne au lieu.
    - ✗ Rejeter (heritage-red) → Change le status en 'rejected'. Rien ne change dans people.
  - Input optionnel "Corriger avant validation" : permet à l'admin de modifier la réponse avant de valider (ex: corriger une faute d'orthographe).

Actions groupées en haut de page :
- Bouton "Tout valider" : valide toutes les réponses d'un coup (avec modale de confirmation).
- Bouton "Tout rejeter" : rejète toutes les réponses restantes.

Après que toutes les missions sont traitées :
- Affiche un résumé : "X champs mis à jour dans l'arbre familial. Merci d'avoir joué !"
- Bouton "Voir les résultats du jeu".

--- 2. PAGE DE RÉSULTATS (/[envId]/game/[gameId] quand status = 'finished') ---

Accessible à tous les joueurs et membres de l'environnement.

Layout festif :

EN HAUT — Annonce du gagnant :
- Grande bannière avec la couleur de l'équipe gagnante.
- "🏆 L'équipe [Nom] remporte le jeu !" en Playfair, grande taille.
- Score final : "[Score Équipe 1] — [Score Équipe 2]".
- Si égalité : "Match nul ! Les deux équipes sont à égalité."

SECTION — Statistiques du jeu :
4 cartes de stats :
- ⏱ Durée du jeu (temps réellement écoulé).
- 📝 Missions complétées (total, ex: "47/60").
- 🌳 Champs de l'arbre complétés (nombre de missions validées par l'admin, avec un texte "L'arbre familial s'est enrichi de X informations grâce à ce jeu !").
- 🏅 Meilleur joueur (celui avec le plus de missions complétées).

SECTION — Classement par équipe :
Deux colonnes (une par équipe) :
- Pour chaque joueur : avatar, nom, score individuel, nombre de skips.
- Trié par score décroissant.
- Badge spécial pour le meilleur joueur de chaque équipe (couronne dorée).
- Badge spécial pour le meilleur joueur global (étoile).

SECTION — Détail des missions (accordéon, replié par défaut) :
- Liste de toutes les missions groupées par joueur.
- Pour chaque mission : personne ciblée, champ, réponse, statut (validated ✓, rejected ✗, skipped ↷).
- Si la mission est validée : affiche "Cette réponse a enrichi l'arbre !" avec un check vert.

SECTION — Avant / Après :
- Comparaison du taux de complétude de l'arbre avant et après le jeu.
- Deux barres de progression côte à côte :
  - "Avant le jeu : 62% de fiches complètes"
  - "Après le jeu : 71% de fiches complètes"
- Différence mise en valeur : "+9% grâce au jeu !"

EN BAS :
- Bouton "Rejouer" (crée un nouveau jeu avec les mêmes paramètres) — admin only.
- Bouton "Retour au tableau de bord".

--- STYLE ---
- Page de validation : thème Heritage classique, fonctionnel.
- Page de résultats : un peu plus festif que le reste de l'app (utiliser heritage-gold comme accent, ombres légèrement plus marquées, léger fond texturé).
- Animations : les scores apparaissent avec un effet de compteur animé (count-up), les barres de progression se remplissent avec une animation.
```

---

## PROMPT J.6 — Tests, polish & intégration finale

📌 **Ce que ça fait :** Passe de finition du module jeu, intégration propre avec le reste de l'app, gestion des cas limites.

⚙️ **Prérequis :** Prompts J.0 à J.5 terminés.

```
Effectue une passe de finition et d'intégration du module Jeu dans Heritage.

--- 1. CAS LIMITES À GÉRER ---

Pas assez de champs vides :
- Si le nombre de champs vides dans l'arbre < missions_per_player × nombre de joueurs :
  - Afficher un avertissement à l'admin dans la modale de création : "Attention : il n'y a que X champs vides disponibles pour Y missions demandées. Certains joueurs pourraient recevoir des missions en double."
  - Réduire automatiquement le nombre de missions si nécessaire.

Joueur qui quitte en cours de jeu :
- Ses missions restent assignées mais ne bloquent pas l'équipe.
- Son score reste figé.
- Dans la vue Game Master, afficher un indicateur "Déconnecté" à côté de son nom si inactif > 5 min.

Personne de l'arbre décédée :
- Pour les missions sur des personnes décédées (is_alive = false), adapter le hint :
  - Au lieu de "Demandez à Jean...", écrire "Cherchez dans les archives ou demandez à un proche de Jean..."
  - Cela permet d'inclure les personnes décédées dans le jeu tout en gardant un ton approprié.

Admin ferme le navigateur :
- Le jeu continue. Le timer est calculé côté serveur (started_at + timer_minutes).
- N'importe quel admin peut reprendre le contrôle via la vue Game Master.

Plusieurs jeux :
- Un seul jeu peut être actif à la fois par environnement.
- Empêcher la création d'un nouveau jeu si un jeu est déjà en status 'lobby' ou 'active'.

--- 2. INTÉGRATION AVEC LE DASHBOARD FAMILY ---

Dans le dashboard famille (/[envId]/page.tsx), ajouter une section "Jeu" :
- Si un jeu est actif : carte avec le nom du jeu, statut, nombre de joueurs, bouton "Rejoindre" ou "Voir le tableau de bord".
- Si aucun jeu actif : carte avec "Aucun jeu en cours" + bouton "Créer un jeu" (admin) ou texte "L'admin peut lancer un jeu depuis l'onglet Jeu."
- Liste des 3 derniers jeux terminés avec scores résumés.

--- 3. NOTIFICATIONS ---

Utilise le système de Toast existant pour :
- "Un jeu vient d'être créé ! Rejoignez le lobby." (quand un admin crée un jeu, notification pour tous).
- "Le jeu commence !" (quand l'admin lance le jeu).
- "Plus que 5 minutes !" (pendant le jeu).
- "Le jeu est terminé !" (fin du timer).

Note : ces notifications sont basées sur les événements Realtime, pas sur des push notifications. Elles apparaissent uniquement si l'utilisateur a l'app ouverte.

--- 4. ACCESSIBILITÉ & RESPONSIVE ---

Vue joueur (mobile-first) :
- Le swipe entre missions doit fonctionner de manière fluide sur iOS et Android.
- Les inputs doivent être assez grands pour être facilement tapables.
- Le clavier mobile ne doit pas masquer le bouton "Valider".

Vue Game Master :
- Tester sur un ratio 16:9 (TV).
- Les textes doivent être lisibles à 3-4 mètres de distance.
- Taille de police minimum : 24px pour les scores, 18px pour les noms.

--- 5. CLEAN UP ---

- Vérifie que toutes les pages du jeu respectent le thème Heritage.
- Vérifie que les animations sont cohérentes avec le reste de l'app (pas de style complètement différent).
- Vérifie que le mode "guest" (lecture seule) peut bien rejoindre et jouer au jeu.
- Vérifie que les logs d'audit capturent les modifications faites par la validation des missions (les champs mis à jour dans people doivent être loggés).
- Ajoute des commentaires dans le code pour les futurs types de jeux : marque les endroits extensibles avec "// EXTENSIBLE: ajouter ici les futurs types de jeux".

--- 6. STRUCTURE FINALE DES FICHIERS DU MODULE JEU ---

Vérifie que la structure est propre :
```
src/
├── app/(dashboard)/[envId]/game/
│   ├── page.tsx                    # Page principale (lobby / liste)
│   └── [gameId]/
│       ├── page.tsx                # Vue joueur
│       ├── master/page.tsx         # Vue Game Master
│       └── validate/page.tsx       # Validation post-jeu
├── components/game/
│   ├── Lobby.tsx
│   ├── MissionCard.tsx             # Carte mission (vue joueur)
│   ├── MiniTree.tsx                # Mini-arbre SVG pour identifier la personne
│   ├── ScoreBoard.tsx              # Scoreboard temps réel (Game Master)
│   ├── TeamCard.tsx                # Carte d'équipe
│   ├── GameTimer.tsx               # Timer réutilisable
│   ├── ActionTicker.tsx            # Ticker d'actions (Game Master)
│   ├── ValidationCard.tsx          # Carte de validation (admin post-jeu)
│   └── GameResults.tsx             # Écran de résultats
├── hooks/game/
│   ├── useGames.ts
│   ├── useGame.ts
│   ├── useGamePlayers.ts
│   ├── useGameMissions.ts
│   ├── useMyMissions.ts
│   ├── useActiveGame.ts
│   └── mutations.ts                # Toutes les mutations du jeu
├── lib/game/
│   ├── types.ts                    # Types TypeScript du jeu
│   ├── mission-generator.ts        # Logique de génération côté client (fallback)
│   └── score-calculator.ts         # Calcul de scores
└── providers/
    └── game-provider.tsx
```
```

---

## Notes d'exécution pour le module Jeu

1. **Ordre strict :** Exécute J.0 → J.1 → J.2 → J.3 → J.4 → J.5 → J.6.
2. **Le Realtime Supabase** est critique pour ce module. Après J.1, teste que les événements Realtime fonctionnent en ouvrant 2 onglets de navigateur.
3. **Teste en conditions réelles** : ouvre 3-4 onglets simulant des joueurs différents + 1 onglet admin Game Master.
4. **Le prompt J.3 (vue joueur) est le plus important** côté UX — c'est ce que les joueurs verront sur leur téléphone. Priorise la fluidité mobile.
5. **Commite après chaque prompt** : `git commit -m "Game module J.X — [description]"`.
