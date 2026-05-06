from django.test import TestCase

from apps.network.calculations import NetworkWork, build_dependencies_from_events, calculate_resource_usage, calculate_resource_usage_with_float, calculate_schedule, detect_cycles


class NetworkCalculationTests(TestCase):
    def test_build_dependencies_from_events(self):
        works = [
            NetworkWork(1, "1", "1", "2", "A", 10, 2, 5),
            NetworkWork(2, "2", "2", "3", "B", 10, 2, 5),
        ]
        build_dependencies_from_events(works)
        self.assertEqual(works[1].dependencies, [1])

    def test_calculate_schedule(self):
        works, errors = calculate_schedule([
            NetworkWork(1, "1", "1", "2", "A", 10, 2, 5),
            NetworkWork(2, "2", "2", "3", "B", 10, 2, 5),
        ])
        self.assertEqual(errors, [])
        self.assertEqual(works[-1].early_finish, 10)
        self.assertTrue(works[0].is_critical)

    def test_inserted_work_rebuilds_event_chain(self):
        works, errors = calculate_schedule([
            NetworkWork(1, "1-2", "1", "2", "A", 6, 2, 3),
            NetworkWork(2, "2-2.1", "2", "2.1", "Inserted", 4, 2, 2),
            NetworkWork(3, "2.1-3", "2.1", "3", "B", 6, 2, 3),
        ])
        self.assertEqual(errors, [])
        first = next(work for work in works if work.id == 1)
        inserted = next(work for work in works if work.id == 2)
        next_work = next(work for work in works if work.id == 3)
        self.assertEqual(inserted.dependencies, [1])
        self.assertEqual(next_work.dependencies, [2])
        self.assertEqual(inserted.early_start, first.early_finish)
        self.assertEqual(next_work.early_start, inserted.early_finish)

    def test_shift_moves_dependent_work_inside_float(self):
        works, errors = calculate_schedule([
            NetworkWork(1, "1-5", "1", "5", "Critical", 10, 1, 10),
            NetworkWork(2, "1-2", "1", "2", "A", 2, 1, 2, planned_shift=3),
            NetworkWork(3, "2-3", "2", "3", "B", 2, 1, 2),
        ])
        self.assertEqual(errors, [])
        first = next(work for work in works if work.id == 2)
        dependent = next(work for work in works if work.id == 3)
        self.assertEqual(first.early_start, 3)
        self.assertEqual(dependent.early_start, first.early_finish)
        self.assertEqual(max(work.early_finish for work in works), 10)

    def test_shift_is_clamped_by_available_float(self):
        works, errors = calculate_schedule([
            NetworkWork(1, "1-5", "1", "5", "Critical", 10, 1, 10),
            NetworkWork(2, "1-2", "1", "2", "A", 2, 1, 2, planned_shift=99),
            NetworkWork(3, "2-3", "2", "3", "B", 2, 1, 2),
        ])
        self.assertEqual(errors, [])
        first = next(work for work in works if work.id == 2)
        dependent = next(work for work in works if work.id == 3)
        self.assertEqual(first.planned_shift, 6)
        self.assertEqual(dependent.early_finish, 10)

    def test_calculate_resource_usage(self):
        works, _ = calculate_schedule([
            NetworkWork(1, "1", "1", "2", "A", 10, 2, 5),
            NetworkWork(2, "2", "1", "3", "B", 10, 3, 4),
        ])
        usage = calculate_resource_usage(works, 4)
        self.assertTrue(any(point["overloaded"] for point in usage))

    def test_resource_usage_without_float_keeps_original_peak(self):
        works, errors = calculate_schedule([
            NetworkWork(1, "1", "1", "2", "Критическая работа", 10, 1, 10),
            NetworkWork(2, "2", "1", "3", "Работа с резервом", 10, 10, 1),
        ])
        self.assertEqual(errors, [])
        usage = calculate_resource_usage(works, 5)
        reserve_work = next(work for work in works if work.id == 2)
        self.assertEqual(reserve_work.total_float, 9)
        self.assertEqual(usage[0]["workers"], 11)
        self.assertEqual(max(point["workers"] for point in usage), 11)

    def test_resource_usage_with_float_spreads_work(self):
        works, errors = calculate_schedule([
            NetworkWork(1, "1", "1", "2", "Критическая работа", 10, 1, 10),
            NetworkWork(2, "2", "1", "3", "Работа с резервом", 10, 10, 1),
        ])
        self.assertEqual(errors, [])
        usage = calculate_resource_usage_with_float(works, 5)
        reserve_work = next(work for work in works if work.id == 2)
        self.assertEqual(reserve_work.total_float, 9)
        self.assertEqual(usage[0]["workers"], 2)
        self.assertEqual(max(point["workers"] for point in usage), 2)

    def test_detect_cycles(self):
        works = [
            NetworkWork(1, "1", "1", "2", "A", 10, 2, 5, dependencies=[2]),
            NetworkWork(2, "2", "2", "1", "B", 10, 2, 5, dependencies=[1]),
        ]
        self.assertTrue(detect_cycles(works))
