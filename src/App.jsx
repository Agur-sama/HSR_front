import React, { useMemo } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { useGameLogic } from './hooks/useGameLogic';
import GanttChart from './components/GanttChart';
import ResourcePanel from './components/ResourcePanel';
import EventPopup from './components/EventPopup';
import VictoryPopup from './components/VictoryPopup';
import { useProject } from './context/ProjectContext';
import { calculateProjectProfile } from './utils/projectCalculator';
import { Main } from './pages/main/Main';
import ResultPage from './pages/ResultPage';
import NewsFeed from './pages/NewsFeed';

function Layout({ children }) {
  return (
    <div className="site-shell">
      <div className="site-shell__glow site-shell__glow--left" />
      <div className="site-shell__glow site-shell__glow--right" />

      <header className="top-frame">
        <div className="topbar">
          <div className="topbar__brand">
            <div className="topbar__logo">
              <div className="topbar__logo-main">ВСМ</div>
              <div className="topbar__logo-sub">высокоскоростная магистраль</div>
            </div>

            <div className="topbar__brand-text">
              <h1>Проект высокоскоростной магистрали</h1>
              <p>Форма параметров и симулятор работают с общими данными</p>
            </div>
          </div>

          <nav className="topbar__nav">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? 'topbar__link topbar__link--active' : 'topbar__link'
              }
            >
              Главная
            </NavLink>

            <NavLink
              to="/game"
              className={({ isActive }) =>
                isActive ? 'topbar__link topbar__link--active' : 'topbar__link'
              }
            >
              Симулятор
            </NavLink>

            <NavLink
              to="/results"
              className={({ isActive }) =>
                isActive ? 'topbar__link topbar__link--active' : 'topbar__link'
              }
            >
              Результаты
            </NavLink>

            <NavLink
              to="/results"
              className={({ isActive }) =>
                isActive ? 'topbar__link topbar__link--active' : 'topbar__link'
              }
            >
              Результаты
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="page-wrap">{children}</main>
    </div>
  );
}

