from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.groups.models import Group
from apps.users.models import StudentProfile, TeacherProfile, User


class UserSerializer(serializers.ModelSerializer):
    group_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    group_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    password = serializers.CharField(required=False, write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["id", "full_name", "email", "password", "role", "is_active", "group_id", "group_ids", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        group_id = validated_data.pop("group_id", None)
        group_ids = validated_data.pop("group_ids", [])
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        sync_profiles(user, group_id, group_ids)
        return user

    def update(self, instance, validated_data):
        group_id = validated_data.pop("group_id", None)
        group_ids = validated_data.pop("group_ids", None)
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        sync_profiles(instance, group_id, group_ids)
        return instance


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
        user = authenticate(username=attrs["email"], password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Неверный email или пароль.")
        if not user.is_active:
            raise serializers.ValidationError("Пользователь неактивен.")
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        }


def sync_profiles(user, group_id=None, group_ids=None):
    if user.role == "student":
        profile, _ = StudentProfile.objects.get_or_create(user=user)
        if group_id is not None:
            profile.group = Group.objects.filter(id=group_id).first()
            profile.save()
    if user.role == "teacher":
        TeacherProfile.objects.get_or_create(user=user)
        if group_ids is not None:
            Group.objects.filter(teacher=user).exclude(id__in=group_ids).update(teacher=None)
            Group.objects.filter(id__in=group_ids).update(teacher=user)
