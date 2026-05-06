from rest_framework import serializers

from apps.comments.models import TeacherComment


class TeacherCommentSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)

    class Meta:
        model = TeacherComment
        fields = ["id", "solution", "teacher", "teacher_name", "text", "created_at", "updated_at"]
        read_only_fields = ["id", "teacher", "created_at", "updated_at"]
