from __future__ import annotations

from dataclasses import dataclass, field
from math import ceil


@dataclass
class NetworkError:
    work_id: int | None
    field: str
    message: str


@dataclass
class NetworkWork:
    id: int
    work_number: str
    event_start: str
    event_end: str
    title: str
    labor: int
    workers: int
    duration: int
    calculation_mode: str = "fixed_labor"
    planned_shift: int = 0
    order_index: int = 0
    dependencies: list[int] = field(default_factory=list)
    early_start: int = 0
    early_finish: int = 0
    late_start: int = 0
    late_finish: int = 0
    total_float: int = 0
    is_critical: bool = False


def normalize_work(work: NetworkWork) -> NetworkWork:
    if work.calculation_mode == "fixed_labor":
        work.duration = max(1, ceil(work.labor / work.workers))
    else:
        work.duration = max(1, work.duration)
        work.labor = max(1, work.duration * work.workers)
    return work


def build_dependencies_from_events(works: list[NetworkWork]) -> list[NetworkWork]:
    for work in works:
        work.dependencies = [
            other.id
            for other in works
            if other.id != work.id and other.event_end == work.event_start
        ]
    return works


def validate_network(works: list[NetworkWork]) -> list[NetworkError]:
    errors: list[NetworkError] = []
    if not works:
        return [NetworkError(None, "project", "Проект должен иметь хотя бы одну работу.")]
    for work in works:
        if not work.work_number:
            errors.append(NetworkError(work.id, "work_number", "Номер работы не должен быть пустым."))
        if not work.title:
            errors.append(NetworkError(work.id, "title", "Заполните название работы."))
        if not work.event_start:
            errors.append(NetworkError(work.id, "event_start", "Заполните событие начала."))
        if not work.event_end:
            errors.append(NetworkError(work.id, "event_end", "Заполните событие окончания."))
        if work.event_start and work.event_start == work.event_end:
            errors.append(NetworkError(work.id, "event_end", "Событие начала и событие окончания не могут совпадать."))
        if work.labor < 1:
            errors.append(NetworkError(work.id, "labor", "Трудоёмкость должна быть больше 0."))
        if work.workers < 1:
            errors.append(NetworkError(work.id, "workers", "Количество исполнителей должно быть больше 0."))
        if work.duration < 1:
            errors.append(NetworkError(work.id, "duration", "Продолжительность должна быть больше 0."))
    if not errors and detect_cycles(works):
        errors.append(NetworkError(None, "project", "В графике обнаружен цикл. Проверьте события начала и окончания."))
    return errors


def detect_cycles(works: list[NetworkWork]) -> bool:
    return len(_topological_sort(works)) != len(works)


def calculate_schedule(works: list[NetworkWork]) -> tuple[list[NetworkWork], list[NetworkError]]:
    works = build_dependencies_from_events([normalize_work(work) for work in works])
    errors = validate_network(works)
    if errors:
        return works, errors
    by_id = {work.id: work for work in works}
    successors = _successors(works)
    order = _topological_sort(works)
    base_by_id = {work.id: _clone_work(work) for work in works}
    base = _forward_schedule(order, base_by_id, 0)
    base_duration = max((work.early_finish for work in base), default=0)
    _apply_late_dates(list(reversed(order)), base_by_id, successors, base_duration)
    if not any(work.planned_shift > 0 for work in works):
        return [base_by_id[work_id] for work_id in order], []

    for work_id in order:
        work = by_id[work_id]
        dependency_finish = max([by_id[dependency].early_finish for dependency in work.dependencies] or [0])
        allowed_shift = max(0, base_by_id[work_id].late_start - dependency_finish)
        work.planned_shift = min(max(0, work.planned_shift), allowed_shift)
        work.early_start = dependency_finish + work.planned_shift
        work.early_finish = work.early_start + work.duration
    project_duration = max((work.early_finish for work in works), default=0)
    _apply_late_dates(list(reversed(order)), by_id, successors, project_duration)
    return [by_id[work_id] for work_id in order], []


