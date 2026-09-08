import { useState } from 'react';
import { useModuleState } from '../../bridge/context';
import {
  assignPz2WorkToStage,
  createPz2Stage,
  formatPz2Km,
  getPz2StageWorks,
  getPz2WorkKind,
  parsePz2Number,
  pz2SoilConditions,
  removePz2Stage,
} from './model';
import type { Pz2Draft, Pz2WorkDraft } from './types';

/**
 * Шаг 02 ПЗ2: разбиение трассы на пространственные этапы (ТЗ ПЗ2 §6).
 *
 * Этап — участок трассы, который строится параллельно другим, а не отрезок
 * времени. Работы разносятся по этапам перетаскиванием; работа принадлежит
 * ровно одному этапу, поэтому перенос — это замена принадлежности.
 *
 * Перетаскивание сделано на нативном HTML drag & drop: заказчик отдельно
 * отметил, что техника не принципиальна, важен результат. Мышью можно не
 * попасть — рядом с каждой карточкой есть список этапов для выбора, иначе шаг
 * был бы непроходим с клавиатуры.
 */
export function StagesStep() {
  const { draft, updateDraft } = useModuleState<Pz2Draft>();
  const [title, setTitle] = useState('');
  const [draggedId, setDraggedId] = useState('');
  const [dropTargetId, setDropTargetId] = useState<string | null | undefined>(undefined);
  const poolWorks = getPz2StageWorks(draft, null);

  function addStage() {
    const trimmed = title.trim();

    if (!trimmed) {
      return;
    }

    updateDraft((current) => ({
      ...current,
      stages: [...current.stages, createPz2Stage(trimmed, current.stages.length)],
    }));
    setTitle('');
  }

  function moveWork(workId: string, stageId: string | null) {
    updateDraft((current) => assignPz2WorkToStage(current, workId, stageId));
  }

  function dropHandlers(stageId: string | null) {
    return {
      onDragEnter: () => setDropTargetId(stageId),
      onDragLeave: () => setDropTargetId((current) => (current === stageId ? undefined : current)),
      onDragOver: (event: React.DragEvent) => event.preventDefault(),
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        const workId = event.dataTransfer.getData('text/plain') || draggedId;

        if (workId) {
          moveWork(workId, stageId);
        }

        setDraggedId('');
        setDropTargetId(undefined);
      },
    };
  }

  return (
    <div className="stages-step">
      <section className="form-section">
        <div className="osm-map-card__head">
          <div>
            <p className="eyebrow">Этапы</p>
            <h3>Участки, которые строятся параллельно</h3>
          </div>
        </div>

        <div className="stage-add">
          <input
            aria-label="Название этапа"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addStage();
              }
            }}
            placeholder="Например: Участок Хабаровск — Бикин"
            value={title}
          />
          <button className="button button--outline" disabled={!title.trim()} onClick={addStage} type="button">
            + Добавить этап
          </button>
        </div>

        {draft.stages.length === 0 ? (
          <p className="status-note">
            Этапов пока нет. Трассу делят на участки, которые строят одновременно: на Москве — Санкт-Петербурге их
            семь-девять.
          </p>
        ) : (
          <ul className="stage-list">
            {draft.stages.map((stage) => {
              const works = getPz2StageWorks(draft, stage.id);

              return (
                <li
                  className={`stage-card${dropTargetId === stage.id ? ' is-drop-target' : ''}`}
                  key={stage.id}
                  {...dropHandlers(stage.id)}
                >
                  <div className="stage-card__head">
                    <h4>{stage.title}</h4>
                    <span className="stage-card__meta">{describeWorks(works)}</span>
                    <button
                      aria-label={`Удалить этап ${stage.title}`}
                      className="data-entry__remove-column"
                      onClick={() => updateDraft((current) => removePz2Stage(current, stage.id))}
                      type="button"
                    >
                      ×
                    </button>
                  </div>

                  {works.length === 0 ? (
                    <p className="stage-drop-hint">Перетащите сюда работы из пула</p>
                  ) : (
                    <ul className="work-cards">
                      {works.map((work) => (
                        <WorkCard
                          draft={draft}
                          key={work.id}
                          onDragStart={setDraggedId}
                          onMove={moveWork}
                          work={work}
                        />
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={`form-section work-pool${dropTargetId === null ? ' is-drop-target' : ''}`} {...dropHandlers(null)}>
        <div className="osm-map-card__head">
          <div>
            <p className="eyebrow">Пул работ</p>
            <h3>Ещё не разнесены по этапам</h3>
          </div>
          <span className="stage-card__meta">{describeWorks(poolWorks)}</span>
        </div>

        {poolWorks.length === 0 ? (
          <p className="status-note">
            {draft.works.length === 0
              ? 'Работ нет — вернитесь на шаг «Работы» и перечислите их.'
              : 'Все работы разнесены по этапам.'}
          </p>
        ) : (
          <ul className="work-cards">
            {poolWorks.map((work) => (
              <WorkCard draft={draft} key={work.id} onDragStart={setDraggedId} onMove={moveWork} work={work} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

interface WorkCardProps {
  draft: Pz2Draft;
  work: Pz2WorkDraft;
  onDragStart: (workId: string) => void;
  onMove: (workId: string, stageId: string | null) => void;
}

function WorkCard({ draft, work, onDragStart, onMove }: WorkCardProps) {
  const kind = getPz2WorkKind(work.kind);
  const conditions = pz2SoilConditions.filter((item) => work.conditions.includes(item.id));

  return (
    <li
      className="work-card"
      draggable
      onDragEnd={() => onDragStart('')}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', work.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(work.id);
      }}
    >
      <div>
        <strong>{kind.label}</strong>
        <span className="work-card__meta">{describeWork(work)}</span>
        {conditions.length > 0 ? (
          <span className="work-card__meta">{conditions.map((item) => item.label).join(', ')}</span>
        ) : null}
      </div>

      {/* Запасной путь к тому же действию: мышью в карточку можно и не попасть,
          а с клавиатуры перетаскивание недоступно вовсе. */}
      <select
        aria-label={`Этап для работы «${kind.label}»`}
        onChange={(event) => onMove(work.id, event.target.value || null)}
        value={work.stageId ?? ''}
      >
        <option value="">В пуле</option>
        {draft.stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.title}
          </option>
        ))}
      </select>
    </li>
  );
}

function describeWork(work: Pz2WorkDraft) {
  const kind = getPz2WorkKind(work.kind);

  if (kind.measure === 'count') {
    return `${parsePz2Number(work.count) ?? 0} шт.`;
  }

  return formatPz2Km(parsePz2Number(work.lengthKm) ?? 0);
}

/** Сводка по этапу: сколько работ и сколько в них километров. */
function describeWorks(works: Pz2WorkDraft[]) {
  if (works.length === 0) {
    return 'пусто';
  }

  const lengthKm = works.reduce(
    (sum, work) =>
      getPz2WorkKind(work.kind).measure === 'length' ? sum + (parsePz2Number(work.lengthKm) ?? 0) : sum,
    0,
  );

  return `${works.length} ${pluralWorks(works.length)} · ${formatPz2Km(lengthKm)}`;
}

function pluralWorks(count: number) {
  const tail = count % 100;

  if (tail >= 11 && tail <= 14) {
    return 'работ';
  }

  if (count % 10 === 1) {
    return 'работа';
  }

  return count % 10 >= 2 && count % 10 <= 4 ? 'работы' : 'работ';
}
