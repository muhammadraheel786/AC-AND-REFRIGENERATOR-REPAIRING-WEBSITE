from rest_framework import generics
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .serializers import UserRegisterSerializer, UserSerializer, SiteSettingsSerializer
from .models import SiteSettings
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class SiteSettingsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            s = SiteSettings.get()
            return Response(SiteSettingsSerializer(s).data)
        except Exception as e:
            # Return default settings if database is not ready
            return Response({
                'company_name_ar': 'للتكييف والتبريد',
                'company_name_en': 'A/C & Refrigeration',
                'phone': '0582618038',
                'whatsapp': '0582618038',
                'email': '',
                'address_ar': 'الصناعية - الدمام، المملكة العربية السعودية',
                'address_en': 'Al-Dieya - Dammam, Kingdom of Saudi Arabia',
                'services_line_ar': 'إصلاح المكيفات والثلاجات والغسالات أفران - برودة - مركزي وسبليت',
                'services_line_en': 'Repairing AC - Refrigerator, Washing Machine - Split - Central A/C',
                'footer_text_ar': 'جميع الحقوق محفوظة',
                'footer_text_en': 'All rights reserved'
            }, status=status.HTTP_200_OK)


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """Health check endpoint to debug deployment issues"""
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                db_status = "connected"
        except Exception as e:
            db_status = f"error: {str(e)}"
        
        return Response({
            'status': 'healthy',
            'database': db_status,
            'debug_mode': settings.DEBUG,
            'environment': 'production' if not settings.DEBUG else 'development'
        })
