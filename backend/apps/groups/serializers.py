from rest_framework import serializers

from apps.groups.models import Group


class GroupSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    students_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Group
        fields = ["id", "title", "teacher", "teacher_name", "students_count", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
