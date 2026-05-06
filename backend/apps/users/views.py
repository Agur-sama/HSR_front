from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.assignments.models import Assignment
from apps.assignments.serializers import AssignmentSerializer
from apps.groups.models import Group
from apps.groups.serializers import GroupSerializer
from apps.solutions.models import StudentSolution
from apps.users.models import User
from apps.users.permissions import IsAdminRole
from apps.users.serializers import LoginSerializer, UserSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class LogoutView(APIView):
    def post(self, request):
        refresh = request.data.get("refresh")
        if refresh:
            RefreshToken(refresh).blacklist()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = UserSerializer
    queryset = User.objects.all().order_by("id")


class AdminGroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = GroupSerializer
    queryset = Group.objects.all().order_by("id")

    def get_queryset(self):
        return super().get_queryset().extra(select={"students_count": "SELECT COUNT(*) FROM users_studentprofile WHERE users_studentprofile.group_id = groups_group.id"})


class AdminAssignmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = AssignmentSerializer
    queryset = Assignment.objects.prefetch_related("works").all().order_by("id")


class AdminStatisticsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        checked = StudentSolution.objects.filter(status="checked")
        return Response({
            "students_count": User.objects.filter(role="student").count(),
            "teachers_count": User.objects.filter(role="teacher").count(),
            "groups_count": Group.objects.count(),
            "assignments_count": Assignment.objects.count(),
            "submitted_solutions_count": StudentSolution.objects.filter(status="submitted").count(),
            "checked_solutions_count": checked.count(),
            "average_score": sum(solution.score or 0 for solution in checked) / checked.count() if checked.exists() else 0,
        })
