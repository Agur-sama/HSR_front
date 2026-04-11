import './App.css'
import Profile from './pages/Profile'

function App() {
  return (
    <div className="app-root">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">BCM</div>
          <div className="brand-text">
            <div className="brand-title">Проект высокоскоростной магистрали</div>
            <div className="brand-sub">Форма параметров и симулятор работают с общими данными</div>
          </div>
        </div>
        <nav className="topnav">
          <button className="btn-primary">Главная</button>
          <button className="btn-ghost">Симулятор</button>
        </nav>
      </header>

      <section className="page-hero">
        <h1>Личный кабинет</h1>
        <p className="lead">Личные данные пользователя, история симуляций и оценки преподавателей.</p>
      </section>

      <main className="page-content">
        <Profile />
      </main>
    </div>
  )
}

export default App
