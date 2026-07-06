import { useEffect, useState } from 'react';
import { AdminDashboardPage } from '../pages/AdminDashboardPage/AdminDashboardPage';
import { LoginPage } from '../pages/LoginPage/LoginPage';
import { StudentSimulatorPage } from '../pages/StudentSimulatorPage/StudentSimulatorPage';
import { StudentReviewPage } from '../pages/StudentReviewPage/StudentReviewPage';
import { TeacherDashboardPage } from '../pages/TeacherDashboardPage/TeacherDashboardPage';
import type { AppUser, UserRole } from '../domain/network/types';
import { getCurrentUser, setCurrentUser } from '../utils/storage';
import { login as apiLogin, logout as apiLogout, me } from '../api/authApi';
import type { ApiUser } from '../api/client';
import { clearTokens } from '../api/client';

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [user, setUser] = useState<AppUser | null>(() => getCurrentUser());
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    me()
      .then((apiUser) => {
        const nextUser = mapApiUser(apiUser);
        setUser(nextUser);
        setCurrentUser(nextUser.id);
      })
      .catch(() => {
        clearTokens();
        setCurrentUser(null);
        setUser(null);
      });
  }, []);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(nextPath: string) {
    window.history.pushState({}, '', nextPath);
    setPath(nextPath);
  }

  async function loginByCredentials(email: string, password: string) {
    try {
      setAuthError('');
      const apiUser = await apiLogin(email, password);
      const nextUser = mapApiUser(apiUser);
      setCurrentUser(nextUser.id);
      setUser(nextUser);
      navigate(`/${nextUser.role === 'admin' ? 'admin' : nextUser.role}`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Не удалось войти.');
    }
  }

  function loginByUser(userId: string) {
    const nextUser = user?.id === userId ? user : null;
    if (!nextUser) return;
    setUser(nextUser);
    navigate(`/${nextUser.role === 'admin' ? 'admin' : nextUser.role}`);
  }

  async function logout() {
    await apiLogout().catch(() => undefined);
    setCurrentUser(null);
    setUser(null);
    navigate('/login');
  }

  if (path === '/register') {
    navigate('/login');
    return null;
  }

  if (path === '/login' || !user) {
    return <LoginPage onLogin={loginByCredentials} error={authError} />;
  }

  if (path.startsWith('/teacher/students/')) {
    return <StudentReviewPage role="teacher" studentId={path.split('/').at(-1) ?? ''} onBack={() => navigate('/teacher')} onLogout={logout} />;
  }

  if (path === '/teacher') {
    return <TeacherDashboardPage role="teacher" onLogout={logout} onOpenStudent={(id) => navigate(`/teacher/students/${id}`)} />;
  }

  if (path === '/admin') {
    return <AdminDashboardPage role="admin" onLogout={logout} />;
  }

  return <StudentSimulatorPage role="student" user={user} onLogout={logout} />;
}

function mapApiUser(user: ApiUser): AppUser {
  return {
    id: String(user.id),
    name: user.full_name,
    email: user.email,
    role: user.role,
    status: user.is_active === false ? 'inactive' : 'active',
  };
}
