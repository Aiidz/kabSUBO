# kabSUBO — CvSU Food Discovery Platform

> A web platform that helps Cavite State University (Don Severino Delas Alas Main Campus, Indang) students discover nearby food spots by typing what they're craving.

---

## Getting Started

### Prerequisites
- **Node.js 20+**
- **XAMPP** (with PHP 8.1+ and MySQL)

### 1. Installation & Auto-Setup
Run these commands in your terminal (CMD, PowerShell, or Bash):

```bash
# Clone the repository
git clone https://github.com/Aiidz/kabSUBO.git
cd kabSUBO

# Run the automated setup (Install dependencies + Setup Database)
cd kabsubo
npm run setup
```

### 2. XAMPP Configuration (Backend)
To link the PHP backend with XAMPP, follow these command-line steps:

**Windows (PowerShell):**
```powershell
# Create the folder in htdocs and copy the backend files
mkdir C:\xampp\htdocs\kabsubo
xcopy ..\backend C:\xampp\htdocs\kabsubo /E /I /Y
```

**macOS (Terminal):**
```bash
# Create the folder in htdocs and copy the backend files
sudo mkdir -p /Applications/XAMPP/htdocs/kabsubo
sudo cp -R ../backend/* /Applications/XAMPP/htdocs/kabsubo
```

### 3. Start Services
1. Open **XAMPP Control Panel**.
2. Start **Apache** and **MySQL**.
3. **Important**: Since XAMPP uses `root` by default, open `C:\xampp\htdocs\kabsubo\api\db_config.php` (or wherever your htdocs is) and ensure the credentials match your MySQL (usually user `root` and empty password).

### 4. Run the Application
In your terminal (inside the `kabsubo` folder), run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Scripts

```bash
npm run setup    # One-time: install dependencies + setup .env + import SQL
npm run db:setup # Interactive database import only
npm run dev      # Start Next.js development server
npm run build    # Production build
```

## Demo Accounts (Seed Data)
All accounts use `password` as the login password.

| Email | Role |
|-------|------|
| `bongalos@kabsubo.test` | user |
| `gaano@kabsubo.test` | user |
| `admin@kabsubo.test` | admin |

---

## Tech Stack
- **Frontend**: Next.js (React) + TypeScript + Tailwind CSS
- **Backend**: PHP 8.1+
- **Database**: MySQL
- **Maps**: MapLibre GL JS + OpenStreetMap
- **AI**: Gemini Flash for ranking recommendations

## License
MIT
