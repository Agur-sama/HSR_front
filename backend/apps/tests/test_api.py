from django.test import TestCase
from rest_framework.test import APIClient

from apps.assignments.models import Assignment, WorkDefinition
from apps.groups.models import Group
from apps.solutions.services import ensure_solution
from apps.users.models import StudentProfile, TeacherProfile, User


class ApiPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user("admin@test.ru", "12345678", full_name="Админ", role="admin", is_staff=True)
        self.teacher = User.objects.create_user("teacher@test.ru", "12345678", full_name="Учитель", role="teacher")
        self.other_teacher = User.objects.create_user("other@test.ru", "12345678", full_name="Чужой учитель", role="teacher")
        self.student = User.objects.create_user("student@test.ru", "12345678", full_name="Студент", role="student")
        self.other_student = User.objects.create_user("other-student@test.ru", "12345678", full_name="Чужой студент", role="student")
        self.group = Group.objects.create(title="КСГ-101", teacher=self.teacher)
        self.other_group = Group.objects.create(title="КСГ-102", teacher=self.other_teacher)
        TeacherProfile.objects.create(user=self.teacher)
        TeacherProfile.objects.create(user=self.other_teacher)
        StudentProfile.objects.create(user=self.student, group=self.group)
        StudentProfile.objects.create(user=self.other_student, group=self.other_group)
        self.assignment = Assignment.objects.create(title="Задание", group=self.group, created_by=self.teacher, status="active", resource_limit=5)
        WorkDefinition.objects.create(assignment=self.assignment, work_number="1", event_start="1", event_end="2", title="Работа", labor=10, workers=2, duration=5)
        self.solution = ensure_solution(self.student, self.assignment)

    def test_public_register_endpoint_does_not_exist(self):
        response = self.client.post("/api/auth/register", {})
        self.assertEqual(response.status_code, 404)

    def test_admin_can_create_user(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/admin/users/", {
            "full_name": "Новый студент",
            "email": "new@test.ru",
            "password": "12345678",
            "role": "student",
            "group_id": self.group.id,
            "is_active": True,
        }, format="json")
        self.assertEqual(response.status_code, 201)

    def test_student_cannot_open_foreign_solution(self):
        self.client.force_authenticate(self.other_student)
        response = self.client.get(f"/api/student/solutions/{self.solution.id}")
        self.assertEqual(response.status_code, 404)

    def test_student_can_change_draft_work(self):
        self.client.force_authenticate(self.student)
        work = self.solution.works.first()
        response = self.client.patch(f"/api/student/solutions/{self.solution.id}/works/{work.id}", {"workers": 5}, format="json")
        self.assertEqual(response.status_code, 200)
        work.refresh_from_db()
        self.assertEqual(work.workers, 5)

    def test_submit_changes_status(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(f"/api/student/solutions/{self.solution.id}/submit")
        self.assertEqual(response.status_code, 200)
        self.solution.refresh_from_db()
        self.assertEqual(self.solution.status, "submitted")

    def test_submitted_solution_cannot_be_edited(self):
        self.solution.status = "submitted"
        self.solution.save()
        self.client.force_authenticate(self.student)
        work = self.solution.works.first()
        response = self.client.patch(f"/api/student/solutions/{self.solution.id}/works/{work.id}", {"workers": 5}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_foreign_teacher_cannot_open_solution(self):
        self.client.force_authenticate(self.other_teacher)
        response = self.client.get(f"/api/teacher/solutions/{self.solution.id}")
        self.assertEqual(response.status_code, 404)

    def test_teacher_can_save_comment_and_get_group_statistics(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(f"/api/teacher/solutions/{self.solution.id}/comments", {"text": "Хорошая работа"}, format="json")
        self.assertEqual(response.status_code, 201)
        stats = self.client.get(f"/api/teacher/groups/{self.group.id}/statistics")
        self.assertEqual(stats.status_code, 200)
