# 🚀 LIVE DEPLOYMENT GUIDE - Vercel + Render (FREE)

## 📋 Architecture
- **Frontend**: Vercel (Free) - React + Vite
- **Backend**: Render (Free) - Django + Supabase
- **Database**: Supabase (Free tier) - PostgreSQL
- **Notifications**: Twilio SMS (working!)

---

## 🎯 Step 1: Prepare for Production

### Update Backend .env for Production
Replace your `backend/.env` with:

```env
# Django Production Settings
DJANGO_SECRET_KEY=your-strong-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-backend.onrender.com,your-domain.com
CORS_ORIGINS=https://your-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-frontend.vercel.app

# Supabase Database (already configured)
SUPABASE_DB_HOST=postgres.hcbdyzghactztdzsqulf
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.hcbdyzghactztdzsqulf
SUPABASE_DB_PASSWORD=kD/yLM#@fg47w+/ 
SUPABASE_DB_PORT=5432

# Company
COMPANY_PHONE=0582618038

# Twilio SMS (working - add your credentials)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_SMS_NUMBER=your_twilio_number_here

# Production URLs
FRONTEND_URL=https://your-frontend.vercel.app
```

### Generate Strong Secret Key
```bash
cd backend
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 🎯 Step 2: Deploy Backend to Render

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### 2. Deploy to Render
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. **Settings**:
   - **Name**: ac-refrigeration-api
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 3`
5. **Environment Variables** (add all from .env above)
6. Click "Create Web Service"

### 3. Run Database Migrations
After deployment, open your Render service URL + `/shell/`:
```bash
python manage.py migrate
python manage.py seed_services
python manage.py createsuperuser
```

---

## 🎯 Step 3: Deploy Frontend to Vercel

### 1. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project" → Import Git Repository
3. **Settings**:
   - **Framework Preset**: Other
   - **Root Directory**: Leave empty (uses vercel.json)
   - **Build Command**: `cd frontend && npm ci && npm run build`
   - **Output Directory**: `frontend/dist`
4. **Environment Variables**:
   - `VITE_API_URL`: `https://your-backend.onrender.com`

### 2. Update Frontend Environment
In Vercel dashboard → Settings → Environment Variables:
```
VITE_API_URL=https://your-backend-name.onrender.com
```

---

## 🎯 Step 4: Final Configuration

### Update CORS Settings
In your backend `.env` on Render:
```env
CORS_ORIGINS=https://your-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-frontend.vercel.app
ALLOWED_HOSTS=your-backend.onrender.com,your-frontend.vercel.app
```

### Test Everything
1. **Frontend**: `https://your-frontend.vercel.app`
2. **Backend API**: `https://your-backend.onrender.com/api/`
3. **Admin Panel**: `https://your-backend.onrender.com/admin/`
4. **Test Booking**: Make a test booking and check SMS notifications

---

## 💰 FREE TIER LIMITS

### Vercel (Frontend)
- ✅ **100GB bandwidth/month**
- ✅ **Custom domain**
- ✅ **SSL certificates**
- ✅ **Unlimited projects**

### Render (Backend)
- ✅ **750 hours/month** (enough for 24/7)
- ✅ **Custom domain**
- ✅ **SSL certificates**
- ✅ **Background workers**

### Supabase (Database)
- ✅ **500MB database**
- ✅ **50MB file storage**
- ✅ **50,000 monthly active users**
- ✅ **2GB bandwidth**

---

## 🔧 Troubleshooting

### Common Issues:
1. **CORS errors**: Update `CORS_ORIGINS` in backend
2. **Database connection**: Check Supabase credentials
3. **SMS not working**: Verify Twilio credentials on Render
4. **Build fails**: Check Node.js/Python versions

### Get Help:
- Render logs: Dashboard → Logs
- Vercel logs: Dashboard → Logs
- Supabase logs: Dashboard → Logs

---

## 🎉 You're Live!

Your AC & Refrigeration booking system will be available at:
- **Website**: `https://your-frontend.vercel.app`
- **Admin**: `https://your-backend.onrender.com/admin/`
- **API**: `https://your-backend.onrender.com/api/`

All features working:
- ✅ Online booking system
- ✅ SMS notifications (Twilio)
- ✅ Admin dashboard
- ✅ Multi-language support
- ✅ Professional appearance
