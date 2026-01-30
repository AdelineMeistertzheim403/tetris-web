# Tetris Web

Front-end React/Vite + back-end Express/Prisma pour un Tetris multi-modes : classique, sprint 40 lignes, versus en temps réel (WebSocket) et roguelike à perks. Authentification JWT, succès et classements persistés en base PostgreSQL.

## Stack
- Front : React 19 + TypeScript, Vite, Tailwind classes.
- Back : Express 5, Prisma/PostgreSQL, JWT, WebSocket (ws), Vitest.
- Infra : Docker/Docker Compose (dev & prod).

## Structure
- `frontend/` : SPA (pages, composants, hooks de jeu, services API).
- `backend/` : API REST + WebSocket (`/ws`), Prisma, tests.
- `docker-compose.dev.yml` / `docker-compose.prod.yml` : environnements complets (db + api + front).
- `backend/prisma/schema.prisma` : modèles User, Score, VersusMatch, Achievement, UserAchievement, UserAchievementStats.

## Modes de jeu & contrôles
- Classique : scoring infini, sauvegarde du score par utilisateur.
- Sprint : chronomètre 40 lignes, enregistrement du temps (seconds).
- Versus : matchmaking par ID, sac partagé + garbage, sauvegarde du match.
- Roguelike : perks aléatoires, bombes (`B`), hold étendu.
- Contrôles : flèches (gauche/droite/bas), `ArrowUp` rotation, `Espace` hard drop, `Shift` ou `C` hold, `B` bombe (roguelike).

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
