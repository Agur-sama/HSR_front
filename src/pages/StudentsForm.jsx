<<<<<<< Updated upstream
import React, { useState } from 'react';
=======
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { defaultProjectData, useProject } from '../context/ProjectContext';
import { calculateProjectProfile } from '../utils/projectCalculator';
>>>>>>> Stashed changes
import './StudentsForm.css';

const StudentsForm = () => {
  const [formData, setFormData] = useState({
    type: 'ВСМ-1: Москва – Санкт-Петербург',
    boss: 'ПИШ (работа на паре)',
    months: '',
    road: '',
    peop: '',
    bridge: '',
    flora: 'plain',
    money: '',
    peom: ''
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setSaved(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('vsm_construction_data', JSON.stringify({
      ...formData,
      savedAt: new Date().toLocaleString()
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setFormData({
      type: 'ВСМ-1: Москва – Санкт-Петербург',
      boss: 'ПИШ (работа на паре)',
      months: '',
      road: '',
      peop: '',
      bridge: '',
      flora: 'plain',
      money: '',
      peom: ''
    });
    setSaved(false);
  };

  const handleLoadLast = () => {
    const savedData = localStorage.getItem('vsm_construction_data');
    if (savedData) {
      const data = JSON.parse(savedData);
      setFormData(data);
      setSaved(false);
    }
  };

  const resources = preview.resources || { money: 0, labor: 0, materials: 0, electricity: 0 };
  
  // Добавляем запас 30% для отображения в форме
  const resourcesWithBuffer = {
    money: Math.round(resources.money * 1.3),
    labor: Math.round(resources.labor * 1.3),
    materials: Math.round(resources.materials * 1.3),
    electricity: Math.round(resources.electricity * 1.3)
  };

  return (
    <div className="construction-container">
      <div className="form-wrapper">
<<<<<<< Updated upstream
        <h1 className='header'>Персональный аккаунт студента ПИШ</h1>
        <h3 className='minheader'>Введите необходимые параметры для планирования постройки ВСМ</h3>

        {saved && (
          <div className="save-message">
            <p>Данные успешно сохранены!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="account-form">
          <div className="form-section">
            <p>Общие показатели</p>
            <div className='block1'>
              <div className="form-field">
                <label htmlFor='type'>Выберите тип ВСМ:</label>
                <select name='type' value={formData.type} onChange={handleChange}>
                  <option>ВСМ-1: Москва – Санкт-Петербург</option>
                  <option>ВСМ-2: Москва – Екатеринбург</option>
                  <option>ВСМ-3: Москва – Адлер</option>
                  <option>ВСМ-4: Москва – Минск</option>
                  <option>ВСМ-5: Москва – Рязань</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor='boss'>Выберите заказчика:</label>
                <select name='boss' value={formData.boss} onChange={handleChange}>
                  <option>ПИШ (работа на паре)</option>
                  <option>Инициативный проект</option>
                  <option>Проект в рамках ПД</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor='months'>Количество месяцев на стройку</label>
                <input 
                  type='number' 
                  placeholder='например: 36' 
                  name='months'
                  value={formData.months}
                  onChange={handleChange}
=======
        <h1 className="header">Персональный аккаунт студента ПИШ</h1>
        <p className="minheader">
          Введите параметры проекта. Они будут автоматически использованы на странице симулятора.
        </p>

        <form onSubmit={handleSubmit} className="account-form">
          {/* Общие показатели */}
          <div className="form-section">
            <p>Общие показатели</p>
            <div className="block1">
              <div className="form-field">
                <label>Выберите тип ВСМ</label>
                <select value={form.routeType} onChange={handleChange('routeType')}>
                  {routeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Выберите заказчика</label>
                <select value={form.customer} onChange={handleChange('customer')}>
                  {customerOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Количество месяцев на стройку</label>
                <input
                  type="number"
                  min="1"
                  value={form.durationMonths}
                  onChange={handleChange('durationMonths')}
                  placeholder="например: 36"
>>>>>>> Stashed changes
                />
              </div>
            </div>
          </div>

<<<<<<< Updated upstream
          <div className="form-section">
            <p>Характеристики стройки</p>
            <div className='block2'>
              <div className="form-field">
                <label htmlFor='road'>Введите протяженность дороги (км)</label>
                <input 
                  type='number' 
                  placeholder='например: 600' 
                  name='road'
                  value={formData.road}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor='peop'>Введите количество рабочих</label>
                <input 
                  type='number' 
                  placeholder='например: 100' 
                  name='peop'
                  value={formData.peop}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor='bridge'>Введите количество мостов</label>
                <input 
                  type='number' 
                  placeholder='например: 5' 
                  name='bridge'
                  value={formData.bridge}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor='flora' className='height'>Выберите тип местности</label>
                <select name='flora' value={formData.flora} onChange={handleChange}>
                  <option value="plain">Равнина</option>
                  <option value="forest">Лесистая местность</option>
                  <option value="mountain">Гористая местность</option>
                  <option value="swamp">Болотистая местность</option>
                  <option value="mixed">Смешанная местность</option>
=======
          {/* Характеристики стройки */}
          <div className="form-section">
            <p>Характеристики стройки</p>
            <div className="block2">
              <div className="form-field">
                <label>Протяжённость дороги (км)</label>
                <input
                  type="number"
                  min="1"
                  value={form.distanceKm}
                  onChange={handleChange('distanceKm')}
                  placeholder="например: 600"
                />
              </div>

              <div className="form-field">
                <label>Количество рабочих</label>
                <input
                  type="number"
                  min="1"
                  value={form.workers}
                  onChange={handleChange('workers')}
                  placeholder="например: 100"
                />
              </div>

              <div className="form-field">
                <label>Количество мостов</label>
                <input
                  type="number"
                  min="0"
                  value={form.bridges}
                  onChange={handleChange('bridges')}
                  placeholder="например: 5"
                />
              </div>

              <div className="form-field">
                <label>Тип местности</label>
                <select value={form.terrain} onChange={handleChange('terrain')}>
                  {terrainOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
>>>>>>> Stashed changes
                </select>
              </div>
            </div>
          </div>

<<<<<<< Updated upstream
          <div className="form-section">
            <p>Затраты</p>
            <div className='block1'>
              <div className="form-field">
                <label htmlFor='money'>Бюджет (млн руб)</label>
                <input 
                  type='number' 
                  placeholder='например: 1000' 
                  name='money'
                  value={formData.money}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor='peom'>Введите зп рабочих (тыс. руб)</label>
                <input 
                  type='number' 
                  placeholder='например: 150' 
                  name='peom'
                  value={formData.peom}
                  onChange={handleChange}
=======
          {/* Затраты */}
          <div className="form-section">
            <p>Затраты</p>
            <div className="block2">
              <div className="form-field">
                <label>Бюджет (млн руб)</label>
                <input
                  type="number"
                  min="1"
                  value={form.budget}
                  onChange={handleChange('budget')}
                  placeholder="например: 1000"
                />
              </div>

              <div className="form-field">
                <label>ЗП рабочих (тыс. руб)</label>
                <input
                  type="number"
                  min="1"
                  value={form.workerSalary}
                  onChange={handleChange('workerSalary')}
                  placeholder="например: 150"
>>>>>>> Stashed changes
                />
              </div>
            </div>
          </div>

<<<<<<< Updated upstream
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Сохранить параметры
            </button>
            <button type="button" onClick={handleReset} className="btn btn-secondary">
              Очистить
=======
          {/* Предпросмотр ресурсов */}
          <div className="form-section preview-section">
            <p className="preview-title">Предпросмотр ресурсов для симулятора</p>
            <div className="preview-grid">
              <div className="preview-card">
                <span className="preview-label">💰 Деньги</span>
                <strong className="preview-value">{resourcesWithBuffer.money.toLocaleString()} ₽</strong>

              </div>
              <div className="preview-card">
                <span className="preview-label">👷 Рабочая сила</span>
                <strong className="preview-value">{resourcesWithBuffer.labor.toLocaleString()} чел.</strong>

              </div>
              <div className="preview-card">
                <span className="preview-label">🏗️ Материалы</span>
                <strong className="preview-value">{resourcesWithBuffer.materials.toLocaleString()} т</strong>

              </div>
              <div className="preview-card">
                <span className="preview-label">⚡ Электроэнергия</span>
                <strong className="preview-value">{resourcesWithBuffer.electricity.toLocaleString()} МВт·ч</strong>

              </div>
            </div>
          </div>

          {/* Сообщение об успехе */}
          {savedMessage && (
            <div className="save-message">
              <span>✅</span>
              <p>{savedMessage}</p>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              💾 Сохранить параметры и открыть симулятор
            </button>
            <button type="button" onClick={handleReset} className="btn btn-secondary">
              🗑️ Очистить форму
>>>>>>> Stashed changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
<<<<<<< Updated upstream
};
=======
}
>>>>>>> Stashed changes

export default StudentsForm;