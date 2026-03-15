import React from 'react';

const VictoryPopup = ({ onClose }) => {
  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <div style={styles.icon}>🏆</div>
        <h2 style={styles.title}>Поздравляем!</h2>
        <p style={styles.message}>
          Вы успешно построили Высокоскоростную магистраль!<br/>
          Спасибо за ваш труд и эффективное управление ресурсами.
        </p>
        <button onClick={onClose} style={styles.button}>
          Начать заново
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000
  },
  popup: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '24px',
    maxWidth: '500px',
    width: '90%',
    textAlign: 'center',
    animation: 'slideIn 0.5s ease'
  },
  icon: {
    fontSize: '80px',
    marginBottom: '20px',
    animation: 'bounce 1s infinite'
  },
  title: {
    fontSize: '32px',
    color: '#2c3e50',
    marginBottom: '20px'
  },
  message: {
    fontSize: '18px',
    color: '#34495e',
    marginBottom: '30px',
    lineHeight: '1.6'
  },
  button: {
    padding: '12px 40px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  }
};

// Добавляем анимации в index.css
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateY(-50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-20px);
    }
  }
`;
document.head.appendChild(style);

export default VictoryPopup;