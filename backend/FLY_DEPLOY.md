# Deploy Backend to Fly.io (CLI)

Use these steps from your computer. Run all commands from the **backend** folder.

---

## 1. Install Fly CLI (if not installed)

- **Windows (PowerShell):**  
  `powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"`
- **Mac/Linux:**  
  `curl -L https://fly.io/install.sh | sh`

Then restart your terminal.

---

## 2. Log in to Fly.io

```bash
cd backend
fly auth login
```

Follow the browser prompt to sign in.

---

## 3. List and delete existing Fly apps (clean slate)

List all apps:

```bash
fly apps list
```

Delete **each** app you want to remove (one by one):

```bash
fly apps destroy <APP_NAME>
```

When asked "Destroy app <APP_NAME>?", type **yes**.

Repeat for every app until the list is empty (or only apps you want to keep).

---

## 4. Create and configure the new app (first time only)

From the **backend** folder:

```bash
fly launch --no-deploy
```

- **App name:** use `ac-repair-backend` (or accept the suggested name).
- **Region:** pick one (e.g. `iad` for Virginia).
- **Postgres/Redis:** say **No** (you use MongoDB Atlas).

This creates the app and updates `fly.toml`. It does **not** deploy yet.

---

## 5. Set secrets (environment variables)

Set each secret (replace values with your real ones):

```bash
fly secrets set DJANGO_SECRET_KEY="your-long-random-secret-key"
fly secrets set DEBUG="False"
fly secrets set ALLOWED_HOSTS=".fly.dev,ac-repair-backend.fly.dev"
fly secrets set MONGODB_URI="mongodb+srv://user:password@cluster....mongodb.net/?appName=..."
fly secrets set CORS_ORIGINS="https://youracrepair.com,https://www.youracrepair.com"
fly secrets set CSRF_TRUSTED_ORIGINS="https://youracrepair.com,https://www.youracrepair.com"
fly secrets set FRONTEND_URL="https://youracrepair.com"
fly secrets set COMPANY_PHONE="0582618038"
```

Or set multiple at once:

```bash
fly secrets set DJANGO_SECRET_KEY="..." DEBUG="False" ALLOWED_HOSTS=".fly.dev,ac-repair-backend.fly.dev" MONGODB_URI="..." CORS_ORIGINS="https://youracrepair.com" CSRF_TRUSTED_ORIGINS="https://youracrepair.com" FRONTEND_URL="https://youracrepair.com" COMPANY_PHONE="0582618038"
```

---

## 6. Deploy

From the **backend** folder:

```bash
fly deploy
```

Wait until the build and deploy finish. Your API will be at:

**https://ac-repair-backend.fly.dev**

---

## 6b. MongoDB Atlas – avoid 500 errors

If you get **500** on `/api/services/` or **503** on `/api/health/`, the app cannot reach MongoDB.

1. **Connection string (Fly secret)**  
   Set `MONGODB_URI` with your **real** Atlas connection string:
   - In Atlas: Cluster → Connect → Drivers → copy the URI.
   - Replace `<password>` with your actual database password (no angle brackets).
   - If the password has special characters (`@`, `#`, `:`, etc.), [URL-encode](https://www.w3schools.com/tags/ref_urlencode.asp) them.
   - Then:  
     `fly secrets set MONGODB_URI="mongodb+srv://user:YOUR_REAL_PASSWORD@cluster....mongodb.net/?appName=..."`

2. **Network Access**  
   In Atlas: **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) so Fly.io can connect. Save.

3. **Database user**  
   In Atlas: **Database Access** → ensure the user used in the URI has read/write on the database (e.g. `ac_refrigeration`).

4. **Check from the API**  
   Open:  
   **https://ac-repair-backend.fly.dev/api/health/**  
   - If you see `{"status":"ok","database":"connected"}` → MongoDB is working.  
   - If you see `{"status":"error","database":"failed","message":"..."}` → use the message to fix URI or Atlas settings.

---

## 7. Run migrations (first deploy only)

After the first successful deploy:

```bash
fly ssh console
```

In the console:

```bash
python manage.py migrate
python manage.py seed_services
python manage.py createsuperuser
exit
```

---

## 8. Useful commands

| Command | Description |
|--------|-------------|
| `fly status` | App status and URL |
| `fly logs` | Live logs |
| `fly secrets list` | List secrets (values hidden) |
| `fly ssh console` | SSH into the app |
| `fly apps destroy ac-repair-backend` | Delete this app |

---

## 9. Update Vercel frontend

In Vercel project → Settings → Environment Variables, set:

- **VITE_API_URL** = `https://ac-repair-backend.fly.dev`

Redeploy the frontend so it uses the new backend.
