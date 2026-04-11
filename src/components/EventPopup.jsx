import React from 'react';

const EventPopup = ({ event, onAccept, onClose }) => {
  if (!event) return null;

  const isGood = event.id.startsWith('good');
  
  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <div style={{
          ...styles.iconContainer,
          backgroundColor: isGood ? '#d4edda' : '#f8d7da'
        }}>
          <span style={styles.icon}>{isGood ? '🎉' : '⚠️'}</span>
        </div>
        
        <h2 style={{
          ...styles.title,
          color: isGood ? '#155724' : '#721c24'
        }}>
          {isGood ? 'Позитивное событие!' : 'Проблема!'}
        </h2>
        
        <h3 style={styles.eventName}>{event.name}</h3>
        <p style={styles.description}>{event.description}</p>
        
        <div style={styles.effects}>
          <strong>Эффект:</strong>
          <ul style={styles.effectsList}>
            {event.effect.type === 'duration' && (
              <li>
                {event.effect.value < 0 ? '⏱️ Сокращение' : '⏱️ Увеличение'} 
                срока на {Math.abs(event.effect.value)} мес.
              </li>
            )}
            {event.effect.type === 'resource' && (
              <li>
                📦 Ресурс {event.effect.resource}: {event.effect.value > 0 ? '+' : ''}{event.effect.value}
              </li>
            )}
          </ul>
        </div>

        <button onClick={onAccept} style={styles.button}>
          Продолжить
        </button>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  popup: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '16px',
    maxWidth: '450px',
    width: '90%',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    textAlign: 'center'
  },
  iconContainer: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 20px'
  },
  icon: {
    fontSize: '30px'
  },
  title: {
    marginBottom: '15px'
  },
  eventName: {
    fontSize: '20px',
    marginBottom: '10px'
  },
  description: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '20px'
  },
  effects: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '25px',
    textAlign: 'left'
  },
  effectsList: {
    marginTop: '10px',
    paddingLeft: '20px'
  },
  button: {
    padding: '12px 40px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default EventPopup;