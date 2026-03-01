# MongoDB Atlas Setup Guide

## 🚀 Quick Setup Steps

### 1. Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free account
3. Create new project: "AC Refrigeration"

### 2. Create Free Cluster
1. Click "Build a Cluster"
2. Select "FREE" plan (M0 Sandbox)
3. Choose region closest to Saudi Arabia (e.g., Dubai, Mumbai)
4. Cluster name: "ac-refrigeration"
5. Click "Create Cluster"

### 3. Create Database User
1. Go to "Database Access" → "Add New Database User"
2. Username: `ac_refrigeration`
3. Password: Generate strong password
4. Permissions: "Read and write to any database"

### 4. Whitelist IP Address
1. Go to "Network Access" → "Add IP Address"
2. Select "Allow Access from Anywhere" (0.0.0.0/0)
3. Click "Confirm"

### 5. Get Connection String
1. Go to "Database" → "Connect"
2. Select "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your actual password

### 6. Update Render Environment Variables
Add this to your Render service environment:

```
MONGODB_URI=mongodb+srv://ac_refrigeration:YOUR_PASSWORD@ac-refrigeration.xxxxx.mongodb.net/ac_refrigeration?retryWrites=true&w=majority
```

## 📋 Required Environment Variables for Render

```
MONGODB_URI=mongodb+srv://ac_refrigeration:YOUR_PASSWORD@cluster.mongodb.net/ac_refrigeration?retryWrites=true&w=majority
DEBUG=False
ALLOWED_HOSTS=ac-and-refrigenerator-repairing-website.onrender.com
CORS_ORIGINS=https://youracrepair.com,https://www.youracrepair.com
FRONTEND_URL=https://youracrepair.com
DJANGO_SECRET_KEY=r$i242zvzyblhca^s5%(4au5@($s4lz%+s(z3*_b(*kc+okh%@
COMPANY_PHONE=0582618038
```

## 🎯 Benefits of MongoDB Atlas

✅ **No DNS issues** - Reliable hostnames
✅ **Free tier** - 512MB storage
✅ **Auto-scaling** - Can handle growth
✅ **Global CDN** - Fast access from Saudi Arabia
✅ **Backups** - Automatic backups included
✅ **Monitoring** - Built-in performance metrics

## 🚀 After Setup

1. Deploy the updated code
2. Add MONGODB_URI to Render environment
3. Test: `https://ac-and-refrigenerator-repairing-website.onrender.com/api/services/?lang=en`
4. Run seeding script in Render shell: `python seed_production.py`

## 📞 Support

If you need help:
- MongoDB Atlas documentation
- Render support
- Django + Djongo documentation
