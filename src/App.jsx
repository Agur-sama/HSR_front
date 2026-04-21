import React, { useMemo } from 'react';
import { Routes, Route, useLocation, NavLink as RouterNavLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  Container,
  Button,
  Stack,
} from '@mui/material';
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
import AuthPage from './pages/AuthPage';

function NavLink({ to, end, children }) {
  const location = useLocation();
  const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
  return (
    <Button
      component={RouterNavLink}
      to={to}
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '15px',
        px: 2.5,
        py: 1,
        borderRadius: '12px',
        color: isActive ? '#FFFFFF' : '#10203A',
        backgroundColor: isActive ? '#0B3A8D' : 'transparent',
        '&:hover': {
          backgroundColor: isActive ? '#062357' : '#F3F7FF',
        },
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </Button>
  );
}

function Layout({ children }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar
        position="static"
        sx={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F3F7FF 100%)',
          boxShadow: '0 10px 30px rgba(31, 45, 61, 0.08)',
          borderBottom: '1px solid #DBE3EE',
        }}
      >
        <Toolbar
          sx={{
            maxWidth: '1480px',
            margin: '0 auto',
            width: '100%',
            px: 3,
            py: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
            <Box>
              <Box sx={{ fontSize: '32px', fontWeight: 900, color: '#0B3A8D', lineHeight: 1 }}>
                ВСМ
              </Box>
              <Box sx={{ fontSize: '11px', fontWeight: 700, color: '#0B3A8D', textTransform: 'uppercase', opacity: 0.8 }}>
                высокоскоростная магистраль
              </Box>
            </Box>

            <Box>
              <Box sx={{ fontSize: '18px', fontWeight: 700, color: '#10203A' }}>
                Проект высокоскоростной магистрали
              </Box>
              <Box sx={{ fontSize: '13px', color: '#617899' }}>
                Форма параметров и симулятор работают с общими данными
              </Box>
            </Box>
          </Stack>

          <Stack direction="row" gap={0.5}>
            <NavLink to="/" end>
              Главная
            </NavLink>
            <NavLink to="/game">
              Симулятор
            </NavLink>
            <NavLink to="/results">
              Результаты
            </NavLink>
            <NavLink to="/news">
              Новости
            </NavLink>
            <NavLink to="/auth">
              Вход
            </NavLink>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth={false}
        component="main"
        sx={{
          flex: 1,
          maxWidth: '1480px',
          mx: 'auto',
          width: '100%',
          px: 3,
          py: 2,
        }}
      >
        {children}
      </Container>
    </Box>
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
    <Box sx={{ py: 4 }}>
      <section>
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
    </Box>
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
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </Layout>
  );
}

export default App;