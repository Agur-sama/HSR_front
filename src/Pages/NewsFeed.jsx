function NewsFeed() {
  const news = [
    {
      id: 1,
      title: "Запуск новой функции",
      date: "10 апреля 2026",
      text: "новость 1.",
    },
    {
      id: 2,
      title: "Обновление интерфейса",
      date: "9 апреля 2026",
      text: "новость 2",
    },
    {
      id: 3,
      title: "Исправление ошибок",
      date: "8 апреля 2026",
      text: "новость 1",
    },
  ];

  return (
    <div className="news-page">
      <header className="news-header">
        <h1>Новостная лента</h1>
        <p>Актуальные новости и обновления проекта</p>
      </header>

      <section className="news-list">
        {news.map((item) => (
          <article key={item.id} className="news-card">
            <span className="news-date">{item.date}</span>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
            <button className="news-button">Читать подробнее</button>
          </article>
        ))}
      </section>
    </div>
  );
}

export default NewsFeed;