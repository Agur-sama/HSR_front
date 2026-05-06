from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email обязателен.")
        email = self.normalize_email(email)
        user = self.model(email=email, username=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Админ"
        TEACHER = "teacher", "Учитель"
        STUDENT = "student", "Студент"

    username = models.CharField(max_length=150, blank=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=16, choices=Role.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]
    objects = UserManager()

    def __str__(self):
        return f"{self.full_name} <{self.email}>"


class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    group = models.ForeignKey("groups.Group", on_delete=models.SET_NULL, null=True, blank=True, related_name="student_profiles")


class TeacherProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="teacher_profile")
