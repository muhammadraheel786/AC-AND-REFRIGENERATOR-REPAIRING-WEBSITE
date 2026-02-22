from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import SiteSettings

User = get_user_model()


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ('company_name_ar', 'company_name_en', 'phone', 'whatsapp', 'email',
                  'address_ar', 'address_en', 'services_line_ar', 'services_line_en',
                  'footer_text_ar', 'footer_text_en')


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name', 'phone', 'whatsapp', 'preferred_language')
        extra_kwargs = {
            'password': {'write_only': True},
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
            'phone': {'required': False, 'allow_blank': True},
            'whatsapp': {'required': False, 'allow_blank': True},
            'preferred_language': {'required': False, 'default': 'ar'},
        }

    def create(self, validated_data):
        email = validated_data.get('email') or ''
        validated_data['email'] = email
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'phone', 'whatsapp', 'role', 'preferred_language')
        read_only_fields = ('role',)
