# Tetris Web

Front-end React/Vite + back-end Express/Prisma pour un Tetris multi-modes : classique, sprint 40 lignes, versus en temps réel (WebSocket), roguelike à perks et Brickfall (solo + versus). Authentification JWT, succès et classements persistés en base PostgreSQL.

## Stack
- Front : React 19 + TypeScript, Vite, Tailwind classes.
- Back : Express 5, Prisma/PostgreSQL, JWT, WebSocket (ws), Vitest.
- Infra : Docker/Docker Compose (dev & prod).

## Structure
- `frontend/` : SPA React/Vite (architecture feature-first).
- `backend/` : API REST + WebSocket (`/ws`), Prisma, tests.
- `docker-compose.dev.yml` / `docker-compose.prod.yml` : environnements complets (db + api + front).
- `backend/prisma/schema.prisma` : modèles User, Score, VersusMatch, Achievement, UserAchievement, UserAchievementStats.

## Architecture frontend (feature-first)
Le front est organisé par domaine fonctionnel, chaque feature regroupe ses pages, composants et logique métier.

- `frontend/src/features/` : un dossier par feature (`app`, `auth`, `achievements`, `game`, `versus`, `roguelike`, `brickfallSolo`, `brickfallVersus`, `settings`).
- `frontend/src/features/<feature>/pages/` : pages/écrans liés à la feature.
- `frontend/src/features/<feature>/components/` : UI spécifique à la feature (sous-dossiers par sous-système si besoin).
- `frontend/src/features/<feature>/hooks/` : hooks React spécifiques à la feature.
- `frontend/src/features/<feature>/logic/` : logique de gameplay/traitements purs.
- `frontend/src/features/<feature>/data/` : données statiques (config, catalogues, listes).
- `frontend/src/features/<feature>/services/` : appels API, side effects.
- `frontend/src/features/<feature>/types/` : types locaux à la feature.
- `frontend/src/features/<feature>/utils/` : helpers ciblés.
- `frontend/src/shared/` : briques transverses réutilisables (components, ui, utils, types).
- `frontend/src/styles/` : styles globaux et spécifiques (roguelike, perks, settings, achievements).

Entrée de l’app :
- `frontend/src/main.tsx` : bootstrap React + providers globaux.
- `frontend/src/App.tsx` : routing et layout global.

## Modes de jeu & contrôles
- Classique : scoring infini, sauvegarde du score par utilisateur.
- Sprint : chronomètre 40 lignes, enregistrement du temps (seconds).
- Versus : matchmaking par ID, sac partagé + garbage, sauvegarde du match.
- Solo vs Tetrobots (Tetris Versus) : duel local contre IA avec profils de difficulté.
- Roguelike : perks aléatoires, bombes (`B`), hold étendu.
- Roguelike vs Tetrobots : duel roguelike contre IA (perks, synergies, mutations, bombes).
- Brickfall Solo : campagne + niveaux custom, blocs spéciaux (`armored`, `bomb`, `cursed`, `mirror`), power-ups et progression.
- Brickfall Versus : duel architecte/démolisseur avec envoi d’événements temps réel (spawn spéciaux, bombes, debuffs).
- Brickfall vs Tetrobots : variante solo locale contre bot, rôles architecte/démolisseur.
- Contrôles : flèches (gauche/droite/bas), `ArrowUp` rotation, `Espace` hard drop, `Shift` ou `C` hold, `B` bombe (roguelike).

## Tetrobots (IA)
- Personnalités IA disponibles : `Tetrobots Rookie` (facile), `Tetrobots Pulse` (normal), `Tetrobots Apex` (difficile).
- Réglages par personnalité : temps de réaction, taux d’erreur simulée (`mistakeRate`), pondérations heuristiques (hauteur, trous, bumpiness, lignes).
- Intégration dans les boards : planification automatique des placements via `computeTetrobotsPlan`.
- UI dédiée : avatar/mood (`idle`, `thinking`, `happy`, `angry`, `glitch`, etc.) et bulles de dialogues contextuelles.
- Modes concernés dans le front :
  - `frontend/src/features/versus/` (Tetris versus bot)
  - `frontend/src/features/roguelikeVersus/` (roguelike vs bot)
  - `frontend/src/features/brickfallVersus/pages/BrickfallVersusBot.tsx` (Brickfall vs bot)
