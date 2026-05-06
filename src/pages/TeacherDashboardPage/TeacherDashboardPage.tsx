import { PlatformShell } from '../../components/Layout/PlatformShell';
import { TeacherDashboard } from '../../components/TeacherDashboard/TeacherDashboard';
import type { UserRole } from '../../domain/network/types';

type TeacherDashboardPageProps = {
  role: UserRole;
  onLogout: () => void;
  onOpenStudent: (studentId: string) => void;
};

export function TeacherDashboardPage({ role, onLogout, onOpenStudent }: TeacherDashboardPageProps) {
  return (
    <PlatformShell
      role={role}
      title="Кабинет преподавателя"
      subtitle="Проверка решений студентов, комментарии, оценивание и анализ прогресса группы по КСГ"
      onLogout={onLogout}
    >
      <TeacherDashboard onOpenStudent={onOpenStudent} />
    </PlatformShell>
  );
}
