# Backend

API Express + Prisma/PostgreSQL + WebSocket (`/ws`) pour les modes Tetris.

## Structure
- `src/` : code serveur (routes, services, websocket, middleware).
- `prisma/` : schéma et migrations.
- `tests/` : tests Vitest/Supertest.

## Scripts
- `npm run dev`
- `npm run build`
- `npm start`
- `npm test`
- `npm run prisma:generate`

## Config
Créer `backend/.env` :
```
DATABASE_URL=postgresql://tetris_user:tetris_pass@localhost:5432/tetris_db?schema=public
JWT_SECRET=super_secret_tetris_key
PORT=8080
ALLOWED_ORIGINS=http://localhost:5173
```

## Démarrage
```bash
npm install
npx prisma migrate dev
npm run dev
```

## Notes
- En prod : `npx prisma migrate deploy`.
- Le WebSocket est exposé sur `/ws` (même hôte/port que l’API).

## Routes principales
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/scores/token`
- `POST /api/scores`
- `GET /api/scores/me/:mode`
- `GET /api/scores/leaderboard/:mode`
- `POST /api/scores/versus-match`
- `GET /api/achievements`
- `POST /api/achievements/unlock`
- `GET /api/achievements/stats`
- `POST /api/achievements/stats`
- `POST /api/roguelike/run/start`
- `GET /api/roguelike/run/current`
- `POST /api/roguelike/run/:id/checkpoint`
- `POST /api/roguelike/run/:id/end`
- `GET /api/roguelike/leaderboard`
- `GET /api/roguelike/runs/me`

## Détail par fichier de routes
### Auth & headers
- Auth JWT : cookie HTTP `AUTH_COOKIE_NAME` (cookie défini côté serveur) ou header `Authorization: Bearer <token>` si utilisé côté client.
- Run token : header `x-run-token` ou body `runToken` (utilisé pour `/api/scores` et `/api/scores/versus-match`).

### `src/routes/auth.routes.ts`
- `POST /api/auth/register` : création de compte (rate limit).
- `POST /api/auth/login` : connexion (rate limit).
- `GET /api/auth/me` : profil du user connecté (JWT requis).
- `POST /api/auth/logout` : clear cookie JWT.

### `src/routes/achievements.routes.ts`
- `GET /api/achievements` : achievements débloqués (JWT requis).
- `POST /api/achievements/unlock` : unlock en batch (JWT requis).
- `GET /api/achievements/stats` : stats (login days, JWT requis).
- `POST /api/achievements/stats` : maj des stats (login days, JWT requis).

### `src/routes/score.routes.ts`
- `POST /api/scores/token` : run token anti-triche (JWT requis).
- `POST /api/scores` : enregistrement d’un score (JWT + run token requis).
- `POST /api/scores/versus-match` : résultat d’un match versus (JWT + run token requis).
- `GET /api/scores/me/:mode` : scores du joueur (JWT requis).
- `GET /api/scores/leaderboard/:mode` : leaderboard (classique/sprint/versus).

### `src/routes/roguelike.routes.ts`
- `POST /api/roguelike/run/start` : démarre une run (JWT requis).
- `GET /api/roguelike/run/current` : run courante (JWT requis).
- `POST /api/roguelike/run/:id/checkpoint` : checkpoint (JWT requis).
- `POST /api/roguelike/run/:id/end` : fin de run (JWT requis).
- `GET /api/roguelike/leaderboard` : leaderboard roguelike.
- `GET /api/roguelike/runs/me` : runs du joueur (JWT requis).

## Schéma d’architecture
```
Client (SPA)
  | HTTP (REST)              | WS
  v                          v
API Express -------------- WebSocket (/ws)
  | Prisma
  v
PostgreSQL
```

## Schéma détaillé (modules, services, middleware)
```
Client (SPA)
  |
  | HTTP (REST)                        WS
  v                                   v
API Express (`src/app.ts`, `src/server.ts`)     WebSocket (`src/ws/server.ts`)
  |                                             |
  |--> Middlewares (`src/middleware/`)          |--> Versus live
  |     - auth.middleware.ts                    - game state sync
  |     - error.middleware.ts                   - garbage / bag
  |
  |--> Routes (`src/routes/`)
  |     - auth.routes.ts
  |     - achievements.routes.ts
  |     - score.routes.ts
  |     - roguelike.routes.ts
  |
  |--> Controllers (`src/controllers/`)
  |     - auth.controller.ts
  |     - roguelike.controller.ts
  |
  |--> Prisma client (`src/prisma/client.ts`)
  |--> Utils (`src/utils/`) + Types (`src/types/`)
  v
PostgreSQL
```
