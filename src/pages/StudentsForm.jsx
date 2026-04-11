import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { defaultProjectData, useProject } from '../context/ProjectContext';
import { calculateProjectProfile } from '../utils/projectCalculator';

const routeOptions = [
  'ВСМ-1: Москва – Санкт-Петербург',
  'ВСМ-2: Москва – Казань',
  'ВСМ-3: Москва – Екатеринбург'
];

const customerOptions = [
  'ПИШ (работа на паре)',
  'Государственный заказчик',
  'Частный инвестор'
];

const terrainOptions = [
  'Равнина',
  'Холмистая местность',
  'Лесная зона',
  'Горы',
  'Смешанная'
];

function StudentsForm() {
  const navigate = useNavigate();
  const { projectData, saveProjectData, resetProjectData } = useProject();

  const [form, setForm] = useState(projectData);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    setForm(projectData);
  }, [projectData]);

  const preview = useMemo(() => calculateProjectProfile(form), [form]);

  const handleChange = (field) => (event) => {
    setSavedMessage('');
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveProjectData(form);
    setSavedMessage('Параметры сохранены. Переход в симулятор...');
    setTimeout(() => {
      navigate('/game');
    }, 500);
  };

  const handleReset = () => {
    setForm(defaultProjectData);
    resetProjectData();
    setSavedMessage('Форма очищена и возвращена к базовым значениям.');
  };

  return (
    <form onSubmit={handleSubmit} style={styles.wrapper}>
      <div style={styles.hero}>
        <h2 style={styles.heroTitle}>Персональный аккаунт студента ПИШ</h2>
        <p style={styles.heroSubtitle}>
          Введите параметры проекта. Они будут автоматически использованы на странице симулятора.
        </p>
      </div>

      <div style={styles.card}>
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Общие показатели</h3>

          <div style={styles.grid3}>
            <label style={styles.field}>
              <span style={styles.label}>Выберите тип ВСМ</span>
              <select value={form.routeType} onChange={handleChange('routeType')} style={styles.input}>
                {routeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Выберите заказчика</span>
              <select value={form.customer} onChange={handleChange('customer')} style={styles.input}>
                {customerOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Количество месяцев на стройку</span>
              <input
                type="number"
                min="1"
                value={form.durationMonths}
                onChange={handleChange('durationMonths')}
                style={styles.input}
                placeholder="например: 36"
              />
            </label>
          </div>
        </section>

        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Характеристики стройки</h3>

          <div style={styles.grid4}>
            <label style={styles.field}>
              <span style={styles.label}>Протяжённость дороги (км)</span>
              <input
                type="number"
                min="1"
                value={form.distanceKm}
                onChange={handleChange('distanceKm')}
                style={styles.input}
                placeholder="например: 600"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Количество рабочих</span>
              <input
                type="number"
                min="1"
                value={form.workers}
                onChange={handleChange('workers')}
                style={styles.input}
                placeholder="например: 100"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Количество мостов</span>
              <input
                type="number"
                min="0"
                value={form.bridges}
                onChange={handleChange('bridges')}
                style={styles.input}
                placeholder="например: 5"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Тип местности</span>
              <select value={form.terrain} onChange={handleChange('terrain')} style={styles.input}>
                {terrainOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Затраты</h3>

          <div style={styles.grid2}>
            <label style={styles.field}>
              <span style={styles.label}>Бюджет (млн руб)</span>
              <input
                type="number"
                min="1"
                value={form.budget}
                onChange={handleChange('budget')}
                style={styles.input}
                placeholder="например: 1000"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>ЗП рабочих (тыс. руб)</span>
              <input
                type="number"
                min="1"
                value={form.workerSalary}
                onChange={handleChange('workerSalary')}
                style={styles.input}
                placeholder="например: 150"
              />
            </label>
          </div>
        </section>

        <section style={styles.previewSection}>
          <h3 style={styles.previewTitle}>Предпросмотр ресурсов для второй страницы</h3>

          <div style={styles.previewGrid}>
            <div style={styles.previewCard}>
              <span style={styles.previewLabel}>💰 Деньги</span>
              <strong style={styles.previewValue}>{preview.resources.money}</strong>
            </div>
            <div style={styles.previewCard}>
              <span style={styles.previewLabel}>👷 Рабочая сила</span>
              <strong style={styles.previewValue}>{preview.resources.labor}</strong>
            </div>
            <div style={styles.previewCard}>
              <span style={styles.previewLabel}>🏗 Материалы</span>
              <strong style={styles.previewValue}>{preview.resources.materials}</strong>
            </div>
            <div style={styles.previewCard}>
              <span style={styles.previewLabel}>⚡ Электроэнергия</span>
              <strong style={styles.previewValue}>{preview.resources.electricity}</strong>
            </div>
          </div>

          <p style={styles.note}>
            Формула расчёта находится в <code>projectCalculator.js</code>, так что позже её легко подстроить под реальные правила проекта.
          </p>
        </section>

        {savedMessage ? <div style={styles.message}>{savedMessage}</div> : null}

        <div style={styles.actions}>
          <button type="submit" style={styles.primaryButton}>
            Сохранить параметры и открыть симулятор
          </button>

          <button type="button" onClick={handleReset} style={styles.secondaryButton}>
            Очистить
          </button>
        </div>
      </div>
    </form>
  );
}

const styles = {
  wrapper: {
    color: '#1f2a44'
  },
  hero: {
    textAlign: 'center',
    marginBottom: '26px'
  },
  heroTitle: {
    fontSize: '56px',
    lineHeight: 1.05,
    fontWeight: 800,
    color: '#21468b',
    marginBottom: '12px'
  },
  heroSubtitle: {
    fontSize: '20px',
    color: '#5a6f95'
  },
  card: {
    background: '#ffffff',
    borderRadius: '30px',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.12)',
    border: '1px solid #e6ecf6'
  },
  section: {
    padding: '36px 38px',
    borderBottom: '1px solid #e7edf6'
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#21468b',
    marginBottom: '26px',
    borderLeft: '5px solid #21468b',
    paddingLeft: '16px'
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '22px'
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '22px'
  },
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '22px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  label: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#394b6a'
  },
  input: {
    height: '62px',
    borderRadius: '18px',
    border: '2px solid #d5dfed',
    padding: '0 18px',
    fontSize: '16px',
    outline: 'none',
    color: '#1f2a44',
    background: '#fff'
  },
  previewSection: {
    padding: '32px 38px',
    background: '#f6f9ff',
    borderBottom: '1px solid #e7edf6'
  },
  previewTitle: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#21468b',
    marginBottom: '18px'
  },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '18px'
  },
  previewCard: {
    borderRadius: '20px',
    background: 'linear-gradient(180deg, #edf3ff 0%, #e6eefc 100%)',
    padding: '20px',
    border: '1px solid #d6e2f8'
  },
  previewLabel: {
    display: 'block',
    fontSize: '15px',
    color: '#4e648b',
    marginBottom: '12px'
  },
  previewValue: {
    fontSize: '30px',
    fontWeight: 800,
    color: '#21468b'
  },
  note: {
    marginTop: '16px',
    color: '#5d7298',
    fontSize: '14px'
  },
  message: {
    margin: '24px 38px 0',
    padding: '14px 16px',
    borderRadius: '14px',
    background: '#eaf4ea',
    color: '#25693b',
    fontWeight: 600
  },
  actions: {
    display: 'grid',
    gridTemplateColumns: '1fr 180px',
    gap: '18px',
    padding: '32px 38px'
  },
  primaryButton: {
    height: '62px',
    border: 'none',
    borderRadius: '18px',
    background: '#21468b',
    color: '#fff',
    fontSize: '20px',
    fontWeight: 800,
    cursor: 'pointer'
  },
  secondaryButton: {
    height: '62px',
    border: 'none',
    borderRadius: '18px',
    background: '#dfe6f1',
    color: '#33445f',
    fontSize: '18px',
    fontWeight: 800,
    cursor: 'pointer'
  }
};

export default StudentsForm;