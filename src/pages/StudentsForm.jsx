import React, { useState } from 'react';
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

  return (
    <div className="construction-container">
      <div className="form-wrapper">
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
                />
              </div>
            </div>
          </div>

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
                </select>
              </div>
            </div>
          </div>

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
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Сохранить параметры
            </button>
            <button type="button" onClick={handleReset} className="btn btn-secondary">
              Очистить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentsForm;