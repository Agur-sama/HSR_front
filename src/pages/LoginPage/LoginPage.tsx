import { useState } from 'react';

type LoginPageProps = {
  onLogin: (email: string, password: string) => void;
  error?: string;
};

export function LoginPage({ onLogin, error }: LoginPageProps) {
  const [email, setEmail] = useState('student@example.com');
  const [password, setPassword] = useState('student123456');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onLogin(email, password);
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div>
          <p className="eyebrow">Интерактивная учебная платформа</p>
          <h1>Сетевое планирование и управление КСГ</h1>
          <p>
            Войдите по email и паролю. Аккаунты студентов и учителей создаёт администратор.
          </p>
        </div>
        <form className="login-panel" aria-label="Вход в платформу" onSubmit={submit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.com" />
          </label>
          <label>
            Пароль
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit">Войти</button>
          <p className="login-hint">
            Демо: admin@example.com / admin123456, teacher@example.com / teacher123456, student@example.com / student123456.
          </p>
        </form>
      </section>
    </main>
  );
}
