# Fix Supabase Connection

Your project uses **DATABASE_URL** with Supabase's **Session mode** (pooler). The region in the host must match your project.

## Steps

1. **Install** (once):
   ```powershell
   pip install dj-database-url
   ```

2. **Get the correct connection string**
   - Supabase → **Project Settings** (gear) → **Database**
   - Under **Connection string**, select **"Session"** mode (not Transaction)
   - Copy the URI (it looks like `postgresql://postgres.xxxx:...@aws-0-REGION.pooler.supabase.com:5432/postgres`)

3. **Put your password in the URI**
   - The URI has `[YOUR-PASSWORD]` — replace it with your real database password
   - If the password has special characters, **URL-encode** them:
     - `#` → `%23`
     - `@` → `%40`
     - `/` → `%2F`
     - `+` → `%2B`
   - Example: password `kD/yLM#@fg47w+/` → `kD%2FyLM%23%40fg47w%2B%2F`

4. **Set in `backend/.env`**
   ```env
   DATABASE_URL=postgresql://postgres.hcbdyzghactztdzsqulf:YOUR_ENCODED_PASSWORD@aws-0-YOUR-REGION.pooler.supabase.com:5432/postgres
   ```
   Use the **exact** host from the dashboard (the region in `aws-0-REGION` must match your project).

5. **Run**
   ```powershell
   cd "d:\ac reparing website\backend"
   python manage.py migrate --noinput
   python manage.py seed_services
   python manage.py createsuperuser
   ```

If you still see "Tenant or user not found", the **host/region** is wrong — use the Session mode URI from your Supabase dashboard as-is (only replace the password).
