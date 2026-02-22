"""
Notification services: WhatsApp Business API, Saudi SMS (Taqnyat/Unifonic), Email
"""
import requests
from django.conf import settings
from django.core.mail import send_mail
from .models import NotificationLog


def get_content(data, lang='ar'):
    return data.get(f'content_{lang}', data.get('content_ar', ''))


def send_whatsapp(recipient_phone, content_ar, content_en='', template_type='booking_confirmation'):
    """WhatsApp Business API - uses Meta Graph API."""
    token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '') or ''
    phone_id = getattr(settings, 'WHATSAPP_PHONE_ID', '') or ''

    if not token or not phone_id:
        return {'success': False, 'error': 'WhatsApp not configured'}

    phone = str(recipient_phone).replace('+', '').replace(' ', '')
    if not phone.startswith('966'):
        phone = '966' + phone.lstrip('0')

    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": template_type,
            "language": {"code": "ar"},
            "components": [{
                "type": "body",
                "parameters": [{"type": "text", "text": content_ar[:1000]}]
            }]
        }
    }

    try:
        r = requests.post(
            f"https://graph.facebook.com/v18.0/{phone_id}/messages",
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=15,
        )
        if r.status_code == 200:
            return {'success': True}
        return {'success': False, 'error': r.text}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def send_sms_saudi(phone, message):
    """
    Saudi SMS: Taqnyat or Unifonic.
    Taqnyat: https://taqnyat.sa
    Unifonic: https://www.unifonic.com
    """
    # Taqnyat
    api_key = getattr(settings, 'TAQNYAT_API_KEY', '') or ''
    sender = getattr(settings, 'TAQNYAT_SENDER', 'ACRefrigeration') or ''

    if api_key:
        try:
            r = requests.post(
                "https://api.taqnyat.sa/v1/messages",
                json={
                    "recipients": [str(phone).replace('+', '')],
                    "body": message,
                    "sender": sender,
                },
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                timeout=10,
            )
            if r.status_code in (200, 201):
                return {'success': True}
        except Exception as e:
            pass

    # Unifonic fallback
    app_sid = getattr(settings, 'UNIFONIC_APP_SID', '') or ''
    if app_sid:
        try:
            r = requests.post(
                "https://api.unifonic.com/rest/SMS/messages",
                data={
                    "AppSid": app_sid,
                    "Recipient": str(phone),
                    "Body": message,
                },
                timeout=10,
            )
            if r.status_code == 200:
                return {'success': True}
        except Exception:
            pass

    # Twilio fallback (works in Saudi with proper number)
    tid = getattr(settings, 'TWILIO_ACCOUNT_SID', '') or ''
    if tid:
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=message,
                from_=settings.TWILIO_SMS_NUMBER,
                to=str(phone),
            )
            return {'success': True}
        except Exception:
            pass

    return {'success': False, 'error': 'No SMS provider configured'}


def send_email_notification(to_email, subject, body_html, body_text=''):
    """Send email via Django SMTP."""
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@ac-refrigeration.sa')
    try:
        send_mail(subject, body_text or body_html[:500], from_email, [to_email], html_message=body_html, fail_silently=False)
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def notify_booking_confirmed(booking, user):
    """Notify customer: WhatsApp, SMS, Email."""
    service_name = booking.service.name_ar
    date_str = str(booking.scheduled_date)
    time_str = booking.scheduled_time

    content_ar = f"تم تأكيد حجزك لخدمة {service_name}. التاريخ: {date_str} الساعة: {time_str}"
    content_en = f"Your booking for {service_name} is confirmed. Date: {date_str} Time: {time_str}"

    log = NotificationLog.objects.create(
        recipient=user,
        channel='whatsapp',
        type='booking-confirmed',
        content_ar=content_ar,
        content_en=content_en,
        metadata={'booking_id': booking.id},
    )
    r = send_whatsapp(user.whatsapp or user.phone, content_ar)
    log.status = 'sent' if r.get('success') else 'failed'
    log.error = r.get('error', '')
    log.save()

    log2 = NotificationLog.objects.create(
        recipient=user,
        channel='sms',
        type='booking-confirmed',
        content_ar=content_ar,
        metadata={'booking_id': booking.id},
    )
    r2 = send_sms_saudi(user.phone or user.whatsapp, content_ar)
    log2.status = 'sent' if r2.get('success') else 'failed'
    log2.error = r2.get('error', '')
    log2.save()

    if user.email:
        html = f"""
        <div style="font-family: Arial; direction: rtl; text-align: right;">
            <h2>التكيف التبريد - A/C & Refrigeration</h2>
            <p>{content_ar}</p>
            <p>{content_en}</p>
            <hr>
            <p>الهاتف: {getattr(settings, 'COMPANY_PHONE', '0582618038')}</p>
        </div>
        """
        log3 = NotificationLog.objects.create(
            recipient=user,
            channel='email',
            type='booking-confirmed',
            content_ar=content_ar,
            content_en=content_en,
            metadata={'booking_id': booking.id},
        )
        r3 = send_email_notification(user.email, f"تأكيد الحجز - Booking Confirmed", html, content_ar)
        log3.status = 'sent' if r3.get('success') else 'failed'
        log3.error = r3.get('error', '')
        log3.save()


def notify_admin_new_order(booking):
    """Notify admin: SMS, WhatsApp, Email."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    admins = User.objects.filter(role='admin')
    service_name = booking.service.name_en
    customer_name = booking.customer.get_full_name() or booking.customer.username
    msg_ar = f"طلب جديد: {service_name} - العميل: {customer_name}"
    msg_en = f"New order: {service_name} - Customer: {customer_name}"

    for admin in admins:
        if admin.phone:
            send_sms_saudi(admin.phone, msg_ar)
        if admin.whatsapp:
            send_whatsapp(admin.whatsapp, msg_ar)
        if admin.email:
            send_email_notification(
                admin.email,
                f"طلب جديد - New Order #{booking.id}",
                f"<p>{msg_ar}</p><p>{msg_en}</p>",
                msg_en,
            )
