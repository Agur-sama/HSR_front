import { AdminDashboard } from '../../components/AdminDashboard/AdminDashboard';
import { PlatformShell } from '../../components/Layout/PlatformShell';
import type { UserRole } from '../../domain/network/types';

type AdminDashboardPageProps = {
  role: UserRole;
  onLogout: () => void;
};

export function AdminDashboardPage({ role, onLogout }: AdminDashboardPageProps) {
  return (
    <PlatformShell
      role={role}
      title="Административная панель"
      subtitle="Пользователи, роли, группы и шаблоны учебных проектов."
      onLogout={onLogout}
    >
      <AdminDashboard />
    </PlatformShell>
  );
}
