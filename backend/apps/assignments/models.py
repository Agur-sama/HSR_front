from django.conf import settings
from django.db import models


class Assignment(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        ACTIVE = "active", "Активно"
        ARCHIVED = "archived", "Архив"

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    group = models.ForeignKey("groups.Group", on_delete=models.CASCADE, related_name="assignments")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_assignments")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    resource_limit = models.PositiveIntegerField(default=17)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class WorkDefinition(models.Model):
    class CalculationMode(models.TextChoices):
        FIXED_LABOR = "fixed_labor", "Фиксированная трудоёмкость"
        MANUAL_DURATION = "manual_duration", "Ручная продолжительность"

    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name="works")
    work_number = models.CharField(max_length=50)
    event_start = models.CharField(max_length=50)
    event_end = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    labor = models.PositiveIntegerField()
    workers = models.PositiveIntegerField()
    duration = models.PositiveIntegerField()
    calculation_mode = models.CharField(max_length=32, choices=CalculationMode.choices, default=CalculationMode.FIXED_LABOR)
    planned_shift = models.PositiveIntegerField(default=0)
    order_index = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order_index", "id"]
