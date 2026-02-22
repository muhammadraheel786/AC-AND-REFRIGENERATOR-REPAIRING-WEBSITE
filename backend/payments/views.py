from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import redirect
from django.conf import settings as django_settings
from .models import Payment
from .gateways import create_payment_session, verify_payment
from bookings.models import Booking


class PaymentViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='initiate')
    def initiate(self, request):
        """Initiate PayTabs payment. Returns redirect URL."""
        booking_id = request.data.get('booking_id')
        if not booking_id:
            return Response({'error': 'booking_id required'}, status=status.HTTP_400_BAD_REQUEST)

        booking = Booking.objects.filter(id=booking_id, customer=request.user).first()
        if not booking:
            return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

        if booking.payment_status == 'paid':
            return Response({'error': 'Already paid'}, status=status.HTTP_400_BAD_REQUEST)

        return_url = request.data.get('return_url', '')
        callback_url = request.data.get('callback_url', '')
        lang = request.data.get('lang', 'ar')
        gateway = request.data.get('gateway', 'paytabs')

        result = create_payment_session(
            booking=booking,
            customer=request.user,
            return_url=return_url,
            callback_url=callback_url,
            lang=lang,
            gateway=gateway,
        )
        if result.get('success'):
            tid = result.get('tran_ref', '')
            Payment.objects.create(
                booking=booking,
                amount=booking.total_price,
                method='credit_card',
                status='processing',
                transaction_id=tid,
            )
            return Response(result)
        return Response({'error': result.get('error', 'Payment failed')}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='callback')
    def callback(self, request):
        """PayTabs server callback - verify and update booking."""
        tran_ref = request.data.get('tran_ref') or request.GET.get('tran_ref')
        if not tran_ref:
            return Response({'error': 'Missing tran_ref'}, status=status.HTTP_400_BAD_REQUEST)

        verification = verify_payment(tran_ref)
        if not verification.get('success'):
            return Response({'error': 'Payment verification failed'}, status=status.HTTP_400_BAD_REQUEST)

        payment = Payment.objects.filter(transaction_id=tran_ref).first()
        if payment:
            payment.status = 'completed'
            payment.gateway_response = verification.get('response')
            payment.save()
            payment.booking.payment_status = 'paid'
            payment.booking.save(update_fields=['payment_status'])

        return Response({'status': 'ok'})


def payment_return_view(request):
    """Handle return from PayTabs - redirect to frontend status page."""
    tran_ref = request.GET.get('tran_ref')
    base_url = getattr(django_settings, 'FRONTEND_URL', 'http://localhost:3000')
    return redirect(f"{base_url}/book/status?tran_ref={tran_ref}")
