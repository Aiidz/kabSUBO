# kabSUBO PHP API

This folder is the PHP/MySQL backend expected by the Next.js frontend.

## Local XAMPP Setup

1. Copy this folder to:

```text
C:\xampp\htdocs\kabsubo\api
```

2. Start Apache and MySQL in XAMPP.

3. Import the database scripts in phpMyAdmin or MySQL CLI:

```sql
SOURCE C:/Users/Ash/Desktop/kabSUBO/database/schema.sql;
SOURCE C:/Users/Ash/Desktop/kabSUBO/database/seed.sql;
SOURCE C:/Users/Ash/Desktop/kabSUBO/database/advanced.sql;
```

4. Create `kabsubo/.env.local` from `kabsubo/env.local.example`:

```env
NEXT_PUBLIC_KABSUBO_API_BASE_URL=http://localhost/kabsubo/api
NEXT_PUBLIC_KABSUBO_USE_MOCK_API=false
```

5. Restart the Next.js dev server:

```bash
npm.cmd run dev
```

## Demo Accounts

All seed users use this password:

```text
password
```

Admin:

```text
admin@cvsu.edu.ph
```

Student:

```text
student@cvsu.edu.ph
```

## Configuration

The backend defaults are XAMPP-friendly:

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=kabsubo
DB_USER=root
DB_PASS=
```

Optional environment variables:

```text
KABSUBO_ALLOWED_ORIGINS=http://localhost:3000
KABSUBO_ALLOWED_EMAIL_DOMAINS=cvsu.edu.ph
```

To allow another CvSU student subdomain:

```text
KABSUBO_ALLOWED_EMAIL_DOMAINS=cvsu.edu.ph,student.cvsu.edu.ph
```

## Making Someone Admin

Run this in MySQL:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'someone@cvsu.edu.ph';
```

## Endpoint Files

- `auth.php`
- `places.php`
- `menu_items.php`
- `reviews.php`
- `favorites.php`
- `submissions.php`
- `recommendations.php`

All endpoints return JSON with a `data` property for frontend compatibility.
