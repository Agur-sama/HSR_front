import { useEffect, useState } from 'react'
import './Settings.css'

const DEFAULTS = {
  difficulty: 'medium',
  simulationMinutes: 10,
  tickMs: 1000,
  enableRandomEvents: true,
  autoStart: false,
}

function load() {
  try {
    const raw = localStorage.getItem('sim-settings')
    return raw ? JSON.parse(raw) : DEFAULTS
  } catch (e) {
    return DEFAULTS
  }
}

export default function Settings({ onBack }) {
  const [settings, setSettings] = useState(load)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(false)
  }, [settings])

  function update(k, v) {
    setSettings((s) => ({ ...s, [k]: v }))
  }

  function apply() {
    localStorage.setItem('sim-settings', JSON.stringify(settings))
    setSaved(true)
  }

  function restoreDefaults() {
    setSettings(DEFAULTS)
  }

  return (
    <main className="settings-root">
      <div className="settings-card">
        <header className="settings-header">
          <h2>Настройки симуляции</h2>
          <div className="settings-actions">
            <button className="counter" onClick={onBack}>Назад</button>
          </div>
        </header>

        <div className="settings-intro">
          <p>Здесь можно задать сложность, длительность и поведение симуляции. Значения сохраняются локально в браузере.</p>
        </div>

        <div className="settings-body">
          <label>
            Сложность
            <select value={settings.difficulty} onChange={(e) => update('difficulty', e.target.value)}>
              <option value="easy">Лёгкая</option>
              <option value="medium">Средняя</option>
              <option value="hard">Сложная</option>
            </select>
          </label>

          <label>
            Время симуляции (минуты)
            <input type="number" min="1" value={settings.simulationMinutes} onChange={(e) => update('simulationMinutes', Number(e.target.value) || 1)} />
          </label>

          <label>
            Интервал шага (мс)
            <input type="number" min="100" value={settings.tickMs} onChange={(e) => update('tickMs', Number(e.target.value) || 100)} />
          </label>

          <label className="checkbox-row">
            <input type="checkbox" checked={settings.enableRandomEvents} onChange={(e) => update('enableRandomEvents', e.target.checked)} />
            Включить случайные события
          </label>

          <label className="checkbox-row">
            <input type="checkbox" checked={settings.autoStart} onChange={(e) => update('autoStart', e.target.checked)} />
            Автозапуск симуляции
          </label>

          <div className="settings-footer">
            <button className="counter" onClick={apply}>Применить</button>
            <button className="counter" onClick={restoreDefaults}>По умолчанию</button>
            {saved && <span className="saved">Сохранено</span>}
          </div>

          <div className="settings-preview">
            <h3>Текущие значения</h3>
            <ul>
              <li>Сложность: <strong>{settings.difficulty}</strong></li>
              <li>Длительность: <strong>{settings.simulationMinutes} мин</strong></li>
              <li>Интервал: <strong>{settings.tickMs} мс</strong></li>
              <li>Случайные события: <strong>{settings.enableRandomEvents ? 'вкл' : 'выкл'}</strong></li>
              <li>Автозапуск: <strong>{settings.autoStart ? 'вкл' : 'выкл'}</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
