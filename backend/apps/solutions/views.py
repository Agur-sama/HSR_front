from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.assignments.models import Assignment
from apps.assignments.serializers import AssignmentSerializer
from apps.comments.models import TeacherComment
from apps.comments.serializers import TeacherCommentSerializer
from apps.groups.models import Group
from apps.groups.serializers import GroupSerializer
from apps.network.calculations import calculate_resource_usage, calculate_schedule
from apps.solutions.models import ChangeHistory, StudentSolution, StudentWorkItem
from apps.solutions.serializers import ChangeHistorySerializer, StudentSolutionSerializer, StudentWorkItemSerializer
from apps.solutions.services import add_history, copy_assignment_works, recalculate_solution, serialize_network_work, ensure_solution
from apps.users.models import User
from apps.users.permissions import IsStudentRole, IsTeacherRole
from apps.users.serializers import UserSerializer


def error_response(errors, status_code=400):
    return Response({"detail": "Ошибка в исходных данных", "errors": errors}, status=status_code)


def solution_payload(solution):
    recalc = recalculate_solution(solution)
    if recalc.get("errors"):
        return {"solution": StudentSolutionSerializer(solution).data, "errors": recalc["errors"]}
    works, _ = calculate_schedule([serialize_network_work(item) for item in solution.works.all()])
    return {
        "solution": StudentSolutionSerializer(solution).data,
        "metrics": {
            "project_duration": solution.project_duration,
            "max_workers": solution.max_workers,
            "average_workers": solution.average_workers,
            "critical_works_count": solution.critical_works_count,
            "works_with_float_count": solution.works_with_float_count,
            "overload_count": solution.overload_count,
            "score": solution.score,
        },
        "resource_usage": calculate_resource_usage(works, solution.assignment.resource_limit),
        "errors": [],
    }


class StudentAssignmentsView(APIView):
    permission_classes = [IsStudentRole]

    def get(self, request):
        group = getattr(request.user.student_profile, "group", None)
        qs = Assignment.objects.filter(group=group, status="active").prefetch_related("works")
        return Response(AssignmentSerializer(qs, many=True).data)


class StudentAssignmentDetailView(APIView):
    permission_classes = [IsStudentRole]

    def get(self, request, assignment_id):
        assignment = Assignment.objects.get(id=assignment_id)
        solution = ensure_solution(request.user, assignment)
        return Response(solution_payload(solution))


class StudentSolutionDetailView(APIView):
    permission_classes = [IsStudentRole]

    def get(self, request, solution_id):
        solution = StudentSolution.objects.get(id=solution_id, student=request.user)
        return Response(solution_payload(solution))


class StudentWorkListView(APIView):
    permission_classes = [IsStudentRole]

    def post(self, request, solution_id):
        solution = StudentSolution.objects.get(id=solution_id, student=request.user, status="draft")
        serializer = StudentWorkItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(solution=solution)
        before_duration, before_workers = solution.project_duration, solution.max_workers
        recalc = recalculate_solution(solution)
        if recalc["errors"]:
            return error_response(recalc["errors"])
        add_history(solution, item, "добавление работы", "", item.work_number, before_duration, before_workers)
        return Response(solution_payload(solution), status=status.HTTP_201_CREATED)


class StudentWorkDetailView(APIView):
    permission_classes = [IsStudentRole]

    def patch(self, request, solution_id, work_id):
        solution = StudentSolution.objects.get(id=solution_id, student=request.user)
        if solution.status != "draft":
            return error_response([{"field": "status", "message": "Отправленное решение нельзя редактировать."}], 403)
        item = solution.works.get(id=work_id)
        before_duration, before_workers = solution.project_duration, solution.max_workers
        changed_field, old_value, new_value = None, "", ""
        for field, value in request.data.items():
            if hasattr(item, field):
                changed_field = field
                old_value = getattr(item, field)
                new_value = value
                setattr(item, field, value)
        item.save()
        recalc = recalculate_solution(solution)
        if recalc["errors"]:
            return error_response(recalc["errors"])
        if changed_field:
            add_history(solution, item, changed_field, old_value, new_value, before_duration, before_workers)
        return Response(solution_payload(solution))

    def delete(self, request, solution_id, work_id):
        solution = StudentSolution.objects.get(id=solution_id, student=request.user, status="draft")
        item = solution.works.get(id=work_id)
        before_duration, before_workers = solution.project_duration, solution.max_workers
        work_number = item.work_number
        item.delete()
        recalc = recalculate_solution(solution)
        if recalc["errors"]:
            return error_response(recalc["errors"])
        ChangeHistory.objects.create(
            solution=solution,
            field_name="удаление работы",
            old_value=work_number,
            new_value="",
            project_duration_before=before_duration,
            project_duration_after=solution.project_duration,
            max_workers_before=before_workers,
            max_workers_after=solution.max_workers,
            message=f"Работа {work_number} удалена.",
        )
        return Response(solution_payload(solution))


