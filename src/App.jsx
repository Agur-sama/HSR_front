import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useGameLogic } from './hooks/useGameLogic';
import GanttChart from './components/GanttChart';
import ResourcePanel from './components/ResourcePanel';
import EventPopup from './components/EventPopup';
import VictoryPopup from './components/VictoryPopup';
import StudentsForm from './pages/StudentsForm';
import './App.css';

function GamePage() {
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

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>🚄 Высокоскоростная магистраль</h1>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Этап:</span>
            <span style={styles.statValue}>
              {gameState.currentPhase + 1} / {gameState.phases.length}
            </span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Месяц:</span>
            <span style={styles.statValue}>
              {gameState.currentMonth} / {gameState.totalMonths}
            </span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Статус:</span>
            <span style={styles.statValue}>
              {gameState.status === 'running'
                ? '🏗️ Строительство'
                : gameState.status === 'paused'
                ? '⏸️ Пауза'
                : gameState.status === 'finished'
                ? '✅ Завершено'
                : '⏳ Ожидание'}
            </span>
          </div>
        </div>

        <div style={styles.resources}>
          <h3 style={styles.resourcesTitle}>📦 Ресурсы:</h3>
          <div style={styles.resourceGrid}>
            <div style={styles.resourceItem}>
              <span>💰 Деньги:</span>
              <strong>{gameState.resources.money}</strong>
            </div>
            <div style={styles.resourceItem}>
              <span>👷 Рабочая сила:</span>
              <strong>{gameState.resources.labor}</strong>
            </div>
            <div style={styles.resourceItem}>
              <span>🏗️ Материалы:</span>
              <strong>{gameState.resources.materials}</strong>
            </div>
            <div style={styles.resourceItem}>
              <span>⚡ Электроэнергия:</span>
              <strong>{gameState.resources.electricity}</strong>
            </div>
          </div>
        </div>

        <div style={styles.controls}>
          {gameState.status === 'idle' && (
            <button onClick={startGame} style={styles.button}>
              ▶️ Начать проект
            </button>
          )}
          {gameState.status === 'running' && (
            <button onClick={pauseGame} style={styles.button}>
              ⏸️ Пауза
            </button>
          )}
          {gameState.status === 'paused' && (
            <button onClick={startGame} style={styles.button}>
              ▶️ Продолжить
            </button>
          )}
          <button
            onClick={resetGame}
            style={{ ...styles.button, ...styles.resetButton }}
          >
            🔄 Сбросить
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <GanttChart
          phases={gameState.phases}
          currentMonth={gameState.currentMonth}
          currentPhase={gameState.currentPhase}
        />

        {currentPhase && !currentPhase.completed && (
          <ResourcePanel
            phase={currentPhase}
            availableResources={gameState.resources}
            onAllocate={allocateResources}
            disabled={!canStartPhase || gameState.status !== 'running'}
          />
        )}

        <div style={styles.logs}>
          <h3 style={styles.logsTitle}>📋 Лог событий</h3>
          <div style={styles.logList}>
            {gameState.logs.slice(-8).map((log, i) => (
              <div key={i} style={styles.logEntry}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </main>

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
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/form" element={<StudentsForm />} />
      </Routes>
    </BrowserRouter>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    backgroundColor: 'white',
    padding: '20px 30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  title: {
    margin: '0 0 20px 0',
    color: '#2c3e50',
    fontSize: '28px'
  },
  stats: {
    display: 'flex',
    gap: '30px',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statLabel: {
    color: '#7f8c8d',
    fontSize: '14px'
  },
  statValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50'
  },
  resources: {
    marginBottom: '20px'
  },
  resourcesTitle: {
    margin: '0 0 10px 0',
    color: '#34495e',
    fontSize: '16px'
  },
  resourceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px'
  },
  resourceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    fontSize: '14px'
  },
  controls: {
    display: 'flex',
    gap: '10px'
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: '#3498db',
    color: 'white',
    transition: 'background-color 0.2s'
  },
  resetButton: {
    backgroundColor: '#e74c3c'
  },
  main: {
    maxWidth: '1200px',
    margin: '20px auto',
    padding: '0 20px'
  },
  logs: {
    marginTop: '30px',
    marginBottom: '30px'
  },
  logsTitle: {
    margin: '0 0 10px 0',
    color: '#34495e'
  },
  logList: {
    maxHeight: '150px',
    overflowY: 'auto',
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  logEntry: {
    padding: '5px',
    borderBottom: '1px solid #eee',
    fontSize: '13px',
    color: '#555'
  }
};

export default App;