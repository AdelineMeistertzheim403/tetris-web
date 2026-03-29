# Frontend

SPA React + TypeScript construite avec Vite. Architecture feature-first.

## Structure
- `src/main.tsx` : bootstrap React + providers globaux.
- `src/App.tsx` : routing et layout global.
- `src/features/` : un dossier par domaine fonctionnel (app, auth, achievements, game, versus, roguelike, settings).
- `src/shared/` : composants et utilitaires transverses.
- `src/styles/` : styles globaux et spécifiques (roguelike, perks, settings, achievements).

## Schéma des features
```
features/
  app/
  auth/
  achievements/
  game/
  versus/
  roguelike/
  settings/
```

### Convention par feature
- `pages/` : pages/écrans.
- `components/` : UI spécifique.
- `hooks/` : hooks React.
- `logic/` : logique de gameplay/traitements purs.
- `data/` : données statiques.
- `services/` : appels API.
- `types/` : types locaux.
- `utils/` : helpers ciblés.

## Conventions de code
- Composants React : `PascalCase.tsx`
- Hooks : `useXxx.ts`
- Types : `PascalCase` dans `types/`
- Utilitaires : `camelCase.ts` dans `utils/`
- Exports : privilégier des exports nommés
- Styles : classes utilitaires + styles ciblés dans `src/styles/`
- State management : Context par feature (dans `features/<feature>/components` ou `features/<feature>/hooks`)
- Routing : routes en `kebab-case` et alignées sur le nom de la feature (ex: `/roguelike/run`, `/versus/lobby`)

### Tests
- Emplacement : `__tests__/` à côté du code concerné (ex: `features/roguelike/__tests__/...`)
- Nommage :
  - unitaires : `*.test.ts` / `*.test.tsx`
  - intégration : `*.integration.test.ts` / `*.integration.test.tsx`
- Structure : `describe` par module, `it` par comportement
- Mocks : colocalisés dans `__mocks__/` si besoin
- Données : factories simples dans `__tests__/fixtures/`

## Scripts
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run test`
- `npm run test:unit`
- `npm run test:coverage`
- `npm run test:integration`

## Config
Créer `frontend/.env.development` :
```
VITE_API_URL=http://localhost:8080/api
```