function GamePage() {
  const { projectData } = useProject();
  const profile = useMemo(() => calculateProjectProfile(projectData), [projectData]);

  const {
    gameState,
    showEvent,
    currentEvent,
    showVictory,
    setShowVictory,
    allocateResources,
    startGame,
    pauseGame,
    resetGame,
    applyEvent,
    closeEvent
  } = useGameLogic();

  const currentPhase = gameState.phases[gameState.currentPhase];
  const canStartPhase =
    currentPhase &&
    !currentPhase.allocatedResources &&
    !currentPhase.completed;

  const statusText =
    gameState.status === 'running'
      ? 'Строительство'
      : gameState.status === 'paused'
      ? 'Пауза'
      : gameState.status === 'finished'
      ? 'Завершено'
      : 'Ожидание';

  return (
    <section className="game-page">
      <div className="section-line" />

      <div className="page-head">
        <div>
          <span className="page-tag">Симулятор auth</span>
          <h2 className="page-title">Управление этапами строительства</h2>
          <p className="page-subtitle">
            Данные ниже автоматически берутся из формы на первой странице и пересчитывают стартовые ресурсы.
          </p>
        </div>

        <div className="page-head__side">
          <div className="year-badge">{profile.durationMonths} мес.</div>
        </div>
      </div>

      <div style={projectStyles.grid}>
        <div style={projectStyles.card}>
          <span style={projectStyles.label}>Маршрут</span>
          <strong style={projectStyles.value}>{profile.routeType}</strong>
        </div>

        <div style={projectStyles.card}>
          <span style={projectStyles.label}>Заказчик</span>
          <strong style={projectStyles.value}>{profile.customer}</strong>
        </div>

        <div style={projectStyles.card}>
          <span style={projectStyles.label}>Протяжённость</span>
          <strong style={projectStyles.value}>{profile.distanceKm} км</strong>
        </div>

        <div style={projectStyles.card}>
          <span style={projectStyles.label}>Рабочие</span>
          <strong style={projectStyles.value}>{profile.workers}</strong>
        </div>

        <div style={projectStyles.card}>
          <span style={projectStyles.label}>Мосты</span>
          <strong style={projectStyles.value}>{profile.bridges}</strong>
        </div>

        <div style={projectStyles.card}>
          <span style={projectStyles.label}>Тип местности</span>
          <strong style={projectStyles.value}>{profile.terrain}</strong>
        </div>

        <div style={projectStyles.card}>
          <span style={projectStyles.label}>Бюджет</span>
          <strong style={projectStyles.value}>{profile.budget} млн ₽</strong>
        </div>

        <div style={projectStyles.card}>
          <span style={projectStyles.label}>ЗП рабочих</span>
          <strong style={projectStyles.value}>{profile.workerSalary} тыс. ₽</strong>
        </div>
      </div>

      <div className="stats-strip">
        <div className="stats-card">
          <span className="stats-card__label">Этап</span>
          <strong className="stats-card__value">
            {gameState.currentPhase + 1} / {gameState.phases.length}
          </strong>
        </div>

        <div className="stats-card">
          <span className="stats-card__label">Текущий месяц</span>
          <strong className="stats-card__value">{gameState.currentMonth}</strong>
        </div>

        <div className="stats-card">
          <span className="stats-card__label">Статус</span>
          <strong className="stats-card__value">{statusText}</strong>
        </div>
      </div>

      <div className="resource-strip">
        <div className="resource-card">
          <span>💰 Деньги</span>
          <strong>{profile.resources.money}</strong>
        </div>
        <div className="resource-card">
          <span>👷 Рабочая сила</span>
          <strong>{profile.resources.labor}</strong>
        </div>
        <div className="resource-card">
          <span>🏗 Материалы</span>
          <strong>{profile.resources.materials}</strong>
        </div>
        <div className="resource-card">
          <span>⚡ Электроэнергия</span>
          <strong>{profile.resources.electricity}</strong>
        </div>
      </div>

      <div className="action-row">
        {gameState.status === 'idle' && (
          <button onClick={startGame} className="btn btn--primary">
            Начать проект
          </button>
        )}

        {gameState.status === 'running' && (
          <button onClick={pauseGame} className="btn btn--primary">
            Пауза
          </button>
        )}

        {gameState.status === 'paused' && (
          <button onClick={startGame} className="btn btn--primary">
            Продолжить
          </button>
        )}

        <button onClick={resetGame} className="btn btn--ghost">
          Сбросить
        </button>
      </div>

      <div className="game-grid">
        <div className="content-panel content-panel--dark content-panel--wide">
          <div className="panel-title">Диаграмма проекта</div>
          <GanttChart
            phases={gameState.phases}
            currentMonth={gameState.currentMonth}
            currentPhase={gameState.currentPhase}
          />
        </div>

        {currentPhase && !currentPhase.completed && (
          <div className="content-panel content-panel--dark">
            <div className="panel-title">Распределение ресурсов</div>
            <ResourcePanel
              phase={currentPhase}
              availableResources={profile.resources}
              onAllocate={allocateResources}
              disabled={!canStartPhase || gameState.status !== 'running'}
            />
          </div>
        )}

        <div className="content-panel content-panel--dark content-panel--wide">
          <div className="panel-title">Лента событий</div>

          <div className="log-box">
            {gameState.logs.length === 0 ? (
              <div className="log-empty">
                Пока событий нет. Сохрани параметры на первой странице и запусти проект.
              </div>
            ) : (
              gameState.logs.slice(-8).map((log, i) => (
                <div key={i} className="log-entry">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showEvent && (
        <EventPopup
          event={currentEvent}
          onAccept={() => applyEvent(currentEvent)}
          onClose={closeEvent}
        />
      )}

      {showVictory && (
        <VictoryPopup
          onClose={() => {
            setShowVictory(false);
            resetGame();
          }}
        />
      )}
    </section>
  );
}

const projectStyles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '16px',
    marginBottom: '18px'
  },
  card: {
    borderRadius: '20px',
    padding: '18px 20px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(191, 219, 254, 0.14)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 34px rgba(2, 8, 23, 0.18)',
    backdropFilter: 'blur(8px)'
  },
  label: {
    display: 'block',
    color: '#9fb9e6',
    fontSize: '14px',
    marginBottom: '8px'
  },
  value: {
    color: '#ffffff',
    fontSize: '22px',
    lineHeight: 1.25
  }
};

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/results" element={<ResultPage />} />
        <Route path="/news" element={<NewsFeed />} />
      </Routes>
    </Layout>
  );
}

export default App;