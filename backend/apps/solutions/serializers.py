from rest_framework import serializers

from apps.assignments.serializers import AssignmentSerializer
from apps.comments.serializers import TeacherCommentSerializer
from apps.solutions.models import ChangeHistory, StudentSolution, StudentWorkItem


class StudentWorkItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentWorkItem
        fields = [
            "id", "work_number", "event_start", "event_end", "title", "labor", "workers", "duration",
            "calculation_mode", "planned_shift", "early_start", "early_finish", "late_start", "late_finish", "total_float",
            "is_critical", "order_index",
        ]
        read_only_fields = ["early_start", "early_finish", "late_start", "late_finish", "total_float", "is_critical"]


class ChangeHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ChangeHistory
        fields = "__all__"


class StudentSolutionSerializer(serializers.ModelSerializer):
    assignment = AssignmentSerializer(read_only=True)
    works = StudentWorkItemSerializer(many=True, read_only=True)
    history = ChangeHistorySerializer(many=True, read_only=True)
    comments = TeacherCommentSerializer(many=True, read_only=True)

    class Meta:
        model = StudentSolution
        fields = [
            "id", "student", "assignment", "status", "project_duration", "max_workers", "average_workers",
            "critical_works_count", "works_with_float_count", "overload_count", "score", "submitted_at",
            "checked_at", "created_at", "updated_at", "works", "history", "comments",
        ]
