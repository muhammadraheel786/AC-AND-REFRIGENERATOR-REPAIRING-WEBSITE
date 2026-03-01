# Taqnyat SMS Setup (Recommended for Saudi Business)

## Why Taqnyat?
- ✅ Saudi-based company
- ✅ Better delivery in Saudi Arabia
- ✅ Arabic language support
- ✅ Cheaper than international SMS
- ✅ No complex setup like WhatsApp

## Setup Steps:

### 1. Register at Taqnyat
Go to: https://taqnyat.sa
- Create account
- Get API key
- Verify your sender name

### 2. Add to .env
```env
TAQNYAT_API_KEY=your_api_key_here
TAQNYAT_SENDER=ACRefrigeration
```

### 3. Test SMS
```bash
cd backend
python test_sms.py
```

## Benefits:
- Works immediately after setup
- No template approval needed
- Perfect for Saudi customers
- Professional appearance

## Current Status:
Your booking system already supports Taqnyat as fallback!
Just add the API key and it will work.
