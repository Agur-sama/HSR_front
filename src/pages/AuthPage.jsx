import { useMemo, useState } from "react";
import "./AuthPage.css";

export default function AuthPage() {
  const [mode, setMode] = useState("login");

  const [loginForm, setLoginForm] = useState({
    login: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    login: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const isLogin = mode === "login";

  const registerPasswordError = useMemo(() => {
    if (!registerForm.confirmPassword) return "";
    if (registerForm.password !== registerForm.confirmPassword) {
      return "Пароли не совпадают";
    }
    return "";
  }, [registerForm.password, registerForm.confirmPassword]);

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    console.log("Вход:", loginForm);
    alert("Форма входа отправлена. Дальше можно подключать API.");
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();

    if (registerForm.password !== registerForm.confirmPassword) {
      alert("Пароли не совпадают");
      return;
    }

    console.log("Регистрация:", registerForm);
    alert("Форма регистрации отправлена. Дальше можно подключать API.");
  };

  return (
    <div className="auth-page">
      <div className="auth-background-glow auth-background-glow--top" />
      <div className="auth-background-glow auth-background-glow--bottom" />

      <div className="auth-layout">
        <section className="auth-hero card">
          <span className="auth-badge">Тренажёр ПИШ</span>

          <p className="auth-meta">Учебная платформа • Диаграммы Ганта</p>

          <h1 className="auth-title">
            Игровой тренажёр для построения диаграмм Ганта
          </h1>

          <p className="auth-description">
            Платформа помогает магистрам Передовой инженерной школы
            отрабатывать навыки планирования проектов, распределения этапов,
            сроков и зависимостей в формате интерактивного тренажёра.
          </p>

          <div className="auth-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={() => setMode("register")}
            >
              Начать работу
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => setMode("login")}
            >
              Уже есть аккаунт
            </button>
          </div>

          <div className="auth-news-grid">
            <div className="news-card">
              <span className="news-tag">Обучение</span>
              <h3>Практика управления сроками</h3>
              <p>
                Стройте этапы проекта, управляйте зависимостями и учитесь
                планировать реалистичный график.
              </p>
            </div>

            <div className="news-card">
              <span className="news-tag">Навыки</span>
              <h3>Фокус на проектном мышлении</h3>
              <p>
                Тренажёр развивает навыки декомпозиции задач и понимание логики
                проектного планирования.
              </p>
            </div>

            <div className="news-card">
              <span className="news-tag">Для магистров</span>
              <h3>Учебный формат с понятным интерфейсом</h3>
              <p>
                Минимум лишнего — только сценарии, задания и удобная работа с
                диаграммой Ганта.
              </p>
            </div>
          </div>
        </section>

        <section className="auth-panel card">
          <div className="tabs">
            <button
              type="button"
              className={`tab-btn ${isLogin ? "active" : ""}`}
              onClick={() => setMode("login")}
            >
              Вход
            </button>
            <button
              type="button"
              className={`tab-btn ${!isLogin ? "active" : ""}`}
              onClick={() => setMode("register")}
            >
              Регистрация
            </button>
          </div>

          <div className="panel-header">
            <h2>{isLogin ? "Вход в систему" : "Создание аккаунта"}</h2>
            <p>
              {isLogin
                ? "Войдите, чтобы продолжить работу в тренажёре."
                : "Зарегистрируйтесь, чтобы начать работу с учебными сценариями."}
            </p>
          </div>

          {isLogin ? (
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <label className="field">
                <span>Логин</span>
                <input
                  type="text"
                  name="login"
                  placeholder="Введите логин"
                  value={loginForm.login}
                  onChange={handleLoginChange}
                  required
                />
              </label>

              <label className="field">
                <span>Пароль</span>
                <input
                  type="password"
                  name="password"
                  placeholder="Введите пароль"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  required
                />
              </label>

              <button type="submit" className="submit-btn">
                Войти
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegisterSubmit}>
              <label className="field">
                <span>Логин</span>
                <input
                  type="text"
                  name="login"
                  placeholder="Придумайте логин"
                  value={registerForm.login}
                  onChange={handleRegisterChange}
                  required
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  placeholder="Введите email"
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                  required
                />
              </label>

              <label className="field">
                <span>Пароль</span>
                <input
                  type="password"
                  name="password"
                  placeholder="Придумайте пароль"
                  value={registerForm.password}
                  onChange={handleRegisterChange}
                  required
                />
              </label>

              <label className="field">
                <span>Повторите пароль</span>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Повторите пароль"
                  value={registerForm.confirmPassword}
                  onChange={handleRegisterChange}
                  required
                />
              </label>

              {registerPasswordError && (
                <div className="error-text">{registerPasswordError}</div>
              )}

              <button type="submit" className="submit-btn">
                Зарегистрироваться
              </button>
            </form>
          )}

          <div className="auth-footer-info">
            <div className="info-card">
              <h4>Что даёт платформа</h4>
              <ul>
                <li>отработка логики построения диаграммы Ганта</li>
                <li>учебные кейсы и сценарии</li>
                <li>удобный старт для магистров ПИШ</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}