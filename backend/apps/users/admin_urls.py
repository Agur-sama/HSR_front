from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.users.views import AdminAssignmentViewSet, AdminGroupViewSet, AdminStatisticsView, AdminUserViewSet

router = DefaultRouter()
router.register("users", AdminUserViewSet, basename="admin-users")
router.register("groups", AdminGroupViewSet, basename="admin-groups")
router.register("assignments", AdminAssignmentViewSet, basename="admin-assignments")

urlpatterns = [
    path("", include(router.urls)),
    path("statistics", AdminStatisticsView.as_view()),
]
