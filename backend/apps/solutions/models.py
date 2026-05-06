from django.conf import settings
from django.db import models


class StudentSolution(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        SUBMITTED = "submitted", "Отправлено"
        CHECKED = "checked", "Проверено"

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="solutions", limit_choices_to={"role": "student"})
    assignment = models.ForeignKey("assignments.Assignment", on_delete=models.CASCADE, related_name="solutions")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    project_duration = models.PositiveIntegerField(default=0)
    max_workers = models.PositiveIntegerField(default=0)
    average_workers = models.FloatField(default=0)
    critical_works_count = models.PositiveIntegerField(default=0)
    works_with_float_count = models.PositiveIntegerField(default=0)
    overload_count = models.PositiveIntegerField(default=0)
    score = models.PositiveIntegerField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    checked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("student", "assignment")


class StudentWorkItem(models.Model):
    solution = models.ForeignKey(StudentSolution, on_delete=models.CASCADE, related_name="works")
    work_number = models.CharField(max_length=50)
    event_start = models.CharField(max_length=50)
    event_end = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    labor = models.PositiveIntegerField()
    workers = models.PositiveIntegerField()
    duration = models.PositiveIntegerField()
    calculation_mode = models.CharField(max_length=32, default="fixed_labor")
    planned_shift = models.PositiveIntegerField(default=0)
    early_start = models.IntegerField(default=0)
    early_finish = models.IntegerField(default=0)
    late_start = models.IntegerField(default=0)
    late_finish = models.IntegerField(default=0)
    total_float = models.IntegerField(default=0)
    is_critical = models.BooleanField(default=False)
    order_index = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order_index", "id"]


class ChangeHistory(models.Model):
    solution = models.ForeignKey(StudentSolution, on_delete=models.CASCADE, related_name="history")
    work_item = models.ForeignKey(StudentWorkItem, on_delete=models.SET_NULL, null=True, blank=True)
    field_name = models.CharField(max_length=100)
    old_value = models.CharField(max_length=255, blank=True)
    new_value = models.CharField(max_length=255, blank=True)
    project_duration_before = models.PositiveIntegerField(default=0)
    project_duration_after = models.PositiveIntegerField(default=0)
    max_workers_before = models.PositiveIntegerField(default=0)
    max_workers_after = models.PositiveIntegerField(default=0)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
