import { resultMock } from '../data/resultMock'
import './ResultPage.css'

function Icon({ name }) {
  const icons = {
    budget: (
      <path d="M4 13h16M6 8h12M7 5h10M7 17h10" strokeLinecap="round" strokeLinejoin="round" />
    ),
    timeline: (
      <path d="M4 6h5v5H4zM11 9h9M4 13h5v5H4zM11 16h9" strokeLinecap="round" strokeLinejoin="round" />
    ),
    resources: (
      <path d="M4 15c0-2.2 1.8-4 4-4h8v7a2 2 0 0 1-2 2H8a4 4 0 0 1-4-5ZM8 4h8v7H8z" strokeLinecap="round" strokeLinejoin="round" />
    ),
    risks: (
      <path d="M12 4 3.5 19h17L12 4Zm0 5v4m0 3h.01" strokeLinecap="round" strokeLinejoin="round" />
    ),
    score: <path d="M5 13.5 9.5 18 19 6" strokeLinecap="round" strokeLinejoin="round" />,
    report: (
      <path d="M7 4h8l4 4v12H7V4Zm8 0v4h4M10 12h6M10 16h6" strokeLinecap="round" strokeLinejoin="round" />
    ),
    replay: (
      <path d="M6 12a6 6 0 1 0 2-4.5M6 7v4h4" strokeLinecap="round" strokeLinejoin="round" />
    ),
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {icons[name]}
    </svg>
  )
}

function scoreColor(score) {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 60) return 'warning'
  return 'critical'
}

export default function ResultPage() {
  const ringPercent = Math.max(0, Math.min(100, resultMock.score))
  const gradeTone = scoreColor(resultMock.score)

  return (
    <main className="result-page">
      <section className="result-hero card">
        <div className="hero-topline">
          <p className="eyebrow">Симулятор управления ресурсами</p>
          <span className={`status-pill ${resultMock.statusTone}`}>{resultMock.status}</span>
        </div>

        <div className="hero-grid">
          <div>
            <h1>Итоги проектной сессии</h1>
            <p className="subtitle">{resultMock.scenario}</p>
            <p className="meta">
              {resultMock.team} · Сессия {resultMock.sessionId} · {resultMock.completionDate}
            </p>
          </div>

          <div className={`score-ring ${gradeTone}`} style={{ '--score': `${ringPercent}%` }}>
            <div className="score-inner">
              <Icon name="score" />
              <strong>{resultMock.score}</strong>
              <span>{resultMock.grade}</span>
            </div>
          </div>
        </div>

        <div className="hero-actions">
          <button type="button" className="btn btn-primary">
            <Icon name="report" />
            Скачать отчет
          </button>
          <button type="button" className="btn btn-secondary">
            <Icon name="replay" />
            Запустить новый сценарий
          </button>
        </div>
      </section>

      <section className="metrics-grid">
        {resultMock.metrics.map((metric) => (
          <article className="metric-card card" key={metric.id}>
            <div className="metric-title-row">
              <span className="metric-icon">
                <Icon name={metric.id} />
              </span>
              <p className="metric-title">{metric.label}</p>
            </div>
            <p className="metric-value">{metric.value}</p>
            <p className="metric-hint">{metric.hint}</p>
            <span className={`metric-trend ${metric.tone}`}>{metric.trend}</span>
          </article>
        ))}
      </section>

      <section className="details-grid">
        <article className="card details-card">
          <div className="section-head">
            <h2>Структура оценки</h2>
            <p>Как сформировался итоговый балл</p>
          </div>
          <div className="score-bars">
            {resultMock.scoreParts.map((part) => {
              const ratio = Math.round((part.value / part.max) * 100)
              return (
                <div className="score-row" key={part.label}>
                  <div className="score-row-head">
                    <span>{part.label}</span>
                    <strong>
                      {part.value}/{part.max}
                    </strong>
                  </div>
                  <div className="score-track" role="progressbar" aria-valuenow={ratio} aria-valuemin="0" aria-valuemax="100">
                    <span style={{ width: `${ratio}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <article className="card details-card">
          <div className="section-head">
            <h2>Ключевые события</h2>
            <p>Решения, повлиявшие на итог</p>
          </div>
          <ol className="timeline">
            {resultMock.timeline.map((item) => (
              <li key={item.title} className={item.tone}>
                <span className="timeline-month">{item.month}</span>
                <div>
                  <p className="timeline-title">{item.title}</p>
                  <p className="timeline-note">{item.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>

        <article className="card details-card recommendations-card">
          <div className="section-head">
            <h2>Рекомендации на следующий запуск</h2>
            <p>Приоритетные шаги для улучшения результата</p>
          </div>
          <ul className="recommendations">
            {resultMock.recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  )
}

