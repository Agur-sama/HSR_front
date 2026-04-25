import React from 'react';

const GanttChart = ({ phases, currentMonth, currentPhase }) => {
  const totalMonths = phases.reduce((sum, p) => sum + p.duration, 0);
  const plannedMonths = phases.reduce((sum, p) => sum + p.originalDuration, 0);
  
  let startOffset = 0;
  const phasesWithOffset = phases.map(phase => {
    const offset = startOffset;
    startOffset += phase.duration;
    return { ...phase, offset };
  });

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '14px', color: '#94a3b8', display: 'flex', gap: '16px' }}>
          <span>📅 План: {plannedMonths} мес.</span>
          <span>📍 Факт: {totalMonths} мес.</span>
          <span>📈 Этапов: {phases.length}</span>
        </div>
      </div>
      
      <div style={styles.timeline}>
        <div style={styles.monthsScale}>
          {Array.from({ length: Math.min(totalMonths + 1, 100) }, (_, i) => (
            <div key={i} style={styles.monthTick}>
              {i % 6 === 0 && <span style={styles.monthLabel}>{i}</span>}
            </div>
          ))}
        </div>

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
                  <div style={{
                    ...styles.barBackground,
                    width: `${(phase.duration / totalMonths) * 100}%`,
                    marginLeft: `${(phase.offset / totalMonths) * 100}%`
                  }}>
                    {phase.startMonth !== null && (
                      <div style={{
                        ...styles.barProgress,
                        width: `${phase.progress}%`,
                        backgroundColor: isCompleted ? '#4caf50' : (isActive ? '#2196f3' : '#9e9e9e')
                      }} />
                    )}
                    
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
    backgroundColor: 'rgba(15, 25, 45, 0.8)',
    borderRadius: '12px',
    marginBottom: '20px'
  },
  timeline: {
    position: 'relative',
    marginTop: '20px',
    overflowX: 'auto'
  },
  monthsScale: {
    display: 'flex',
    height: '30px',
    borderBottom: '2px solid rgba(255,255,255,0.2)',
    marginBottom: '20px',
    minWidth: '600px'
  },
  monthTick: {
    flex: 1,
    position: 'relative',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
    height: '100%'
  },
  monthLabel: {
    position: 'absolute',
    bottom: '-20px',
    left: '-10px',
    fontSize: '10px',
    color: '#94a3b8'
  },
  bars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: '600px'
  },
  phaseRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  phaseInfo: {
    width: '200px',
    flexShrink: 0
  },
  phaseName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '2px'
  },
  phaseDuration: {
    fontSize: '11px',
    color: '#94a3b8'
  },
  barContainer: {
    flex: 1,
    position: 'relative',
    height: '28px'
  },
  barBackground: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    flexWrap: 'wrap'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#cbd5e1'
  },
  legendColor: {
    width: '16px',
    height: '16px',
    borderRadius: '4px'
  }
};

export default GanttChart;