def _clone_work(work: NetworkWork) -> NetworkWork:
    return NetworkWork(
        work.id,
        work.work_number,
        work.event_start,
        work.event_end,
        work.title,
        work.labor,
        work.workers,
        work.duration,
        work.calculation_mode,
        0,
        work.order_index,
        list(work.dependencies),
    )


def _forward_schedule(order: list[int], by_id: dict[int, NetworkWork], default_shift: int) -> list[NetworkWork]:
    for work_id in order:
        work = by_id[work_id]
        work.planned_shift = default_shift
        work.early_start = max([by_id[dependency].early_finish for dependency in work.dependencies] or [0]) + default_shift
        work.early_finish = work.early_start + work.duration
    return [by_id[work_id] for work_id in order]


def _apply_late_dates(order: list[int], by_id: dict[int, NetworkWork], successors: dict[int, list[int]], project_duration: int):
    for work_id in order:
        work = by_id[work_id]
        next_ids = successors.get(work_id, [])
        work.late_finish = min([by_id[next_id].late_start for next_id in next_ids] or [project_duration])
        work.late_start = work.late_finish - work.duration
        work.total_float = work.late_start - work.early_start
        work.is_critical = work.total_float == 0


def calculate_resource_usage(works: list[NetworkWork], resource_limit: int) -> list[dict]:
    duration = max((work.early_finish for work in works), default=0)
    usage = []
    for day in range(duration):
        workers = sum(work.workers for work in works if day >= work.early_start and day < work.early_finish)
        usage.append({
            "day": day + 1,
            "workers": workers,
            "overloaded": workers > resource_limit,
            "idle": workers > 0 and workers < resource_limit * 0.45,
        })
    return usage


def calculate_resource_usage_with_float(works: list[NetworkWork], resource_limit: int) -> list[dict]:
    duration = max((work.early_finish for work in works), default=0)
    allocations = [_reserve_aware_allocation(work) for work in works]
    usage = []
    for day in range(duration):
        workers = sum(allocation["workers"] for allocation in allocations if day >= allocation["start"] and day < allocation["finish"])
        usage.append({
            "day": day + 1,
            "workers": workers,
            "overloaded": workers > resource_limit,
            "idle": workers > 0 and workers < resource_limit * 0.45,
        })
    return usage


def _reserve_aware_allocation(work: NetworkWork) -> dict:
    available_duration = max(1, work.duration + max(0, work.total_float))
    workers = max(1, ceil(work.labor / available_duration)) if work.total_float > 0 else work.workers
    duration = min(available_duration, max(1, ceil(work.labor / workers))) if work.total_float > 0 else work.duration
    return {
        "start": work.early_start,
        "finish": min(work.late_finish, work.early_start + duration),
        "workers": workers,
    }


def calculate_metrics(works: list[NetworkWork], resource_limit: int) -> dict:
    usage = calculate_resource_usage(works, resource_limit)
    project_duration = max((work.early_finish for work in works), default=0)
    max_workers = max((point["workers"] for point in usage), default=0)
    average_workers = sum(point["workers"] for point in usage) / len(usage) if usage else 0
    return {
        "project_duration": project_duration,
        "max_workers": max_workers,
        "average_workers": round(average_workers, 2),
        "critical_works_count": sum(1 for work in works if work.is_critical),
        "works_with_float_count": sum(1 for work in works if work.total_float > 0),
        "overload_count": sum(1 for point in usage if point["overloaded"]),
    }


def _successors(works: list[NetworkWork]) -> dict[int, list[int]]:
    result = {work.id: [] for work in works}
    for work in works:
        for dependency_id in work.dependencies:
            result.setdefault(dependency_id, []).append(work.id)
    return result


def _topological_sort(works: list[NetworkWork]) -> list[int]:
    incoming = {work.id: 0 for work in works}
    successors = _successors(works)
    for work in works:
        incoming[work.id] = len(work.dependencies)
    queue = [work.id for work in works if incoming[work.id] == 0]
    order: list[int] = []
    while queue:
        work_id = queue.pop(0)
        order.append(work_id)
        for next_id in successors.get(work_id, []):
            incoming[next_id] -= 1
            if incoming[next_id] == 0:
                queue.append(next_id)
    return order
