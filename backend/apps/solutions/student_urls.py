from django.urls import path

from apps.solutions.views import (
    StudentAssignmentDetailView,
    StudentAssignmentsView,
    StudentHistoryView,
    StudentSolutionDetailView,
    StudentSolutionResetView,
    StudentSolutionSubmitView,
    StudentWorkDetailView,
    StudentWorkListView,
)

urlpatterns = [
    path("assignments", StudentAssignmentsView.as_view()),
    path("assignments/<int:assignment_id>", StudentAssignmentDetailView.as_view()),
    path("solutions/<int:solution_id>", StudentSolutionDetailView.as_view()),
    path("solutions/<int:solution_id>/works", StudentWorkListView.as_view()),
    path("solutions/<int:solution_id>/works/<int:work_id>", StudentWorkDetailView.as_view()),
    path("solutions/<int:solution_id>/reset", StudentSolutionResetView.as_view()),
    path("solutions/<int:solution_id>/submit", StudentSolutionSubmitView.as_view()),
    path("solutions/<int:solution_id>/history", StudentHistoryView.as_view()),
]
