# kabSUBO — CvSU Food Discovery Platform

> A web platform that helps Cavite State University (Don Severino Delas Alas Main Campus, Indang) students discover nearby food spots by typing what they're craving.

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
- **PHP 8.1+** with PDO MySQL extension
- **MySQL 8.x / MariaDB 12.x**
- **npm**

### Installation

```bash
git clone https://github.com/Aiidz/kabSUBO.git
cd kabSUBO
```

#### The Easy Way (Recommended)

If you have MySQL running, you can set up everything (dependencies, `.env.local`, and database) with one command:

```bash
cd kabsubo
npm run setup
```

---

#### The Manual Way

#### 1. Database

Create the database and import the schema + seed data:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
mysql -u root -p < database/advanced.sql
```

#### 2. Backend

Copy the `backend/` folder to your web server's document root (e.g., XAMPP `htdocs` or `/var/www/html`). Configure DB credentials in `backend/db_config.php` or via environment variables:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=kabsubo
DB_USER=kabsubo
DB_PASS=kabsubo_dev
```

#### 3. Frontend

```bash
cd kabsubo
cp env.local.example .env.local
npm install
```

Edit `.env.local` and point the API URL to your PHP backend:

```env
NEXT_PUBLIC_KABSUBO_API_BASE_URL=http://localhost/kabsubo/api
NEXT_PUBLIC_KABSUBO_USE_MOCK_API=false
```

### Development

```bash
cd kabsubo
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
cd kabsubo
npm run build
```

### Mock API Mode

Set `NEXT_PUBLIC_KABSUBO_USE_MOCK_API=true` to run without the PHP backend. The app uses hardcoded sample data for all features.

---

## Demo Accounts (Seed Data)

All accounts use `password` as the login password.

| Email | Role |
|-------|------|
| `bongalos@kabsubo.test` | user |
| `gaano@kabsubo.test` | user |
| `legaspi@kabsubo.test` | user |
| `santos@kabsubo.test` | user |
| `admin@kabsubo.test` | admin |

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
| `/sign-in` | Sign in / sign up |
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

- **Framework** — Next.js + TypeScript
- **Styling** — Tailwind CSS with glassmorphism
- **Backend** — PHP 8.1+ with PDO prepared statements
- **Database** — MySQL 8.x / MariaDB 12.x
- **AI** — Gemini Flash for recommendation ranking
- **Maps** — MapLibre GL JS + OpenStreetMap (no API key required)
- **Auth** — Session tokens via `sessions` table + httponly cookie

---

## Data Model

```
profiles            id, display_name, email (unique), avatar_url, password_hash, created_at
user_roles          id, user_id, role ('admin'|'moderator'|'user')
sessions            id, user_id, token (unique), created_at

places              id, name, slug, type, description, lat, lng,
                    address, hours_json, price_range, photo_urls[],
                    submitted_by, status ('pending'|'approved'|'rejected'),
                    created_at, updated_at
menu_items          id, place_id, name, description, price, category,
                    is_best_seller, tags[], created_at
reviews             id, place_id, user_id, rating (1-5), body, created_at
favorites           user_id, place_id, created_at (composite PK)
submissions_audit   id, place_id, actor_id, action, notes, created_at
```

---

## Recommendation Engine

A server function `recommendPlaces({ query, userLat, userLng })`:

1. **Keyword pass** — Full-text search over menu items, descriptions, and tags
2. **AI pass** — Sends craving + candidate list to Gemini Flash for ranked subset
3. **Geo scoring** — Haversine distance blended: `final = 0.5 * matchScore + 0.3 * (1/distance) + 0.2 * rating`
4. **Fallback** — Returns keyword-only ranking if AI is rate-limited

---

## Project Structure

```
kabSUBO/
├── backend/          # PHP API endpoints
│   ├── auth.php
│   ├── places.php
│   ├── menu_items.php
│   ├── reviews.php
│   ├── favorites.php
│   ├── submissions.php
│   ├── recommendations.php
│   ├── helpers.php
│   └── db_config.php
├── database/         # SQL schema + seed data
│   ├── schema.sql
│   ├── seed.sql
│   └── advanced.sql
├── kabsubo/          # Next.js frontend
│   ├── app/
│   ├── public/
│   └── package.json
└── README.md
```

---

## License

MIT
