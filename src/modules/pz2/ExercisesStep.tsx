import { useState } from 'react';
import { useModuleState } from '../../bridge/context';
import { checkPz2CriticalPath } from './model';
import { pz2NetworkExercises } from './networkExercises';
import type { Pz2NetworkExercise } from './networkExercises';
import type { Pz2Draft } from './types';

/**
 * Шаг 03 ПЗ2: упражнения (ТЗ ПЗ2 §7).
 *
 * Сверху — упражнение Артёма Глебовича: готовая сетевая диаграмма картинкой,
 * студент определяет критический путь и вводит ответ. Ниже — тренажёр
 * выравнивания загрузки Ольги Владимировны, он подключается как есть.
 */
export function ExercisesStep({ trainer }: { trainer: React.ReactNode }) {
  return (
    <div className="exercises-step">
      <CriticalPathExercises />
      {trainer}
    </div>
  );
}

function CriticalPathExercises() {
  if (pz2NetworkExercises.length === 0) {
    return (
      <section className="form-section">
        <p className="eyebrow">Критический путь</p>
        <h3>Упражнение по сетевой диаграмме</h3>
        <p className="status-note">
          Упражнение ждёт материалов заказчика: сами диаграммы и правильные ответы к ним. Как только они придут,
          упражнение появится здесь — проверка ответа уже готова. Придумывать диаграмму и «правильный» путь нельзя:
          студент по ним учится.
        </p>
      </section>
    );
  }

  return (
    <section className="form-section">
      <p className="eyebrow">Критический путь</p>
      <h3>Упражнение по сетевой диаграмме</h3>
      <ul className="exercise-list">
        {pz2NetworkExercises.map((exercise) => (
          <CriticalPathExercise exercise={exercise} key={exercise.id} />
        ))}
      </ul>
    </section>
  );
}

function CriticalPathExercise({ exercise }: { exercise: Pz2NetworkExercise }) {
  const { draft, updateDraft } = useModuleState<Pz2Draft>();
  const [checked, setChecked] = useState(false);
  const answer = draft.criticalPathAnswers[exercise.id] ?? '';
  const correct = checkPz2CriticalPath(answer, exercise.answer);

  return (
    <li className="exercise-card">
      <h4>{exercise.title}</h4>
      <img alt={`Сетевая диаграмма: ${exercise.title}`} src={exercise.imageUrl} />
      <p>{exercise.question}</p>

      <div className="exercise-answer">
        <input
          aria-label={`Ответ: ${exercise.title}`}
          onChange={(event) => {
            const value = event.target.value;
            setChecked(false);
            updateDraft((current) => ({
              ...current,
              criticalPathAnswers: { ...current.criticalPathAnswers, [exercise.id]: value },
            }));
          }}
          placeholder="Например: 1-3-5-7"
          value={answer}
        />
        <button className="button button--outline" disabled={!answer.trim()} onClick={() => setChecked(true)} type="button">
          Проверить
        </button>
      </div>

      {checked ? (
        <p className={correct ? 'status-note' : 'field-warning'}>
          {correct ? 'Верно: это и есть самая длинная цепочка работ.' : 'Пока не сходится. Ищите самую длинную цепочку от начала до конца.'}
        </p>
      ) : null}
    </li>
  );
}
