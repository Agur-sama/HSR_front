import { useEffect, useState } from 'react'
import './Profile.css'

const USER_KEY = 'user-profile'
const HISTORY_KEY = 'sim-history'
const RATINGS_KEY = 'teacher-ratings'

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : { firstName: '', lastName: '' }
  } catch (e) {
    return { firstName: '', lastName: '' }
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

function saveUser(u) {
  localStorage.setItem(USER_KEY, JSON.stringify(u))
}

function saveHistory(h) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
}

function loadRatings() {
  try {
    const raw = localStorage.getItem(RATINGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

function saveRatings(r) {
  localStorage.setItem(RATINGS_KEY, JSON.stringify(r))
}

export default function Profile({ onBack }) {
  const [user, setUser] = useState(loadUser)
  const [history, setHistory] = useState(loadHistory)
  const [ratings, setRatings] = useState(loadRatings)
  const [teacherName, setTeacherName] = useState('')
  const [score, setScore] = useState(5)
  const [comment, setComment] = useState('')

  useEffect(() => {
    saveUser(user)
  }, [user])

  useEffect(() => {
    saveHistory(history)
  }, [history])

  useEffect(() => {
    saveRatings(ratings)
  }, [ratings])

  function updateField(k, v) {
    setUser((s) => ({ ...s, [k]: v }))
  }

  function clearHistory() {
    setHistory([])
  }

  function addRating() {
    if (!teacherName) return
    const now = new Date().toISOString()
    const entry = { id: now, teacher: teacherName, score: Number(score), comment: comment || '', date: now }
    setRatings((r) => [entry, ...r])
    setTeacherName('')
    setScore(5)
    setComment('')
  }

  function clearRatings() {
    setRatings([])
  }

  function exportProfile() {
    const data = { user, history, ratings }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'profile-export.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="profile-root">
      <div className="profile-card">
        <header className="profile-header">
          <h2>Личный кабинет</h2>
          <div className="profile-actions">
            <button className="counter" onClick={onBack}>Назад</button>
          </div>
        </header>

        <section className="profile-body">
          <div className="profile-left">
            <h3>Профиль</h3>
            <label>
              Имя
              <input placeholder="Введите имя" value={user.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
            </label>
            <label>
              Фамилия
              <input placeholder="Введите фамилию" value={user.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
            </label>

            <div className="profile-stats">
              <h4>Прогресс</h4>
              <div className="stat-row">
                <div>
                  Всего симуляций: <strong>{history.length}</strong>
                </div>
              </div>
            </div>

            <div className="profile-controls">
              <button className="counter" onClick={clearHistory}>Очистить историю симуляций</button>
            </div>
          </div>

          <aside className="profile-right">
            <h3>История симуляций</h3>
            {history.length === 0 && <p className="muted">История пуста — у вас ещё нет записей.</p>}
            <ul className="history-list">
              {history.map((it) => (
                <li key={it.id} className="history-item">
                  <div className="hi-top">
                    <div className="hi-title">{it.title}</div>
                    <div className="hi-date">{new Date(it.date).toLocaleString()}</div>
                  </div>
                  <div className="hi-progress">
                    <div className="bar"><div className="bar-inner placeholder"></div></div>
                    <div className="hi-meta">{it.result}</div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="ratings-section">
              <h3>Оценки преподавателя</h3>
              <div className="ratings-summary">
                <div className="avg">Средняя оценка: {ratings.length ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1) + '/5' : '—/5'}</div>
                <div className="ratings-actions">
                  <button className="counter" onClick={clearRatings}>Очистить оценки</button>
                  <button className="counter" onClick={exportProfile}>Экспорт данных</button>
                </div>
              </div>

              <div className="rating-form">
                <input placeholder="Фамилия и имя преподавателя" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
                <select value={score} onChange={(e) => setScore(e.target.value)}>
                  <option value={5}>5</option>
                  <option value={4}>4</option>
                  <option value={3}>3</option>
                  <option value={2}>2</option>
                  <option value={1}>1</option>
                </select>
                <input placeholder="Комментарий (необязательно)" value={comment} onChange={(e) => setComment(e.target.value)} />
                <button className="counter" onClick={addRating}>Добавить оценку</button>
              </div>

              <ul className="ratings-list">
                {ratings.map((rt) => (
                  <li key={rt.id} className="rating-item">
                    <div className="ri-top">
                      <div className="ri-teacher">{rt.teacher}</div>
                      <div className="ri-date">{new Date(rt.date).toLocaleString()}</div>
                    </div>
                    <div className="ri-body">
                      <div className="ri-score">{'★'.repeat(rt.score) + '☆'.repeat(5 - rt.score)}</div>
                      {rt.comment && <div className="ri-comment">{rt.comment}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
