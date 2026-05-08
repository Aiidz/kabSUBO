# kabSUBO — CvSU Food Discovery Platform

> A web platform that helps Cavite State University (Don Severino Delas Alas Main Campus, Indang) students discover nearby food spots by typing what they're craving. The map of restaurants, shops, stalls, and diners is the canvas; an AI-assisted prompt sits on top.

---

## Overview

kabSUBO is a food discovery platform built for CvSU Indang students. Search by craving, compare nearby spots, and find your next meal — all on a live map centered around campus. An AI-powered recommendation engine ranks results based on menu match, distance, and ratings.

---

## How It Works

```
Open Map -> Type Craving -> Browse Ranked Results -> Compare / Get Directions
```

1. **Search** — Type what you're craving in the prompt
2. **Discover** — The map filters to matching spots with ranked recommendations
3. **Compare** — Side-by-side comparison of price, distance, and ratings
4. **Navigate** — Get directions to your chosen spot

---

## Getting Started

### Prerequisites

- **Node.js 20+**
- **pnpm 8+** (or npm/yarn)

### Installation

```bash
git clone https://github.com/Aiidz/kabSUBO.git
cd kabSUBO
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Preview

```bash
pnpm preview
```

---

## Pages / Routes

| Route | Description |
| :--- | :--- |
| `/` | Map + craving prompt (home) |
| `/results?q=...` | Map + ranked recommendations panel |
| `/place/$placeId` | Restaurant detail |
| `/compare?ids=...` | Side-by-side comparison |
| `/submit` | Add a new place (auth required) |
| `/my/submissions` | User's own submissions and statuses |
| `/favorites` | Saved places (auth required) |
| `/auth` | Sign in / sign up |
| `/admin` | Moderation queue + place editor (admin only) |
| `/about` | About kabSUBO and credits |

---

## Features

- **Live Map** — OpenStreetMap tiles via MapLibre GL JS, centered on CvSU Indang
- **AI Recommendations** — Leverages Gemini Flash to rank food spots by craving match, distance, and rating
- **Craving Search** — Natural language search over menus, tags, and place descriptions
- **Side-by-Side Comparison** — Compare 2–4 spots: price, distance, rating, best sellers
- **Crowdsourced Submissions** — Anyone can submit a place; moderated before going live
- **Geolocation** — "Use my location" falls back to campus center
- **Optional Auth** — Browse freely; sign in to submit, review, and save favorites
- **Admin Moderation** — Pending queue for approving/rejecting submissions
- **Reviews & Ratings** — Community ratings on each place
- **Persistent Preferences** — Saved favorites and submissions per user

---

## Tech Stack

- **Framework** — TanStack Start (TanStack Router)
- **Database & Auth** — Lovable Cloud (Supabase)
- **AI** — Gemini Flash via Lovable AI Gateway
- **Maps** — MapLibre GL JS + OpenStreetMap (no API key required)
- **Styling** — CSS with glassmorphism design
- **Validation** — Zod on both client and server

---

## Data Model

```
profiles            id, display_name, avatar_url, created_at
user_roles          id, user_id, role ('admin'|'moderator'|'user')
places              id, name, slug, type, description, lat, lng,
                    address, hours_json, price_range, photo_urls[],
                    submitted_by, status ('pending'|'approved'|'rejected'),
                    created_at
menu_items          id, place_id, name, description, price, category,
                    is_best_seller, photo_url, tags[]
reviews             id, place_id, user_id, rating (1-5), body, created_at
favorites           user_id, place_id, created_at
submissions_audit   id, place_id, action, actor_id, notes, created_at
```

---

## Recommendation Engine

A server function `recommendPlaces({ query, userLat, userLng })`:

1. **Keyword pass** — Full-text search over menu items, descriptions, and tags
2. **AI pass** — Sends craving + candidate list to Gemini Flash for ranked subset
3. **Geo scoring** — Haversine distance blended: `final = 0.5 * matchScore + 0.3 * (1/distance) + 0.2 * rating`
4. **Fallback** — Returns keyword-only ranking if AI is rate-limited

---

## Build Phases

- [ ] **Phase 1** — Foundation: Lovable Cloud schema, RLS, seed data
- [ ] **Phase 2** — Map + prompt UI: home route, floating card, pin popups, geolocation
- [ ] **Phase 3** — Recommendation flow: server function, results panel, place detail
- [ ] **Phase 4** — Auth + submissions: sign in/up, submit flow, "my submissions"
- [ ] **Phase 5** — Admin moderation: pending queue, approve/reject, editor
- [ ] **Phase 6** — Comparison feature: multi-select, compare view, weighted winner
- [ ] **Phase 7** — Reviews + favorites: ratings, saved list, polish

---

## Contributing

Contributions are welcome! Open an issue or submit a pull request.

---

## License

MIT