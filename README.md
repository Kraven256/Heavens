# InternUG — Backend Setup Guide (Windows + XAMPP)

## Folder Structure
```
backend/
├── server.js               ← Main server (start here)
├── package.json            ← Dependencies
├── .env.example            ← Copy to .env and fill in
├── database/
│   └── schema.sql          ← Run this in phpMyAdmin
├── middleware/
│   └── auth.js             ← JWT authentication
└── routes/
    ├── auth.js             ← Register / Login
    ├── internships.js      ← Internship listings
    ├── applications.js     ← Apply / approve / reject
    ├── placements.js       ← Place interns
    ├── logbooks.js         ← Submit / approve logbooks
    └── admin.js            ← Admin panel data
```

---

## Step 1 — Start MySQL in XAMPP
1. Open **XAMPP Control Panel**
2. Click **Start** next to **MySQL** — it should turn green

---

## Step 2 — Create the Database
1. Click **Admin** next to MySQL in XAMPP → opens phpMyAdmin
2. Click **New** in the left sidebar
3. Name it: `internship_management` → click **Create**
4. Click the **SQL** tab at the top
5. Open `database/schema.sql`, copy all the contents, paste into the SQL tab
6. Click **Go**
7. You should see all tables created (users, internships, applications, placements, logbooks)

---

## Step 3 — Create your .env file
1. In the `backend/` folder, copy `.env.example` and rename the copy to `.env`
2. Open `.env` — it should look like this (XAMPP default has no password):
```
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=internship_management
JWT_SECRET=internug_secret_key_change_this_in_production
PORT=5000
```

---

## Step 4 — Install Dependencies
1. Open a terminal (Command Prompt or PowerShell) in the `backend/` folder
2. Run:
```
npm install
```

---

## Step 5 — Start the Server
```
node server.js
```

You should see:
```
✅ MySQL connected successfully
🚀 InternUG backend running on http://localhost:5000
```

Test it by opening: http://localhost:5000/api/health

---

## Step 6 — Connect the Frontend
Open `index.html` and find this line near the top of the script:
```js
const API_BASE = '';
```
Change it to:
```js
const API_BASE = 'http://localhost:5000';
```

---

## Default Admin Login
- Email: `admin@internug.ug`
- Password: `admin123`

---

## New features (logbooks, letters, emails)

Run this once in Supabase SQL Editor if your database was created before these features:

```sql
-- See backend/database/add_features.sql
ALTER TABLE placements ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE logbooks ADD COLUMN IF NOT EXISTS supervisor_note TEXT;
```

- **Logbook records**: All entries are stored permanently. Students can filter and export CSV. Companies and admins can browse archives.
- **Completion letters**: Companies (or admin) mark a placement **Completed** → students download a printable letter from the **Placement** tab.
- **Email notifications**: When a company approves or rejects an application, the student receives an email (via Resend).

---

## Troubleshooting
| Problem | Fix |
|---|---|
| MySQL won't start in XAMPP | Port 3306 may be in use. In XAMPP → Config → MySQL → change port to 3307 |
| `npm install` fails | Make sure Node.js is installed from nodejs.org |
| `ER_ACCESS_DENIED` | Check DB_USER and DB_PASS in your .env |
| `ECONNREFUSED` | MySQL is not running — start it in XAMPP |
