# kabSUBO PHP API Contract

The frontend is prepared for a PHP + MySQL backend. By default it uses mock data from `app/data/places.ts`.

The PHP backend exists in the repository under `/backend`. Copy that folder to
XAMPP as `C:\xampp\htdocs\kabsubo\api`, then set these environment variables:

```bash
NEXT_PUBLIC_KABSUBO_API_BASE_URL=http://localhost/kabsubo/api
NEXT_PUBLIC_KABSUBO_USE_MOCK_API=false
```

Use `kabsubo/env.local.example` as the local frontend template.

## Local Database

Import these scripts in order:

```sql
SOURCE C:/Users/Ash/Desktop/kabSUBO/database/schema.sql;
SOURCE C:/Users/Ash/Desktop/kabSUBO/database/seed.sql;
SOURCE C:/Users/Ash/Desktop/kabSUBO/database/advanced.sql;
```

Seed login accounts:

- `admin@cvsu.edu.ph` / `password`
- `student@cvsu.edu.ph` / `password`

## Frontend Routes

- `/` - map and craving prompt
- `/results?q=...` - map and ranked recommendations panel
- `/place/{placeId}` - restaurant detail
- `/compare?ids=...` - side-by-side dish or restaurant comparison
- `/submit` - add a new place, auth required
- `/my/submissions` - user's submissions and statuses
- `/favorites` - saved places, auth required
- `/auth` - sign in and sign up
- `/admin` - moderation queue and place editor, admin only
- `/about` - project overview and credits

## Endpoint Files

- `POST /auth.php?action=signin` - sign in with email and password
- `POST /auth.php?action=signup` - create a standard user account with an allowed CvSU email domain
- `POST /auth.php?action=signout` - end the current session
- `GET /places.php` - list places
- `GET /places.php?id={placeId}` - get one place
- `POST /places.php` - create submitted place
- `PUT /places.php?id={placeId}` - update place
- `DELETE /places.php?id={placeId}` - delete place
- `GET /menu_items.php?place_id={placeId}` - list menu items
- `POST /menu_items.php` - create menu item
- `PUT /menu_items.php?place_id={placeId}&name={itemName}` - update menu item
- `DELETE /menu_items.php?place_id={placeId}&name={itemName}` - delete menu item
- `GET /reviews.php?place_id={placeId}` - list reviews
- `POST /reviews.php` - create review
- `PUT /reviews.php?place_id={placeId}&author={author}` - update review
- `DELETE /reviews.php?place_id={placeId}&author={author}` - delete review
- `GET /favorites.php?user_id={userId}` - list favorites
- `POST /favorites.php` - add favorite
- `DELETE /favorites.php?place_id={placeId}&user_id={userId}` - remove favorite
- `GET /submissions.php` - list submissions
- `GET /submissions.php?status=pending` - list by status
- `PUT /submissions.php?id={submissionId}` - approve/reject submission
- `DELETE /submissions.php?id={submissionId}` - delete submission record
- `GET /recommendations.php?q={query}` - ranked recommendation results

## Account Rules

- Browsing, searching, viewing details, and comparing must work without a session.
- A signed-in `user` can submit places, leave reviews, save favorites, and edit their own submissions.
- A signed-in `admin` can moderate submissions and edit or remove any entry.
- PHP stores the signed-in user in a server-side session.
- Protected endpoints should return `401` when not signed in and `403` when the role or owner does not match.
- To make someone an admin, update `users.role` in MySQL.

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'someone@cvsu.edu.ph';
```

Auth responses should return the public user only:

```json
{
  "data": {
    "id": "user-123",
    "name": "Demo Student",
    "email": "student@kabsubo.test",
    "role": "user"
  }
}
```

## Response Shape

Prefer returning data wrapped in a `data` property:

```json
{
  "data": {}
}
```

The frontend client also accepts raw JSON for simple PHP scripts.

Menu item records should include:

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
- Authenticated endpoints should rely on PHP sessions or a token cookie; the frontend uses `credentials: "include"`.
