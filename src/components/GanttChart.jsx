import React from 'react';

const GanttChart = ({ phases, currentMonth, currentPhase }) => {
  const totalMonths = phases.reduce((sum, p) => sum + p.duration, 0);
  
  // Вычисляем смещение для каждого этапа
  let startOffset = 0;
  const phasesWithOffset = phases.map(phase => {
    const offset = startOffset;
    startOffset += phase.duration;
    return { ...phase, offset };
  });

  return (
    <div style={styles.container}>
      <h3>📊 Диаграмма Ганта</h3>
      <div style={styles.timeline}>
        {/* Шкала месяцев */}
        <div style={styles.monthsScale}>
          {Array.from({ length: totalMonths + 1 }, (_, i) => (
            <div key={i} style={styles.monthTick}>
              {i % 3 === 0 && <span style={styles.monthLabel}>{i}</span>}
            </div>
          ))}
        </div>

        {/* Полосы этапов */}
        <div style={styles.bars}>
          {phasesWithOffset.map((phase, index) => {
            const isActive = index === currentPhase && !phase.completed;
            const isCompleted = phase.completed;
            
            return (
              <div key={phase.id} style={styles.phaseRow}>
                <div style={styles.phaseInfo}>
                  <div style={styles.phaseName}>{phase.name}</div>
                  <div style={styles.phaseDuration}>{phase.duration} мес.</div>
                </div>
                
                <div style={styles.barContainer}>
                  {/* Фоновая полоса (вся длительность) */}
                  <div style={{
                    ...styles.barBackground,
                    width: `${(phase.duration / totalMonths) * 100}%`,
                    marginLeft: `${(phase.offset / totalMonths) * 100}%`
                  }}>
                    {/* Прогресс */}
                    {phase.startMonth !== null && (
                      <div style={{
                        ...styles.barProgress,
                        width: `${phase.progress}%`,
                        backgroundColor: isCompleted ? '#4caf50' : (isActive ? '#2196f3' : '#9e9e9e')
                      }} />
                    )}
                    
                    {/* Метка текущего времени */}
                    {isActive && (
                      <div style={{
                        ...styles.currentMarker,
                        left: `${(phase.progress / 100) * 100}%`
                      }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Легенда */}
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: '#4caf50'}} />
            <span>Завершено</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: '#2196f3'}} />
            <span>Активный этап</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: '#ff5722'}} />
            <span>Текущий месяц</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  timeline: {
    position: 'relative',
    marginTop: '30px'
  },
  monthsScale: {
    display: 'flex',
    height: '30px',
    borderBottom: '2px solid #dee2e6',
    marginBottom: '20px'
  },
  monthTick: {
    flex: 1,
    position: 'relative',
    borderLeft: '1px solid #dee2e6',
    height: '100%'
  },
  monthLabel: {
    position: 'absolute',
    bottom: '-20px',
    left: '-10px',
    fontSize: '11px',
    color: '#6c757d',
    transform: 'rotate(-45deg)',
    transformOrigin: 'left top'
  },
  bars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '10px'
  },
  phaseRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  phaseInfo: {
    width: '200px'
  },
  phaseName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057',
    marginBottom: '2px'
  },
  phaseDuration: {
    fontSize: '12px',
    color: '#6c757d'
  },
  barContainer: {
    flex: 1,
    position: 'relative',
    height: '30px'
  },
  barBackground: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  barProgress: {
    height: '100%',
    transition: 'width 0.3s ease'
  },
  currentMarker: {
    position: 'absolute',
    top: 0,
    width: '2px',
    height: '100%',
    backgroundColor: '#ff5722',
    zIndex: 2,
    transform: 'translateX(-1px)'
  },
  legend: {
    display: 'flex',
    gap: '20px',
    marginTop: '20px',
    padding: '10px',
    backgroundColor: '#fff',
    borderRadius: '6px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px'
  },
  legendColor: {
    width: '16px',
    height: '16px',
    borderRadius: '4px'
  }
};

export default GanttChart;