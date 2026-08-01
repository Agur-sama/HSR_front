import { useState } from 'react';
import type { CSSProperties, ChangeEvent, DragEvent } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  Pz1PassengerFlowModeInputs,
  Pz1PassengerFlowRegionalInputs,
  Pz1PassengerFlowResult,
  TransportModeId,
} from '../../bridge/schema';
import { ModuleStateProvider, useModuleState } from '../../bridge/context';
import { jsonFileDraftStorage } from '../../bridge/storage';
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
  discomfortRows,
  finalIndicators,
  getComputedFinalIndicators,
  getDuplicateStationNames,
  getPz1TaskStepCount,
  getPz1PassengerFlowForecast,
  getRouteMetrics,
  getStationRouteDistances,
  getSyncedCorrespondenceTables,
  isConsumerPropertiesComplete,
  isFinalIndicatorsComplete,
  isPassengerFlowForecastComplete,
  isPassportComplete,
  isStationsStepComplete,
  isTransportModeRemovable,
  passengerFlowModeRows,
  passengerFlowRegionalFields,
  sanitizeFileName,
  syncCorrespondenceTables,
  transportColumns,
  updateCellValue,
  validateConsumerCell,
  validateDiscomfortCell,
  validateStationField,
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
      id: 'passenger-flow-forecast',
      title: 'Прогноз пассажиропотока',
      goal:
        'Рассчитайте общий рост рынка и распределите прогноз по шести видам транспорта через гравитационную модель.',
      content: <PassengerFlowForecastStep />,
      isComplete: isPassengerFlowForecastComplete(draft),
      completionHint: 'Заполните региональные параметры и таблицу по видам транспорта, чтобы получить прогноз',
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
      onSaveDraft={() => jsonFileDraftStorage.save(createPz1Bridge(draft), `${fileSlug}-bridge.json`)}
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
      const bridge = await jsonFileDraftStorage.load(file);
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
  const duplicateStationNames = getDuplicateStationNames(draft);
  const stationRouteDistances = getStationRouteDistances(draft);

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
          const nameError = validateStationField(stationDraft, 'name', duplicateStationNames);
          const latError = validateStationField(stationDraft, 'lat');
          const lngError = validateStationField(stationDraft, 'lng');

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
                <input
                  aria-invalid={nameError ? true : undefined}
                  className={nameError ? 'is-invalid' : undefined}
                  onChange={(event) => updateStation(stationDraft.label, { name: event.target.value })}
                  value={stationDraft.name}
                />
                {nameError ? <small className="field-error">{nameError}</small> : null}
              </label>
              <div className="coordinate-grid">
                <label>
                  <span>Широта</span>
                  <input
                    aria-invalid={latError ? true : undefined}
                    className={latError ? 'is-invalid' : undefined}
                    inputMode="decimal"
                    onChange={(event) => updateStation(stationDraft.label, { lat: event.target.value })}
                    value={stationDraft.lat}
                  />
                  {latError ? <small className="field-error">{latError}</small> : null}
                </label>
                <label>
                  <span>Долгота</span>
                  <input
                    aria-invalid={lngError ? true : undefined}
                    className={lngError ? 'is-invalid' : undefined}
                    inputMode="decimal"
                    onChange={(event) => updateStation(stationDraft.label, { lng: event.target.value })}
                    value={stationDraft.lng}
                  />
                  {lngError ? <small className="field-error">{lngError}</small> : null}
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
      {stationRouteDistances.length > 0 ? (
        <aside className="station-route-distances">
          <p className="eyebrow">Участки трассы</p>
          <h3>Расстояние между станциями</h3>
          <dl>
            {stationRouteDistances.map((distance) => (
              <div key={`${distance.fromLabel}-${distance.toLabel}`}>
                <dt>
                  {distance.fromLabel} — {distance.toLabel}
                </dt>
                <dd>{formatKm(distance.distanceKm)}</dd>
              </div>
            ))}
          </dl>
        </aside>
      ) : null}
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
              canRemoveColumn={(columnId) => isTransportModeRemovable(columnId as TransportModeId)}
              getCellMeta={(rowId, columnId) => getConsumerCellMeta(rowId, table.values[rowId]?.[columnId] ?? '')}
              getError={(rowId, columnId) => validateConsumerCell(rowId, table.values[rowId]?.[columnId] ?? '')}
              onChange={(rowId, columnId, value) => updateCorrespondenceTable(table.pairKey, { values: updateCellValue(table.values, rowId, columnId, value) })}
              onRemoveColumn={(columnId) => {
                const modeId = columnId as TransportModeId;
                if (!isTransportModeRemovable(modeId)) {
                  return;
                }

                updateCorrespondenceTable(table.pairKey, {
                  activeModes: table.activeModes.filter((activeModeId) => activeModeId !== modeId),
                });
              }}
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
      <section className="correspondence-table">
        <DataEntryTable
          caption="Коэффициент дискомфорта"
          columns={transportColumns}
          getCellMeta={(rowId, columnId) => getDiscomfortCellMeta(draft.discomfortMatrix.values[rowId]?.[columnId as TransportModeId] ?? '')}
          getError={(rowId, columnId) => validateDiscomfortCell(draft.discomfortMatrix.values[rowId]?.[columnId as TransportModeId] ?? '')}
          getInputClassName={() => 'discomfort-value'}
          getInputStyle={(rowId, columnId) =>
            getDiscomfortInputStyle(draft.discomfortMatrix.values[rowId]?.[columnId as TransportModeId] ?? '')
          }
          onChange={(rowId, columnId, value) => updateDiscomfortValue(rowId, columnId as TransportModeId, value)}
          rows={discomfortRows}
          values={draft.discomfortMatrix.values}
        />
      </section>
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

  function updateDiscomfortValue(rowId: string, modeId: TransportModeId, value: string) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      discomfortMatrix: {
        values: updateCellValue(currentDraft.discomfortMatrix.values, rowId, modeId, value) as Record<
          string,
          Record<TransportModeId, string>
        >,
      },
    }));
  }
}

function PassengerFlowForecastStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const forecast = getPz1PassengerFlowForecast(draft);
  const chartData = forecast ? buildPassengerFlowChartData(forecast) : [];
  const modeTableValues = passengerFlowModeRows.reduce<Record<string, Record<string, string>>>((values, row) => {
    values[row.id] = transportColumns.reduce<Record<string, string>>((modeValues, column) => {
      modeValues[column.id] = draft.passengerFlowForecast.modes[column.id]?.[row.id] ?? '';
      return modeValues;
    }, {});
    return values;
  }, {});

  function updateRegionalField(fieldId: keyof Pz1PassengerFlowRegionalInputs, value: string) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      passengerFlowForecast: {
        ...currentDraft.passengerFlowForecast,
        regional: {
          ...currentDraft.passengerFlowForecast.regional,
          [fieldId]: value,
        },
      },
    }));
  }

  function updateModeField(modeId: TransportModeId, fieldId: keyof Pz1PassengerFlowModeInputs, value: string) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      passengerFlowForecast: {
        ...currentDraft.passengerFlowForecast,
        modes: {
          ...currentDraft.passengerFlowForecast.modes,
          [modeId]: {
            ...currentDraft.passengerFlowForecast.modes[modeId],
            [fieldId]: value,
          },
        },
      },
    }));
  }

  return (
    <div className="passenger-flow-step">
      <section className="form-section">
        <p className="eyebrow">Регионы</p>
        <h3>Параметры роста рынка</h3>
        <div className="passenger-flow-regions">
          {passengerFlowRegionalFields.map((field) => (
            <FieldWithHint
              hint={field.hint}
              id={`passenger-flow-${field.id}`}
              key={field.id}
              label={field.label}
              onChange={(value) => updateRegionalField(field.id, value)}
              value={draft.passengerFlowForecast.regional[field.id]}
            />
          ))}
        </div>
      </section>

      <DataEntryTable
        caption="Параметры по видам транспорта"
        columns={transportColumns}
        getError={(rowId, columnId) =>
          validatePassengerFlowModeInput(
            rowId as keyof Pz1PassengerFlowModeInputs,
            draft.passengerFlowForecast.modes[columnId as TransportModeId]?.[
              rowId as keyof Pz1PassengerFlowModeInputs
            ] ?? '',
          )
        }
        onChange={(rowId, columnId, value) =>
          updateModeField(columnId as TransportModeId, rowId as keyof Pz1PassengerFlowModeInputs, value)
        }
        rows={passengerFlowModeRows}
        values={modeTableValues}
      />

      <section className="forecast-summary-panel">
        <p className="eyebrow">Расчёт</p>
        <h3>Итог прогноза</h3>
        {forecast ? (
          <>
            <dl className="forecast-summary-grid">
              <div>
                <dt>Существующий рынок</dt>
                <dd>{formatPassengerFlowValue(forecast.totalDemand.existingAnnualFlow)}</dd>
              </div>
              <div>
                <dt>Базовый прогноз</dt>
                <dd>{formatPassengerFlowValue(forecast.totalDemand.baseForecast)}</dd>
              </div>
              <div>
                <dt>Индуцированный спрос</dt>
                <dd>{formatPassengerFlowValue(forecast.totalDemand.inducedDemand)}</dd>
              </div>
              <div>
                <dt>Итоговый прогноз</dt>
                <dd>{formatPassengerFlowValue(forecast.totalDemand.totalForecast)}</dd>
              </div>
            </dl>

            <div className="forecast-output-grid">
              <div className="forecast-chart">
                <ResponsiveContainer height={300} width="100%">
                  <BarChart data={chartData} margin={{ bottom: 8, left: 10, right: 10, top: 18 }}>
                    <CartesianGrid stroke="#e4edfa" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCompactPassengerFlowValue(Number(value))} />
                    <Tooltip />
                    <Legend />
                    {transportColumns.map((column) => (
                      <Bar
                        dataKey={column.id}
                        fill={passengerFlowChartColors[column.id]}
                        key={column.id}
                        name={column.label}
                        stackId="flow"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="table-scroll">
                <table className="forecast-result-table">
                  <thead>
                    <tr>
                      <th>Вид транспорта</th>
                      <th>Прогноз, пасс./год</th>
                      <th>Доля</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.modes.map((mode) => (
                      <tr key={mode.modeId}>
                        <th scope="row">{getTransportModeLabel(mode.modeId)}</th>
                        <td>{formatPassengerFlowValue(mode.forecastAnnualFlow)}</td>
                        <td>{formatPercent(mode.forecastShare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <p className="status-note">
            Заполните числовые поля: существующий поток должен быть больше нуля, TTC и время в пути — положительными.
          </p>
        )}
      </section>
    </div>
  );
}

function FinalIndicatorsStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const totalLengthText = formatKm(getRouteMetrics(draft).totalLengthKm);
  const computedFinalIndicators = getComputedFinalIndicators(draft);

  return (
    <div className="indicator-step">
      <div className="indicator-grid">
        {finalIndicators.map((indicator) => {
          const isComputed = indicator.id === 'lineLength' || indicator.id === 'annualFlow';

          return (
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
              readOnly={isComputed}
              unit={'unit' in indicator ? indicator.unit : undefined}
              value={
                indicator.id === 'lineLength'
                  ? totalLengthText
                  : indicator.id === 'annualFlow'
                    ? computedFinalIndicators.annualFlow
                    : draft.finalIndicators[indicator.id] ?? ''
              }
            />
          );
        })}
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
  const computedFinalIndicators = getComputedFinalIndicators(draft);
  const fileSlug = sanitizeFileName(draft.passport.lineTitle, 'pz1');
  const filledConsumerCells = countFilledConsumerCells(draft);
  const filledIndicatorCount = finalIndicators.filter((indicator) =>
    indicator.id === 'lineLength' ? result.totalLengthKm > 0 : isFilled(computedFinalIndicators[indicator.id] ?? ''),
  ).length;
  const totalLengthText = formatKm(result.totalLengthKm);
  const stationRouteDistances = getStationRouteDistances(draft);

  function downloadJson() {
    jsonFileDraftStorage.save(bridge, `${fileSlug}-bridge.json`);
    setExportStatus('✓ Файл сохранён');
  }

  async function downloadPdf() {
    try {
      const { downloadPz1Pdf } = await import('../../pdf/render');
      const passengerFlowChartImage = result.passengerFlowForecast
        ? createPassengerFlowChartImage(result.passengerFlowForecast)
        : undefined;
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
          discomfortMatrix: result.discomfortMatrix,
          finalIndicators: result.finalIndicators,
          notes: result.notes,
          passengerFlowForecast: result.passengerFlowForecast,
          passengerFlowChartImage,
          routeLine: result.routeLine,
          stationRouteDistances,
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
            <dd>{computedFinalIndicators.annualFlow || 'не рассчитано'}</dd>
          </div>
          <div>
            <dt>Прогноз</dt>
            <dd>{computedFinalIndicators.ticketRevenue || 'не рассчитано'}</dd>
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

const passengerFlowChartColors: Record<TransportModeId, string> = {
  hSR: '#e0182d',
  airplane: '#003d84',
  bus: '#08a696',
  suburbanTrain: '#7b61ff',
  longDistanceTrain: '#f59e0b',
  car: '#475569',
};

function buildPassengerFlowChartData(forecast: Pz1PassengerFlowResult) {
  return [
    buildPassengerFlowChartRow('Существующий поток', (modeId) => {
      const mode = forecast.modes.find((item) => item.modeId === modeId);
      return mode?.existingAnnualFlow ?? 0;
    }),
    buildPassengerFlowChartRow('Прогноз', (modeId) => {
      const mode = forecast.modes.find((item) => item.modeId === modeId);
      return mode?.forecastAnnualFlow ?? 0;
    }),
  ];
}

function buildPassengerFlowChartRow(label: string, getValue: (modeId: TransportModeId) => number) {
  const row = { name: label } as Record<string, string | number>;

  for (const column of transportColumns) {
    row[column.id] = getValue(column.id);
  }

  return row;
}

function createPassengerFlowChartImage(forecast: Pz1PassengerFlowResult) {
  const canvas = document.createElement('canvas');
  const pixelRatio = window.devicePixelRatio || 1;
  const width = 920;
  const height = 360;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  const context = canvas.getContext('2d');
  if (!context) {
    return undefined;
  }

  context.scale(pixelRatio, pixelRatio);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#003d84';
  context.font = '800 22px Raleway, Arial, sans-serif';
  context.fillText('Существующий поток и прогноз', 32, 38);

  const plotX = 88;
  const plotY = 62;
  const plotWidth = 560;
  const plotHeight = 220;
  const barWidth = 92;
  const barXs = [230, 430];
  const barGroups = [
    {
      label: 'Существующий поток',
      values: transportColumns.map((column) =>
        getPassengerFlowModeValue(forecast, column.id, 'existingAnnualFlow'),
      ),
    },
    {
      label: 'Прогноз',
      values: transportColumns.map((column) =>
        getPassengerFlowModeValue(forecast, column.id, 'forecastAnnualFlow'),
      ),
    },
  ];
  const maxTotal = Math.max(
    1,
    ...barGroups.map((group) => group.values.reduce((sum, value) => sum + value, 0)),
  );

  context.strokeStyle = '#e4edfa';
  context.lineWidth = 1;
  context.beginPath();
  for (let index = 0; index <= 4; index += 1) {
    const y = plotY + (plotHeight / 4) * index;
    context.moveTo(plotX, y);
    context.lineTo(plotX + plotWidth, y);
  }
  context.stroke();

  context.strokeStyle = '#8b87a0';
  context.beginPath();
  context.moveTo(plotX, plotY);
  context.lineTo(plotX, plotY + plotHeight);
  context.lineTo(plotX + plotWidth, plotY + plotHeight);
  context.stroke();

  barGroups.forEach((group, groupIndex) => {
    let offset = 0;

    group.values.forEach((value, modeIndex) => {
      const column = transportColumns[modeIndex];
      const segmentHeight = (value / maxTotal) * plotHeight;
      const x = barXs[groupIndex];
      const y = plotY + plotHeight - offset - segmentHeight;
      context.fillStyle = passengerFlowChartColors[column.id];
      context.fillRect(x, y, barWidth, Math.max(segmentHeight, value > 0 ? 1 : 0));
      offset += segmentHeight;
    });

    context.fillStyle = '#232323';
    context.font = '700 15px Raleway, Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText(group.label, barXs[groupIndex] + barWidth / 2, plotY + plotHeight + 30);
  });

  context.textAlign = 'left';
  context.font = '600 14px Raleway, Arial, sans-serif';
  transportColumns.forEach((column, index) => {
    const y = 84 + index * 36;
    context.fillStyle = passengerFlowChartColors[column.id];
    context.fillRect(700, y - 12, 16, 16);
    context.fillStyle = '#232323';
    context.fillText(column.label, 726, y + 1);
  });

  return canvas.toDataURL('image/png');
}

function getPassengerFlowModeValue(
  forecast: Pz1PassengerFlowResult,
  modeId: TransportModeId,
  field: 'existingAnnualFlow' | 'forecastAnnualFlow',
) {
  return forecast.modes.find((mode) => mode.modeId === modeId)?.[field] ?? 0;
}

function validatePassengerFlowModeInput(fieldId: keyof Pz1PassengerFlowModeInputs, value: string) {
  const parsed = parseNumberInput(value);

  if (parsed === null) {
    return 'Заполните числом';
  }

  if (parsed < 0) {
    return 'Значение не может быть отрицательным';
  }

  if ((fieldId === 'travelTimeHours' || fieldId === 'totalTransportCost') && parsed <= 0) {
    return 'Значение должно быть больше 0';
  }

  return null;
}

function isFilled(value: string) {
  return value.trim().length > 0;
}

function getConsumerCellMeta(rowId: string, value: string) {
  void rowId;
  void value;

  return null;
}

function getDiscomfortCellMeta(value: string) {
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

function getDiscomfortInputStyle(value: string): CSSProperties | undefined {
  const parsed = parseNumberInput(value);
  if (parsed === null || parsed < 0 || parsed > 1) {
    return undefined;
  }

  const low = { r: 225, g: 245, b: 238 };
  const high = { r: 253, g: 243, b: 242 };
  const mix = {
    r: Math.round(low.r + (high.r - low.r) * parsed),
    g: Math.round(low.g + (high.g - low.g) * parsed),
    b: Math.round(low.b + (high.b - low.b) * parsed),
  };

  return {
    backgroundColor: `rgb(${mix.r}, ${mix.g}, ${mix.b})`,
  };
}

function formatKm(value: number) {
  if (value <= 0) {
    return 'не рассчитано';
  }

  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} км`;
}

function formatPassengerFlowValue(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

function formatCompactPassengerFlowValue(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 1,
    style: 'percent',
  }).format(value);
}

function parseNumberInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function getTransportModeLabel(modeId: TransportModeId) {
  return transportColumns.find((column) => column.id === modeId)?.label ?? modeId;
}

function isIntroComplete(draft: Pz1Draft) {
  return isPassportComplete(draft);
}
