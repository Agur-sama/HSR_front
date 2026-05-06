from django.db import transaction

from apps.assignments.models import WorkDefinition
from apps.network.calculations import NetworkWork, calculate_metrics, calculate_resource_usage, calculate_schedule
from apps.solutions.models import ChangeHistory, StudentSolution, StudentWorkItem


def ensure_solution(student, assignment):
    solution, created = StudentSolution.objects.get_or_create(student=student, assignment=assignment)
    if created or not solution.works.exists():
        copy_assignment_works(solution)
    recalculate_solution(solution)
    return solution


def copy_assignment_works(solution: StudentSolution):
    solution.works.all().delete()
    bulk = [
        StudentWorkItem(
            solution=solution,
            work_number=work.work_number,
            event_start=work.event_start,
            event_end=work.event_end,
            title=work.title,
            labor=work.labor,
            workers=work.workers,
            duration=work.duration,
            calculation_mode=work.calculation_mode,
            planned_shift=work.planned_shift,
            order_index=work.order_index,
        )
        for work in WorkDefinition.objects.filter(assignment=solution.assignment)
    ]
    StudentWorkItem.objects.bulk_create(bulk)


def serialize_network_work(item: StudentWorkItem) -> NetworkWork:
    return NetworkWork(
        id=item.id,
        work_number=item.work_number,
        event_start=item.event_start,
        event_end=item.event_end,
        title=item.title,
        labor=item.labor,
        workers=item.workers,
        duration=item.duration,
        calculation_mode=item.calculation_mode,
        planned_shift=item.planned_shift,
        order_index=item.order_index,
    )


@transaction.atomic
def recalculate_solution(solution: StudentSolution):
    items = list(solution.works.all())
    works, errors = calculate_schedule([serialize_network_work(item) for item in items])
    if errors:
        return {"errors": [error.__dict__ for error in errors]}
    by_id = {work.id: work for work in works}
    for item in items:
        work = by_id[item.id]
        item.labor = work.labor
        item.duration = work.duration
        item.planned_shift = work.planned_shift
        item.early_start = work.early_start
        item.early_finish = work.early_finish
        item.late_start = work.late_start
        item.late_finish = work.late_finish
        item.total_float = work.total_float
        item.is_critical = work.is_critical
        item.save()
    metrics = calculate_metrics(works, solution.assignment.resource_limit)
    for field, value in metrics.items():
        setattr(solution, field, value)
    solution.save()
    return {
        "errors": [],
        "metrics": metrics,
        "resource_usage": calculate_resource_usage(works, solution.assignment.resource_limit),
    }


def add_history(solution, work_item, field_name, old_value, new_value, before_duration, before_workers):
    message = (
        f"Работа {work_item.work_number}: {field_name} изменено с {old_value} на {new_value}. "
        f"Общий срок проекта: {before_duration} → {solution.project_duration}."
    )
    return ChangeHistory.objects.create(
        solution=solution,
        work_item=work_item,
        field_name=field_name,
        old_value=str(old_value),
        new_value=str(new_value),
        project_duration_before=before_duration,
        project_duration_after=solution.project_duration,
        max_workers_before=before_workers,
        max_workers_after=solution.max_workers,
        message=message,
    )
