# kabSUBO — Frontend

Next.js frontend for the CvSU Indang food discovery platform.

## Getting Started

To install dependencies, set up environment variables, and initialize the database in one go:

```bash
npm run setup
```

Alternatively, to just run the database setup later:

```bash
npm run db:setup
```

Then start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run setup    # install + env setup + db import
npm run db:setup # interactive database import
npm run dev:all  # start both frontend + backend
npm run dev      # start dev server only
npm run build    # production build
npm run lint     # run ESLint
```

## Configuration

Copy `env.local.example` to `.env.local`:

```env
NEXT_PUBLIC_KABSUBO_API_BASE_URL=http://localhost/kabsubo/api
NEXT_PUBLIC_KABSUBO_USE_MOCK_API=false   # toggle mock/real backend
```

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- MapLibre GL + OpenStreetMap
- PHP 8.1+ backend (see `/backend`)

## Scope

- Map-centered home page for CvSU Don Severino Delas Alas Main Campus, Indang
- Craving search with ranking logic
- Place details, comparison, reviews, favorites
- User auth with PHP session backend
- Admin moderation queue
