import React, { useState } from 'react';

const ResourcePanel = ({ phase, availableResources, onAllocate, disabled }) => {
  const [allocations, setAllocations] = useState({
    money: 0,
    labor: 0,
    materials: 0,
    electricity: 0
  });

  const resourceNames = {
    money: '💰 Деньги',
    labor: '👷 Рабочая сила',
    materials: '🏗️ Материалы',
    electricity: '⚡ Электроэнергия'
  };

  const handleAllocate = () => {
    // Проверяем, что всего хватает
    const isValid = Object.entries(allocations).every(
      ([key, value]) => value <= (availableResources[key] || 0)
    );

    if (!isValid) {
      alert('❌ Недостаточно ресурсов!');
      return;
    }

    onAllocate(phase.id, allocations);
  };

  const handleInputChange = (key, value) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    setAllocations(prev => ({
      ...prev,
      [key]: Math.max(0, numValue)
    }));
  };

  if (!phase) return null;

  return (
    <div style={styles.panel}>
      <h3 style={styles.title}>📦 Распределение ресурсов</h3>
      <h4 style={styles.phaseTitle}>{phase.name}</h4>
      <p style={styles.description}>{phase.description}</p>
      
      <div style={styles.resources}>
        {Object.keys(phase.resources).map(key => (
          <div key={key} style={styles.resource}>
            <div style={styles.resourceHeader}>
              <span style={styles.resourceName}>{resourceNames[key]}</span>
              <span style={styles.required}>требуется всего: {phase.resources[key]}</span>
            </div>
            
            <div style={styles.inputGroup}>
              <input
                type="number"
                min="0"
                max={availableResources[key] || 0}
                value={allocations[key]}
                onChange={(e) => handleInputChange(key, e.target.value)}
                disabled={disabled}
                style={styles.input}
              />
              <span style={styles.available}>
                / {availableResources[key] || 0} доступно
              </span>
            </div>

            {allocations[key] < phase.resources[key] && (
              <div style={styles.warning}>
                ⚠️ Нужно еще {phase.resources[key] - allocations[key]}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleAllocate}
        disabled={disabled}
        style={{
          ...styles.button,
          ...(disabled ? styles.buttonDisabled : {})
        }}
      >
        ✅ Начать этап
      </button>
    </div>
  );
};

const styles = {
  panel: {
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginTop: '20px'
  },
  title: {
    margin: '0 0 8px 0',
    color: '#2c3e50'
  },
  phaseTitle: {
    margin: '0 0 4px 0',
    color: '#34495e'
  },
  description: {
    fontSize: '14px',
    color: '#7f8c8d',
    marginBottom: '24px'
  },
  resources: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '24px'
  },
  resource: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px'
  },
  resourceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px'
  },
  resourceName: {
    fontWeight: '600',
    color: '#2c3e50'
  },
  required: {
    color: '#e67e22',
    fontSize: '14px'
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  input: {
    width: '120px',
    padding: '8px 12px',
    border: '2px solid #dee2e6',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  available: {
    color: '#7f8c8d',
    fontSize: '14px'
  },
  warning: {
    marginTop: '8px',
    color: '#e74c3c',
    fontSize: '13px'
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
    cursor: 'not-allowed'
  }
};

export default ResourcePanel;