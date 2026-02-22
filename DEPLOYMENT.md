# Production Deployment (Vercel + Supabase)

## Architecture

- **Frontend** → Vercel (React/Vite)
- **Backend** → Render, Railway, or any host (Django)
- **Database** → Supabase (PostgreSQL)

---

## 1. Supabase (Database)

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → Database**.
3. Copy connection details and set in backend `.env`:

```env
SUPABASE_DB_HOST=db.xxxxxxxxxxxx.supabase.co
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-database-password
SUPABASE_DB_PORT=5432
```

4. Run migrations (from your machine or backend host):

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_services
python manage.py createsuperuser
```

---

## 2. Vercel (Frontend)

1. Push your repo to GitHub and import the project in [Vercel](https://vercel.com).
2. **Root Directory:** leave empty (or set to `frontend` and then set Build Command to `npm run build`, Output Directory to `dist`).
   - If root is empty: `vercel.json` at repo root will use `cd frontend && npm ci && npm run build` and `frontend/dist`.
3. **Environment variables** (Vercel dashboard → Settings → Environment Variables):

| Name           | Value                    |
|----------------|--------------------------|
| `VITE_API_URL` | Your backend URL, e.g. `https://your-api.onrender.com` |

4. Deploy. The frontend will be at `https://your-project.vercel.app`.

---

## 3. Backend (Render / Railway)

Deploy Django to Render, Railway, or similar. Example for **Render**:

1. New → Web Service → connect repo, root directory: `backend`.
2. Build: `pip install -r requirements.txt`
3. Start: `gunicorn config.wsgi:application`
4. Add environment variables (same as `backend/.env.example`), including:
   - `SUPABASE_DB_*` (or `PG_*`) for database
   - `DJANGO_SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `CORS_ORIGINS`, `FRONTEND_URL`

Set **FRONTEND_URL** to your Vercel URL (e.g. `https://your-project.vercel.app`).

---

## 4. Required env vars summary

**Backend** (Render/Railway/etc.):

- `DJANGO_SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `CORS_ORIGINS`, `CSRF_TRUSTED_ORIGINS`
- `SUPABASE_DB_HOST`, `SUPABASE_DB_NAME`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_PORT`
- `FRONTEND_URL` = your Vercel URL

**Frontend** (Vercel):

- `VITE_API_URL` = your backend URL

---

## 5. After deploy

- Frontend: `https://your-project.vercel.app`
- Backend admin: `https://your-api.onrender.com/admin/`
- Pay on site or configure PayTabs (optional) in backend env.
