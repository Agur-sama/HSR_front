import React from 'react';

const BankruptcyPopup = ({ reason, onReset }) => {
  const messages = {
    money: {
      title: '💸 БАНКРОТСТВО',
      message: 'Закончилось финансирование проекта. Без денег строительство невозможно.',
      icon: '💸',
      color: '#dc2626'
    },
    labor: {
      title: '👷 КАДРОВЫЙ КРИЗИС',
      message: 'Некому работать. Все рабочие уволены или ушли.',
      icon: '👷',
      color: '#ea580c'
    },
    materials: {
      title: '🏗️ ДЕФИЦИТ МАТЕРИАЛОВ',
      message: 'Закончились строительные материалы. Поставки прекращены.',
      icon: '🏗️',
      color: '#d97706'
    },
    electricity: {
      title: '⚡ ЭНЕРГЕТИЧЕСКАЯ КАТАСТРОФА',
      message: 'Отключение электроэнергии. Работы остановлены.',
      icon: '⚡',
      color: '#f59e0b'
    }
  };

  const data = messages[reason] || messages.money;

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <div style={{...styles.iconContainer, backgroundColor: `${data.color}20`}}>
          <span style={styles.icon}>{data.icon}</span>
        </div>
        
        <h2 style={{...styles.title, color: data.color}}>
          {data.title}
        </h2>
        
        <p style={styles.message}>
          {data.message}
        </p>
        
        <div style={styles.summary}>
          <strong>Проект не может быть продолжен.</strong>
        </div>

        <button onClick={onReset} style={styles.button}>
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000
  },
  popup: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '24px',
    maxWidth: '480px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    animation: 'slideIn 0.5s ease'
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 20px'
  },
  icon: {
    fontSize: '48px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    marginBottom: '16px'
  },
  message: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '24px',
    lineHeight: '1.6'
  },
  summary: {
    backgroundColor: '#fef2f2',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '28px',
    color: '#991b1b'
  },
  button: {
    padding: '14px 40px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

// Добавляем анимацию
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
`;
document.head.appendChild(style);

export default BankruptcyPopup;