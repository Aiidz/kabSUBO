# kabSUBO

Initial draft for the CvSU Indang food discovery platform.

kabSUBO helps students find nearby food spots by typing what they are craving, then browsing ranked recommendations on a map. This main-branch draft focuses on the public discovery surface: craving search, sample ranked places, selected place details, and a MapLibre/OpenStreetMap map that is ready to be replaced or expanded with components from [`AnmolSaini16/mapcn`](https://github.com/AnmolSaini16/mapcn).

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Current Draft Scope

- Map-centered home page for CvSU Don Severino Delas Alas Main Campus, Indang
- Craving search with local sample ranking logic
- Restaurant cards with price range, walk time, hours, rating, and highlights
- Selected place panel synced with the map
- OpenStreetMap tiles through MapLibre GL

## Planned Feature Branches

- `codex/auth-and-accounts` - login, user profiles, reviews, and favorites
- `codex/place-submissions` - crowdsourced place submission form and validation
- `codex/admin-moderation` - admin approval queue for submitted places
- `codex/recommendation-engine` - keyword scoring, Gemini fallback path, and database-backed recommendations
- `codex/database-php-api` - MySQL schema, `db_config.php`, prepared statements, and CRUD routes

## Map Direction

The draft uses MapLibre directly with OpenStreetMap raster tiles. The target map component library is `mapcn`, which is built on MapLibre and supports markers, popups, controls, and routes. When the UI component layer is added, replace `app/components/map-canvas.tsx` with the selected `mapcn` component pattern.

## Project Notes From The Activity Brief

- Public browsing, search, comparison, and place details should work without an account.
- Accounts are required for submitted places, reviews, and favorites.
- Admin users moderate submitted places and manage approved entries.
- Placeholder data is acceptable for the early development stage.
- Open decisions include the nearby-radius rule, final logo/color treatment, and whether CvSU email is required.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- MapLibre GL
- OpenStreetMap tiles

Later branches can add PHP/MySQL for the database-backed activity requirements.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```
