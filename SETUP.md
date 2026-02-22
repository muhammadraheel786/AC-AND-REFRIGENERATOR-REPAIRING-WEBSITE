# التكيف التبريد - Setup Guide

Complete setup instructions for the AC & Refrigeration digital business platform.

---

## Prerequisites

- **Python 3.9+** (recommended 3.10)
- **Node.js 18+** and npm
- **PostgreSQL 12+** (local or managed)
- **Git**

---

## 1. Database Setup

### Quick start (SQLite – no PostgreSQL needed)

- Do **not** set `PG_PASSWORD` in `.env` (or leave it empty)
- The app uses SQLite for local development

### Production (PostgreSQL)

1. Install PostgreSQL or use a managed service (AWS RDS, DigitalOcean, etc.)
2. Install the driver: `pip install psycopg2-binary`
3. Create database: `createdb ac_refrigeration`
4. Set in `.env`: `PG_PASSWORD`, `PG_USER`, `PG_NAME`, `PG_HOST`, `PG_PORT`

---

## 2. Backend (Django) Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Copy environment template
copy .env.example .env   # Windows
# cp .env.example .env   # Mac/Linux

# Edit .env with your settings (see below)
```

### Create `.env` file in `backend/`:

```env
# Django
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# PostgreSQL
PG_NAME=ac_refrigeration
PG_USER=postgres
PG_PASSWORD=yourpassword
PG_HOST=127.0.0.1
PG_PORT=5432

# Company (from invoice image)
COMPANY_PHONE=0582618038

# PayTabs (Saudi payments: Mada, STC Pay, Cards)
# Register at https://www.paytabs.com
PAYTABS_PROFILE_ID=
PAYTABS_SERVER_KEY=
PAYTABS_CLIENT_KEY=

# WhatsApp Business API (Meta)
# https://developers.facebook.com/docs/whatsapp
WHATSAPP_PHONE_ID=
WHATSAPP_ACCESS_TOKEN=

# SMS - Taqnyat (Saudi) - https://taqnyat.sa
TAQNYAT_API_KEY=
TAQNYAT_SENDER=ACRefrigeration

# SMS - Unifonic (alternative) - https://www.unifonic.com
UNIFONIC_APP_SID=

# Twilio (fallback for SMS/WhatsApp)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_NUMBER=

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@ac-refrigeration.sa

# Google Maps (optional)
GOOGLE_MAPS_API_KEY=

# Frontend URL (for payment redirect)
FRONTEND_URL=http://localhost:3000
```

### Run migrations and create admin:

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_services
python manage.py runserver
```

Backend runs at **http://localhost:8000**

---

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# In dev: no .env needed – Vite proxy forwards /api to backend
# For production build: set VITE_API_URL to your API base URL

# Run dev server
npm run dev
```

Frontend runs at **http://localhost:3000**

---

## 4. Details From Invoice Image (see INFORMATION_FROM_INVOICE.md)

| Field | English | Arabic |
|-------|---------|--------|
| Company | A/C & Refrigeration | للتكييف والتبريد |
| Phone | 0582618038 | 0582618038 |
| Location | Al-Dieya - KSA | الصناعية - المملكة العربية السعودية |
| Invoice Title | Cash/Credit Invoice | فاتورة نقداً / بالدين |
| Columns | DESCRIPTION, QTY, UNIT PRICE, TOTAL | البيان، العدد، السعر الفرادي، السعر الاجمالي |
| Services | AC, Refrigerator, Washing Machine, Split, Central, Ovens | المكيفات، الثلاجات، الغسالات، أفران، بردة، مركزي وسبليت |

---

## 5. Payment Gateway Setup (PayTabs)

1. Register at https://www.paytabs.com
2. Complete merchant verification for Saudi Arabia
3. Enable: Mada, STC Pay, Credit/Debit Cards
4. Get Profile ID and Server Key from dashboard
5. Add to `.env`

---

## 6. WhatsApp Business API

1. Create Meta Business account
2. Apply for WhatsApp Business API
3. Get Phone Number ID and Access Token
4. Configure message templates (booking confirmation, etc.)
5. Add to `.env`

---

## 7. Saudi SMS Providers

**Taqnyat** (recommended for Saudi):
- https://taqnyat.sa
- Supports Arabic, OTP, delivery reports

**Unifonic**:
- https://www.unifonic.com
- MENA coverage

---

## 8. Admin Panel (Full Dashboard)

**URL:** http://localhost:8000/admin/  
(Also linked in the website footer as "Admin".)

**First time:** Create a superuser to log in:
```bash
cd backend
python manage.py createsuperuser
```
Enter username, email, and password.

**In the admin you can:**
- **Users** – View/edit customers, set role (admin/technician/customer), phone, WhatsApp
- **Services** – Add/edit services, prices, categories (AC, refrigerator, washing machine, oven, cold storage)
- **Bookings** – View all orders, filter by status/payment, assign technician, add invoice line items, bulk actions (Mark as Confirmed/Completed/Cancelled)
- **Payments** – View payment history, method, status, transaction ID
- **Reviews** – Moderate customer reviews
- **Notification logs** – View sent WhatsApp/SMS/Email logs

---

## 9. Deployment Checklist

- [ ] Set `DEBUG=False`
- [ ] Configure production `ALLOWED_HOSTS`
- [ ] Use strong `DJANGO_SECRET_KEY`
- [ ] Set up HTTPS
- [ ] Configure CORS for production domain
- [ ] Use production PostgreSQL
- [ ] Configure production SMTP
- [ ] Set `FRONTEND_URL` to production URL

---

## Project Structure

```
d:\ac reparing website\
├── backend/           # Django + DRF + PostgreSQL
│   ├── config/        # Settings, URLs
│   ├── core/          # User, Auth
│   ├── bookings/      # Services, Bookings, Invoices
│   ├── payments/      # PayTabs integration
│   └── notifications/ # WhatsApp, SMS, Email
└── frontend/          # React + Vite + i18n
    └── src/
        ├── pages/
        ├── components/
        └── api/
```
