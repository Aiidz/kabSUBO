# kabSUBO PHP API Contract

The frontend is prepared for a PHP + MySQL backend. By default it uses mock data from `app/data/places.ts`.

Set these environment variables when the PHP backend exists:

```bash
NEXT_PUBLIC_KABSUBO_API_BASE_URL=http://localhost/kabsubo/api
NEXT_PUBLIC_KABSUBO_USE_MOCK_API=false
```

## Endpoint Files

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
