import './App.css'

function App() {
  const news = [
    {
      id: 1,
      category: 'Обновление',
      date: '10 апреля 2026',
      title: 'Запущен новый раздел аналитики',
      text: 'В системе появился обновленный раздел аналитики, который позволяет быстрее отслеживать ключевые показатели и изменения в проекте.',
    },
    {
      id: 2,
      category: 'Система',
      date: '9 апреля 2026',
      title: 'Улучшена производительность интерфейса',
      text: 'Новость 1',
    },
    {
      id: 3,
      category: 'Безопасность',
      date: '8 апреля 2026',
      title: 'Обновлены механизмы авторизации',
      text: 'Новость 2',
    },
    {
      id: 4,
      category: 'Команда',
      date: '7 апреля 2026',
      title: 'Добавлена внутренняя лента новостей',
      text: 'Новость 3',
    },
  ]

  const importantNews = news[0]
  const otherNews = news.slice(1)

  return (
    <>
      <section id="center" className="news-hero">
        <div className="news-badge">Новости проекта</div>

        <div className="news-hero-content">
          <p className="news-meta">
            <span className="news-category">{importantNews.category}</span>
            <span className="news-dot">•</span>
            <span>{importantNews.date}</span>
          </p>

          <h1>{importantNews.title}</h1>

          <p className="news-hero-text">{importantNews.text}</p>

          <div className="news-actions">
            <button className="primary-btn">Читать подробнее</button>
            <button className="secondary-btn">Все новости</button>
          </div>
        </div>
      </section>

      <div className="ticks"></div>

      <section id="next-steps" className="news-layout">
        <div id="docs" className="news-list-section">
          <div className="section-head">
            <h2>Лента обновлений</h2>
            <p>Последние события и изменения в системе</p>
          </div>

          <div className="news-list">
            {otherNews.map((item) => (
              <article key={item.id} className="news-card">
                <div className="card-top">
                  <span className="card-category">{item.category}</span>
                  <span className="card-date">{item.date}</span>
                </div>

                <h3>{item.title}</h3>
                <p>{item.text}</p>

                <button className="card-link">Открыть новость</button>
              </article>
            ))}
          </div>
        </div>

        <aside id="social" className="news-sidebar">
          <div className="section-head">
            <h2>Важно</h2>
            <p>Краткая информация для пользователей</p>
          </div>

          <div className="info-card">
            <h3>Что здесь можно показывать</h3>
            <p>
              В этой колонке удобно размещать анонсы, уведомления, ссылки на
              документы, статус системы или важные объявления.
            </p>
          </div>

          <div className="info-card">
            <h3>Примеры блоков</h3>
            <ul className="info-list">
              <li>статус сервиса</li>
              <li>срочные уведомления</li>
              <li>ссылки на регламенты</li>
              <li>обновления команды</li>
            </ul>
          </div>
        </aside>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App