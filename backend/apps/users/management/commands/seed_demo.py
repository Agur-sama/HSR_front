from django.core.management.base import BaseCommand

from apps.assignments.models import Assignment, WorkDefinition
from apps.groups.models import Group
from apps.users.models import StudentProfile, TeacherProfile, User


class Command(BaseCommand):
    help = "Создаёт демонстрационные данные Академии ВСМ."

    def handle(self, *args, **options):
        admin = upsert_user("admin@example.com", "admin123456", "Администратор Академии", "admin")
        teacher = upsert_user("teacher@example.com", "teacher123456", "Петров Пётр", "teacher")
        student = upsert_user("student@example.com", "student123456", "Иванов Иван", "student")
        group, _ = Group.objects.get_or_create(title="КСГ-101", defaults={"teacher": teacher})
        group.teacher = teacher
        group.save()
        TeacherProfile.objects.get_or_create(user=teacher)
        profile, _ = StudentProfile.objects.get_or_create(user=student)
        profile.group = group
        profile.save()
        assignment, _ = Assignment.objects.get_or_create(
            title="Оптимизация сетевого графика",
            group=group,
            defaults={
                "description": "Учебное задание для тренажёра.",
                "status": "active",
                "resource_limit": 17,
                "created_by": admin,
            },
        )
        assignment.description = "Учебное задание для тренажёра."
        assignment.status = "active"
        assignment.resource_limit = 17
        assignment.created_by = admin
        assignment.save()
        assignment.works.all().delete()
        works = [
            ("1", "1", "2", "Подготовка объекта", 20, 4),
            ("2", "1", "3", "Диагностика", 12, 3),
            ("3", "2", "4", "Демонтаж", 24, 4),
            ("4", "3", "4", "Проверка оборудования", 10, 2),
            ("5", "4", "5", "Основные работы", 30, 5),
            ("6", "4", "6", "Параллельная операция", 12, 3),
            ("7", "5", "7", "Финальная сборка", 16, 4),
            ("8", "6", "7", "Контроль качества", 8, 2),
        ]
        for index, (number, start, end, title, labor, workers) in enumerate(works, start=1):
            WorkDefinition.objects.create(
                assignment=assignment,
                work_number=number,
                event_start=start,
                event_end=end,
                title=title,
                labor=labor,
                workers=workers,
                duration=max(1, -(-labor // workers)),
                calculation_mode="fixed_labor",
                order_index=index,
            )
        self.stdout.write(self.style.SUCCESS("Демо-данные созданы."))


def upsert_user(email, password, full_name, role):
    user, created = User.objects.get_or_create(email=email, defaults={"full_name": full_name, "role": role})
    user.full_name = full_name
    user.role = role
    user.is_staff = role == "admin"
    user.is_superuser = role == "admin"
    user.is_active = True
    user.set_password(password)
    user.save()
    return user
