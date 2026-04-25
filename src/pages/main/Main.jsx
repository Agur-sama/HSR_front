import StudentsForm from '../StudentsForm';

export function Main() {
  return (
    <section className="landing-page">
      <div className="section-line" />
      <StudentsForm />  {/* ← Убрали обёртку content-panel */}
    </section>
  );
}