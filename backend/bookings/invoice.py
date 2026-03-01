"""
Invoice PDF - A/C & Refrigeration (Cash/Credit Invoice).
English-only to avoid black boxes (ReportLab default fonts do not support Arabic).
"""
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from django.conf import settings
from django.utils import formats

def get_invoice_number(booking):
    """Generate invoice number - format: INV-YYYYMMDD-XXX"""
    from datetime import date
    from .models import Booking
    prefix = f"INV-{date.today().strftime('%Y%m%d')}"
    count = Booking.objects.filter(invoice_number__startswith=prefix).count()
    return f"{prefix}-{count + 1:03d}"


def generate_invoice_pdf(booking, line_items=None):
    """
    Generate booking receipt: company header, receipt no, date, time, customer, service lines, signatures.
    English-only layout to avoid black boxes (default PDF fonts do not support Arabic).
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    company_name_en = getattr(settings, 'COMPANY_NAME_EN', 'A/C & Refrigeration')
    company_phone = getattr(settings, 'COMPANY_PHONE', '0582618038')
    company_loc_en = getattr(settings, 'COMPANY_LOCATION', 'Al-Dieya - Dammam, Kingdom of Saudi Arabia')
    services_line_en = 'Repairing AC - Refrigerator, Washing Machine - Split - Central A/C'

    y = height - 30
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width / 2, y, company_name_en)
    y -= 14
    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, y, company_phone)
    y -= 10
    c.setFont("Helvetica", 9)
    c.drawCentredString(width / 2, y, company_loc_en)
    y -= 10
    c.drawCentredString(width / 2, y, services_line_en)
    y -= 22

    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "Booking Receipt")
    y -= 22

    inv_num = booking.invoice_number or get_invoice_number(booking)
    if not booking.invoice_number:
        booking.invoice_number = inv_num
        try:
            booking.save(update_fields=['invoice_number'])
        except Exception:
            pass  # proxy objects from pymongo fallback cannot be saved via ORM
    c.setFont("Helvetica", 10)
    c.drawString(50, y, f"No. {inv_num}")
    y -= 14

    try:
        date_str = formats.date_format(booking.scheduled_date, "SHORT_DATE_FORMAT")
    except Exception:
        date_str = str(booking.scheduled_date) if booking.scheduled_date else '-'
    c.drawString(50, y, f"Date: {date_str}")
    c.drawString(200, y, f"Time: {booking.scheduled_time or '-'}")
    y -= 22

    customer = booking.customer
    try:
        customer_name = customer.get_full_name() or getattr(customer, 'username', None) or '-'
    except Exception:
        customer_name = getattr(customer, 'username', 'Guest')
    phone = getattr(customer, 'phone', '') or getattr(customer, 'whatsapp', '') or '-'
    email = getattr(customer, 'email', '') or '-'
    if not email or email.endswith('@guest.local'):
        email = '-'
    address = f"{booking.address_street}, {booking.address_city}"

    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Mr. / Messers:")
    y -= 12
    c.setFont("Helvetica", 10)
    c.drawString(50, y, customer_name[:55])
    y -= 12
    c.drawString(50, y, f"Phone: {phone}")
    y -= 12
    c.drawString(50, y, f"Email: {email}")
    y -= 12
    c.drawString(50, y, f"Address: {address[:55]}")
    y -= 22

    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "DESCRIPTION")
    c.drawString(430, y, "QTY.")
    y -= 20

    if line_items:
        items = line_items
    else:
        items = list(booking.line_items.all())
    if not items:
        items = [{
            'description_en': booking.service.name_en,
            'description_ar': booking.service.name_ar,
            'quantity': 1,
        }]

    c.setFont("Helvetica", 9)
    for item in items:
        if hasattr(item, 'description_en'):
            desc_en = item.description_en
            qty = item.quantity
        else:
            desc_en = item.get('description_en', '') or item.get('description_ar', '')
            qty = item.get('quantity', 1)
        c.drawString(50, y, (str(desc_en) or '-')[:45])
        c.drawString(440, y, str(qty))
        y -= 16
        if y < 120:
            c.showPage()
            c.setFont("Helvetica", 9)
            y = height - 40

    y -= 35

    c.setFont("Helvetica", 9)
    c.drawString(50, y, "Receiver ............................")
    c.drawString(280, y, "Salesman ............................")

    c.save()
    buffer.seek(0)
    return buffer
