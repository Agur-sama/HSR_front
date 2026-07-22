import { useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { ModuleStateProvider, useModuleState } from '../../bridge/context';
import { downloadBridgeJson, parseBridgeJson } from '../../bridge/io';
import { ModuleShell } from '../../shared/ui/ModuleShell';
import type { ModuleTaskStep } from '../../shared/ui/ModuleShell';
import { DataEntryTable } from '../../shared/ui/DataEntryTable';
import { FieldWithHint } from '../../shared/ui/FieldWithHint';
import { OsmStationMap } from './OsmStationMap';
import {
  countFilledConsumerCells,
  consumerRows,
  createInitialPz1Draft,
  createPz1Bridge,
  createPz1Result,
  finalIndicators,
  getPz1TaskStepCount,
  getRouteMetrics,
  getSyncedCorrespondenceTables,
  isConsumerPropertiesComplete,
  isFinalIndicatorsComplete,
  isPassportComplete,
  isStationsStepComplete,
  sanitizeFileName,
  syncCorrespondenceTables,
  transportColumns,
  updateCellValue,
  validateConsumerCell,
} from './model';
import type { Pz1CorrespondenceTableDraft, Pz1Draft, Pz1StationDraft } from './types';
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
  const fileSlug = sanitizeFileName(draft.passport.lineTitle, 'pz1');
  const taskSteps: ModuleTaskStep[] = [
    {
      id: 'stations',
      title: 'Размещение станций и план трассы',
      goal:
        'Назначьте начально-конечные станции (А и Г) и не более двух промежуточных (Б, В), затем проложите линию ВСМ между ними.',
      content: <StationsStep />,
      isComplete: isStationsStepComplete(draft),
      completionHint: 'Проложите линию трассы — нужно минимум две точки',
    },
    {
      id: 'consumer-properties',
      title: 'Потребительские свойства линии',
      goal:
        'Заполните характеристики поездки на каждом виде транспорта — они понадобятся для прогноза пассажиропотока.',
      content: <ConsumerPropertiesStep />,
      isComplete: isConsumerPropertiesComplete(draft),
      completionHint: 'Заполните все обязательные поля, чтобы продолжить',
    },
    {
      id: 'final-indicators',
      title: 'Технико-экономические показатели',
      goal:
        'Сведите ключевые параметры линии. У капиталоёмких показателей рядом приведены справочные диапазоны — используйте их, чтобы прикинуть порядок величины.',
      content: <FinalIndicatorsStep />,
      isComplete: isFinalIndicatorsComplete(draft),
      completionHint: 'Заполните все обязательные поля, чтобы продолжить',
    },
  ];

  return (
    <ModuleShell
      intro={<IntroStep />}
      introComplete={isIntroComplete(draft)}
      introCompletionHint="Заполните все поля, чтобы начать"
      onSaveDraft={() => downloadBridgeJson(createPz1Bridge(draft), `${fileSlug}-bridge.json`)}
      result={<ResultStep />}
      subtitle="Практическое задание № 1"
      taskSteps={taskSteps}
      theory={<TheoryStep />}
      title="Технико-экономическое обоснование проекта ВСМ"
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
            <span>Название команды</span>
            <input
              maxLength={40}
              minLength={2}
              onChange={(event) =>
                updateDraft((currentDraft) => ({
                  ...currentDraft,
                  passport: { ...currentDraft.passport, team: event.target.value },
                }))
              }
              placeholder="напр. Юнит-3"
              value={draft.passport.team}
            />
          </label>
          <label>
            <span>Название линии</span>
            <input
              maxLength={80}
              minLength={3}
              onChange={(event) =>
                updateDraft((currentDraft) => ({
                  ...currentDraft,
                  passport: { ...currentDraft.passport, lineTitle: event.target.value },
                }))
              }
              placeholder="напр. ВСМ Владивосток — Хабаровск"
              value={draft.passport.lineTitle}
            />
          </label>
          <label>
            <span>Вариант, который вам назначили</span>
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
          <p>
            Станции А, Г и опциональные Б, В ставятся на OpenStreetMap. Линия трассы прокладывается отдельными
            точками, чтобы обойти водоёмы и возвышенности.
          </p>
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
  const routeMetrics = getRouteMetrics(draft);
  const correspondenceCount = getSyncedCorrespondenceTables(draft).length;
  const estimatedStepCount = getPz1TaskStepCount(draft);

  function updateStation(label: Pz1StationDraft['label'], patch: Partial<Pz1StationDraft>) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      stationDrafts: currentDraft.stationDrafts.map((stationDraft) =>
        stationDraft.label === label ? { ...stationDraft, ...patch } : stationDraft,
      ),
      correspondenceTables: syncCorrespondenceTables(
        {
          stationDrafts: currentDraft.stationDrafts.map((stationDraft) =>
            stationDraft.label === label ? { ...stationDraft, ...patch } : stationDraft,
          ),
          correspondenceTables: currentDraft.correspondenceTables,
        },
      ),
    }));
  }

  function replaceRoutePointDrafts(routePointDrafts: Pz1Draft['routePointDrafts']) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      routePointDrafts,
    }));
  }

  return (
    <div className="stations-step">
      <OsmStationMap
        activeStationLabel={activeStationLabel}
        onActiveStationChange={setActiveStationLabel}
        onPreviewImageChange={(previewImage) =>
          updateDraft((currentDraft) =>
            currentDraft.previewImage === previewImage ? currentDraft : { ...currentDraft, previewImage },
          )
        }
        onRoutePointDraftsChange={replaceRoutePointDrafts}
        onStationChange={updateStation}
        routeMetrics={routeMetrics}
        routePointDrafts={draft.routePointDrafts}
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
      <aside className="correspondence-estimate">
        <p className="eyebrow">Объём ПЗ1</p>
        <strong>{correspondenceCount} корреспонденций</strong>
        <span>{estimatedStepCount} шагов в фазе задания при текущем наборе станций.</span>
      </aside>
    </div>
  );
}

function ConsumerPropertiesStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const correspondenceTables = getSyncedCorrespondenceTables(draft);

  return (
    <div className="consumer-tables">
      {correspondenceTables.length === 0 ? (
        <section className="empty-state">
          <h3>Корреспонденции пока не сформированы</h3>
          <p>Назначьте станции на карте, чтобы появились пары для таблиц потребительских свойств.</p>
        </section>
      ) : null}
      {correspondenceTables.map((table) => {
        const activeColumns = transportColumns.filter((column) => table.activeModes.includes(column.id));
        const excludedColumns = transportColumns.filter((column) => !table.activeModes.includes(column.id));

        return (
          <section className="correspondence-table" key={table.pairKey}>
            <DataEntryTable
              caption={`Корреспонденция ${table.pairKey}`}
              columns={activeColumns}
              getCellMeta={(rowId, columnId) => getConsumerCellMeta(rowId, table.values[rowId]?.[columnId] ?? '')}
              getError={(rowId, columnId) => validateConsumerCell(rowId, table.values[rowId]?.[columnId] ?? '')}
              onChange={(rowId, columnId, value) => updateCorrespondenceTable(table.pairKey, { values: updateCellValue(table.values, rowId, columnId, value) })}
              onRemoveColumn={(columnId) =>
                updateCorrespondenceTable(table.pairKey, {
                  activeModes: table.activeModes.filter((modeId) => modeId !== columnId),
                })
              }
              rows={consumerRows}
              values={table.values}
            />
            {excludedColumns.length > 0 ? (
              <div className="excluded-modes">
                <span>Исключены для этой пары:</span>
                {excludedColumns.map((column) => (
                  <button
                    className="button button--ghost"
                    key={column.id}
                    onClick={() =>
                      updateCorrespondenceTable(table.pairKey, {
                        activeModes: [...table.activeModes, column.id],
                      })
                    }
                    type="button"
                  >
                    Вернуть {column.label}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );

  function updateCorrespondenceTable(pairKey: string, patch: Partial<Pz1CorrespondenceTableDraft>) {
    updateDraft((currentDraft) => {
      const syncedTables = syncCorrespondenceTables(currentDraft);
      const currentTable = syncedTables[pairKey];

      if (!currentTable) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        correspondenceTables: {
          ...syncedTables,
          [pairKey]: {
            ...currentTable,
            ...patch,
          },
        },
      };
    });
  }
}

function FinalIndicatorsStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const totalLengthText = formatKm(getRouteMetrics(draft).totalLengthKm);

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
            readOnly={indicator.id === 'lineLength'}
            unit={'unit' in indicator ? indicator.unit : undefined}
            value={indicator.id === 'lineLength' ? totalLengthText : draft.finalIndicators[indicator.id] ?? ''}
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
  const [exportStatus, setExportStatus] = useState('');
  const bridge = createPz1Bridge(draft);
  const result = createPz1Result(draft);
  const fileSlug = sanitizeFileName(draft.passport.lineTitle, 'pz1');
  const filledConsumerCells = countFilledConsumerCells(draft);
  const filledIndicatorCount = finalIndicators.filter((indicator) =>
    indicator.id === 'lineLength' ? result.totalLengthKm > 0 : isFilled(draft.finalIndicators[indicator.id] ?? ''),
  ).length;
  const totalLengthText = formatKm(result.totalLengthKm);

  function downloadJson() {
    downloadBridgeJson(bridge, `${fileSlug}-bridge.json`);
    setExportStatus('✓ Файл сохранён');
  }

  async function downloadPdf() {
    try {
      const { downloadPz1Pdf } = await import('../../pdf/render');
      await downloadPz1Pdf(
        {
          team: draft.passport.team,
          lineTitle: draft.passport.lineTitle,
          variantTitle: getPz1VariantTitle(draft.selectedVariantId),
          stationCount: result.stations.length,
          routePointCount: result.routeLine.vertices.length,
          totalLengthKm: result.totalLengthKm,
          filledConsumerCells,
          filledIndicatorCount,
          createdAt: draft.passport.createdAt,
          consumerProperties: result.consumerProperties,
          finalIndicators: result.finalIndicators,
          notes: result.notes,
          routeLine: result.routeLine,
          previewImage: result.previewImage,
          stations: result.stations,
        },
        `${fileSlug}-report.pdf`,
      );
      setExportStatus('✓ Файл сохранён');
    } catch {
      setExportStatus('Не удалось сформировать PDF. Попробуйте скачать JSON и повторить экспорт.');
    }
  }

  return (
    <div className="result-layout">
      <section className="result-summary">
        <p className="eyebrow">Итог ПЗ1</p>
        <h2>Задание выполнено</h2>
        <p>Проверьте сводку и скачайте отчёт. Файл JSON понадобится, если вы захотите перенести данные в следующее задание.</p>
        <dl className="summary-grid">
          <div>
            <dt>Вариант</dt>
            <dd>{getPz1VariantTitle(draft.selectedVariantId)}</dd>
          </div>
          <div>
            <dt>Число станций</dt>
            <dd>{result.stations.length}</dd>
          </div>
          <div>
            <dt>Длина трассы</dt>
            <dd>{totalLengthText}</dd>
          </div>
          <div>
            <dt>Общий пассажиропоток</dt>
            <dd>{draft.finalIndicators.annualFlow || 'не рассчитано'}</dd>
          </div>
          <div>
            <dt>Прогноз</dt>
            <dd>{draft.finalIndicators.ticketRevenue || 'не рассчитано'}</dd>
          </div>
          <div>
            <dt>Точки трассы</dt>
            <dd>{result.routeLine.vertices.length}</dd>
          </div>
        </dl>
        <p className="save-warning">Сохраните файл перед выходом — прогресс не восстановится, если закрыть страницу.</p>
      </section>

      <section className="result-actions">
        <p className="eyebrow">Экспорт</p>
        <h2>Скачать файлы</h2>
        <p className="status-note">PDF нужен для сдачи преподавателю. JSON можно загрузить позже, чтобы продолжить работу с теми же данными.</p>
        <button className="button button--primary" onClick={() => void downloadPdf()} type="button">
          Скачать PDF
        </button>
        <button className="button button--secondary" onClick={downloadJson} type="button">
          Скачать JSON
        </button>
        {exportStatus ? <p className="status-note">{exportStatus}</p> : null}
      </section>
    </div>
  );
}

function isFilled(value: string) {
  return value.trim().length > 0;
}

function getConsumerCellMeta(rowId: string, value: string) {
  if (rowId !== 'discomfort' || !value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (parsed === 0) {
    return '0 — комфортнее';
  }

  if (parsed === 1) {
    return '1 — менее комфортно';
  }

  return 'Диапазон 0…1';
}

function formatKm(value: number) {
  if (value <= 0) {
    return 'не рассчитано';
  }

  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} км`;
}

function isIntroComplete(draft: Pz1Draft) {
  return isPassportComplete(draft);
}
