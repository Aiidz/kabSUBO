# kabSUBO PHP API Contract

The frontend is prepared for a PHP + MySQL backend. By default it uses mock data from `app/data/places.ts`.

The PHP backend exists in the repository under `/backend`. Copy that folder to
your web server's document root (e.g., `C:\xampp\htdocs\kabsubo\api` or
`/var/www/html/kabsubo/api`), then set these environment variables:

```bash
NEXT_PUBLIC_KABSUBO_API_BASE_URL=http://localhost/kabsubo/api
NEXT_PUBLIC_KABSUBO_USE_MOCK_API=false
```

Use `kabsubo/env.local.example` as the local frontend template.

## Local Database

Import these scripts from the repository root in order:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
mysql -u root -p < database/advanced.sql
```

Seed accounts (no password set by default — register via the app or set manually):

- `bongalos@kabsubo.test`
- `gaano@kabsubo.test`
- `legaspi@kabsubo.test`
- `santos@kabsubo.test`

## Frontend Routes

- `/` — map and craving prompt
- `/results?q=...` — map and ranked recommendations panel
- `/place/{placeId}` — restaurant detail
- `/compare?ids=...` — side-by-side dish or restaurant comparison
- `/submit` — add a new place, auth required
- `/my/submissions` — user's submissions and statuses
- `/favorites` — saved places, auth required
- `/sign-in` — sign in and sign up
- `/admin` — moderation queue and place editor, admin only
- `/about` — project overview and credits

## Endpoint Files

- `POST /auth.php?action=signin` — sign in with email and password
- `POST /auth.php?action=signup` — create a standard user account
- `POST /auth.php?action=signout` — end the current session
- `GET /auth.php?action=me` — get current user from session token
- `GET /places.php` — list places
- `GET /places.php?id={placeId}` — get one place
- `POST /places.php` — create submitted place
- `PUT /places.php?id={placeId}` — update place
- `DELETE /places.php?id={placeId}` — delete place
- `GET /menu_items.php?place_id={placeId}` — list menu items
- `POST /menu_items.php` — create menu item
- `PUT /menu_items.php?place_id={placeId}&name={itemName}` — update menu item
- `DELETE /menu_items.php?place_id={placeId}&name={itemName}` — delete menu item
- `GET /reviews.php?place_id={placeId}` — list reviews
- `POST /reviews.php` — create review
- `PUT /reviews.php?place_id={placeId}&author={author}` — update review
- `DELETE /reviews.php?place_id={placeId}&author={author}` — delete review
- `GET /favorites.php?user_id={userId}` — list favorites
- `POST /favorites.php` — add favorite
- `DELETE /favorites.php?place_id={placeId}&user_id={userId}` — remove favorite
- `GET /submissions.php` — list submissions
- `GET /submissions.php?status=pending` — list by status
- `POST /submissions.php` — create submission
- `PUT /submissions.php?id={submissionId}` — approve/reject submission
- `DELETE /submissions.php?id={submissionId}` — delete submission record
- `GET /recommendations.php?q={query}` — ranked recommendation results

## Account Rules

- Browsing, searching, viewing details, and comparing must work without a session.
- A signed-in `user` can submit places, leave reviews, save favorites, and edit their own submissions.
- A signed-in `admin` or `moderator` can moderate submissions and edit or remove any entry.
- PHP validates sessions via a token stored in the `sessions` table and an httponly cookie.
- Protected endpoints return `401` when not signed in and `403` when the role or owner does not match.
- To make someone an admin, insert a row in `user_roles`:

  ```sql
  INSERT INTO user_roles (id, user_id, role) VALUES (UUID(), '<user-id>', 'admin');
  ```

Auth responses return the public user only:

```json
{
  "data": {
    "token": "abc123...",
    "id": "user-123",
    "name": "Demo Student",
    "email": "student@kabsubo.test",
    "role": "user"
  }
}
```

## Response Shape

All endpoints return data wrapped in a `data` property:

```json
{
  "data": {}
}
```

Menu item records:

```json
{
  "name": "Cheese burger",
  "category": "Burgers",
  "price": 55,
  "prepNote": "Made to order on the griddle.",
  "isBestSeller": true,
  "tags": ["burger", "snack", "budget"]
}
```

## PHP Backend Notes

- Use PDO prepared statements.
- Return JSON with `Content-Type: application/json`.
- Use matching HTTP status codes: `200`, `201`, `400`, `401`, `403`, `404`, `422`, `500`.
- The frontend sends JSON bodies for `POST` and `PUT`.
- Authenticated endpoints validate the session token from the `session_token` cookie; the frontend uses `credentials: "include"`.
