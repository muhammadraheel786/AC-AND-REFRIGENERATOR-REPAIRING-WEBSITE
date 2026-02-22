# Keys to Provide for Supabase

Send these **5 values** (from your Supabase project). I will put them in `backend/.env`.

## Where to find them

1. Go to [supabase.com](https://supabase.com) → your project
2. **Project Settings** (gear icon) → **Database**
3. Under **Connection string** or **Connection info**, copy:

---

## 1. SUPABASE_DB_HOST

- **Example:** `db.abcdefghijklmn.supabase.co`
- In Supabase: **Database** → **Host** (or from connection string: the part after `@` and before `:5432`)

---

## 2. SUPABASE_DB_NAME

- **Usually:** `postgres`
- In Supabase: **Database name**

---

## 3. SUPABASE_DB_USER

- **Usually:** `postgres`
- In Supabase: **Database user**

---

## 4. SUPABASE_DB_PASSWORD

- The **database password** you set when creating the project
- If you forgot: **Database** → **Reset database password**

---

## 5. SUPABASE_DB_PORT

- **Usually:** `5432`
- In Supabase: **Port**

---

## How to send them

Reply in this format (replace with your real values):

```
SUPABASE_DB_HOST=db.xxxx.supabase.co
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-actual-password
SUPABASE_DB_PORT=5432
```

**Security:** Do not share your password in public. Only paste in this private chat. I will write these only into `backend/.env` (which is in `.gitignore` and not committed).
