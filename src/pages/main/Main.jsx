import StudentsForm from '../StudentsForm';

export function Main() {
  return (
    <section className="landing-page">
      <div className="section-line" />
      <div className="content-panel content-panel--light">
        <StudentsForm />
      </div>
    </section>
  );
}