- Persistance backend : les résultats bot sont normalisés côté API via des pseudos `Tetrobots...` et des comptes techniques dédiés.

## Brickfall Solo : éditeur de niveaux
- Accès depuis la page `Brickfall Solo` via le bouton éditeur.
- L’éditeur s’ouvre sur un niveau vierge par défaut (pas d’auto-chargement d’un ancien niveau).
- Types de blocs disponibles : `normal`, `armor`, `bonus`, `malus`, `explosive`, `cursed`, `mirror`.
- Export : bouton `Export JSON` (fichier `.json` téléchargeable).
- Import : bouton `Import JSON` avec sélection de fichier `.json` (niveau unique ou tableau de niveaux).
- Sauvegarde locale + tentative de synchronisation serveur (`/api/brickfall-solo/custom-levels`).

## Assets frontend
- Les icônes de synergies utilisent les fichiers dans `frontend/public/Synergies/`.
- Les sprites de blocs Brickfall utilisent les fichiers dans `frontend/public/blocs/`.
- Les power-ups Brickfall utilisent les fichiers dans `frontend/public/powerups/`.

## Pré-requis
- Node.js 18+ et npm.
- PostgreSQL (ou laisser Compose lancer le conteneur).
- Ports par défaut : front 5173, back API 8080, WS sur le même hôte (`/ws`).

## Configuration
Backend (`backend/.env` exemple) :
```
DATABASE_URL=postgresql://tetris_user:tetris_pass@localhost:5432/tetris_db?schema=public
JWT_SECRET=super_secret_tetris_key
PORT=8080
ALLOWED_ORIGINS=http://localhost:5173
# (prod docker-compose) BACKEND_PORT=8080, BACKEND_INTERNAL_PORT=8080
```

Frontend (`frontend/.env.development` exemple) :
```
VITE_API_URL=http://localhost:8080/api
```

## Démarrage rapide (Docker)
```bash
docker-compose -f docker-compose.dev.yml up --build
# Front : http://localhost:5173
# API & WS : http://localhost:8080/api et ws://localhost:8080/ws
```

## Démarrage manuel
Backend :
```bash
cd backend
npm install
npx prisma migrate dev   # applique le schéma local
npm run dev                          # ou npm run build && npm start
```

Frontend :
```bash
cd frontend
npm install
npm run dev -- --host                # VITE_API_URL doit pointer vers l'API
```

## Scripts utiles
Backend : `npm run dev` (tsx + prisma generate), `npm run build`, `npm start`, `npm test` (Vitest, Prisma mock), `npm run prisma:generate`.
Frontend : `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.

## Succès & progression
- Déblocage côté client + synchronisation serveur des succès.
- Stats persistées en base pour la progression globale (ex: jours de connexion) via `UserAchievementStats`.

## API (résumé)
- Auth : `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
- Scores : `POST /api/scores` (JWT), `GET /api/scores/me/:mode` (JWT), `GET /api/scores/leaderboard/:mode`, `POST /api/scores/versus-match` (résultat de duel).
- Succès : `GET /api/achievements` (débloqués), `POST /api/achievements/unlock`.
- Stats succès : `GET /api/achievements/stats`, `POST /api/achievements/stats` (jours de connexion).
- WebSocket Versus : `/ws`
  - Entrant : `join_match`, `lines_cleared`, `state` (grille), `game_over`.
  - Sortant : `match_joined`, `start` (sac initial + slot), `bag_refill`, `garbage`, `opponent_state`, `opponent_finished`, `match_over`, `players_sync`, `opponent_left`.

## Notes production
- Build front : `npm run build` puis `npm run preview` pour tester.
- Build back : `npm run build` puis `npm start`.
- Compose prod : `docker-compose -f docker-compose.prod.yml up --build` (utilise `backend/.env` et expose 5173 + BACKEND_PORT).
- Sécuriser `JWT_SECRET` et `DATABASE_URL`, ajuster `ALLOWED_ORIGINS`.
- Appliquer les migrations Prisma (`npx prisma migrate deploy`).

## Tests
- Backend : `npm test` (Vitest, supertest, Prisma mock).
- Frontend : pas de tests automatisés fournis.
