"""
Payment: PayTabs (Saudi - Mada, STC Pay, Cards). No Stripe.
"""
import requests
from django.conf import settings


def create_payment_session(booking, customer, return_url, callback_url, lang='ar', gateway='paytabs'):
    """Create payment session. Only PayTabs is supported."""
    if gateway != 'paytabs':
        return {'success': False, 'error': 'Only PayTabs is configured. Pay on site or contact us.'}

    profile_id = getattr(settings, 'PAYTABS_PROFILE_ID', '') or ''
    server_key = getattr(settings, 'PAYTABS_SERVER_KEY', '') or ''
    if not profile_id or not server_key:
        return {'success': False, 'error': 'PayTabs not configured. Pay on site or contact us.'}

    payload = {
        "profile_id": profile_id,
        "tran_type": "sale",
        "tran_class": "ecom",
        "cart_id": str(booking.id),
        "cart_description": f"Service: {booking.service.name_en}",
        "cart_currency": "SAR",
        "cart_amount": float(booking.total_price),
        "callback": callback_url,
        "return": return_url,
        "customer_details": {
            "name": customer.get_full_name() or customer.username,
            "email": customer.email or "",
            "phone": customer.phone or getattr(customer, 'whatsapp', '') or "",
            "street1": booking.address_street,
            "city": booking.address_city,
            "country": "SA",
        },
        "payment_methods": ["mada", "stcpay", "creditcard"],
        "lang": "ar" if lang == 'ar' else "en",
    }

    try:
        r = requests.post(
            "https://secure.paytabs.sa/payment/request",
            json=payload,
            headers={"Authorization": server_key, "Content-Type": "application/json"},
            timeout=30,
        )
        data = r.json()
        if data.get("redirect_url"):
            return {"success": True, "redirect_url": data["redirect_url"], "tran_ref": data.get("tran_ref")}
        return {"success": False, "error": data.get("message", "Payment initiation failed")}
    except Exception as e:
        return {"success": False, "error": str(e)}


def verify_payment(tran_ref):
    """Verify payment status with PayTabs."""
    server_key = getattr(settings, 'PAYTABS_SERVER_KEY', '') or ''
    if not server_key:
        return {'success': False, 'error': 'Gateway not configured'}

    try:
        r = requests.post(
            "https://secure.paytabs.sa/payment/query",
            json={"profile_id": getattr(settings, 'PAYTABS_PROFILE_ID', ''), "tran_ref": tran_ref},
            headers={"Authorization": server_key, "Content-Type": "application/json"},
            timeout=15,
        )
        data = r.json()
        if data.get("payment_result", {}).get("response_status") == "A":
            return {"success": True, "transaction_id": tran_ref, "response": data}
        return {"success": False, "response": data}
    except Exception as e:
        return {"success": False, "error": str(e)}
