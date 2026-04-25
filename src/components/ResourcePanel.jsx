import React, { useState, useEffect } from 'react';

const ResourcePanel = ({ phase, availableResources, onAllocate, disabled }) => {
  const [allocations, setAllocations] = useState({ 
    money: 0,
    labor: 0,
    materials: 0,
    electricity: 0
  });

  // Сбрасываем выделение при смене этапа
  useEffect(() => {
    setAllocations({
      money: 0,
      labor: 0,
      materials: 0,
      electricity: 0
    });
  }, [phase?.id]);

  const resourceNames = { 
    money: '💰 Финансирование', 
    labor: '👷 Рабочая сила', 
    materials: '🏗️ Стройматериалы', 
    electricity: '⚡ Электроэнергия' 
  };
  
  const hasChanges = phase.originalResources && (
    phase.requiredResources.money !== phase.originalResources.money ||
    phase.requiredResources.labor !== phase.originalResources.labor ||
    phase.requiredResources.materials !== phase.originalResources.materials ||
    phase.requiredResources.electricity !== phase.originalResources.electricity
  );

  const handleAllocate = () => {
    // Проверяем, что все поля заполнены
    const allFilled = Object.values(allocations).every(val => val > 0);
    if (!allFilled) {
      alert('⚠️ Заполните все поля ресурсов!');
      return;
    }

    const exceedsAvailable = Object.entries(allocations).some(([resKey, value]) => value > (availableResources[resKey] || 0));
    if (exceedsAvailable) {
      alert('❌ Нельзя выделить больше, чем есть в наличии!');
      return;
    }

    const meetsRequired = Object.entries(phase.requiredResources).every(([resKey, value]) => allocations[resKey] >= value);
    if (!meetsRequired) {
      alert('⚠️ Выделено меньше требуемого минимума!');
      return;
    }

    onAllocate(phase.id, allocations);
  };

  const handleInputChange = (resourceKey, value) => {
    const num = value === '' ? 0 : parseInt(value) || 0;
    setAllocations(prev => ({ ...prev, [resourceKey]: Math.max(0, num) }));
  };

  if (!phase) return null;

  const resourceKeys = Object.keys(phase.requiredResources || {});

  // Проверяем, все ли поля заполнены
  const allFieldsFilled = Object.values(allocations).every(val => val > 0);
  const isButtonDisabled = disabled || !allFieldsFilled;

  return (
    <div style={styles.panel}>
      {hasChanges && <div style={styles.changesWarning}>⚡ Требования к ресурсам изменены из-за событий!</div>}
      
      <h4 style={styles.phaseTitle}>{phase.name}</h4>
      <p style={styles.description}>{phase.description}</p>
      
      <div style={styles.resources}>
        {resourceKeys.map((resourceKey) => {
          const required = phase.requiredResources[resourceKey];
          const available = availableResources[resourceKey] || 0;
          const allocated = allocations[resourceKey];
          const originalValue = phase.originalResources?.[resourceKey];

          return (
            <div key={resourceKey} style={styles.resource}>
              <div style={styles.resourceHeader}>
                <span style={styles.resourceName}>{resourceNames[resourceKey]}</span>
                <span style={styles.required}>
                  требуется: {required} 
                  {originalValue && originalValue !== required && (
                    <span style={{ color: '#f59e0b', marginLeft: 8 }}>(было: {originalValue})</span>
                  )}
                </span>
              </div>
              
              <div style={styles.inputGroup}>
                <input
                  type="number"
                  min="0"
                  max={available}
                  value={allocated}
                  onChange={(e) => handleInputChange(resourceKey, e.target.value)}
                  disabled={disabled}
                  placeholder="Введите количество"
                  style={{
                    ...styles.input, 
                    borderColor: allocated > available ? '#e74c3c' : allocated >= required ? '#2ecc71' : '#dee2e6'
                  }}
                />
                <span style={styles.available}>/ {available} доступно</span>
              </div>

              {allocated > 0 && allocated < required && (
                <div style={styles.warning}>⚠️ Нужно ещё {required - allocated}</div>
              )}
              {allocated > available && (
                <div style={styles.warning}>🚨 Превышен лимит!</div>
              )}
              {allocated === 0 && (
                <div style={styles.hint}>📝 Введите количество ресурсов</div>
              )}
            </div>
          );
        })}
      </div>

      <button 
        onClick={handleAllocate} 
        disabled={isButtonDisabled} 
        style={{...styles.button, ...(isButtonDisabled ? styles.buttonDisabled : {})}}
      >
        ✅ Выделить и начать этап
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
  changesWarning: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '8px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px'
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
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: '8px'
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
    gap: '10px',
    flexWrap: 'wrap'
  },
  input: {
    width: '140px',
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
  hint: {
    marginTop: '8px',
    color: '#7f8c8d',
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