<<<<<<< Updated upstream
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import StudentsForm from './pages/StudentsForm'  

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/form" element={<StudentsForm />} />
      </Routes>
    </BrowserRouter>
  )
=======
import React, { useMemo, useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useGameLogic } from './hooks/useGameLogic';
import GanttChart from './components/GanttChart';
import ResourcePanel from './components/ResourcePanel';
import EventPopup from './components/EventPopup';
import VictoryPopup from './components/VictoryPopup';
import BankruptcyPopup from './components/BankruptcyPopup';
import { useProject, ProjectProvider } from './context/ProjectContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { calculateProjectProfile } from './utils/projectCalculator';
import { Main } from './pages/main/Main';
import ResultPage from './pages/ResultPage';
import NewsFeed from './pages/NewsFeed';
import AuthPage from './pages/AuthPage';
import './index.css';

function ProtectedRoute({ children, isAuthenticated }) {
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

function Layout({ children, isAuthenticated, onLogout }) {
  const { themeName, toggleTheme } = useTheme();

  return (
    <>
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
          {isAuthenticated && (
            <nav className="topbar__nav">
              <NavLink to="/form" end className={({ isActive }) => isActive ? 'topbar__link topbar__link--active' : 'topbar__link'}>Главная</NavLink>
              <NavLink to="/game" className={({ isActive }) => isActive ? 'topbar__link topbar__link--active' : 'topbar__link'}>Симулятор</NavLink>
              <NavLink to="/results" className={({ isActive }) => isActive ? 'topbar__link topbar__link--active' : 'topbar__link'}>Результаты</NavLink>
              <NavLink to="/news" className={({ isActive }) => isActive ? 'topbar__link topbar__link--active' : 'topbar__link'}>Новости</NavLink>
              <button onClick={toggleTheme} className="topbar__link" style={{ background: 'none' }}>
                {themeName === 'dark' ? '☀️ Светлая' : '🌙 Тёмная'}
              </button>
              <button onClick={onLogout} className="topbar__link topbar__link--logout">Выйти</button>
            </nav>
          )}
        </div>
      </header>
      <main className="page-wrap">{children}</main>
    </>
  );
}

function GamePage() {
  const { projectData, resetProjectData } = useProject();
  const profile = useMemo(() => calculateProjectProfile(projectData), [projectData]);
  const {
    gameState, showEvent, currentEvent, showVictory, setShowVictory,
    showBankruptcy, bankruptcyReason, setShowBankruptcy,
    allocateResources, startGame, pauseGame, resetGame, applyEvent, closeEvent
  } = useGameLogic(projectData);

  const currentPhase = gameState.phases[gameState.currentPhase];
  const canStartPhase = currentPhase && !currentPhase.allocatedResources && !currentPhase.completed;
  const statusText = gameState.status === 'running' ? 'Строительство' : gameState.status === 'paused' ? 'Пауза' : gameState.status === 'finished' ? 'Завершено' : gameState.status === 'bankrupt' ? 'Банкротство' : 'Ожидание';
  
  const totalPlannedMonths = gameState.phases.reduce((sum, phase) => sum + phase.originalDuration, 0);
  const actualCompletedMonths = gameState.phases.filter(p => p.completed).reduce((sum, p) => sum + p.duration, 0);
  const plannedCompletedMonths = gameState.phases.filter(p => p.completed).reduce((sum, p) => sum + p.originalDuration, 0);
  const totalDeviation = actualCompletedMonths - plannedCompletedMonths;
  const completedCount = gameState.phases.filter(p => p.completed).length;

  const handleFullReset = () => {
    resetGame();
    resetProjectData();
  };

  return (
    <section className="game-page">
      <div className="page-head">
        <div>
          <div className="page-tag">Симулятор строительства</div>
          <h1 className="page-title">Управление этапами строительства</h1>
          <p className="page-subtitle">
            Распределяйте ресурсы, отслеживайте прогресс и реагируйте на события в реальном времени
          </p>
        </div>
        <div className="page-head__side">
          <div className="year-badge">{profile.durationMonths} мес.</div>
          <div className="page-tag">плановый срок</div>
        </div>
      </div>

      <div className="project-grid">
        <div className="project-card">
          <span className="project-label">Маршрут</span>
          <strong className="project-value">{profile.routeType}</strong>
        </div>
        <div className="project-card">
          <span className="project-label">Заказчик</span>
          <strong className="project-value">{profile.customer}</strong>
        </div>
        <div className="project-card">
          <span className="project-label">Протяжённость</span>
          <strong className="project-value">{profile.distanceKm} км</strong>
        </div>
        <div className="project-card">
          <span className="project-label">Рабочие</span>
          <strong className="project-value">{profile.workers}</strong>
        </div>
      </div>

      <div className="stats-strip">
        <div className="stats-card">
          <span className="stats-card__label">Текущий этап</span>
          <strong className="stats-card__value">{gameState.currentPhase + 1} / {gameState.phases.length}</strong>
        </div>
        <div className="stats-card">
          <span className="stats-card__label">Месяц строительства</span>
          <strong className="stats-card__value">{gameState.currentMonth}</strong>
        </div>
        <div className="stats-card">
          <span className="stats-card__label">Статус</span>
          <strong className="stats-card__value">{statusText}</strong>
        </div>
        <div className="stats-card">
          <span className="stats-card__label">⏱️ Отклонение от плана</span>
          <strong className="stats-card__value" style={{ color: totalDeviation > 0 ? '#ef4444' : totalDeviation < 0 ? '#10b981' : '#f59e0b' }}>
            {totalDeviation > 0 ? `+${totalDeviation}` : totalDeviation} мес.
          </strong>
          <span style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
            {totalDeviation > 0 ? '🔴 Отставание' : totalDeviation < 0 ? '🟢 Опережение' : '✅ По графику'}
          </span>
          <span style={{ fontSize: 10, display: 'block', marginTop: 4, color: '#94a3b8' }}>
            Завершено этапов: {completedCount} / {gameState.phases.length}
          </span>
        </div>
      </div>

      <div className="resource-strip">
        <div className="resource-card">
          <span>💰 Финансирование</span>
          <strong>{Math.floor(gameState.resources.money).toLocaleString()} ₽</strong>
        </div>
        <div className="resource-card">
          <span>👷 Рабочая сила</span>
          <strong>{Math.floor(gameState.resources.labor)} чел.</strong>
        </div>
        <div className="resource-card">
          <span>🏗️ Стройматериалы</span>
          <strong>{Math.floor(gameState.resources.materials)} т</strong>
        </div>
        <div className="resource-card">
          <span>⚡ Электроэнергия</span>
          <strong>{Math.floor(gameState.resources.electricity)} МВт·ч</strong>
        </div>
      </div>

      <div className="action-row">
        {gameState.status === 'idle' && (
          <button onClick={startGame} className="btn btn--primary">🚀 Начать проект</button>
        )}
        {gameState.status === 'running' && (
          <button onClick={pauseGame} className="btn btn--primary">⏸️ Пауза</button>
        )}
        {gameState.status === 'paused' && (
          <button onClick={startGame} className="btn btn--primary">▶️ Продолжить</button>
        )}
        <button onClick={handleFullReset} className="btn btn--ghost">🔄 Сбросить всё</button>
      </div>

      <div className="game-grid">
        <div className="content-panel content-panel--dark content-panel--wide">
          <div className="panel-title">📊 Диаграмма Ганта</div>
          <GanttChart 
            phases={gameState.phases} 
            currentMonth={gameState.currentMonth} 
            currentPhase={gameState.currentPhase} 
          />
        </div>

        {currentPhase && !currentPhase.completed && gameState.status !== 'bankrupt' && (
          <div className="content-panel content-panel--dark">
            <div className="panel-title">📦 Распределение ресурсов</div>
            <ResourcePanel 
              phase={currentPhase} 
              availableResources={gameState.resources} 
              onAllocate={allocateResources} 
              disabled={!canStartPhase || gameState.status !== 'running'} 
            />
          </div>
        )}

        <div className="content-panel content-panel--dark content-panel--wide">
          <div className="panel-title">📋 Лента событий</div>
          <div className="log-box">
            {gameState.logs.length === 0 ? (
              <div className="log-empty">Пока событий нет. Начните проект!</div>
            ) : (
              gameState.logs.slice(-8).map((log, i) => (
                <div key={i} className="log-entry">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>

      {showEvent && (
        <EventPopup event={currentEvent} onAccept={() => applyEvent(currentEvent)} onClose={closeEvent} />
      )}
      {showVictory && (
        <VictoryPopup onClose={() => { setShowVictory(false); resetGame(); }} />
      )}
      {showBankruptcy && (
        <BankruptcyPopup reason={bankruptcyReason} onReset={() => { setShowBankruptcy(false); resetGame(); }} />
      )}
    </section>
  );
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { resetToDarkTheme } = useTheme();
  
  const handleLogin = () => {
    setIsAuthenticated(true);
  };
  
  const handleLogout = () => {
    setIsAuthenticated(false);
    resetToDarkTheme();
  };

  return (
    <ProjectProvider>
      <Layout isAuthenticated={isAuthenticated} onLogout={handleLogout}>
        <Routes>
          {/* Корневой путь - перенаправление в зависимости от авторизации */}
          <Route path="/" element={<Navigate to={isAuthenticated ? "/form" : "/auth"} replace />} />
          <Route path="/auth" element={<AuthPage onLogin={handleLogin} />} />
          <Route path="/form" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Main />
            </ProtectedRoute>
          } />
          <Route path="/game" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <GamePage />
            </ProtectedRoute>
          } />
          <Route path="/results" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <ResultPage />
            </ProtectedRoute>
          } />
          <Route path="/news" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <NewsFeed />
            </ProtectedRoute>
          } />
        </Routes>
      </Layout>
    </ProjectProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
>>>>>>> Stashed changes
}

export default App