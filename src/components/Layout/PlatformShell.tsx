import type { ReactNode } from 'react';
import type { UserRole } from '../../domain/network/types';
import { RoleSwitcher } from '../RoleSwitcher/RoleSwitcher';

const roleLabels: Record<UserRole, string> = {
  admin: 'Админ',
  teacher: 'Преподаватель',
  student: 'Студент',
};

type PlatformShellProps = {
  role: UserRole;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  onLogout: () => void;
};

export function PlatformShell({ role, title, subtitle, actions, children, onLogout }: PlatformShellProps) {
  return (
    <div className="platform-shell">
      <header className="topbar lms-topbar">
        <div>
          <p className="eyebrow">Академия ВСМ · учебный тренажер</p>
          <h1>{title}</h1>
          {subtitle ? <p className="topbar__subtitle">{subtitle}</p> : null}
        </div>
        <div className="topbar__actions">
          <RoleSwitcher label={roleLabels[role]} onLogout={onLogout} />
          {actions}
        </div>
      </header>
      {children}
    </div>
  );
}
