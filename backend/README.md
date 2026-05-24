# kabSUBO PHP API

This folder is the PHP/MySQL backend expected by the Next.js frontend.

## Local Setup

### Apache + MySQL (XAMPP on Windows, LAMP on Linux)

1. Copy this folder to your web server's document root:

   - **XAMPP**: `C:\xampp\htdocs\kabsubo\api`
   - **LAMP**: `/var/www/html/kabsubo/api`

2. Start Apache and MySQL.

3. Import the database scripts (run from repository root):

   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   mysql -u root -p < database/advanced.sql
   ```

4. Configure DB credentials in `db_config.php` or via environment variables. Defaults:

   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=kabsubo
   DB_USER=kabsubo
   DB_PASS=kabsubo_dev
   ```

5. Create `kabsubo/.env.local` from `kabsubo/env.local.example`:

   ```env
   NEXT_PUBLIC_KABSUBO_API_BASE_URL=http://localhost/kabsubo/api
   NEXT_PUBLIC_KABSUBO_USE_MOCK_API=false
   ```

6. Restart the Next.js dev server:

   ```bash
   cd kabsubo
   npm run dev
   ```

## Demo Accounts

All accounts use `password` as the login password.

| Display Name | Email | Role |
|-------------|-------|------|
| Bongalos | `bongalos@kabsubo.test` | user |
| Gaano | `gaano@kabsubo.test` | user |
| Legaspi | `legaspi@kabsubo.test` | user |
| Santos | `santos@kabsubo.test` | user |
| Admin | `admin@kabsubo.test` | admin |

## Making Someone Admin

Run this in MySQL:

```sql
INSERT INTO user_roles (id, user_id, role) VALUES (UUID(), '<user-id>', 'admin');
```

Find the user ID first:

```sql
SELECT id, display_name, email FROM profiles WHERE email = 'someone@cvsu.edu.ph';
```

## Endpoint Files

| File | Description |
|------|-------------|
| `auth.php` | Sign in, sign up, sign out, session check |
| `places.php` | CRUD for food places |
| `menu_items.php` | CRUD for menu items per place |
| `reviews.php` | CRUD for reviews per place |
| `favorites.php` | Toggle and list user favorites |
| `submissions.php` | List, approve, reject submissions |
| `recommendations.php` | AI-ranked search results |
| `helpers.php` | CORS, JSON responses, auth helpers |

All endpoints return JSON with a `data` property for frontend compatibility.
