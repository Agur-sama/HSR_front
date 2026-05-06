from django.urls import path

from apps.solutions.views import (
    TeacherCheckView,
    TeacherCommentDetailView,
    TeacherCommentView,
    TeacherGroupDetailView,
    TeacherGroupStatisticsView,
    TeacherGroupsView,
    TeacherSolutionDetailView,
    TeacherStudentStatisticsView,
)

urlpatterns = [
    path("groups", TeacherGroupsView.as_view()),
    path("groups/<int:group_id>", TeacherGroupDetailView.as_view()),
    path("groups/<int:group_id>/statistics", TeacherGroupStatisticsView.as_view()),
    path("students/<int:student_id>/statistics", TeacherStudentStatisticsView.as_view()),
    path("solutions/<int:solution_id>", TeacherSolutionDetailView.as_view()),
    path("solutions/<int:solution_id>/comments", TeacherCommentView.as_view()),
    path("solutions/<int:solution_id>/comments/<int:comment_id>", TeacherCommentDetailView.as_view()),
    path("solutions/<int:solution_id>/check", TeacherCheckView.as_view()),
]
