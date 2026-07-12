import { useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { ModuleStateProvider, useModuleState } from '../../bridge/context';
import { downloadBridgeJson, parseBridgeJson } from '../../bridge/io';
import { ModuleShell } from '../../shared/ui/ModuleShell';
import type { ModuleTaskStep } from '../../shared/ui/ModuleShell';
import { DataEntryTable } from '../../shared/ui/DataEntryTable';
import { FieldWithHint } from '../../shared/ui/FieldWithHint';
import { downloadPz1Pdf } from '../../pdf/render';
import { OsmStationMap } from './OsmStationMap';
import {
  consumerRows,
  createInitialPz1Draft,
  createPz1Bridge,
  createPz1Result,
  finalIndicators,
  sanitizeFileName,
  transportColumns,
  updateCellValue,
} from './model';
import type { Pz1Draft, Pz1StationDraft } from './types';
import { getPz1VariantTitle, pz1Variants } from './variants';

export function Pz1Module() {
  return (
    <ModuleStateProvider<Pz1Draft> initialDraft={createInitialPz1Draft()}>
      <Pz1Workspace />
    </ModuleStateProvider>
  );
}

function Pz1Workspace() {
  const { draft } = useModuleState<Pz1Draft>();
  const taskSteps: ModuleTaskStep[] = [
    {
      id: 'stations',
      title: 'Трасса и станции',
      goal: 'Зафиксировать конечные и промежуточные станции для результата ПЗ1.',
      content: <StationsStep />,
      isComplete: isStationsStepComplete(draft),
      completionHint: 'Заполните названия и координаты всех включённых станций.',
    },
    {
      id: 'consumer-properties',
      title: 'Потребительские свойства',
      goal: 'Заполнить сравнение видов транспорта для дальнейшего технико-экономического обоснования.',
      content: <ConsumerPropertiesStep />,
      isComplete: isConsumerPropertiesComplete(draft),
      completionHint: 'Заполните все ячейки таблицы потребительских свойств.',
    },
    {
      id: 'final-indicators',
      title: 'Итоговые показатели',
      goal: 'Собрать 13 итоговых показателей ПЗ1 с явными справочными подсказками.',
      content: <FinalIndicatorsStep />,
      isComplete: isFinalIndicatorsComplete(draft),
      completionHint: 'Заполните все итоговые показатели ПЗ1.',
    },
  ];

  return (
    <ModuleShell
      intro={<IntroStep />}
      introComplete={isIntroComplete(draft)}
      introCompletionHint="Заполните команду и название линии, затем выберите вариант направления."
      result={<ResultStep />}
      subtitle="Статический MVP без бэкенда: паспорт, теория, ручная трасса, таблицы, JSON-мост и PDF."
      taskSteps={taskSteps}
      theory={<TheoryStep />}
      title="ПЗ1. Технико-экономическое обоснование"
    />
  );
}

function IntroStep() {
  const { draft, replaceDraft, setImportedBridge, updateDraft } = useModuleState<Pz1Draft>();
  const [importError, setImportError] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const selectedVariant = pz1Variants.find((variant) => variant.id === draft.selectedVariantId) ?? pz1Variants[0];

  async function importBridgeFile(file: File) {
    try {
      const bridge = parseBridgeJson(await file.text());
      setImportedBridge(bridge);
      replaceDraft({ ...createInitialPz1Draft(bridge), importedFileName: file.name });
      setImportError('');
      setImportStatus(`Загружен файл: ${file.name}`);
    } catch (error) {
      setImportStatus('');
      setImportError(error instanceof Error ? error.message : 'Не удалось загрузить JSON-мост.');
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.item(0);
    if (file) {
      void importBridgeFile(file);
    }
    event.currentTarget.value = '';
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files.item(0);
    if (file) {
      void importBridgeFile(file);
    }
  }

  return (
    <div className="intro-layout">
      <section className="form-section">
        <p className="eyebrow">Паспорт работы</p>
        <h2>Входные данные</h2>
        <div className="form-grid">
          <label>
            <span>Команда</span>
            <input
              onChange={(event) =>
                updateDraft((currentDraft) => ({
                  ...currentDraft,
                  passport: { ...currentDraft.passport, team: event.target.value },
                }))
              }
              value={draft.passport.team}
            />
          </label>
          <label>
            <span>Название линии</span>
            <input
              onChange={(event) =>
                updateDraft((currentDraft) => ({
                  ...currentDraft,
                  passport: { ...currentDraft.passport, lineTitle: event.target.value },
                }))
              }
              value={draft.passport.lineTitle}
            />
          </label>
          <label>
            <span>Вариант направления</span>
            <select
              onChange={(event) =>
                updateDraft((currentDraft) => ({
                  ...currentDraft,
                  selectedVariantId: event.target.value,
                }))
              }
              value={draft.selectedVariantId}
            >
              {pz1Variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="variant-note">{selectedVariant.description}</p>
      </section>

      <section className="import-section">
        <p className="eyebrow">JSON-мост</p>
        <h2>Загрузка данных</h2>
        <label className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <input accept="application/json,.json" className="visually-hidden" onChange={handleFileInput} type="file" />
          <span>Выберите JSON-файл или перенесите его сюда</span>
        </label>
        {draft.importedFileName ? <p className="status-note">Активный файл: {draft.importedFileName}</p> : null}
        {importStatus ? <p className="status-note">{importStatus}</p> : null}
        {importError ? <p className="status-note status-note--error">{importError}</p> : null}
      </section>
    </div>
  );
}

function TheoryStep() {
  return (
    <div className="theory-layout">
      <section>
        <p className="eyebrow">Смысл ПЗ1</p>
        <h2>От паспорта линии к обоснованию</h2>
        <p>
          ПЗ1 собирает трассу, потребительские свойства альтернативных видов транспорта и итоговые показатели, которые
          позже становятся входом для других практических заданий.
        </p>
      </section>
      <div className="theory-grid">
        <article>
          <span>01</span>
          <h3>Трасса</h3>
          <p>Станции А-Б-В-Г ставятся на OpenStreetMap: клик по карте записывает координаты, а включённые станции соединяются линией трассы.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Сравнение</h3>
          <p>Таблица потребительских свойств хранит исходные значения без расчётов в JSX.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Итог</h3>
          <p>JSON-мост и PDF фиксируют личный результат студента; черновик между сессиями не сохраняется автоматически.</p>
        </article>
      </div>
    </div>
  );
}

function StationsStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const [activeStationLabel, setActiveStationLabel] = useState<Pz1StationDraft['label']>('А');

  function updateStation(label: Pz1StationDraft['label'], patch: Partial<Pz1StationDraft>) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      stationDrafts: currentDraft.stationDrafts.map((stationDraft) =>
        stationDraft.label === label ? { ...stationDraft, ...patch } : stationDraft,
      ),
    }));
  }

  return (
    <div className="stations-step">
      <OsmStationMap
        activeStationLabel={activeStationLabel}
        onActiveStationChange={setActiveStationLabel}
        onStationChange={updateStation}
        stations={draft.stationDrafts}
      />
      <div className="station-grid">
        {draft.stationDrafts.map((stationDraft) => {
          const isTerminal = stationDraft.type === 'terminal';

          return (
            <fieldset
              className={`station-editor ${stationDraft.label === activeStationLabel ? 'is-active' : ''}`}
              key={stationDraft.label}
              onFocus={() => setActiveStationLabel(stationDraft.label)}
            >
              <legend>Станция {stationDraft.label}</legend>
              <button className="station-editor__select" onClick={() => setActiveStationLabel(stationDraft.label)} type="button">
                Выбрать для карты
              </button>
              <label className="compact-toggle">
                <input
                  checked={stationDraft.enabled}
                  disabled={isTerminal}
                  onChange={(event) => updateStation(stationDraft.label, { enabled: event.target.checked })}
                  type="checkbox"
                />
                <span>{isTerminal ? 'Обязательная' : 'Промежуточная'}</span>
              </label>
              <label>
                <span>Название</span>
                <input onChange={(event) => updateStation(stationDraft.label, { name: event.target.value })} value={stationDraft.name} />
              </label>
              <div className="coordinate-grid">
                <label>
                  <span>Широта</span>
                  <input
                    inputMode="decimal"
                    onChange={(event) => updateStation(stationDraft.label, { lat: event.target.value })}
                    value={stationDraft.lat}
                  />
                </label>
                <label>
                  <span>Долгота</span>
                  <input
                    inputMode="decimal"
                    onChange={(event) => updateStation(stationDraft.label, { lng: event.target.value })}
                    value={stationDraft.lng}
                  />
                </label>
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

function ConsumerPropertiesStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();

  return (
    <DataEntryTable
      caption="Таблицы потребительских свойств"
      columns={transportColumns}
      onChange={(rowId, columnId, value) =>
        updateDraft((currentDraft) => ({
          ...currentDraft,
          consumerProperties: updateCellValue(currentDraft.consumerProperties, rowId, columnId, value),
        }))
      }
      rows={consumerRows}
      values={draft.consumerProperties}
    />
  );
}

function FinalIndicatorsStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();

  return (
    <div className="indicator-step">
      <div className="indicator-grid">
        {finalIndicators.map((indicator) => (
          <FieldWithHint
            hint={indicator.hint}
            id={indicator.id}
            key={indicator.id}
            label={indicator.label}
            onChange={(value) =>
              updateDraft((currentDraft) => ({
                ...currentDraft,
                finalIndicators: { ...currentDraft.finalIndicators, [indicator.id]: value },
              }))
            }
            unit={'unit' in indicator ? indicator.unit : undefined}
            value={draft.finalIndicators[indicator.id] ?? ''}
          />
        ))}
      </div>
      <label className="notes-field">
        <span>Комментарий к исходным данным</span>
        <textarea
          onChange={(event) =>
            updateDraft((currentDraft) => ({
              ...currentDraft,
              notes: event.target.value,
            }))
          }
          value={draft.notes}
        />
      </label>
    </div>
  );
}

function ResultStep() {
  const { draft } = useModuleState<Pz1Draft>();
  const bridge = createPz1Bridge(draft);
  const result = createPz1Result(draft);
  const fileSlug = sanitizeFileName(draft.passport.lineTitle, 'pz1');
  const filledConsumerCells = Object.values(draft.consumerProperties).flatMap((row) => Object.values(row)).filter(isFilled).length;
  const filledIndicatorCount = Object.values(draft.finalIndicators).filter(isFilled).length;

  function downloadJson() {
    downloadBridgeJson(bridge, `${fileSlug}-bridge.json`);
  }

  function downloadPdf() {
    downloadPz1Pdf(
      {
        team: draft.passport.team,
        lineTitle: draft.passport.lineTitle,
        variantTitle: getPz1VariantTitle(draft.selectedVariantId),
        stationCount: result.stations.length,
        filledConsumerCells,
        filledIndicatorCount,
        createdAt: draft.passport.createdAt,
      },
      `${fileSlug}-report.pdf`,
    );
  }

  function saveResult() {
    downloadPdf();
    window.setTimeout(downloadJson, 120);
  }

  return (
    <div className="result-layout">
      <section className="result-summary">
        <p className="eyebrow">Итог ПЗ1</p>
        <h2>Сводка результата</h2>
        <dl className="summary-grid">
          <div>
            <dt>Команда</dt>
            <dd>{draft.passport.team || 'Не заполнено'}</dd>
          </div>
          <div>
            <dt>Линия</dt>
            <dd>{draft.passport.lineTitle || 'Не заполнено'}</dd>
          </div>
          <div>
            <dt>Вариант</dt>
            <dd>{getPz1VariantTitle(draft.selectedVariantId)}</dd>
          </div>
          <div>
            <dt>Станции</dt>
            <dd>{result.stations.length}</dd>
          </div>
          <div>
            <dt>Ячейки свойств</dt>
            <dd>{filledConsumerCells}</dd>
          </div>
          <div>
            <dt>Итоговые показатели</dt>
            <dd>{filledIndicatorCount}</dd>
          </div>
        </dl>
        <p className="save-warning">Сохраните файл перед выходом, иначе прогресс не восстановится.</p>
      </section>

      <section className="result-actions">
        <p className="eyebrow">Экспорт</p>
        <h2>Сохранить результат</h2>
        <p className="status-note">Будут сформированы два файла: PDF-отчёт и JSON-мост для повторной загрузки.</p>
        <button className="button button--primary" onClick={saveResult} type="button">
          Сохранить результат
        </button>
      </section>
    </div>
  );
}

function isFilled(value: string) {
  return value.trim().length > 0;
}

function isIntroComplete(draft: Pz1Draft) {
  return isFilled(draft.passport.team) && isFilled(draft.passport.lineTitle) && isFilled(draft.selectedVariantId);
}

function isStationsStepComplete(draft: Pz1Draft) {
  const enabledStations = draft.stationDrafts.filter((stationDraft) => stationDraft.enabled);
  const terminalLabels: Array<Pz1StationDraft['label']> = ['А', 'Г'];

  return (
    terminalLabels.every((label) => enabledStations.some((stationDraft) => stationDraft.label === label)) &&
    enabledStations.every(isStationDraftComplete)
  );
}

function isStationDraftComplete(stationDraft: Pz1StationDraft) {
  return isFilled(stationDraft.name) && isValidCoordinate(stationDraft.lat) && isValidCoordinate(stationDraft.lng);
}

function isValidCoordinate(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return isFilled(value) && Number.isFinite(parsed);
}

function isConsumerPropertiesComplete(draft: Pz1Draft) {
  return consumerRows.every((row) => transportColumns.every((column) => isFilled(draft.consumerProperties[row.id]?.[column.id] ?? '')));
}

function isFinalIndicatorsComplete(draft: Pz1Draft) {
  return finalIndicators.every((indicator) => isFilled(draft.finalIndicators[indicator.id] ?? ''));
}