class StudentSolutionResetView(APIView):
    permission_classes = [IsStudentRole]

    def post(self, request, solution_id):
        solution = StudentSolution.objects.get(id=solution_id, student=request.user)
        before_duration, before_workers = solution.project_duration, solution.max_workers
        copy_assignment_works(solution)
        recalculate_solution(solution)
        ChangeHistory.objects.create(
            solution=solution,
            field_name="сброс решения",
            project_duration_before=before_duration,
            project_duration_after=solution.project_duration,
            max_workers_before=before_workers,
            max_workers_after=solution.max_workers,
            message="Решение сброшено к исходному заданию.",
        )
        return Response(solution_payload(solution))


class StudentSolutionSubmitView(APIView):
    permission_classes = [IsStudentRole]

    def post(self, request, solution_id):
        solution = StudentSolution.objects.get(id=solution_id, student=request.user)
        solution.status = "submitted"
        solution.submitted_at = timezone.now()
        solution.save()
        return Response(solution_payload(solution))


class StudentHistoryView(APIView):
    permission_classes = [IsStudentRole]

    def get(self, request, solution_id):
        solution = StudentSolution.objects.get(id=solution_id, student=request.user)
        return Response(ChangeHistorySerializer(solution.history.all(), many=True).data)


class TeacherGroupsView(APIView):
    permission_classes = [IsTeacherRole]

    def get(self, request):
        return Response(GroupSerializer(Group.objects.filter(teacher=request.user), many=True).data)


class TeacherGroupDetailView(APIView):
    permission_classes = [IsTeacherRole]

    def get(self, request, group_id):
        group = Group.objects.get(id=group_id, teacher=request.user)
        students = User.objects.filter(student_profile__group=group)
        solutions = StudentSolution.objects.filter(student__in=students)
        return Response({
            "group": GroupSerializer(group).data,
            "students": UserSerializer(students, many=True).data,
            "solutions": StudentSolutionSerializer(solutions, many=True).data,
            "statistics": group_statistics(group),
        })


class TeacherGroupStatisticsView(APIView):
    permission_classes = [IsTeacherRole]

    def get(self, request, group_id):
        group = Group.objects.get(id=group_id, teacher=request.user)
        return Response(group_statistics(group))


class TeacherStudentStatisticsView(APIView):
    permission_classes = [IsTeacherRole]

    def get(self, request, student_id):
        student = User.objects.get(id=student_id, student_profile__group__teacher=request.user)
        solutions = StudentSolution.objects.filter(student=student)
        return Response({
            "student": UserSerializer(student).data,
            "assignments": StudentSolutionSerializer(solutions, many=True).data,
            "changes_count": sum(solution.history.count() for solution in solutions),
        })


class TeacherSolutionDetailView(APIView):
    permission_classes = [IsTeacherRole]

    def get(self, request, solution_id):
        solution = StudentSolution.objects.get(id=solution_id, student__student_profile__group__teacher=request.user)
        return Response(solution_payload(solution))


class TeacherCommentView(APIView):
    permission_classes = [IsTeacherRole]

    def post(self, request, solution_id):
        solution = StudentSolution.objects.get(id=solution_id, student__student_profile__group__teacher=request.user)
        comment = TeacherComment.objects.create(solution=solution, teacher=request.user, text=request.data.get("text", ""))
        return Response(TeacherCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class TeacherCommentDetailView(APIView):
    permission_classes = [IsTeacherRole]

    def patch(self, request, solution_id, comment_id):
        comment = TeacherComment.objects.get(id=comment_id, solution_id=solution_id, teacher=request.user)
        comment.text = request.data.get("text", comment.text)
        comment.save()
        return Response(TeacherCommentSerializer(comment).data)

    def delete(self, request, solution_id, comment_id):
        TeacherComment.objects.get(id=comment_id, solution_id=solution_id, teacher=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeacherCheckView(APIView):
    permission_classes = [IsTeacherRole]

    def post(self, request, solution_id):
        solution = StudentSolution.objects.get(id=solution_id, student__student_profile__group__teacher=request.user)
        solution.status = "checked"
        solution.score = request.data.get("score")
        solution.checked_at = timezone.now()
        solution.save()
        comment = request.data.get("comment")
        if comment:
            TeacherComment.objects.create(solution=solution, teacher=request.user, text=comment)
        return Response(solution_payload(solution))


def group_statistics(group):
    students = User.objects.filter(student_profile__group=group)
    solutions = StudentSolution.objects.filter(student__in=students)
    checked = solutions.filter(status="checked")
    durations = [solution.project_duration for solution in solutions if solution.project_duration]
    return {
        "students_count": students.count(),
        "started_count": solutions.count(),
        "submitted_count": solutions.filter(status="submitted").count(),
        "checked_count": checked.count(),
        "average_score": sum(solution.score or 0 for solution in checked) / checked.count() if checked.exists() else 0,
        "average_project_duration": sum(durations) / len(durations) if durations else 0,
        "min_project_duration": min(durations) if durations else 0,
        "max_project_duration": max(durations) if durations else 0,
        "average_max_workers": sum(solution.max_workers for solution in solutions) / solutions.count() if solutions.exists() else 0,
        "students_with_overload": solutions.filter(overload_count__gt=0).count(),
        "best_result": min(durations) if durations else 0,
        "worst_result": max(durations) if durations else 0,
    }
