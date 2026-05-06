from django.conf import settings
from django.db import models


class TeacherComment(models.Model):
    solution = models.ForeignKey("solutions.StudentSolution", on_delete=models.CASCADE, related_name="comments")
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="teacher_comments", limit_choices_to={"role": "teacher"})
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
